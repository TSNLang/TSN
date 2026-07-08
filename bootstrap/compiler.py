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
        
        if ch == '|' and self.peek() == '|':
            self.add_token('OR', '||')
            self.advance()
            self.advance()
            return
        
        if ch == '&' and self.peek() == '&':
            self.add_token('AND', '&&')
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
            # Skip access modifiers if present
            if self.check('PUBLIC') or self.check('PRIVATE'):
                self.advance()
            
            # Constructor
            if self.check('CONSTRUCTOR'):
                method = self.parse_constructor()
                methods.append(method)
            else:
                # Need to look ahead to distinguish field from method
                # Method: name ( ...
                # Field: name : ...
                name_token = self.peek()
                next_token = self.peek_ahead(1)
                
                if next_token.type == 'LPAREN':
                    # It's a method
                    method = self.parse_method()
                    methods.append(method)
                else:
                    # It's a field
                    field = self.parse_field()
                    fields.append(field)
        
        self.consume('RBRACE')
        
        return ClassDecl(name, is_export, fields, methods)
    
    def parse_field(self) -> FieldDecl:
        name = self.consume('IDENTIFIER').value
        self.consume('COLON')
        type_name = self.parse_type()
        self.consume('SEMICOLON')
        
        return FieldDecl(name, type_name)
    
    def parse_type(self) -> str:
        """Parse type including generics: i32, string, Array<T>"""
        name = self.consume('IDENTIFIER').value
        
        # Handle generic types
        if self.match('LT'):
            type_param = self.parse_type()  # Recursive for nested generics
            self.consume('GT')
            return f"{name}<{type_param}>"
        
        return name
    
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
        return_type = self.parse_type()
        
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
        return_type = self.parse_type()
        
        body = self.parse_block()
        
        return FunctionDecl(name, params, return_type, body, is_export)
    
    def parse_parameter(self) -> Parameter:
        name = self.consume('IDENTIFIER').value
        self.consume('COLON')
        type_name = self.parse_type()
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
        
        # Type annotation is optional (type inference)
        type_name = "auto"
        if self.match('COLON'):
            type_name = self.parse_type()
        
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
        expr = self.parse_logical_and()
        
        while self.check('OR'):
            op = self.advance().value
            right = self.parse_logical_and()
            expr = BinaryExpr(expr, op, right)
        
        return expr
    
    def parse_logical_and(self) -> Expr:
        expr = self.parse_comparison()
        
        while self.check('AND'):
            op = self.advance().value
            right = self.parse_comparison()
            expr = BinaryExpr(expr, op, right)
        
        return expr
    
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
            
            # Handle generic type parameters (e.g., Array<T>)
            if self.match('LT'):
                type_param = self.parse_type()
                self.consume('GT')
                class_name = f"{class_name}<{type_param}>"
            
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
# CODEGEN - LLVM IR Generator
# ============================================================================

