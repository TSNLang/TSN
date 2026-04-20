import { Token, TokenKind, ASTKind, Program, Declaration, Statement, Expression, FunctionDecl, InterfaceDecl, VarDecl, Assignment, ReturnStmt, IfStmt, WhileStmt, ForStmt, BreakStmt, ContinueStmt, ExprStmt, Parameter, InterfaceField, InterfaceMethod, TypeAnnotation, BinaryExpr, UnaryExpr, CallExpr, IndexExpr, MemberExpr, Identifier, NumberLiteral, StringLiteral, BoolLiteral, NullLiteral, AddressofExpr, ImportDecl, ExportDecl, ImportSpecifier, TypeAliasDecl, EnumDecl, EnumMember, NamespaceDecl, ClassDecl, StructDecl, ClassField, ClassMethod, NewExpr, ThisExpr, TupleExpr } from './types.ts';
import { Reporter } from './diagnostics.ts';

export class Parser {
  private tokens: Token[];
  private reporter: Reporter;
  private pos: number = 0;

  constructor(tokens: Token[], reporter: Reporter) {
    this.tokens = tokens;
    this.reporter = reporter;
  }

  parse(): Program {
    const declarations: Declaration[] = [];
    while (!this.isAtEnd()) {
      try {
        const decl = this.parseDeclaration();
        if (decl) {
          const name = (decl as any).name || 'unnamed';
          console.log(`DEBUG: Parser adding declaration ${decl.kind} (${name}) at ${decl.line}:${decl.column}`);
          declarations.push(decl);
        }
        else this.synchronize();
      } catch (e) {
        this.synchronize();
      }
    }
    return { kind: ASTKind.Program, declarations, line: 1, column: 1 };
  }

  private parseDeclaration(): Declaration | null {
    if (this.match(TokenKind.Import)) return this.parseImport();
    if (this.match(TokenKind.Export)) return this.parseExport();

    let ffiLib: string | undefined;
    let isUnsafe = false;
    let targetOS: string[] | undefined;
    while (this.match(TokenKind.At)) {
      const decoratorName = this.consume(TokenKind.Identifier, "Expected decorator name").text;
      if (decoratorName === 'ffi') {
        this.consume(TokenKind.Dot, "Expected '.' after 'ffi'");
        if (this.check(TokenKind.Identifier) && this.peek().text === 'lib') {
          this.advance(); // 'lib'
          this.consume(TokenKind.LParen, "Expected '('");
          if (this.check(TokenKind.String)) ffiLib = this.advance().text;
          else this.error("Expected string literal for ffi library");
          this.consume(TokenKind.RParen, "Expected ')'");
        }
      } else if (decoratorName === 'unsafe') {
        isUnsafe = true;
      } else if (decoratorName === 'target_os') {
        this.consume(TokenKind.LParen, "Expected '(' after 'target_os'");
        const supported = new Set(['windows', 'linux', 'macos', 'bsd', 'android', 'posix']);
        const values: string[] = [];
        do {
          if (!this.check(TokenKind.String)) {
            this.error("Expected string literal for target_os");
            break;
          }
          const value = this.advance().text;
          if (!supported.has(value)) this.error(`Unsupported target OS: ${value}`);
          else if (!values.includes(value)) values.push(value);
        } while (this.match(TokenKind.Comma));
        if (values.length === 0) this.error("Expected at least one target_os value");
        else targetOS = values;
        this.consume(TokenKind.RParen, "Expected ')'");
      } else {
        this.error(`Unknown decorator: @${decoratorName}`);
      }
    }

    if (this.match(TokenKind.Export)) {
      const token = this.previous();
      const declaration = this.parseDecoratedDeclaration(ffiLib, isUnsafe, targetOS);
      if (!declaration) throw this.error('Expected declaration after export');
      return { kind: ASTKind.ExportDecl, declaration, line: token.line, column: token.column };
    }

    return this.parseDecoratedDeclaration(ffiLib, isUnsafe, targetOS);
  }

  private parseDecoratedDeclaration(ffiLib?: string, isUnsafe: boolean = false, targetOS?: string[]): Declaration | null {
    if (this.match(TokenKind.Const)) return this.parseTopLevelConst();
    if (this.match(TokenKind.Let)) return this.parseTopLevelLet();
    if (this.match(TokenKind.Interface)) return this.parseInterface();
    if (this.match(TokenKind.Type)) return this.parseTypeAlias();
    if (this.match(TokenKind.Enum)) return this.parseEnum();
    if (this.match(TokenKind.Namespace)) return this.parseNamespace();
    if (this.match(TokenKind.Class)) return this.parseClass();
    if (this.match(TokenKind.Struct)) return this.parseStruct();

    const isDeclare = this.match(TokenKind.Declare);
    if (this.check(TokenKind.Function)) return this.parseFunction(isDeclare, ffiLib, isUnsafe, targetOS);

    this.error('Expected declaration (function, class, let, const, interface, etc.)');
    return null;
  }

