#!/usr/bin/env python3
"""
TSN Bootstrap Compiler - Minimal Python Implementation
Goal: Compile compiler v2 files to LLVM IR
"""

import sys
import re
from dataclasses import dataclass
from typing import List, Optional, Dict

# ============================================================================
# LEXER - Token Scanner
# ============================================================================

@dataclass
class Token:
    type: str
    value: str
    line: int
    col: int

class Lexer:
    def __init__(self, source: str):
        self.source = source
        self.pos = 0
        self.line = 1
        self.col = 1
        self.tokens = []
        
    def tokenize(self) -> List[Token]:
        while self.pos < len(self.source):
            self.scan_token()
        self.tokens.append(Token('EOF', '', self.line, self.col))
        return self.tokens
    
    def scan_token(self):
        ch = self.current()
        
        # Whitespace
        if ch in ' \t\r':
            self.advance()
            return
        
        # Newline
        if ch == '\n':
            self.line += 1
            self.col = 1
            self.advance()
            return
        
        # Comments
        if ch == '/' and self.peek() == '/':
            while self.pos < len(self.source) and self.current() != '\n':
                self.advance()
            return
        
        # Identifier/Keyword
        if ch.isalpha() or ch == '_':
            self.scan_identifier()
            return
        
        # Number
        if ch.isdigit():
            self.scan_number()
            return
        
        # String
        if ch == '"':
            self.scan_string()
            return
        
        # Two-char operators
        if ch == '=' and self.peek() == '=':
            self.add_token('EQ', '==')
            self.advance()
            self.advance()
            return
        
        if ch == '!' and self.peek() == '=':
            self.add_token('NE', '!=')
            self.advance()
            self.advance()
            return
        
        if ch == '<' and self.peek() == '=':
            self.add_token('LE', '<=')
            self.advance()
            self.advance()
            return
        
        if ch == '>' and self.peek() == '=':
            self.add_token('GE', '>=')
            self.advance()
            self.advance()
            return
        
        # Single-char tokens
        single_chars = {
            '(': 'LPAREN', ')': 'RPAREN',
            '{': 'LBRACE', '}': 'RBRACE',
            '[': 'LBRACK', ']': 'RBRACK',
            ',': 'COMMA', ';': 'SEMICOLON',
            ':': 'COLON', '.': 'DOT',
            '+': 'PLUS', '-': 'MINUS',
            '*': 'STAR', '/': 'SLASH',
            '=': 'ASSIGN', '<': 'LT', '>': 'GT'
        }
        
        if ch in single_chars:
            self.add_token(single_chars[ch], ch)
            self.advance()
            return
        
        # Unknown - skip
        self.advance()
    
    def scan_identifier(self):
        start = self.pos
        while self.pos < len(self.source) and (self.current().isalnum() or self.current() == '_'):
            self.advance()
        
        value = self.source[start:self.pos]
        
        keywords = {
            'import': 'IMPORT', 'export': 'EXPORT', 'from': 'FROM',
            'class': 'CLASS', 'constructor': 'CONSTRUCTOR',
            'function': 'FUNCTION', 'return': 'RETURN',
            'let': 'LET', 'const': 'CONST',
            'if': 'IF', 'else': 'ELSE', 'while': 'WHILE',
            'true': 'TRUE', 'false': 'FALSE', 'null': 'NULL',
            'new': 'NEW', 'this': 'THIS',
            'public': 'PUBLIC', 'private': 'PRIVATE'
        }
        
        token_type = keywords.get(value, 'IDENTIFIER')
        self.add_token(token_type, value)
    
    def scan_number(self):
        start = self.pos
        while self.pos < len(self.source) and self.current().isdigit():
            self.advance()
        self.add_token('NUMBER', self.source[start:self.pos])
    
    def scan_string(self):
        self.advance()  # Skip opening "
        start = self.pos
        
        while self.pos < len(self.source) and self.current() != '"':
            if self.current() == '\\':
                self.advance()  # Skip escape char
            self.advance()
        
        value = self.source[start:self.pos]
        self.advance()  # Skip closing "
        self.add_token('STRING', value)
    
    def add_token(self, type: str, value: str):
        self.tokens.append(Token(type, value, self.line, self.col))
    
    def current(self) -> str:
        if self.pos >= len(self.source):
            return '\0'
        return self.source[self.pos]
    
    def peek(self) -> str:
        if self.pos + 1 >= len(self.source):
            return '\0'
        return self.source[self.pos + 1]
    
    def advance(self):
        self.pos += 1
        self.col += 1

# ============================================================================
# AST - Abstract Syntax Tree
# ============================================================================