class Codegen:
    # Map: imported name -> (C function name, return_type, [param_types])
    STDLIB_FUNCS = {
        'log':         ('_T_log_P_ptr',                 'void', ['ptr']),
        'readText':    ('_T_readText_P_ptr',             'ptr',  ['ptr']),
        'writeText':   ('_T_writeText_P_ptr_ptr',        'void', ['ptr', 'ptr']),
        'Array_new':   ('Array_new',                    'ptr',  []),
        'Array_push':  ('Array_push_impl',               'void', ['ptr', 'ptr']),
        'Array_get':   ('Array_get_impl',                'ptr',  ['ptr', 'i32']),
        'Array_length':('Array_length_impl',             'i32',  ['ptr']),
    }

    def __init__(self, program: Program):
        self.program = program
        self.output = []
        self.string_literals = []
        self.register_counter = 0
        self.label_counter = 0
        self.imports: Dict[str, str] = {}
        self.extern_classes = []
        # Build class field type map: {ClassName: {fieldName: (llvm_type, gep_idx)}}
        self.class_fields: Dict[str, Dict[str, tuple]] = {}
        self.class_methods: Dict[str, Dict[str, str]] = {}
        self._collect_imports()
        self._collect_class_fields()
        
    def _collect_imports(self):
        """Collect imported names → C function names, and external class declarations"""
        self.extern_classes = []  # class names imported from other modules
        for imp in self.program.imports:
            for name in imp.names:
                if name in self.STDLIB_FUNCS:
                    self.imports[name] = self.STDLIB_FUNCS[name][0]
                elif not imp.module.startswith('std:'):
                    # Non-stdlib import = external class/function from another .tsn module
                    self.extern_classes.append(name)
    
    def _collect_class_fields(self):
        """Build map of class field types and GEP indices for emit_member"""
        # Also build method return type map
        self.class_methods: Dict[str, Dict[str, str]] = {}  # {ClassName: {methodName: ret_type}}
        
        # Process classes defined in current module first
        for cls in self.program.classes:
            if cls.name not in self.class_fields:
                self.class_fields[cls.name] = {}
            if cls.name not in self.class_methods:
                self.class_methods[cls.name] = {}
            for i, field in enumerate(cls.fields):
                llvm_type = self.get_llvm_type(field.type_name)
                gep_idx = i + 2
                self.class_fields[cls.name][field.name] = (llvm_type, gep_idx)
            for method in cls.methods:
                ret = self.get_llvm_type(method.return_type)
                self.class_methods[cls.name][method.name] = ret
        
        # Then add hardcoded external classes (only if not already defined)
        # Token: { type: string, lexeme: string, line: i32, column: i32 }
        if 'Token' not in self.class_fields:
            self.class_fields['Token'] = {
                'type': ('ptr', 2),
                'lexeme': ('ptr', 3),
                'line': ('i32', 4),
                'column': ('i32', 5)
            }
        # Parser: { tokens: Array<Token>, current: i32 }
        if 'Parser' not in self.class_fields:
            self.class_fields['Parser'] = {
                'tokens': ('ptr', 2),
                'current': ('i32', 3)
            }
        # Program: { functions: Array<FunctionDecl> }
        if 'Program' not in self.class_fields:
            self.class_fields['Program'] = {
                'functions': ('ptr', 2)
            }
        # FunctionDecl: { name: string, params: Array, returnType: string, body: BlockStmt }
        if 'FunctionDecl' not in self.class_fields:
            self.class_fields['FunctionDecl'] = {
                'name': ('ptr', 2),
                'params': ('ptr', 3),
                'returnType': ('ptr', 4),
                'body': ('ptr', 5)
            }
        # Parameter: { name: string, typeAnnotation: string }
        if 'Parameter' not in self.class_fields:
            self.class_fields['Parameter'] = {
                'name': ('ptr', 2),
                'typeAnnotation': ('ptr', 3)
            }
        # BlockStmt: { statements: Array<Stmt> }
        if 'BlockStmt' not in self.class_fields:
            self.class_fields['BlockStmt'] = {
                'statements': ('ptr', 2)
            }
        # Stmt: { kind: string }
        self.class_fields['Stmt'] = {
            'kind': ('ptr', 2)
        }
        # ReturnStmt: { kind: string, value: Expr }
        self.class_fields['ReturnStmt'] = {
            'kind': ('ptr', 2),
            'value': ('ptr', 3)
        }
        # ExprStmt: { kind: string, expr: Expr }
        self.class_fields['ExprStmt'] = {
            'kind': ('ptr', 2),
            'expr': ('ptr', 3)
        }
        # VarDeclStmt: { kind: string, name: string, typeAnnotation: string, init: Expr }
        self.class_fields['VarDeclStmt'] = {
            'kind': ('ptr', 2),
            'name': ('ptr', 3),
            'typeAnnotation': ('ptr', 4),
            'init': ('ptr', 5)
        }
        # Expr: { kind: string, numValue: string, name: string, left: Expr, operator: string, right: Expr, callee: string, args: Array }
        self.class_fields['Expr'] = {
            'kind': ('ptr', 2),
            'numValue': ('ptr', 3),
            'name': ('ptr', 4),
            'left': ('ptr', 5),
            'operator': ('ptr', 6),
            'right': ('ptr', 7),
            'callee': ('ptr', 8),
            'args': ('ptr', 9)
        }
        # NumberLiteral: { kind: string, value: i32 }
        self.class_fields['NumberLiteral'] = {
            'kind': ('ptr', 2),
            'value': ('i32', 3)
        }
        # Identifier: { kind: string, name: string }
        self.class_fields['Identifier'] = {
            'kind': ('ptr', 2),
            'name': ('ptr', 3)
        }
        # BinaryExpr: { kind: string, left: Expr, operator: string, right: Expr }
        self.class_fields['BinaryExpr'] = {
            'kind': ('ptr', 2),
            'left': ('ptr', 3),
            'operator': ('ptr', 4),
            'right': ('ptr', 5)
        }
        # CallExpr: { kind: string, callee: string, args: Array<Expr> }
        self.class_fields['CallExpr'] = {
            'kind': ('ptr', 2),
            'callee': ('ptr', 3),
            'args': ('ptr', 4)
        }
        
        for cls in self.program.classes:
            self.class_fields[cls.name] = {}
            self.class_methods[cls.name] = {}
            for i, field in enumerate(cls.fields):
                llvm_type = self.get_llvm_type(field.type_name)
                gep_idx = i + 2
                self.class_fields[cls.name][field.name] = (llvm_type, gep_idx)
            for method in cls.methods:
                ret = self.get_llvm_type(method.return_type)
                self.class_methods[cls.name][method.name] = ret
    
    def _get_method_return_type(self, cls_name: str, method_name: str) -> str:
        """Return LLVM return type of a class method, default ptr"""
        if cls_name in self.class_methods:
            return self.class_methods[cls_name].get(method_name, 'ptr')
        # Common known void methods
        VOID_METHODS = {'scanToken', 'addToken', 'advance', 'push', 'scanIdentifier',
                        'scanNumber', 'scanString'}
        if method_name in VOID_METHODS:
            return 'void'
        return 'ptr'
    
    def generate(self) -> str:
        """Generate LLVM IR from AST"""
        self.emit_header()
        self.emit_class_structs()
        self.emit_functions()
        self.emit_string_literals()
        
        return '\n'.join(self.output)
    
    def emit_header(self):
        """Emit standard runtime declarations"""
        self.output.append("; Generated by TSN Bootstrap Compiler")
        self.output.append("")
        
        # Runtime declarations - use C-compatible names (no dots)
        runtime_decls = [
            "declare ptr @class_alloc(i32)",
            "declare void @class_incref(ptr)",
            "declare void @class_decref(ptr, ptr)",
            "declare ptr @Array_new()",
            "declare ptr @Array_get_impl(ptr, i32)",
            "declare void @Array_push_impl(ptr, ptr)",
            "declare i32 @Array_length_impl(ptr)",
            "declare void @tsn_incref(ptr)",
            "declare void @tsn_decref(ptr)",
            "declare ptr @_T_string_concat_P_ptr_ptr(ptr, ptr)",
            "declare i32 @_T_string_equals_P_ptr_ptr(ptr, ptr)",
            "declare void @_T_log_P_ptr(ptr)",
            "declare ptr @_T_readText_P_ptr(ptr)",
            "declare void @_T_writeText_P_ptr_ptr(ptr, ptr)",
            "declare void @print_i32(i32)",
            "declare i32 @charCodeAt(ptr, i32)",
            "declare ptr @slice(ptr, i32, i32)",
            "declare i32 @tsn_string_length(ptr)",
            ""
        ]
        
        self.output.extend(runtime_decls)
        
        # Declare external class constructors (from imports)
        for cls_name in self.extern_classes:
            self.output.append(f"declare ptr @{cls_name}_new(...)")
            # Declare common methods as variadic (avoids type errors)
            common_methods = ['tokenize', 'parse', 'scanToken', 'addToken',
                              'isAlpha', 'isDigit', 'isAlphaNumeric', 'current',
                              'advance', 'peek', 'parseFunction', 'parseClass',
                              'parseStatement', 'parseExpression', 'parseBlock',
                              'generate', 'emit', 'emitFunction', 'emitStatement']
            for m in common_methods:
                self.output.append(f"declare ptr @{cls_name}_{m}(...)")
        if self.extern_classes:
            self.output.append("")
    
    def emit_class_structs(self):
        """Emit struct definitions for classes"""
        # Emit classes from current module only
        for cls in self.program.classes:
            # struct { i32 refcount, ptr vtable, fields... }
            fields = ["i32", "ptr"]  # refcount, vtable
            
            for field in cls.fields:
                field_type = self.get_llvm_type(field.type_name)
                fields.append(field_type)
            
            struct_def = f"%{cls.name} = type {{ {', '.join(fields)} }}"
            self.output.append(struct_def)
        
        self.output.append("")
    
    def emit_functions(self):
        """Emit all function definitions"""
        # Emit class methods
        for cls in self.program.classes:
            self.emit_class_methods(cls)
        # Emit top-level functions
        for func in self.program.functions:
            self.emit_function(func, None)
    
    def emit_class_methods(self, cls: 'ClassDecl'):
        """Emit constructor and methods for a class"""
        for method in cls.methods:
            self.emit_function(method, cls)
    
    def emit_function(self, func: 'FunctionDecl', cls):
        """Emit a single function (cls=None for top-level)"""
        self.register_counter = 0
        self.label_counter = 0
        self.local_vars = {}  # Track local variables
        self.var_class_types = {}  # var_name -> class_name
        self.current_class = cls  # for 'this' reference
        self._current_return_type = self.get_llvm_type(func.return_type)
        
        # Function signature
        return_type = self.get_llvm_type(func.return_type)
        
        if cls is not None:
            cls_name = cls.name
            if func.is_constructor:
                # Constructor → ClassName_new() → alloc + init
                func_name = f"{cls_name}_new"
                # Build param list: just constructor params
                params_str = self.get_params_string(func.params)
                # Constructor returns ptr
                return_type = "ptr"
                
                self.output.append(f"define ptr @{func_name}({params_str}) {{")
                self.output.append("entry:")
                
                # Allocate the object: size = 8 + 8*num_fields (rough estimate)
                struct_size = 16 + 8 * len(cls.fields)
                obj_reg = self.new_register()
                self.output.append(f"  {obj_reg} = call ptr @class_alloc(i32 {struct_size})")
                # Store obj ptr in an alloca so 'this' loads work consistently
                this_alloca = self.new_register()
                self.output.append(f"  {this_alloca} = alloca ptr, align 8")
                self.output.append(f"  store ptr {obj_reg}, ptr {this_alloca}, align 8")
                self.local_vars['this'] = (this_alloca, 'ptr')
                
                # Store constructor params in local vars
                for param in func.params:
                    param_type = self.get_llvm_type(param.type_name)
                    alloca_reg = self.new_register()
                    self.output.append(f"  {alloca_reg} = alloca {param_type}, align 8")
                    self.output.append(f"  store {param_type} %{param.name}, ptr {alloca_reg}, align 8")
                    self.local_vars[param.name] = (alloca_reg, param_type)
                
                # Emit constructor body
                self.emit_block_stmt(func.body)
                
                # Return the object
                if not self.output[-1].strip().startswith('ret'):
                    self.output.append(f"  ret ptr {obj_reg}")
                
                self.output.append("}")
                self.output.append("")
                return
            else:
                # Regular method → ClassName_methodName(ptr %self, ...)
                func_name = f"{cls_name}_{func.name}"
                # Build params: self first
                self_param = "ptr %self"
                rest = self.get_params_string(func.params)
                params_str = self_param + (f", {rest}" if rest else "")
                # Track 'this'
        else:
            func_name = self.mangle_function_name(func.name, func.is_export)
            params_str = self.get_params_string(func.params)
        
        self.output.append(f"define {return_type} @{func_name}({params_str}) {{")
        self.output.append("entry:")
        
        # For methods, track 'this' = %self
        if cls is not None and not func.is_constructor:
            self_alloca = self.new_register()
            self.output.append(f"  {self_alloca} = alloca ptr, align 8")
            self.output.append(f"  store ptr %self, ptr {self_alloca}, align 8")
            self.local_vars['this'] = (self_alloca, 'ptr')
        
        # Allocate space for parameters
        for param in func.params:
            param_type = self.get_llvm_type(param.type_name)
            alloca_reg = self.new_register()
            self.output.append(f"  {alloca_reg} = alloca {param_type}, align 8")
            self.output.append(f"  store {param_type} %{param.name}, ptr {alloca_reg}, align 8")
            self.local_vars[param.name] = (alloca_reg, param_type)
        
        # Emit function body
        self.emit_block_stmt(func.body)
        
        # Add default return if needed
        last = self.output[-1].strip()
        if not last.startswith('ret') and not last.startswith('br label'):
            if func.return_type == "void":
                self.output.append("  ret void")
            elif func.return_type == "i32":
                self.output.append("  ret i32 0")
            else:
                self.output.append("  ret ptr null")
        
        self.output.append("}")
        self.output.append("")
    
    def emit_block_stmt(self, block: BlockStmt):
        """Emit statements in a block"""
        for stmt in block.statements:
            self.emit_statement(stmt)
    
    def emit_statement(self, stmt: ASTNode):
        """Emit a single statement"""
        if isinstance(stmt, ReturnStmt):
            self.emit_return(stmt)
        elif isinstance(stmt, VarDeclStmt):
            self.emit_var_decl(stmt)
        elif isinstance(stmt, ExprStmt):
            self.emit_expr_stmt(stmt)
        elif isinstance(stmt, IfStmt):
            self.emit_if(stmt)
        elif isinstance(stmt, WhileStmt):
            self.emit_while(stmt)
        elif isinstance(stmt, BlockStmt):
            self.emit_block_stmt(stmt)
    
    def emit_return(self, stmt: ReturnStmt):
        """Emit return statement"""
        if stmt.value is None:
            self.output.append("  ret void")
        else:
            value_reg, value_type = self.emit_expression(stmt.value)
            # Get expected return type from current function context
            expected = getattr(self, '_current_return_type', value_type)
            
            if expected == 'void':
                self.output.append("  ret void")
            elif expected == 'i32' and value_type == 'ptr':
                # Cast ptr to i32 via ptrtoint
                cast_reg = self.new_register()
                self.output.append(f"  {cast_reg} = ptrtoint ptr {value_reg} to i64")
                trunc_reg = self.new_register()
                self.output.append(f"  {trunc_reg} = trunc i64 {cast_reg} to i32")
                self.output.append(f"  ret i32 {trunc_reg}")
            elif expected == 'ptr' and value_type == 'i32':
                # Cast i32 to ptr
                cast_reg = self.new_register()
                self.output.append(f"  {cast_reg} = inttoptr i32 {value_reg} to ptr")
                self.output.append(f"  ret ptr {cast_reg}")
            else:
                self.output.append(f"  ret {value_type} {value_reg}")
    
    def emit_var_decl(self, stmt: VarDeclStmt):
        """Emit variable declaration"""
        # Evaluate initial value first to get its type
        init_reg, init_type = self.emit_expression(stmt.init)
        
        # Track class type if init is 'new ClassName(...)'
        if isinstance(stmt.init, NewExpr):
            class_name = stmt.init.class_name.split('<')[0]
            if not hasattr(self, 'var_class_types'):
                self.var_class_types = {}
            self.var_class_types[stmt.name] = class_name
        
        # Use explicit type or infer from init
        if stmt.type_name == 'auto' or stmt.type_name == '':
            var_type = init_type
        else:
            var_type = self.get_llvm_type(stmt.type_name)
        
        # Allocate space
        alloca_reg = self.new_register()
        self.output.append(f"  {alloca_reg} = alloca {var_type}, align 8")
        
        # Store initial value (cast if needed)
        if init_type != var_type and init_type == 'i32' and var_type == 'ptr':
            ext_reg = self.new_register()
            self.output.append(f"  {ext_reg} = inttoptr i32 {init_reg} to ptr")
            self.output.append(f"  store ptr {ext_reg}, ptr {alloca_reg}, align 8")
        else:
            self.output.append(f"  store {init_type} {init_reg}, ptr {alloca_reg}, align 8")
        
        # Track variable with actual type
        self.local_vars[stmt.name] = (alloca_reg, var_type)
    
    def emit_expr_stmt(self, stmt: ExprStmt):
        """Emit expression statement"""
        self.emit_expression(stmt.expr)
    
    def emit_if(self, stmt: IfStmt):
        """Emit if statement"""
        # Evaluate condition
        cond_reg, cond_type = self.emit_expression(stmt.condition)
        
        # Convert to i1 (handle both i32 and ptr)
        cond_i1 = self.new_register()
        if cond_type == 'ptr':
            # ptr != null
            self.output.append(f"  {cond_i1} = icmp ne ptr {cond_reg}, null")
        else:
            self.output.append(f"  {cond_i1} = trunc i32 {cond_reg} to i1")
        
        # Create labels
        then_label = self.new_label("if.then")
        else_label = self.new_label("if.else")
        end_label = self.new_label("if.end")
        
        # Branch
        if stmt.else_branch:
            self.output.append(f"  br i1 {cond_i1}, label %{then_label}, label %{else_label}")
        else:
            self.output.append(f"  br i1 {cond_i1}, label %{then_label}, label %{end_label}")
        
        # Then branch
        self.output.append(f"{then_label}:")
        self.emit_statement(stmt.then_branch)
        last = self.output[-1].strip()
        if not last.startswith('ret') and not last.startswith('br label'):
            self.output.append(f"  br label %{end_label}")
        
        # Else branch
        if stmt.else_branch:
            self.output.append(f"{else_label}:")
            self.emit_statement(stmt.else_branch)
            last = self.output[-1].strip()
            if not last.startswith('ret') and not last.startswith('br label'):
                self.output.append(f"  br label %{end_label}")
        
        # End
        self.output.append(f"{end_label}:")
    
    def emit_while(self, stmt: WhileStmt):
        """Emit while loop"""
        # Labels
        cond_label = self.new_label("while.cond")
        body_label = self.new_label("while.body")
        end_label = self.new_label("while.end")
        
        # Jump to condition
        self.output.append(f"  br label %{cond_label}")
        
        # Condition
        self.output.append(f"{cond_label}:")
        cond_reg, cond_type = self.emit_expression(stmt.condition)
        cond_i1 = self.new_register()
        if cond_type == 'ptr':
            self.output.append(f"  {cond_i1} = icmp ne ptr {cond_reg}, null")
        else:
            self.output.append(f"  {cond_i1} = trunc i32 {cond_reg} to i1")
        self.output.append(f"  br i1 {cond_i1}, label %{body_label}, label %{end_label}")
        
        # Body
        self.output.append(f"{body_label}:")
        self.emit_statement(stmt.body)
        last = self.output[-1].strip()
        if not last.startswith('ret') and not last.startswith('br label'):
            self.output.append(f"  br label %{cond_label}")
        
        # End
        self.output.append(f"{end_label}:")
    
    def emit_expression(self, expr: ASTNode) -> tuple:
        """Emit expression and return (register, type)"""
        if isinstance(expr, NumberLiteral):
            return (str(expr.value), "i32")
        
        elif isinstance(expr, StringLiteral):
            # Add to string literals
            str_idx = len(self.string_literals)
            self.string_literals.append(expr.value)
            return (f"@.str.{str_idx}", "ptr")
        
        elif isinstance(expr, IdentifierExpr):
            # Load from local variable
            if expr.name in self.local_vars:
                alloca_reg, var_type = self.local_vars[expr.name]
                load_reg = self.new_register()
                self.output.append(f"  {load_reg} = load {var_type}, ptr {alloca_reg}, align 8")
                return (load_reg, var_type)
            else:
                # Unknown variable - return 0
                return ("0", "i32")
        
        elif isinstance(expr, BinaryExpr):
            return self.emit_binary(expr)
        
        elif isinstance(expr, CallExpr):
            return self.emit_call(expr)
        
        elif isinstance(expr, MemberExpr):
            return self.emit_member(expr)
        
        elif isinstance(expr, NewExpr):
            return self.emit_new(expr)
        
        elif isinstance(expr, AssignExpr):
            return self.emit_assign(expr)
        
        elif isinstance(expr, ThisExpr):
            # 'this' → load from local_vars
            if 'this' in self.local_vars:
                alloca_reg, var_type = self.local_vars['this']
                load_reg = self.new_register()
                self.output.append(f"  {load_reg} = load {var_type}, ptr {alloca_reg}, align 8")
                return (load_reg, var_type)
            return ("%self", "ptr")
        
        else:
            # Unknown expression
            return ("0", "i32")
    
    def emit_binary(self, expr: BinaryExpr) -> tuple:
        """Emit binary operation"""
        left_reg, left_type = self.emit_expression(expr.left)
        right_reg, right_type = self.emit_expression(expr.right)
        
        result_reg = self.new_register()
        
        # String concatenation: ptr + ptr → call string_concat
        if expr.op == '+' and (left_type == 'ptr' or right_type == 'ptr'):
            self.output.append(f"  {result_reg} = call ptr @_T_string_concat_P_ptr_ptr(ptr {left_reg}, ptr {right_reg})")
            return (result_reg, "ptr")
        
        # String equality: ptr == ptr → call string_equals
        if expr.op == '==' and (left_type == 'ptr' or right_type == 'ptr'):
            # Ensure both sides are ptr
            if left_type != 'ptr':
                conv = self.new_register()
                self.output.append(f"  {conv} = inttoptr i32 {left_reg} to ptr")
                left_reg, left_type = conv, 'ptr'
            if right_type != 'ptr':
                conv = self.new_register()
                self.output.append(f"  {conv} = inttoptr i32 {right_reg} to ptr")
                right_reg, right_type = conv, 'ptr'
            cmp_reg = self.new_register()
            self.output.append(f"  {cmp_reg} = call i32 @_T_string_equals_P_ptr_ptr(ptr {left_reg}, ptr {right_reg})")
            self.output.append(f"  {result_reg} = and i32 {cmp_reg}, 1")
            return (result_reg, "i32")
        
        if expr.op == '!=' and (left_type == 'ptr' or right_type == 'ptr'):
            if left_type != 'ptr':
                conv = self.new_register()
                self.output.append(f"  {conv} = inttoptr i32 {left_reg} to ptr")
                left_reg, left_type = conv, 'ptr'
            if right_type != 'ptr':
                conv = self.new_register()
                self.output.append(f"  {conv} = inttoptr i32 {right_reg} to ptr")
                right_reg, right_type = conv, 'ptr'
            cmp_reg = self.new_register()
            self.output.append(f"  {cmp_reg} = call i32 @_T_string_equals_P_ptr_ptr(ptr {left_reg}, ptr {right_reg})")
            self.output.append(f"  {result_reg} = xor i32 {cmp_reg}, 1")
            return (result_reg, "i32")
        
        # Arithmetic operators (i32) - auto-convert ptr if needed
        if expr.op in ('+', '-', '*', '/'):
            # Convert ptr operands to i32 if needed
            if left_type == 'ptr':
                conv = self.new_register()
                self.output.append(f"  {conv} = ptrtoint ptr {left_reg} to i32")
                left_reg, left_type = conv, 'i32'
            if right_type == 'ptr':
                conv = self.new_register()
                self.output.append(f"  {conv} = ptrtoint ptr {right_reg} to i32")
                right_reg, right_type = conv, 'i32'
        
        if expr.op == '+':
            self.output.append(f"  {result_reg} = add i32 {left_reg}, {right_reg}")
            return (result_reg, "i32")
        elif expr.op == '-':
            self.output.append(f"  {result_reg} = sub i32 {left_reg}, {right_reg}")
            return (result_reg, "i32")
        elif expr.op == '*':
            self.output.append(f"  {result_reg} = mul i32 {left_reg}, {right_reg}")
            return (result_reg, "i32")
        elif expr.op == '/':
            self.output.append(f"  {result_reg} = sdiv i32 {left_reg}, {right_reg}")
            return (result_reg, "i32")
        
        # Logical operators - handle both i32 and ptr operands
        elif expr.op == '||':
            left_i1 = self.new_register()
            right_i1 = self.new_register()
            or_i1 = self.new_register()
            if left_type == 'ptr':
                self.output.append(f"  {left_i1} = icmp ne ptr {left_reg}, null")
            else:
                self.output.append(f"  {left_i1} = trunc i32 {left_reg} to i1")
            if right_type == 'ptr':
                self.output.append(f"  {right_i1} = icmp ne ptr {right_reg}, null")
            else:
                self.output.append(f"  {right_i1} = trunc i32 {right_reg} to i1")
            self.output.append(f"  {or_i1} = or i1 {left_i1}, {right_i1}")
            self.output.append(f"  {result_reg} = zext i1 {or_i1} to i32")
            return (result_reg, "i32")
        elif expr.op == '&&':
            left_i1 = self.new_register()
            right_i1 = self.new_register()
            and_i1 = self.new_register()
            if left_type == 'ptr':
                self.output.append(f"  {left_i1} = icmp ne ptr {left_reg}, null")
            else:
                self.output.append(f"  {left_i1} = trunc i32 {left_reg} to i1")
            if right_type == 'ptr':
                self.output.append(f"  {right_i1} = icmp ne ptr {right_reg}, null")
            else:
                self.output.append(f"  {right_i1} = trunc i32 {right_reg} to i1")
            self.output.append(f"  {and_i1} = and i1 {left_i1}, {right_i1}")
            self.output.append(f"  {result_reg} = zext i1 {and_i1} to i32")
            return (result_reg, "i32")
        
        # Comparison operators (i32) - auto-convert ptr
        elif expr.op in ('<', '>', '<=', '>='):
            if left_type == 'ptr':
                conv = self.new_register()
                self.output.append(f"  {conv} = ptrtoint ptr {left_reg} to i32")
                left_reg = conv
            if right_type == 'ptr':
                conv = self.new_register()
                self.output.append(f"  {conv} = ptrtoint ptr {right_reg} to i32")
                right_reg = conv
        
        if expr.op == '<':
            cmp_reg = self.new_register()
            self.output.append(f"  {cmp_reg} = icmp slt i32 {left_reg}, {right_reg}")
            self.output.append(f"  {result_reg} = zext i1 {cmp_reg} to i32")
            return (result_reg, "i32")
        elif expr.op == '>':
            cmp_reg = self.new_register()
            self.output.append(f"  {cmp_reg} = icmp sgt i32 {left_reg}, {right_reg}")
            self.output.append(f"  {result_reg} = zext i1 {cmp_reg} to i32")
            return (result_reg, "i32")
        elif expr.op == '==':
            cmp_reg = self.new_register()
            self.output.append(f"  {cmp_reg} = icmp eq i32 {left_reg}, {right_reg}")
            self.output.append(f"  {result_reg} = zext i1 {cmp_reg} to i32")
            return (result_reg, "i32")
        elif expr.op == '!=':
            cmp_reg = self.new_register()
            self.output.append(f"  {cmp_reg} = icmp ne i32 {left_reg}, {right_reg}")
            self.output.append(f"  {result_reg} = zext i1 {cmp_reg} to i32")
            return (result_reg, "i32")
        elif expr.op == '<=':
            cmp_reg = self.new_register()
            self.output.append(f"  {cmp_reg} = icmp sle i32 {left_reg}, {right_reg}")
            self.output.append(f"  {result_reg} = zext i1 {cmp_reg} to i32")
            return (result_reg, "i32")
        elif expr.op == '>=':
            cmp_reg = self.new_register()
            self.output.append(f"  {cmp_reg} = icmp sge i32 {left_reg}, {right_reg}")
            self.output.append(f"  {result_reg} = zext i1 {cmp_reg} to i32")
            return (result_reg, "i32")
        
        return ("0", "i32")
    
    def emit_call(self, expr: CallExpr) -> tuple:
        """Emit function call"""
        # Simple case: direct function call  e.g. log("hello")
        if isinstance(expr.callee, IdentifierExpr):
            name = expr.callee.name
            
            # Check if it's a known stdlib import
            if name in self.imports:
                c_name = self.imports[name]
                info = self.STDLIB_FUNCS.get(name)
                ret_type = info[1] if info else 'ptr'
            else:
                c_name = self.mangle_function_name(name, False)
                ret_type = 'ptr'
            
            # Evaluate arguments
            args = []
            for arg in expr.args:
                arg_reg, arg_type = self.emit_expression(arg)
                args.append(f"{arg_type} {arg_reg}")
            
            args_str = ', '.join(args)
            
            if ret_type == 'void':
                self.output.append(f"  call void @{c_name}({args_str})")
                return ("0", "i32")
            else:
                result_reg = self.new_register()
                self.output.append(f"  {result_reg} = call {ret_type} @{c_name}({args_str})")
                return (result_reg, ret_type)
        
        # Method call:  obj.method(args)
        elif isinstance(expr.callee, MemberExpr):
            method_name = expr.callee.member
            obj_reg, obj_type = self.emit_expression(expr.callee.object)
            
            args = [f"ptr {obj_reg}"]  # first arg = self
            for arg in expr.args:
                arg_reg, arg_type = self.emit_expression(arg)
                args.append(f"{arg_type} {arg_reg}")
            args_str = ', '.join(args)
            
            # Map known method names to C implementations
            method_map = {
                'push':         ('Array_push_impl', 'void'),
                'get':          ('Array_get_impl',  'ptr'),
                'length':       ('Array_length_impl', 'i32'),
                'charCodeAt':   ('charCodeAt', 'i32'),
                'slice':        ('slice', 'ptr'),
            }
            
            if method_name in method_map and method_map[method_name][0]:
                c_name, ret_type = method_map[method_name]
                if ret_type == 'void':
                    self.output.append(f"  call void @{c_name}({args_str})")
                    return ("0", "i32")
                else:
                    result_reg = self.new_register()
                    self.output.append(f"  {result_reg} = call {ret_type} @{c_name}({args_str})")
                    return (result_reg, ret_type)
            else:
                # Look up class type from var name for method prefix
                cls_prefix = ""
                obj_expr = expr.callee.object
                if isinstance(obj_expr, IdentifierExpr):
                    var_name = obj_expr.name
                    if hasattr(self, 'var_class_types') and var_name in self.var_class_types:
                        cls_prefix = self.var_class_types[var_name] + "_"
                elif self.current_class is not None:
                    cls_prefix = self.current_class.name + "_"
                
                full_method = f"{cls_prefix}{method_name}"
                result_reg = self.new_register()
                self.output.append(f"  ; method call: {full_method}")
                # Determine return type
                cls_name_clean = cls_prefix.rstrip('_')
                ret_type = self._get_method_return_type(cls_name_clean, method_name)
                if ret_type == 'void':
                    self.output.append(f"  call void @{full_method}({args_str})")
                    return ("0", "i32")
                else:
                    self.output.append(f"  {result_reg} = call {ret_type} @{full_method}({args_str})")
                    return (result_reg, ret_type)
        
        return ("0", "i32")
    
    def emit_member(self, expr: MemberExpr) -> tuple:
        """Emit member access - real GEP field read"""
        obj_reg, obj_type = self.emit_expression(expr.object)
        member = expr.member
        
        # .length → could be Array or String length
        if member == 'length':
            # If we can determine it's a string field, use tsn_string_length
            # Otherwise use Array_length_impl (works for arrays)
            # Heuristic: if object is an IdentifierExpr referring to a string field → tsn_string_length
            is_string = self._is_string_expr(expr.object)
            result_reg = self.new_register()
            if is_string:
                self.output.append(f"  {result_reg} = call i32 @tsn_string_length(ptr {obj_reg})")
            else:
                self.output.append(f"  {result_reg} = call i32 @Array_length_impl(ptr {obj_reg})")
            return (result_reg, "i32")
        
        # Look up field in known classes (GEP)
        field_info = self._lookup_field(member)
        if field_info is not None:
            field_type, gep_idx = field_info
            # Determine struct name from object expression context
            struct_name = self._get_obj_struct_name(expr.object)
            gep_reg = self.new_register()
            load_reg = self.new_register()
            if struct_name:
                # Check if this struct is defined in current module (not external)
                is_local_class = any(cls.name == struct_name for cls in self.program.classes)
                if is_local_class:
                    # Use typed GEP for local classes
                    self.output.append(
                        f"  {gep_reg} = getelementptr inbounds %{struct_name}, ptr {obj_reg}, i32 0, i32 {gep_idx}")
                    self.output.append(f"  {load_reg} = load {field_type}, ptr {gep_reg}, align 8")
                    return (load_reg, field_type)
                else:
                    # External class - use byte offset calculation
                    # Calculate offset: skip refcount (4 bytes) + padding (4) + vtable (8) = 16 bytes base
                    # Then each field: i32=4, ptr=8, aligned to 8-byte boundaries
                    # Simplified: assume all fields are 8-byte aligned
                    byte_offset = 8 * gep_idx  # Simple: each slot is 8 bytes
                    self.output.append(
                        f"  {gep_reg} = getelementptr inbounds i8, ptr {obj_reg}, i32 {byte_offset}")
                    self.output.append(f"  {load_reg} = load {field_type}, ptr {gep_reg}, align 8")
                    return (load_reg, field_type)
            else:
                # No struct name but field is known - search all classes to find which one has this field
                for cls_name, fields in self.class_fields.items():
                    if member in fields:
                        struct_name = cls_name
                        break
                if struct_name:
                    # Check if this is a local class
                    is_local_class = any(cls.name == struct_name for cls in self.program.classes)
                    if is_local_class:
                        self.output.append(
                            f"  {gep_reg} = getelementptr inbounds %{struct_name}, ptr {obj_reg}, i32 0, i32 {gep_idx}")
                        self.output.append(f"  {load_reg} = load {field_type}, ptr {gep_reg}, align 8")
                        return (load_reg, field_type)
                    else:
                        # External - byte offset
                        byte_offset = 8 * gep_idx
                        self.output.append(
                            f"  {gep_reg} = getelementptr inbounds i8, ptr {obj_reg}, i32 {byte_offset}")
                        self.output.append(f"  {load_reg} = load {field_type}, ptr {gep_reg}, align 8")
                        return (load_reg, field_type)
                # Still can't determine struct - fallback to heuristic null value
                pass
        
        # Heuristic fallback (unknown field)
        I32_FIELDS = {'pos', 'line', 'col', 'column', 'index', 'count', 'size',
                      'capacity', 'tag', 'refcount', 'start', 'end', 'current',
                      'tokenCount', 'charCode', 'value'}
        field_type = 'i32' if member in I32_FIELDS else 'ptr'
        
        result_reg = self.new_register()
        if field_type == 'i32':
            self.output.append(f"  ; unknown field .{member} → i32 (heuristic)")
            self.output.append(f"  {result_reg} = add i32 0, 0")
        else:
            self.output.append(f"  ; unknown field .{member} → ptr (heuristic)")
            self.output.append(f"  {result_reg} = inttoptr i32 0 to ptr")
        return (result_reg, field_type)
    
    def _lookup_field(self, field_name: str):
        """Search all known classes for a field, return (type, gep_idx) or None"""
        for cls_name, fields in self.class_fields.items():
            if field_name in fields:
                return fields[field_name]
        return None
    
    def _is_string_expr(self, expr) -> bool:
        """Heuristic: is this expression a string (ptr to TsnStr)?"""
        # Direct string var name heuristics
        if isinstance(expr, IdentifierExpr):
            name = expr.name
            STRING_VARS = {'source', 'lexeme', 'type', 'name', 'typeAnnotation',
                           'returnType', 'message', 'str', 's', 'text', 'content'}
            if name in STRING_VARS:
                return True
            # Array-like vars are NOT strings
            ARRAY_VARS = {'tokens', 'functions', 'statements', 'params', 'args', 'fields', 'methods'}
            if name in ARRAY_VARS:
                return False
            # Check local var type
            if name in self.local_vars:
                _, t = self.local_vars[name]
                # All strings are ptr, but we can check if field is string type
                pass
        # Member access like this.source → check field name
        if isinstance(expr, MemberExpr):
            member_name = expr.member
            # Known array fields
            ARRAY_FIELDS = {'tokens', 'functions', 'statements', 'params', 'args', 'fields', 'methods'}
            if member_name in ARRAY_FIELDS:
                return False
            # Known string fields
            STRING_FIELDS = {'source', 'lexeme', 'type', 'name', 'typeAnnotation', 'returnType', 'message'}
            if member_name in STRING_FIELDS:
                return True
            # Default: if it's a ptr field, assume NOT string (could be array or object)
            field_info = self._lookup_field(member_name)
            if field_info:
                ftype, _ = field_info
                # Only return True if we're confident it's a string
                return False
        # StringLiteral is always string
        if isinstance(expr, StringLiteral):
            return True
        return False
    
    def _get_obj_struct_name(self, obj_expr) -> str:
        """Try to determine class name of object expression"""
        if isinstance(obj_expr, IdentifierExpr):
            var_name = obj_expr.name
            if var_name == 'this' and self.current_class:
                return self.current_class.name
            if hasattr(self, 'var_class_types') and var_name in self.var_class_types:
                return self.var_class_types[var_name]
            # Heuristic name mapping
            NAME_TO_CLASS = {
                'token': 'Token',
                'lexer': 'Lexer',
                'parser': 'Parser',
                'program': 'Program',
                'func': 'FunctionDecl',
                'funcDecl': 'FunctionDecl',
                'stmt': 'Statement',
                'expr': 'Expression',
            }
            if var_name in NAME_TO_CLASS:
                return NAME_TO_CLASS[var_name]
        elif isinstance(obj_expr, ThisExpr):
            if self.current_class:
                return self.current_class.name
        return ""
    
    def emit_new(self, expr: NewExpr) -> tuple:
        """Emit new expression - call ClassName_new(args)"""
        # Strip generic type params: Array<Token> → Array
        class_name = expr.class_name.split('<')[0]
        
        # Evaluate constructor args
        args = []
        for arg in expr.args:
            arg_reg, arg_type = self.emit_expression(arg)
            args.append(f"{arg_type} {arg_reg}")
        args_str = ', '.join(args)
        
        result_reg = self.new_register()
        self.output.append(f"  {result_reg} = call ptr @{class_name}_new({args_str})")
        return (result_reg, "ptr")
    
    def emit_assign(self, expr: AssignExpr) -> tuple:
        """Emit assignment - variable or field write"""
        # Simple variable assignment
        if isinstance(expr.target, IdentifierExpr):
            if expr.target.name in self.local_vars:
                alloca_reg, var_type = self.local_vars[expr.target.name]
                value_reg, value_type = self.emit_expression(expr.value)
                # Cast if needed
                if value_type != var_type:
                    value_reg, value_type = self._cast(value_reg, value_type, var_type)
                self.output.append(f"  store {var_type} {value_reg}, ptr {alloca_reg}, align 8")
                return (value_reg, var_type)
        
        # Field assignment: this.field = value  OR  obj.field = value
        if isinstance(expr.target, MemberExpr):
            member = expr.target.member
            obj_expr = expr.target.object
            obj_reg, _ = self.emit_expression(obj_expr)
            value_reg, value_type = self.emit_expression(expr.value)
            
            # Look up field info
            field_info = self._lookup_field(member)
            struct_name = self._get_obj_struct_name(obj_expr)
            
            if field_info is not None:
                field_type, gep_idx = field_info
                # Cast value if needed
                if value_type != field_type:
                    value_reg, value_type = self._cast(value_reg, value_type, field_type)
                gep_reg = self.new_register()
                if struct_name:
                    # Check if local class or external
                    is_local_class = any(cls.name == struct_name for cls in self.program.classes)
                    if is_local_class:
                        self.output.append(
                            f"  {gep_reg} = getelementptr inbounds %{struct_name}, ptr {obj_reg}, i32 0, i32 {gep_idx}")
                    else:
                        # External - use byte offset
                        byte_offset = 8 * gep_idx
                        self.output.append(
                            f"  {gep_reg} = getelementptr inbounds i8, ptr {obj_reg}, i32 {byte_offset}")
                else:
                    byte_offset = 8 * gep_idx
                    self.output.append(
                        f"  {gep_reg} = getelementptr inbounds i8, ptr {obj_reg}, i32 {byte_offset}")
                self.output.append(f"  store {field_type} {value_reg}, ptr {gep_reg}, align 8")
                return (value_reg, field_type)
            else:
                # Unknown field - best effort
                self.output.append(f"  ; field write .{member} (unknown class - skipped)")
                return (value_reg, value_type)
        
        return ("0", "i32")
    
    def _cast(self, reg: str, from_type: str, to_type: str) -> tuple:
        """Emit type cast instruction, return (new_reg, to_type)"""
        if from_type == to_type:
            return (reg, to_type)
        cast_reg = self.new_register()
        if from_type == 'i32' and to_type == 'ptr':
            self.output.append(f"  {cast_reg} = inttoptr i32 {reg} to ptr")
        elif from_type == 'ptr' and to_type == 'i32':
            self.output.append(f"  {cast_reg} = ptrtoint ptr {reg} to i32")
        else:
            return (reg, from_type)  # can't cast, return original
        return (cast_reg, to_type)
    
    def emit_string_literals(self):
        """Emit string literal definitions"""
        for i, s in enumerate(self.string_literals):
            escaped = self.escape_string(s)
            length = len(s)
            self.output.append(
                f'@.str.{i} = private unnamed_addr constant '
                f'{{ i32, i32, [{length+1} x i8] }} '
                f'{{ i32 -1, i32 {length}, [{length+1} x i8] c"{escaped}\\00" }}'
            )
    
    def get_llvm_type(self, tsn_type: str) -> str:
        """Convert TSN type to LLVM type"""
        # Handle generics - strip for now
        if '<' in tsn_type:
            tsn_type = tsn_type.split('<')[0]
        
        type_map = {
            'i32': 'i32',
            'i64': 'i64',
            'i8': 'i8',
            'i16': 'i16',
            'bool': 'i32',
            'void': 'void',
            'string': 'ptr',
            'Array': 'ptr',
            'Expr': 'ptr',
            'Stmt': 'ptr',
            'Token': 'ptr',
        }
        
        return type_map.get(tsn_type, 'ptr')
    
    def get_params_string(self, params: List[Parameter]) -> str:
        """Generate parameter string for function signature"""
        if not params:
            return ""
        
        param_strs = []
        for param in params:
            llvm_type = self.get_llvm_type(param.type_name)
            param_strs.append(f"{llvm_type} %{param.name}")
        
        return ', '.join(param_strs)
    
    def mangle_function_name(self, name: str, is_export: bool) -> str:
        """Mangle function name for LLVM"""
        if name == "main":
            return "main"
        
        if is_export:
            return f"_T.{name}$P"
        
        return name
    
    def escape_string(self, s: str) -> str:
        """Escape string for LLVM"""
        return s.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\0A')
    
    def new_register(self) -> str:
        """Generate new register name"""
        reg = f"%r{self.register_counter}"
        self.register_counter += 1
        return reg
    
    def new_label(self, prefix: str = "label") -> str:
        """Generate new label name"""
        label = f"{prefix}.{self.label_counter}"
        self.label_counter += 1
        return label