  private parseTopLevelConst(): VarDecl {
    const token = this.previous();
    const name = this.consume(TokenKind.Identifier, 'Expected constant name').text;
    let type: TypeAnnotation | undefined;
    if (this.match(TokenKind.Colon)) type = this.parseType();
    let init: Expression | undefined;
    if (this.match(TokenKind.Equal)) init = this.parseExpression();
    this.consume(TokenKind.Semicolon, "Expected ';' after constant declaration");
    return { kind: ASTKind.VarDecl, name, type, init, isConst: true, line: token.line, column: token.column };
  }

  private parseTopLevelLet(): VarDecl {
    const token = this.previous();
    const name = this.consume(TokenKind.Identifier, 'Expected variable name').text;
    let type: TypeAnnotation | undefined;
    if (this.match(TokenKind.Colon)) type = this.parseType();
    let init: Expression | undefined;
    if (this.match(TokenKind.Equal)) init = this.parseExpression();
    this.consume(TokenKind.Semicolon, "Expected ';' after variable declaration");
    return { kind: ASTKind.VarDecl, name, type, init, isConst: false, line: token.line, column: token.column };
  }

  private parseInterface(): InterfaceDecl {
    const token = this.previous();
    const name = this.consume(TokenKind.Identifier, 'Expected interface name').text;
    
    let typeParameters: string[] | undefined;
    if (this.match(TokenKind.Less)) {
      typeParameters = this.parseTypeParameters();
    }

    this.consume(TokenKind.LBrace, "Expected '{'");
    const fields: InterfaceField[] = [];
    const methods: InterfaceMethod[] = [];
    while (!this.check(TokenKind.RBrace) && !this.isAtEnd()) {
      const startToken = this.peek();
        const memberName = this.consume(TokenKind.Identifier, 'Expected member name').text;
        
        if (this.check(TokenKind.LParen)) {
          // Method signature
          const mParams = this.parseMethodParams();
          this.consume(TokenKind.Colon, "Expected ':'");
          const mRet = this.parseType();
          this.consume(TokenKind.Semicolon, "Expected ';'");
          methods.push({
            kind: ASTKind.ClassMethod as any,
            name: memberName,
            params: mParams,
            returnType: mRet,
            line: startToken.line,
            column: startToken.column
          });
        } else {
          // Field
          this.consume(TokenKind.Colon, "Expected ':'");
          const fieldType = this.parseType();
          this.consume(TokenKind.Semicolon, "Expected ';'");
          fields.push({ name: memberName, type: fieldType });
        }
      }
    this.consume(TokenKind.RBrace, "Expected '}'");
    return { kind: ASTKind.InterfaceDecl, name, typeParameters, fields, methods, line: token.line, column: token.column };
  }

  private parseTypeAlias(): TypeAliasDecl {
    const token = this.previous();
    const name = this.consume(TokenKind.Identifier, 'Expected type alias name').text;
    this.consume(TokenKind.Equal, "Expected '=' after type alias name");
    const type = this.parseType();
    this.consume(TokenKind.Semicolon, "Expected ';' after type alias");
    return { kind: ASTKind.TypeAliasDecl, name, type, line: token.line, column: token.column };
  }

  private parseEnum(): EnumDecl {
    const token = this.previous();
    const name = this.consume(TokenKind.Identifier, 'Expected enum name').text;
    this.consume(TokenKind.LBrace, "Expected '{'");
    const members: EnumMember[] = [];
    if (!this.check(TokenKind.RBrace)) {
      do {
        const mName = this.consume(TokenKind.Identifier, 'Expected enum member name').text;
        let value: number | undefined;
        if (this.match(TokenKind.Equal)) value = parseInt(this.consume(TokenKind.Number, 'Expected enum member value').text);
        members.push({ name: mName, value });
      } while (this.match(TokenKind.Comma));
    }
    this.consume(TokenKind.RBrace, "Expected '}'");
    return { kind: ASTKind.EnumDecl, name, members, line: token.line, column: token.column };
  }

  private parseNamespace(): NamespaceDecl {
    const token = this.previous();
    const name = this.consume(TokenKind.Identifier, 'Expected namespace name').text;
    this.consume(TokenKind.LBrace, "Expected '{'");
    const body: Declaration[] = [];
    while (!this.check(TokenKind.RBrace) && !this.isAtEnd()) {
      const decl = this.parseDeclaration();
      if (decl) body.push(decl);
    }
    this.consume(TokenKind.RBrace, "Expected '}'");
    return { kind: ASTKind.NamespaceDecl, name, body, line: token.line, column: token.column };
  }

