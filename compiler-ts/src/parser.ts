import { Token, TokenKind, ASTKind, Program, Declaration, Statement, Expression, FunctionDecl, InterfaceDecl, VarDecl, Assignment, ReturnStmt, IfStmt, WhileStmt, ExprStmt, Parameter, InterfaceField, TypeAnnotation, BinaryExpr, UnaryExpr, CallExpr, IndexExpr, MemberExpr, Identifier, NumberLiteral, StringLiteral, BoolLiteral, NullLiteral, AddressofExpr } from './types.ts';

export class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  // Main parse function
  parse(): Program {
    const declarations: Declaration[] = [];

    while (!this.isAtEnd()) {
      const decl = this.parseDeclaration();
      if (decl) {
        declarations.push(decl);
      }
    }

    return {
      kind: ASTKind.Program,
      declarations,
      line: 1,
      column: 1,
    };
  }

  // Parse top-level declarations
  private parseDeclaration(): Declaration | null {
    // FFI annotation: @ffi.lib("kernel32")
    let ffiLib: string | undefined;
    if (this.match(TokenKind.At)) {
      if (this.check(TokenKind.Identifier) && this.peek().text === 'ffi') {
        this.advance(); // consume 'ffi'
        this.consume(TokenKind.Dot, 'Expected .');
        if (this.check(TokenKind.Identifier) && this.peek().text === 'lib') {
          this.advance(); // consume 'lib'
          this.consume(TokenKind.LParen, 'Expected (');
          if (this.check(TokenKind.String)) {
            ffiLib = this.advance().text;
          }
          this.consume(TokenKind.RParen, 'Expected )');
        }
      }
    }

    // Top-level const or let declaration
    if (this.match(TokenKind.Const)) {
      return this.parseTopLevelConst();
    }
    
    if (this.match(TokenKind.Let)) {
      return this.parseTopLevelLet();
    }

    // Interface declaration
    if (this.match(TokenKind.Interface)) {
      return this.parseInterface();
    }

    // Function declaration (with or without 'declare')
    const isDeclare = this.match(TokenKind.Declare);
    if (this.check(TokenKind.Function)) {
      return this.parseFunction(isDeclare, ffiLib);
    }

    this.error('Expected declaration');
    return null;
  }

  // Parse top-level const declaration
  private parseTopLevelConst(): VarDecl {
    const token = this.previous();
    const name = this.consume(TokenKind.Identifier, 'Expected constant name').text;

    let type: TypeAnnotation | undefined;
    if (this.match(TokenKind.Colon)) {
      type = this.parseType();
    }

    let init: Expression | undefined;
    if (this.match(TokenKind.Equal)) {
      init = this.parseExpression();
    }

    this.consume(TokenKind.Semicolon, 'Expected ;');

    return {
      kind: ASTKind.VarDecl,
      name,
      type,
      init,
      isConst: true,
      line: token.line,
      column: token.column,
    };
  }

  // Parse top-level let declaration
  private parseTopLevelLet(): VarDecl {
    const token = this.previous();
    const name = this.consume(TokenKind.Identifier, 'Expected variable name').text;

    let type: TypeAnnotation | undefined;
    if (this.match(TokenKind.Colon)) {
      type = this.parseType();
    }

    let init: Expression | undefined;
    if (this.match(TokenKind.Equal)) {
      init = this.parseExpression();
    }

    this.consume(TokenKind.Semicolon, 'Expected ;');

    return {
      kind: ASTKind.VarDecl,
      name,
      type,
      init,
      isConst: false,
      line: token.line,
      column: token.column,
    };
  }

  // Parse interface declaration
  private parseInterface(): InterfaceDecl {
    const token = this.previous();
    const name = this.consume(TokenKind.Identifier, 'Expected interface name').text;
    this.consume(TokenKind.LBrace, 'Expected {');

    const fields: InterfaceField[] = [];
    while (!this.check(TokenKind.RBrace) && !this.isAtEnd()) {
      const fieldName = this.consume(TokenKind.Identifier, 'Expected field name').text;
      this.consume(TokenKind.Colon, 'Expected :');
      const fieldType = this.parseType();
      this.consume(TokenKind.Semicolon, 'Expected ;');

      fields.push({ name: fieldName, type: fieldType });
    }

    this.consume(TokenKind.RBrace, 'Expected }');

    return {
      kind: ASTKind.InterfaceDecl,
      name,
      fields,
      line: token.line,
      column: token.column,
    };
  }

  // Parse function declaration
  private parseFunction(isDeclare: boolean, ffiLib?: string): FunctionDecl {
    this.consume(TokenKind.Function, 'Expected function');
    const token = this.previous();
    const name = this.consume(TokenKind.Identifier, 'Expected function name').text;

    // Parameters
    this.consume(TokenKind.LParen, 'Expected (');
    const params: Parameter[] = [];
    
    if (!this.check(TokenKind.RParen)) {
      do {
        const paramName = this.consume(TokenKind.Identifier, 'Expected parameter name').text;
        this.consume(TokenKind.Colon, 'Expected :');
        const paramType = this.parseType();
        params.push({ name: paramName, type: paramType });
      } while (this.match(TokenKind.Comma));
    }
    
    this.consume(TokenKind.RParen, 'Expected )');

    // Return type
    this.consume(TokenKind.Colon, 'Expected :');
    const returnType = this.parseType();

    // Body (only if not declare)
    let body: Statement[] = [];
    if (isDeclare) {
      this.consume(TokenKind.Semicolon, 'Expected ; after declare function');
    } else {
      this.consume(TokenKind.LBrace, 'Expected {');
      body = this.parseBlock();
      this.consume(TokenKind.RBrace, 'Expected }');
    }

    return {
      kind: ASTKind.FunctionDecl,
      name,
      params,
      returnType,
      body,
      isDeclare,
      ffiLib,
      line: token.line,
      column: token.column,
    };
  }

  // Parse block of statements
  private parseBlock(): Statement[] {
    const statements: Statement[] = [];
    
    while (!this.check(TokenKind.RBrace) && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
    }
    
    return statements;
  }

  // Parse statement
  private parseStatement(): Statement | null {
    // Variable declaration
    if (this.match(TokenKind.Let, TokenKind.Const)) {
      return this.parseVarDecl();
    }

    // Return statement
    if (this.match(TokenKind.Return)) {
      return this.parseReturn();
    }

    // If statement
    if (this.match(TokenKind.If)) {
      return this.parseIf();
    }

    // While statement
    if (this.match(TokenKind.While)) {
      return this.parseWhile();
    }

    // For statement
    if (this.match(TokenKind.For)) {
      return this.parseFor();
    }

    // Break statement
    if (this.match(TokenKind.Break)) {
      const token = this.previous();
      this.consume(TokenKind.Semicolon, 'Expected ;');
      return {
        kind: ASTKind.BreakStmt,
        line: token.line,
        column: token.column,
      };
    }

    // Continue statement
    if (this.match(TokenKind.Continue)) {
      const token = this.previous();
      this.consume(TokenKind.Semicolon, 'Expected ;');
      return {
        kind: ASTKind.ContinueStmt,
        line: token.line,
        column: token.column,
      };
    }

    // Expression statement or assignment
    return this.parseExpressionStatement();
  }

  // Parse variable declaration
  private parseVarDecl(): VarDecl {
    const token = this.previous();
    const isConst = token.kind === TokenKind.Const;
    const name = this.consume(TokenKind.Identifier, 'Expected variable name').text;

    let type: TypeAnnotation | undefined;
    if (this.match(TokenKind.Colon)) {
      type = this.parseType();
    }

    let init: Expression | undefined;
    if (this.match(TokenKind.Equal)) {
      init = this.parseExpression();
    }

    this.consume(TokenKind.Semicolon, 'Expected ;');

    return {
      kind: ASTKind.VarDecl,
      name,
      type,
      init,
      isConst,
      line: token.line,
      column: token.column,
    };
  }

  // Parse return statement
  private parseReturn(): ReturnStmt {
    const token = this.previous();
    let value: Expression | undefined;

    if (!this.check(TokenKind.Semicolon)) {
      value = this.parseExpression();
    }

    this.consume(TokenKind.Semicolon, 'Expected ;');

    return {
      kind: ASTKind.ReturnStmt,
      value,
      line: token.line,
      column: token.column,
    };
  }

  // Parse if statement
  private parseIf(): IfStmt {
    const token = this.previous();
    this.consume(TokenKind.LParen, 'Expected (');
    const condition = this.parseExpression();
    this.consume(TokenKind.RParen, 'Expected )');
    
    // Parse then branch - can be single statement or block
    let thenBranch: Statement[];
    if (this.check(TokenKind.LBrace)) {
      this.advance(); // consume {
      thenBranch = this.parseBlock();
      this.consume(TokenKind.RBrace, 'Expected }');
    } else {
      // Single statement
      const stmt = this.parseStatement();
      thenBranch = stmt ? [stmt] : [];
    }

    let elseBranch: Statement[] | undefined;
    if (this.match(TokenKind.Else)) {
      if (this.check(TokenKind.LBrace)) {
        this.advance(); // consume {
        elseBranch = this.parseBlock();
        this.consume(TokenKind.RBrace, 'Expected }');
      } else {
        // Single statement (including else if)
        const stmt = this.parseStatement();
        elseBranch = stmt ? [stmt] : [];
      }
    }

    return {
      kind: ASTKind.IfStmt,
      condition,
      thenBranch,
      elseBranch,
      line: token.line,
      column: token.column,
    };
  }

  // Parse while statement
  private parseWhile(): WhileStmt {
    const token = this.previous();
    this.consume(TokenKind.LParen, 'Expected (');
    const condition = this.parseExpression();
    this.consume(TokenKind.RParen, 'Expected )');
    
    // Parse body - can be single statement or block
    let body: Statement[];
    if (this.check(TokenKind.LBrace)) {
      this.advance(); // consume {
      body = this.parseBlock();
      this.consume(TokenKind.RBrace, 'Expected }');
    } else {
      // Single statement
      const stmt = this.parseStatement();
      body = stmt ? [stmt] : [];
    }

    return {
      kind: ASTKind.WhileStmt,
      condition,
      body,
      line: token.line,
      column: token.column,
    };
  }

  // Parse for statement
  private parseFor(): ForStmt {
    const token = this.previous();
    this.consume(TokenKind.LParen, 'Expected (');
    
    // Init (optional) - can be let/const declaration or assignment
    let init: Statement | undefined;
    if (!this.check(TokenKind.Semicolon)) {
      if (this.match(TokenKind.Let, TokenKind.Const)) {
        // Variable declaration: for (let i = 0; ...)
        const isConst = this.previous().kind === TokenKind.Const;
        const name = this.consume(TokenKind.Identifier, 'Expected variable name').text;
        
        let type: TypeAnnotation | undefined;
        if (this.match(TokenKind.Colon)) {
          type = this.parseType();
        }
        
        let initExpr: Expression | undefined;
        if (this.match(TokenKind.Equal)) {
          initExpr = this.parseExpression();
        }
        
        this.consume(TokenKind.Semicolon, 'Expected ;');
        
        init = {
          kind: ASTKind.VarDecl,
          name,
          type,
          init: initExpr,
          isConst,
          line: token.line,
          column: token.column,
        };
      } else {
        // Assignment: for (i = 0; ...)
        const identToken = this.consume(TokenKind.Identifier, 'Expected identifier in for init');
        const target: Identifier = {
          kind: ASTKind.Identifier,
          name: identToken.text,
          line: identToken.line,
          column: identToken.column,
        };
        this.consume(TokenKind.Equal, 'Expected = in for init');
        const value = this.parseExpression();
        this.consume(TokenKind.Semicolon, 'Expected ;');
        
        init = {
          kind: ASTKind.Assignment,
          target,
          value,
          line: token.line,
          column: token.column,
        };
      }
    } else {
      this.advance(); // consume semicolon
    }
    
    // Condition (optional)
    let condition: Expression | undefined;
    if (!this.check(TokenKind.Semicolon)) {
      condition = this.parseExpression();
    }
    this.consume(TokenKind.Semicolon, 'Expected ;');
    
    // Update (optional) - typically an assignment like i = i + 1
    let update: Statement | undefined;
    if (!this.check(TokenKind.RParen)) {
      const identToken = this.consume(TokenKind.Identifier, 'Expected identifier in for update');
      const target: Identifier = {
        kind: ASTKind.Identifier,
        name: identToken.text,
        line: identToken.line,
        column: identToken.column,
      };
      this.consume(TokenKind.Equal, 'Expected = in for update');
      const value = this.parseExpression();
      
      update = {
        kind: ASTKind.Assignment,
        target,
        value,
        line: identToken.line,
        column: identToken.column,
      };
    }
    this.consume(TokenKind.RParen, 'Expected )');
    
    // Parse body - can be single statement or block
    let body: Statement[];
    if (this.check(TokenKind.LBrace)) {
      this.advance(); // consume {
      body = this.parseBlock();
      this.consume(TokenKind.RBrace, 'Expected }');
    } else {
      // Single statement
      const stmt = this.parseStatement();
      body = stmt ? [stmt] : [];
    }

    return {
      kind: ASTKind.ForStmt,
      init,
      condition,
      update,
      body,
      line: token.line,
      column: token.column,
    };
  }

  // Parse expression statement or assignment
  private parseExpressionStatement(): Statement {
    const token = this.peek();
    const expr = this.parseExpression();

    // Check if it's an assignment
    if (this.match(TokenKind.Equal)) {
      const value = this.parseExpression();
      this.consume(TokenKind.Semicolon, 'Expected ;');
      
      return {
        kind: ASTKind.Assignment,
        target: expr,
        value,
        line: token.line,
        column: token.column,
      };
    }

    // Expression statement
    this.consume(TokenKind.Semicolon, 'Expected ;');
    return {
      kind: ASTKind.ExprStmt,
      expr,
      line: token.line,
      column: token.column,
    };
  }

  // Parse expression (with operator precedence)
  private parseExpression(): Expression {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): Expression {
    let left = this.parseLogicalAnd();

    while (this.match(TokenKind.Or)) {
      const operator = this.previous().text;
      const right = this.parseLogicalAnd();
      left = {
        kind: ASTKind.BinaryExpr,
        operator,
        left,
        right,
        line: left.line,
        column: left.column,
      };
    }

    return left;
  }

  private parseLogicalAnd(): Expression {
    let left = this.parseEquality();

    while (this.match(TokenKind.And)) {
      const operator = this.previous().text;
      const right = this.parseEquality();
      left = {
        kind: ASTKind.BinaryExpr,
        operator,
        left,
        right,
        line: left.line,
        column: left.column,
      };
    }

    return left;
  }

  private parseEquality(): Expression {
    let left = this.parseComparison();

    while (this.match(TokenKind.EqualEqual, TokenKind.NotEqual)) {
      const operator = this.previous().text;
      const right = this.parseComparison();
      left = {
        kind: ASTKind.BinaryExpr,
        operator,
        left,
        right,
        line: left.line,
        column: left.column,
      };
    }

    return left;
  }

  private parseComparison(): Expression {
    let left = this.parseAdditive();

    while (this.match(TokenKind.Less, TokenKind.LessEqual, TokenKind.Greater, TokenKind.GreaterEqual)) {
      const operator = this.previous().text;
      const right = this.parseAdditive();
      left = {
        kind: ASTKind.BinaryExpr,
        operator,
        left,
        right,
        line: left.line,
        column: left.column,
      };
    }

    return left;
  }

  private parseAdditive(): Expression {
    let left = this.parseMultiplicative();

    while (this.match(TokenKind.Plus, TokenKind.Minus)) {
      const operator = this.previous().text;
      const right = this.parseMultiplicative();
      left = {
        kind: ASTKind.BinaryExpr,
        operator,
        left,
        right,
        line: left.line,
        column: left.column,
      };
    }

    return left;
  }

  private parseMultiplicative(): Expression {
    let left = this.parseUnary();

    while (this.match(TokenKind.Star, TokenKind.Slash, TokenKind.Percent)) {
      const operator = this.previous().text;
      const right = this.parseUnary();
      left = {
        kind: ASTKind.BinaryExpr,
        operator,
        left,
        right,
        line: left.line,
        column: left.column,
      };
    }

    return left;
  }

  private parseUnary(): Expression {
    if (this.match(TokenKind.Not, TokenKind.Minus)) {
      const token = this.previous();
      const operator = token.text;
      const operand = this.parseUnary();
      return {
        kind: ASTKind.UnaryExpr,
        operator,
        operand,
        line: token.line,
        column: token.column,
      };
    }

    return this.parsePostfix();
  }

  private parsePostfix(): Expression {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match(TokenKind.LParen)) {
        // Function call
        const args: Expression[] = [];
        if (!this.check(TokenKind.RParen)) {
          do {
            args.push(this.parseExpression());
          } while (this.match(TokenKind.Comma));
        }
        this.consume(TokenKind.RParen, 'Expected )');
        
        expr = {
          kind: ASTKind.CallExpr,
          callee: expr,
          args,
          line: expr.line,
          column: expr.column,
        };
      } else if (this.match(TokenKind.LBracket)) {
        // Array index
        const index = this.parseExpression();
        this.consume(TokenKind.RBracket, 'Expected ]');
        
        expr = {
          kind: ASTKind.IndexExpr,
          base: expr,
          index,
          line: expr.line,
          column: expr.column,
        };
      } else if (this.match(TokenKind.Dot)) {
        // Member access
        const member = this.consume(TokenKind.Identifier, 'Expected member name').text;
        
        expr = {
          kind: ASTKind.MemberExpr,
          object: expr,
          member,
          line: expr.line,
          column: expr.column,
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): Expression {
    const token = this.peek();

    // Number literal
    if (this.match(TokenKind.Number)) {
      const value = parseInt(this.previous().text);
      return {
        kind: ASTKind.NumberLiteral,
        value,
        line: token.line,
        column: token.column,
      };
    }

    // String literal
    if (this.match(TokenKind.String)) {
      const value = this.previous().text;
      return {
        kind: ASTKind.StringLiteral,
        value,
        line: token.line,
        column: token.column,
      };
    }

    // Boolean literals
    if (this.match(TokenKind.True)) {
      return {
        kind: ASTKind.BoolLiteral,
        value: true,
        line: token.line,
        column: token.column,
      };
    }

    if (this.match(TokenKind.False)) {
      return {
        kind: ASTKind.BoolLiteral,
        value: false,
        line: token.line,
        column: token.column,
      };
    }

    // Null literal
    if (this.match(TokenKind.Null)) {
      return {
        kind: ASTKind.NullLiteral,
        line: token.line,
        column: token.column,
      };
    }

    // Addressof expression
    if (this.match(TokenKind.Addressof)) {
      this.consume(TokenKind.LParen, 'Expected (');
      const operand = this.parseExpression();
      this.consume(TokenKind.RParen, 'Expected )');
      return {
        kind: ASTKind.AddressofExpr,
        operand,
        line: token.line,
        column: token.column,
      };
    }

    // Identifier
    if (this.match(TokenKind.Identifier)) {
      const name = this.previous().text;
      return {
        kind: ASTKind.Identifier,
        name,
        line: token.line,
        column: token.column,
      };
    }

    // Parenthesized expression
    if (this.match(TokenKind.LParen)) {
      const expr = this.parseExpression();
      this.consume(TokenKind.RParen, 'Expected )');
      return expr;
    }

    this.error('Expected expression');
    // Return dummy identifier to continue parsing
    return {
      kind: ASTKind.Identifier,
      name: 'error',
      line: token.line,
      column: token.column,
    };
  }

  // Parse type annotation
  private parseType(): TypeAnnotation {
    let name = this.consume(TokenKind.Identifier, 'Expected type name').text;
    let isPointer = false;
    let isArray = false;
    let arraySize: number | undefined;

    // Check for ptr<T>
    if (name === 'ptr' && this.match(TokenKind.Less)) {
      isPointer = true;
      name = this.consume(TokenKind.Identifier, 'Expected type name').text;
      this.consume(TokenKind.Greater, 'Expected >');
    }

    // Check for array type T[N]
    if (this.match(TokenKind.LBracket)) {
      isArray = true;
      if (this.check(TokenKind.Number)) {
        arraySize = parseInt(this.advance().text);
      }
      this.consume(TokenKind.RBracket, 'Expected ]');
    }

    return { name, isPointer, isArray, arraySize };
  }

  // Helper methods
  private match(...kinds: TokenKind[]): boolean {
    for (const kind of kinds) {
      if (this.check(kind)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(kind: TokenKind): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().kind === kind;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.pos++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().kind === TokenKind.EOF;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private previous(): Token {
    return this.tokens[this.pos - 1];
  }

  private consume(kind: TokenKind, message: string): Token {
    if (this.check(kind)) return this.advance();
    this.error(message);
    return this.peek();
  }

  private error(message: string): void {
    const token = this.peek();
    console.error(`Parse error at ${token.line}:${token.column}: ${message}`);
    console.error(`  Got: ${token.kind} "${token.text}"`);
  }
}