@dataclass
class ASTNode:
    pass

@dataclass
class Program(ASTNode):
    imports: List['ImportDecl']
    classes: List['ClassDecl']
    functions: List['FunctionDecl']

@dataclass
class ImportDecl(ASTNode):
    names: List[str]
    module: str

@dataclass
class ClassDecl(ASTNode):
    name: str
    is_export: bool
    fields: List['FieldDecl']
    methods: List['FunctionDecl']

@dataclass
class FieldDecl(ASTNode):
    name: str
    type_name: str

@dataclass
class FunctionDecl(ASTNode):
    name: str
    params: List['Parameter']
    return_type: str
    body: 'BlockStmt'
    is_export: bool = False
    is_constructor: bool = False

@dataclass
class Parameter(ASTNode):
    name: str
    type_name: str

@dataclass
class BlockStmt(ASTNode):
    statements: List['Stmt']

@dataclass
class ReturnStmt(ASTNode):
    value: Optional['Expr']

@dataclass
class VarDeclStmt(ASTNode):
    name: str
    type_name: str
    init: 'Expr'

@dataclass
class ExprStmt(ASTNode):
    expr: 'Expr'

@dataclass
class IfStmt(ASTNode):
    condition: 'Expr'
    then_branch: 'Stmt'
    else_branch: Optional['Stmt']

@dataclass
class WhileStmt(ASTNode):
    condition: 'Expr'
    body: 'Stmt'

@dataclass
class AssignExpr(ASTNode):
    target: 'Expr'
    value: 'Expr'

@dataclass
class BinaryExpr(ASTNode):
    left: 'Expr'
    op: str
    right: 'Expr'

@dataclass
class CallExpr(ASTNode):
    callee: 'Expr'
    args: List['Expr']

@dataclass
class MemberExpr(ASTNode):
    object: 'Expr'
    member: str

@dataclass
class NewExpr(ASTNode):
    class_name: str
    args: List['Expr']

@dataclass
class IdentifierExpr(ASTNode):
    name: str

@dataclass
class NumberLiteral(ASTNode):
    value: int

@dataclass
class StringLiteral(ASTNode):
    value: str

@dataclass
class ThisExpr(ASTNode):
    pass

# Type aliases
Stmt = ASTNode
Expr = ASTNode

# ============================================================================
# PARSER - Recursive Descent Parser
# ============================================================================