  private parseClass(): ClassDecl {
    const token = this.previous();
    const name = this.consume(TokenKind.Identifier, 'Expected class name').text;
    
    let typeParameters: string[] | undefined;
    if (this.match(TokenKind.Less)) {
      typeParameters = this.parseTypeParameters();
    }

    let baseClassName: string | undefined;
    if (this.match(TokenKind.Extends)) {
      baseClassName = this.consume(TokenKind.Identifier, 'Expected base class name').text;
    }

    let implementsInterfaces: TypeAnnotation[] | undefined;
    if (this.match(TokenKind.Implements)) {
      implementsInterfaces = [];
      do {
        implementsInterfaces.push(this.parseType());
      } while (this.match(TokenKind.Comma));
    }

    this.consume(TokenKind.LBrace, "Expected '{'");
    const fields: ClassField[] = [];
    const methods: ClassMethod[] = [];
    let constructorDecl: ClassMethod | undefined;
    while (!this.check(TokenKind.RBrace) && !this.isAtEnd()) {
      let isUnsafe = false;
      while (this.match(TokenKind.At)) {
        const decoratorName = this.consume(TokenKind.Identifier, "Expected decorator name").text;
        if (decoratorName === 'unsafe') isUnsafe = true;
        else this.error(`Unknown decorator: @${decoratorName}`);
      }

      let isPublic = true;
      if (this.match(TokenKind.Public)) isPublic = true;
      else if (this.match(TokenKind.Private)) isPublic = false;
      const startToken = this.peek();
      if (this.match(TokenKind.Constructor)) {
        if (constructorDecl) this.error('Duplicate constructor');
        const cParams = this.parseMethodParams();
        this.consume(TokenKind.LBrace, "Expected '{'");
        const cBody = this.parseBlock();
        this.consume(TokenKind.RBrace, "Expected '}'");
        constructorDecl = { 
          kind: ASTKind.ClassMethod,
          name: 'constructor', 
          isPublic: true, 
          params: cParams, 
          returnType: { name: 'void', isPointer: false, isRawPointer: false, isArray: false }, 
          body: cBody, 
          isUnsafe,
          line: startToken.line, 
          column: startToken.column 
        };
      } else {
        const memberName = this.consume(TokenKind.Identifier, 'Expected class member name').text;
        if (this.check(TokenKind.LParen)) {
          const mParams = this.parseMethodParams();
          this.consume(TokenKind.Colon, "Expected ':' after method params");
          const mRet = this.parseType();
          this.consume(TokenKind.LBrace, "Expected '{'");
          const mBody = this.parseBlock();
          this.consume(TokenKind.RBrace, "Expected '}'");
          methods.push({ 
            kind: ASTKind.ClassMethod,
            name: memberName, 
            isPublic, 
            params: mParams, 
            returnType: mRet, 
            body: mBody, 
            isUnsafe,
            line: startToken.line, 
            column: startToken.column 
          });
        } else {
          this.consume(TokenKind.Colon, "Expected ':'");
          const fType = this.parseType();
          this.consume(TokenKind.Semicolon, "Expected ';'");
          fields.push({ 
            kind: ASTKind.ClassField,
            name: memberName, 
            isPublic, 
            type: fType, 
            line: startToken.line, 
            column: startToken.column 
          });
        }
      }
    }
    this.consume(TokenKind.RBrace, "Expected '}'");
    return { kind: ASTKind.ClassDecl, name, typeParameters, baseClassName, implements: implementsInterfaces, fields, methods, constructorDecl, line: token.line, column: token.column };
  }

  private parseStruct(): StructDecl {
    const token = this.previous();
    const name = this.consume(TokenKind.Identifier, 'Expected struct name').text;
    
    let typeParameters: string[] | undefined;
    if (this.match(TokenKind.Less)) {
      typeParameters = this.parseTypeParameters();
    }

    let baseStructName: string | undefined;
    if (this.match(TokenKind.Extends)) {
      baseStructName = this.consume(TokenKind.Identifier, 'Expected base struct name').text;
    }

    let implementsInterfaces: TypeAnnotation[] | undefined;
    if (this.match(TokenKind.Implements)) {
      implementsInterfaces = [];
      do {
        implementsInterfaces.push(this.parseType());
      } while (this.match(TokenKind.Comma));
    }

    this.consume(TokenKind.LBrace, "Expected '{'");
    const fields: InterfaceField[] = [];
    while (!this.check(TokenKind.RBrace) && !this.isAtEnd()) {
      const fieldName = this.consume(TokenKind.Identifier, 'Expected field name').text;
      this.consume(TokenKind.Colon, "Expected ':'");
      const fieldType = this.parseType();
      this.consume(TokenKind.Semicolon, "Expected ';'");
      fields.push({ name: fieldName, type: fieldType });
    }
    this.consume(TokenKind.RBrace, "Expected '}'");
    return { kind: ASTKind.StructDecl, name, typeParameters, baseStructName, implements: implementsInterfaces, fields, line: token.line, column: token.column };
  }