# ============================================================================
# CODEGEN - LLVM IR Generator (NEXT PART)
# ============================================================================

def main():
    if len(sys.argv) < 3:
        print("Usage: python compiler.py input.tsn -o output.ll")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[3] if len(sys.argv) > 3 else "output.ll"
    
    print(f"=== TSN Bootstrap Compiler ===")
    print(f"Input:  {input_file}")
    print(f"Output: {output_file}")
    print()
    
    # Read source
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            source = f.read()
    except FileNotFoundError:
        print(f"Error: File not found: {input_file}")
        sys.exit(1)
    
    # Lexer
    print(f"[1/3] Lexing...")
    lexer = Lexer(source)
    tokens = lexer.tokenize()
    print(f"      Tokens: {len(tokens)}")
    
    # Parser
    print(f"[2/3] Parsing...")
    parser = Parser(tokens)
    program = parser.parse()
    print(f"      Classes: {len(program.classes)}")
    print(f"      Functions: {len(program.functions)}")
    
    # Codegen
    print(f"[3/3] Generating LLVM IR...")
    codegen = Codegen(program)
    llvm_ir = codegen.generate()
    
    # Write output
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(llvm_ir)
    
    print(f"\nSuccess! Generated {len(llvm_ir)} bytes")
    print(f"  Output: {output_file}")

if __name__ == '__main__':
    main()