class Parser:
    def __init__(self, tokens: List[Token]):
        self.tokens = tokens
        self.current = 0
    
    def parse(self) -> Program:
        imports = []
        classes = []
        functions = []
        
        while not self.is_at_end():
            if self.check('IMPORT'):
                imports.append(self.parse_import())
            elif self.check('EXPORT') and self.peek_ahead(1).type == 'CLASS':
                classes.append(self.parse_class(True))
            elif self.check('CLASS'):
                classes.append(self.parse_class(False))
            elif self.check('EXPORT') and self.peek_ahead(1).type == 'FUNCTION':
                functions.append(self.parse_function(True))
            elif self.check('FUNCTION'):
                functions.append(self.parse_function(False))
            else:
                self.advance()
        
        return Program(imports, classes, functions)
    
    def parse_import(self) -> ImportDecl:
        self.consume('IMPORT')
        self.consume('LBRACE')
        
        names = []
        names.append(self.consume('IDENTIFIER').value)
        
        while self.match('COMMA'):
            names.append(self.consume('IDENTIFIER').value)
        
        self.consume('RBRACE')
        self.consume('FROM')
        
        module = self.consume('STRING').value
        self.consume('SEMICOLON')
        
        return ImportDecl(names, module)
    
    def parse_class(self, is_export: bool) -> ClassDecl:
        if is_export:
            self.consume('EXPORT')
        self.consume('CLASS')
        
        name = self.consume('IDENTIFIER').value
        
        self.consume('LBRACE')
        
        fields = []
        methods = []
        
        while not self.check('RBRACE') and not self.is_at_end():
            # Constructor
            if self.check('CONSTRUCTOR'):
                method = self.parse_constructor()
                methods.append(method)
            # Method
            elif self.peek_ahead(1).type == 'LPAREN':
                method = self.parse_method()
                methods.append(method)
            # Field
            else:
                field = self.parse_field()
                fields.append(field)
        
        self.consume('RBRACE')
        
        return ClassDecl(name, is_export, fields, methods)
    
    def parse_field(self) -> FieldDecl:
        name = self.consume('IDENTIFIER').value
        self.consume('COLON')
        type_name = self.consume('IDENTIFIER').value
        self.consume('SEMICOLON')
        
        return FieldDecl(name, type_name)
    
    def parse_constructor(self) -> FunctionDecl:
        self.consume('CONSTRUCTOR')
        
        self.consume('LPAREN')
        params = []
        if not self.check('RPAREN'):
            params.append(self.parse_parameter())
            while self.match('COMMA'):
                params.append(self.parse_parameter())
        self.consume('RPAREN')
        
        body = self.parse_block()
        
        return FunctionDecl('constructor', params, 'void', body, False, True)
    
    def parse_method(self) -> FunctionDecl:
        name = self.consume('IDENTIFIER').value
        
        self.consume('LPAREN')
        params = []
        if not self.check('RPAREN'):
            params.append(self.parse_parameter())
            while self.match('COMMA'):
                params.append(self.parse_parameter())
        self.consume('RPAREN')
        
        self.consume('COLON')
        return_type = self.consume('IDENTIFIER').value
        
        body = self.parse_block()
        
        return FunctionDecl(name, params, return_type, body)
    
    def parse_function(self, is_export: bool) -> FunctionDecl:
        if is_export:
            self.consume('EXPORT')
        self.consume('FUNCTION')
        
        name = self.consume('IDENTIFIER').value
        
        self.consume('LPAREN')
        params = []
        if not self.check('RPAREN'):
            params.append(self.parse_parameter())
            while self.match('COMMA'):
                params.append(self.parse_parameter())
        self.consume('RPAREN')
        
        self.consume('COLON')
        return_type = self.consume('IDENTIFIER').value
        
        body = self.parse_block()
        
        return FunctionDecl(name, params, return_type, body, is_export)
    
    def parse_parameter(self) -> Parameter:
        name = self.consume('IDENTIFIER').value
        self.consume('COLON')
        type_name = self.consume('IDENTIFIER').value
        return Parameter(name, type_name)
    
    def parse_block(self) -> BlockStmt:
        self.consume('LBRACE')
        
        stmts = []
        while not self.check('RBRACE') and not self.is_at_end():
            stmts.append(self.parse_statement())
        
        self.consume('RBRACE')
        
        return BlockStmt(stmts)
    
    def parse_statement(self) -> Stmt:
        if self.check('RETURN'):
            return self.parse_return()
        if self.check('LET'):
            return self.parse_var_decl()
        if self.check('IF'):
            return self.parse_if()
        if self.check('WHILE'):
            return self.parse_while()
        if self.check('LBRACE'):
            return self.parse_block()
        
        # Expression statement
        expr = self.parse_expression()
        self.consume('SEMICOLON')
        return ExprStmt(expr)
    
    def parse_return(self) -> ReturnStmt:
        self.consume('RETURN')
        
        value = None
        if not self.check('SEMICOLON'):
            value = self.parse_expression()
        
        self.consume('SEMICOLON')
        return ReturnStmt(value)
    
    def parse_var_decl(self) -> VarDeclStmt:
        self.consume('LET')
        name = self.consume('IDENTIFIER').value
        self.consume('COLON')
        type_name = self.consume('IDENTIFIER').value
        self.consume('ASSIGN')
        init = self.parse_expression()
        self.consume('SEMICOLON')
        
        return VarDeclStmt(name, type_name, init)
    
    def parse_if(self) -> IfStmt:
        self.consume('IF')
        self.consume('LPAREN')
        condition = self.parse_expression()
        self.consume('RPAREN')
        
        then_branch = self.parse_statement()
        
        else_branch = None
        if self.match('ELSE'):
            else_branch = self.parse_statement()
        
        return IfStmt(condition, then_branch, else_branch)
    
    def parse_while(self) -> WhileStmt:
        self.consume('WHILE')
        self.consume('LPAREN')
        condition = self.parse_expression()
        self.consume('RPAREN')
        
        body = self.parse_statement()
        
        return WhileStmt(condition, body)
    
    def parse_expression(self) -> Expr:
        return self.parse_assignment()
    
    def parse_assignment(self) -> Expr:
        expr = self.parse_logical_or()
        
        if self.match('ASSIGN'):
            value = self.parse_assignment()
            return AssignExpr(expr, value)
        
        return expr
    
    def parse_logical_or(self) -> Expr:
        return self.parse_comparison()
    
    def parse_comparison(self) -> Expr:
        expr = self.parse_addition()
        
        while self.check('LT') or self.check('GT') or self.check('LE') or self.check('GE') or self.check('EQ') or self.check('NE'):
            op = self.advance().value
            right = self.parse_addition()
            expr = BinaryExpr(expr, op, right)
        
        return expr
    
    def parse_addition(self) -> Expr:
        expr = self.parse_multiplication()
        
        while self.check('PLUS') or self.check('MINUS'):
            op = self.advance().value
            right = self.parse_multiplication()
            expr = BinaryExpr(expr, op, right)
        
        return expr
    
    def parse_multiplication(self) -> Expr:
        expr = self.parse_postfix()
        
        while self.check('STAR') or self.check('SLASH'):
            op = self.advance().value
            right = self.parse_postfix()
            expr = BinaryExpr(expr, op, right)
        
        return expr
    
    def parse_postfix(self) -> Expr:
        expr = self.parse_primary()
        
        while True:
            if self.match('DOT'):
                member = self.consume('IDENTIFIER').value
                
                # Method call
                if self.match('LPAREN'):
                    args = []
                    if not self.check('RPAREN'):
                        args.append(self.parse_expression())
                        while self.match('COMMA'):
                            args.append(self.parse_expression())
                    self.consume('RPAREN')
                    
                    expr = CallExpr(MemberExpr(expr, member), args)
                else:
                    expr = MemberExpr(expr, member)
            
            elif self.match('LPAREN'):
                args = []
                if not self.check('RPAREN'):
                    args.append(self.parse_expression())
                    while self.match('COMMA'):
                        args.append(self.parse_expression())
                self.consume('RPAREN')
                
                expr = CallExpr(expr, args)
            else:
                break
        
        return expr
    
    def parse_primary(self) -> Expr:
        if self.check('NUMBER'):
            return NumberLiteral(int(self.advance().value))
        
        if self.check('STRING'):
            return StringLiteral(self.advance().value)
        
        if self.check('TRUE'):
            self.advance()
            return NumberLiteral(1)
        
        if self.check('FALSE'):
            self.advance()
            return NumberLiteral(0)
        
        if self.check('THIS'):
            self.advance()
            return ThisExpr()
        
        if self.check('NEW'):
            self.advance()
            class_name = self.consume('IDENTIFIER').value
            self.consume('LPAREN')
            args = []
            if not self.check('RPAREN'):
                args.append(self.parse_expression())
                while self.match('COMMA'):
                    args.append(self.parse_expression())
            self.consume('RPAREN')
            
            return NewExpr(class_name, args)
        
        if self.check('IDENTIFIER'):
            return IdentifierExpr(self.advance().value)
        
        if self.match('LPAREN'):
            expr = self.parse_expression()
            self.consume('RPAREN')
            return expr
        
        raise Exception(f"Unexpected token: {self.peek()}")
    
    # Helper methods
    def match(self, type: str) -> bool:
        if self.check(type):
            self.advance()
            return True
        return False
    
    def check(self, type: str) -> bool:
        if self.is_at_end():
            return False
        return self.peek().type == type
    
    def advance(self) -> Token:
        if not self.is_at_end():
            self.current += 1
        return self.previous()
    
    def is_at_end(self) -> bool:
        return self.peek().type == 'EOF'
    
    def peek(self) -> Token:
        return self.tokens[self.current]
    
    def peek_ahead(self, n: int) -> Token:
        if self.current + n >= len(self.tokens):
            return self.tokens[-1]
        return self.tokens[self.current + n]
    
    def previous(self) -> Token:
        return self.tokens[self.current - 1]
    
    def consume(self, type: str) -> Token:
        if self.check(type):
            return self.advance()
        raise Exception(f"Expected {type}, got {self.peek().type}")

# ============================================================================
# CODEGEN - LLVM IR Generator (NEXT PART)
# ============================================================================

def main():
    if len(sys.argv) < 3:
        print("Usage: python compiler.py input.tsn -o output.ll")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[3] if len(sys.argv) > 3 else "output.ll"
    
    # Read source
    with open(input_file, 'r', encoding='utf-8') as f:
        source = f.read()
    
    # Lexer
    print(f"Lexing {input_file}...")
    lexer = Lexer(source)
    tokens = lexer.tokenize()
    print(f"  Tokens: {len(tokens)}")
    
    # Parser
    print(f"Parsing...")
    parser = Parser(tokens)
    program = parser.parse()
    print(f"  Classes: {len(program.classes)}")
    print(f"  Functions: {len(program.functions)}")
    
    # Codegen (TODO: next step)
    print(f"Codegen...")
    print(f"  Output: {output_file}")
    
    # For now, just write a placeholder
    with open(output_file, 'w') as f:
        f.write("; Placeholder LLVM IR\n")
        f.write("; TODO: Implement codegen\n")
    
    print("Done!")

if __name__ == '__main__':
    main()