  private parseMethodParams(): Parameter[] {
    this.consume(TokenKind.LParen, "Expected '('");
    const params: Parameter[] = [];
    if (!this.check(TokenKind.RParen)) {
      do {
        const pName = this.consume(TokenKind.Identifier, 'Expected parameter name').text;
        this.consume(TokenKind.Colon, "Expected ':'");
        const pType = this.parseType();
        params.push({ name: pName, type: pType });
      } while (this.match(TokenKind.Comma));
    }
    this.consume(TokenKind.RParen, "Expected ')'");
    return params;
  }

  private parseFunction(isDeclare: boolean, ffiLib?: string, isUnsafe: boolean = false, targetOS?: string[]): FunctionDecl {
    this.consume(TokenKind.Function, "Expected 'function'");
    const token = this.previous();
    const name = this.consume(TokenKind.Identifier, 'Expected function name').text;
    
    let typeParameters: string[] | undefined;
    if (this.match(TokenKind.Less)) {
      typeParameters = this.parseTypeParameters();
    }

    const params = this.parseMethodParams();
    this.consume(TokenKind.Colon, "Expected ':' return type annotation");
    const returnType = this.parseType();
    let body: Statement[] = [];
    if (isDeclare || ffiLib) this.consume(TokenKind.Semicolon, "Expected ';' after external function declaration");
    else {
      this.consume(TokenKind.LBrace, "Expected '{'");
      body = this.parseBlock();
      this.consume(TokenKind.RBrace, "Expected '}'");
    }
    return { kind: ASTKind.FunctionDecl, name, typeParameters, params, returnType, body, isDeclare, ffiLib, isUnsafe, targetOS, line: token.line, column: token.column };
  }

  private parseBlock(): Statement[] {
    const statements: Statement[] = [];
    while (!this.check(TokenKind.RBrace) && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
    }
    return statements;
  }

  private parseStatement(): Statement | null {
    if (this.match(TokenKind.Let, TokenKind.Const)) return this.parseVarDecl();
    if (this.match(TokenKind.Return)) return this.parseReturn();
    if (this.match(TokenKind.If)) return this.parseIf();
    if (this.match(TokenKind.While)) return this.parseWhile();
    if (this.match(TokenKind.For)) return this.parseFor();
    if (this.match(TokenKind.Break)) {
      const token = this.previous();
      this.consume(TokenKind.Semicolon, "Expected ';' after 'break'");
      return { kind: ASTKind.BreakStmt, line: token.line, column: token.column };
    }
    if (this.match(TokenKind.Continue)) {
      const token = this.previous();
      this.consume(TokenKind.Semicolon, "Expected ';' after 'continue'");
      return { kind: ASTKind.ContinueStmt, line: token.line, column: token.column };
    }
    return this.parseExpressionStatement();
  }

  private parseVarDecl(): VarDecl {
    const token = this.previous();
    const isConst = token.kind === TokenKind.Const;
    const name = this.consume(TokenKind.Identifier, 'Expected variable name').text;
    let type: TypeAnnotation | undefined;
    if (this.match(TokenKind.Colon)) type = this.parseType();
    let init: Expression | undefined;
    if (this.match(TokenKind.Equal)) init = this.parseExpression();
    this.consume(TokenKind.Semicolon, "Expected ';' after variable declaration");
    return { kind: ASTKind.VarDecl, name, type, init, isConst, line: token.line, column: token.column };
  }

  private parseReturn(): ReturnStmt {
    const token = this.previous();
    let value: Expression | undefined;
    if (!this.check(TokenKind.Semicolon)) value = this.parseExpression();
    this.consume(TokenKind.Semicolon, "Expected ';' after return");
    return { kind: ASTKind.ReturnStmt, value, line: token.line, column: token.column };
  }

  private parseIf(): IfStmt {
    const token = this.previous();
    this.consume(TokenKind.LParen, "Expected '('");
    const condition = this.parseExpression();
    this.consume(TokenKind.RParen, "Expected ')'");
    let thenBranch: Statement[];
    if (this.match(TokenKind.LBrace)) {
      thenBranch = this.parseBlock();
      this.consume(TokenKind.RBrace, "Expected '}'");
    } else {
      const stmt = this.parseStatement();
      thenBranch = stmt ? [stmt] : [];
    }
    let elseBranch: Statement[] | undefined;
    if (this.match(TokenKind.Else)) {
      if (this.match(TokenKind.LBrace)) {
        elseBranch = this.parseBlock();
        this.consume(TokenKind.RBrace, "Expected '}'");
      } else {
        const stmt = this.parseStatement();
        elseBranch = stmt ? [stmt] : [];
      }
    }
    return { kind: ASTKind.IfStmt, condition, thenBranch, elseBranch, line: token.line, column: token.column };
  }

  private parseWhile(): WhileStmt {
    const token = this.previous();
    this.consume(TokenKind.LParen, "Expected '('");
    const condition = this.parseExpression();
    this.consume(TokenKind.RParen, "Expected ')'");
    let body: Statement[];
    if (this.match(TokenKind.LBrace)) {
      body = this.parseBlock();
      this.consume(TokenKind.RBrace, "Expected '}'");
    } else {
      const stmt = this.parseStatement();
      body = stmt ? [stmt] : [];
    }
    return { kind: ASTKind.WhileStmt, condition, body, line: token.line, column: token.column };
  }

  private parseFor(): ForStmt {
    const token = this.previous();
    this.consume(TokenKind.LParen, "Expected '('");
    let init: Statement | undefined;
    if (!this.check(TokenKind.Semicolon)) {
      if (this.match(TokenKind.Let, TokenKind.Const)) {
        const startToken = this.previous();
        const isConst = startToken.kind === TokenKind.Const;
        const name = this.consume(TokenKind.Identifier, 'Expected variable name').text;
        let type: TypeAnnotation | undefined;
        if (this.match(TokenKind.Colon)) type = this.parseType();
        let initExpr: Expression | undefined;
        if (this.match(TokenKind.Equal)) initExpr = this.parseExpression();
        this.consume(TokenKind.Semicolon, "Expected ';' in for init");
        init = { kind: ASTKind.VarDecl, name, type, init: initExpr, isConst, line: startToken.line, column: startToken.column };
      } else {
        const target = this.parseExpression();
        this.consume(TokenKind.Equal, "Expected '=' in for init assignment");
        const value = this.parseExpression();
        this.consume(TokenKind.Semicolon, "Expected ';' in for init");
        init = { kind: ASTKind.Assignment, target, value, line: target.line, column: target.column };
      }
    } else this.advance();
    let condition: Expression | undefined;
    if (!this.check(TokenKind.Semicolon)) condition = this.parseExpression();
    this.consume(TokenKind.Semicolon, "Expected ';' in for condition");
    let update: Statement | undefined;
    if (!this.check(TokenKind.RParen)) {
      const expr = this.parseExpression();
      if (this.match(TokenKind.Equal)) {
        const value = this.parseExpression();
        update = { kind: ASTKind.Assignment, target: expr, value, line: expr.line, column: expr.column };
      } else {
        update = { kind: ASTKind.ExprStmt, expr, line: expr.line, column: expr.column };
      }
    }
    this.consume(TokenKind.RParen, "Expected ')'");
    let body: Statement[];
    if (this.match(TokenKind.LBrace)) {
      body = this.parseBlock();
      this.consume(TokenKind.RBrace, "Expected '}'");
    } else {
      const stmt = this.parseStatement();
      body = stmt ? [stmt] : [];
    }
    return { kind: ASTKind.ForStmt, init, condition, update, body, line: token.line, column: token.column };
  }

  private parseExpressionStatement(): Statement {
    const token = this.peek();
    const expr = this.parseExpression();
    if (this.match(TokenKind.Equal)) {
      const value = this.parseExpression();
      this.consume(TokenKind.Semicolon, "Expected ';' after assignment");
      return { kind: ASTKind.Assignment, target: expr, value, line: token.line, column: token.column };
    }
    this.consume(TokenKind.Semicolon, "Expected ';' after expression");
    return { kind: ASTKind.ExprStmt, expr, line: token.line, column: token.column };
  }

  private parseExpression(): Expression { return this.parseLogicalOr(); }
  private parseLogicalOr(): Expression {
    let left = this.parseLogicalAnd();
    while (this.match(TokenKind.Or)) {
      const op = this.previous().text;
      const right = this.parseLogicalAnd();
      left = { kind: ASTKind.BinaryExpr, operator: op, left, right, line: left.line, column: left.column };
    }
    return left;
  }
  private parseLogicalAnd(): Expression {
    let left = this.parseBitwiseOr();
    while (this.match(TokenKind.And)) {
      const op = this.previous().text;
      const right = this.parseBitwiseOr();
      left = { kind: ASTKind.BinaryExpr, operator: op, left, right, line: left.line, column: left.column };
    }
    return left;
  }

  private parseBitwiseOr(): Expression {
    let left = this.parseBitwiseXor();
    while (this.match(TokenKind.Pipe)) {
      const op = this.previous().text;
      const right = this.parseBitwiseXor();
      left = { kind: ASTKind.BinaryExpr, operator: op, left, right, line: left.line, column: left.column };
    }
    return left;
  }

  private parseBitwiseXor(): Expression {
    let left = this.parseBitwiseAnd();
    while (this.match(TokenKind.Caret)) {
      const op = this.previous().text;
      const right = this.parseBitwiseAnd();
      left = { kind: ASTKind.BinaryExpr, operator: op, left, right, line: left.line, column: left.column };
    }
    return left;
  }

  private parseBitwiseAnd(): Expression {
    let left = this.parseEquality();
    while (this.match(TokenKind.Ampersand)) {
      const op = this.previous().text;
      const right = this.parseEquality();
      left = { kind: ASTKind.BinaryExpr, operator: op, left, right, line: left.line, column: left.column };
    }
    return left;
  }
  private parseEquality(): Expression {
    let left = this.parseComparison();
    while (this.match(TokenKind.EqualEqual, TokenKind.NotEqual)) {
      const op = this.previous().text;
      const right = this.parseComparison();
      left = { kind: ASTKind.BinaryExpr, operator: op, left, right, line: left.line, column: left.column };
    }
    return left;
  }
  private parseComparison(): Expression {
    let left = this.parseShift();
    while (this.match(TokenKind.Less, TokenKind.LessEqual, TokenKind.Greater, TokenKind.GreaterEqual)) {
      const op = this.previous().text;
      const right = this.parseShift();
      left = { kind: ASTKind.BinaryExpr, operator: op, left, right, line: left.line, column: left.column };
    }
    return left;
  }

  private parseShift(): Expression {
    let left = this.parseAdditive();
    while (this.match(TokenKind.LessLess, TokenKind.GreaterGreater)) {
       const op = this.previous().text;
       const right = this.parseAdditive();
       left = { kind: ASTKind.BinaryExpr, operator: op, left, right, line: left.line, column: left.column };
    }
    return left;
  }
  private parseAdditive(): Expression {
    let left = this.parseMultiplicative();
    while (this.match(TokenKind.Plus, TokenKind.Minus)) {
      const op = this.previous().text;
      const right = this.parseMultiplicative();
      left = { kind: ASTKind.BinaryExpr, operator: op, left, right, line: left.line, column: left.column };
    }
    return left;
  }
  private parseMultiplicative(): Expression {
    let left = this.parseUnary();
    while (this.match(TokenKind.Star, TokenKind.Slash, TokenKind.Percent)) {
      const op = this.previous().text;
      const right = this.parseUnary();
      left = { kind: ASTKind.BinaryExpr, operator: op, left, right, line: left.line, column: left.column };
    }
    return left;
  }
  private parseUnary(): Expression {
    if (this.match(TokenKind.Not, TokenKind.Minus, TokenKind.Tilde)) {
      const token = this.previous();
      const operand = this.parseUnary();
      return { kind: ASTKind.UnaryExpr, operator: token.text, operand, line: token.line, column: token.column };
    }
    return this.parsePostfix();
  }
  private parsePostfix(): Expression {
    let expr = this.parsePrimary();
    while (true) {
      if (this.check(TokenKind.Less)) {
          // Potential generic call: foo<i32>(...)
          // We look ahead to see if it's followed by types and then a '('
          const snapshot = this.pos;
          try {
              this.advance(); // consume '<'
              const gArgs: TypeAnnotation[] = [];
              do {
                  gArgs.push(this.parseType());
              } while (this.match(TokenKind.Comma));
              this.consume(TokenKind.Greater, "Expected '>'");
              
              if (this.match(TokenKind.LParen)) {
                  const args: Expression[] = [];
                  if (!this.check(TokenKind.RParen)) {
                    do { args.push(this.parseExpression()); } while (this.match(TokenKind.Comma));
                  }
                  this.consume(TokenKind.RParen, "Expected ')' after arguments");
                  expr = { kind: ASTKind.CallExpr, callee: expr, genericArgs: gArgs, args, line: expr.line, column: expr.column };
                  continue;
              } else {
                  // Not a call, backtrack
                  this.pos = snapshot;
              }
          } catch (e) {
              this.pos = snapshot;
          }
      }
      
      if (this.match(TokenKind.PlusPlus, TokenKind.MinusMinus)) {
        const op = this.previous().text;
        expr = { kind: ASTKind.UnaryExpr, operator: op, operand: expr, isPostfix: true, line: expr.line, column: expr.column };
        continue;
      }

      if (this.match(TokenKind.LParen)) {
        const args: Expression[] = [];
        if (!this.check(TokenKind.RParen)) {
          do { args.push(this.parseExpression()); } while (this.match(TokenKind.Comma));
        }
        this.consume(TokenKind.RParen, "Expected ')' after arguments");
        expr = { kind: ASTKind.CallExpr, callee: expr, args, line: expr.line, column: expr.column };
      } else if (this.match(TokenKind.LBracket)) {
        const index = this.parseExpression();
        this.consume(TokenKind.RBracket, "Expected ']' after index");
        expr = { kind: ASTKind.IndexExpr, base: expr, index, line: expr.line, column: expr.column };
      } else if (this.match(TokenKind.Dot)) {
        const member = this.consume(TokenKind.Identifier, 'Expected member name').text;
        expr = { kind: ASTKind.MemberExpr, object: expr, member, line: expr.line, column: expr.column };
      } else if (this.match(TokenKind.As)) {
        const targetType = this.parseType();
        expr = { kind: ASTKind.CastExpr, expr, targetType, line: expr.line, column: expr.column };
      } else break;
    }
    return expr;
  }

  private parsePrimary(): Expression {
    const token = this.peek();
    if (this.match(TokenKind.Number)) return { kind: ASTKind.NumberLiteral, value: parseFloat(this.previous().text), line: token.line, column: token.column };
    if (this.match(TokenKind.String)) return { kind: ASTKind.StringLiteral, value: this.previous().text, line: token.line, column: token.column };
    if (this.match(TokenKind.True)) return { kind: ASTKind.BoolLiteral, value: true, line: token.line, column: token.column };
    if (this.match(TokenKind.False)) return { kind: ASTKind.BoolLiteral, value: false, line: token.line, column: token.column };
    if (this.match(TokenKind.Null)) return { kind: ASTKind.NullLiteral, line: token.line, column: token.column };
    if (this.match(TokenKind.Undefined)) return { kind: ASTKind.UndefinedLiteral, line: token.line, column: token.column };
    if (this.match(TokenKind.This)) return { kind: ASTKind.ThisExpr, line: token.line, column: token.column };
    if (this.match(TokenKind.Super)) return { kind: ASTKind.SuperExpr, line: token.line, column: token.column };
    if (this.match(TokenKind.New)) {
      let cName = this.consume(TokenKind.Identifier, 'Expected class name after new').text;
      while (this.match(TokenKind.Dot)) {
          cName += "." + this.consume(TokenKind.Identifier, "Expected identifier after '.'").text;
      }
      
      let genericArgs: TypeAnnotation[] | undefined;
      if (this.match(TokenKind.Less)) {
          genericArgs = [];
          do {
              genericArgs.push(this.parseType());
          } while (this.match(TokenKind.Comma));
          this.consume(TokenKind.Greater, "Expected '>' after generic arguments");
      }

      this.consume(TokenKind.LParen, "Expected '('");
      const args: Expression[] = [];
      if (!this.check(TokenKind.RParen)) {
        do { args.push(this.parseExpression()); } while (this.match(TokenKind.Comma));
      }
      this.consume(TokenKind.RParen, "Expected ')'");
      return { kind: ASTKind.NewExpr, className: cName, genericArgs, args, line: token.line, column: token.column };
    }
    if (this.match(TokenKind.Addressof)) {
      this.consume(TokenKind.LParen, "Expected '('");
      const operand = this.parseExpression();
      this.consume(TokenKind.RParen, "Expected ')'");
      return { kind: ASTKind.AddressofExpr, operand, line: token.line, column: token.column };
    }
    if (this.match(TokenKind.Sizeof)) {
      this.consume(TokenKind.LParen, "Expected '(' after sizeof");
      const targetType = this.parseType();
      this.consume(TokenKind.RParen, "Expected ')' after type");
      return { kind: ASTKind.SizeofExpr, targetType, line: token.line, column: token.column };
    }
    if (this.match(TokenKind.Identifier)) return { kind: ASTKind.Identifier, name: this.previous().text, line: token.line, column: token.column };

    if (this.match(TokenKind.LBracket)) {
      const elements: Expression[] = [];
      if (!this.check(TokenKind.RBracket)) {
        do {
          if (this.match(TokenKind.Ellipsis)) {
            const expr = this.parseExpression();
            elements.push({ kind: ASTKind.SpreadElementExpr, expr, line: token.line, column: token.column } as any);
          } else {
            elements.push(this.parseExpression());
          }
        } while (this.match(TokenKind.Comma));
      }
      this.consume(TokenKind.RBracket, "Expected ']' after array elements");
      return { kind: ASTKind.ArrayLiteralExpr, elements, line: token.line, column: token.column };
    }

    if (this.match(TokenKind.LParen)) {
      const expr = this.parseExpression();
      this.consume(TokenKind.RParen, "Expected ')'");
      return expr;
    }
    throw this.error('Expected expression');
  }

  private parseType(): TypeAnnotation {
    let type = this.parsePrimaryType();
    if (this.check(TokenKind.Pipe)) {
      const types: TypeAnnotation[] = [type];
      while (this.match(TokenKind.Pipe)) {
        types.push(this.parsePrimaryType());
      }
      return { name: 'union', isPointer: false, isArray: false, isUnion: true, unionTypes: types };
    }
    return type;
  }

  private parsePrimaryType(): TypeAnnotation {
    if (this.match(TokenKind.Null) || this.match(TokenKind.Undefined)) {
      return { name: this.previous().text.toLowerCase(), isPointer: false, isArray: false };
    }

    if (this.match(TokenKind.LBracket)) {
      const tupleElements: TypeAnnotation[] = [];
      if (!this.check(TokenKind.RBracket)) {
        do {
          tupleElements.push(this.parseType());
        } while (this.match(TokenKind.Comma));
      }
      this.consume(TokenKind.RBracket, "Expected ']' after tuple types");
      return { name: 'tuple', isPointer: false, isArray: false, isTuple: true, tupleElements };
    }

    let name = this.consume(TokenKind.Identifier, 'Expected type name').text;
    let isPointer = false, isRawPointer = false, isArray = false, arraySize: number | undefined;
    let genericArgs: TypeAnnotation[] | undefined;

    if (this.match(TokenKind.Less)) {
        genericArgs = [];
        do {
            genericArgs.push(this.parseType());
        } while (this.match(TokenKind.Comma));
        this.consume(TokenKind.Greater, "Expected '>' after generic arguments");
    }

    if (name === 'ptr' && genericArgs && genericArgs.length === 1) {
      isPointer = true;
      name = genericArgs[0].name;
      genericArgs = undefined;
    } else if (name === 'rawPtr' && genericArgs && genericArgs.length === 1) {
      isPointer = true;
      isRawPointer = true;
      name = genericArgs[0].name;
      genericArgs = undefined;
    }
    
    if (this.match(TokenKind.LBracket)) {
      isArray = true;
      if (this.check(TokenKind.Number)) arraySize = parseInt(this.advance().text);
      this.consume(TokenKind.RBracket, "Expected ']' for array type");
    }
    return { name, isPointer, isRawPointer, isArray, arraySize, genericArgs };
  }

  private parseTypeParameters(): string[] {
    const params: string[] = [];
    do {
        params.push(this.consume(TokenKind.Identifier, 'Expected type parameter name').text);
    } while (this.match(TokenKind.Comma));
    this.consume(TokenKind.Greater, "Expected '>' after type parameters");
    return params;
  }

  private match(...kinds: TokenKind[]): boolean {
    for (const kind of kinds) {
      if (this.check(kind)) {
        this.advance();
        return true;
      }
    }
    return false;
  }
  private check(kind: TokenKind): boolean { return !this.isAtEnd() && this.peek().kind === kind; }
  private advance(): Token { if (!this.isAtEnd()) this.pos++; return this.previous(); }
  private isAtEnd(): boolean { return this.peek().kind === TokenKind.EOF; }
  private peek(): Token { return this.tokens[this.pos]; }
  private previous(): Token { return this.tokens[this.pos - 1]; }
  private consume(kind: TokenKind, message: string): Token {
    if (this.check(kind)) return this.advance();
    throw this.error(message);
  }
  private error(message: string): Error {
    const token = this.peek();
    this.reporter.error(token.line, token.column, message, token.length);
    return new Error(message);
  }
  private synchronize(): void {
    this.advance();
    while (!this.isAtEnd()) {
      if (this.previous().kind === TokenKind.Semicolon) return;
      switch (this.peek().kind) {
        case TokenKind.Function: case TokenKind.Let: case TokenKind.Const: case TokenKind.If:
        case TokenKind.While: case TokenKind.For: case TokenKind.Return: case TokenKind.Interface:
        case TokenKind.Import: case TokenKind.Export: case TokenKind.Type: case TokenKind.Enum:
        case TokenKind.Namespace: case TokenKind.Class:
          return;
      }
      this.advance();
    }
  }

  private parseImport(): ImportDecl {
    const token = this.previous();
    let namespace: string | undefined;
    let defaultImport: string | undefined;
    const specifiers: ImportSpecifier[] = [];

    if (this.match(TokenKind.Star)) {
      this.consume(TokenKind.As, "Expected 'as' after '*");
      namespace = this.consume(TokenKind.Identifier, 'Expected namespace name').text;
    } else if (this.match(TokenKind.LBrace)) {
      do {
        const imported = this.consume(TokenKind.Identifier, 'Expected import name').text;
        let local = imported;
        if (this.match(TokenKind.As)) local = this.consume(TokenKind.Identifier, 'Expected local name').text;
        specifiers.push({ imported, local });
      } while (this.match(TokenKind.Comma));
      this.consume(TokenKind.RBrace, "Expected '}'");
    } else if (this.check(TokenKind.Identifier)) {
      defaultImport = this.advance().text;
      if (this.match(TokenKind.Comma)) {
        this.consume(TokenKind.LBrace, "Expected '{'");
        do {
          const imported = this.consume(TokenKind.Identifier, 'Expected import name').text;
          let local = imported;
          if (this.match(TokenKind.As)) local = this.consume(TokenKind.Identifier, 'Expected local name').text;
          specifiers.push({ imported, local });
        } while (this.match(TokenKind.Comma));
        this.consume(TokenKind.RBrace, "Expected '}'");
      }
    }

    this.consume(TokenKind.From, "Expected 'from'");
    const source = this.consume(TokenKind.String, 'Expected module path').text;
    this.consume(TokenKind.Semicolon, "Expected ';'");
    return { kind: ASTKind.ImportDecl, specifiers, namespace, defaultImport, source, line: token.line, column: token.column };
  }

  private parseExport(): ExportDecl {
    const token = this.previous();
    const declaration = this.parseDeclaration();
    if (!declaration) throw this.error('Expected declaration after export');
    return { kind: ASTKind.ExportDecl, declaration, line: token.line, column: token.column };
  }
}
