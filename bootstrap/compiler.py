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
    def __init__(self, program: Program):
        self.program = program
        self.output = []
        self.string_literals = []
        self.register_counter = 0
        self.label_counter = 0
        
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
        
        # Runtime declarations
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
            "declare ptr @_T.string_concat$P.ptr.ptr(ptr, ptr)",
            "declare i32 @_T.string_equals$P.ptr.ptr(ptr, ptr)",
            "declare void @_T.log$P.ptr(ptr)",
            "declare ptr @_T.readText$P.ptr(ptr)",
            "declare void @_T.writeText$P.ptr.ptr(ptr, ptr)",
            "declare void @print_i32(i32)",
            ""
        ]
        
        self.output.extend(runtime_decls)
    
    def emit_class_structs(self):
        """Emit struct definitions for classes"""
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
        for func in self.program.functions:
            self.emit_function(func)
    
    def emit_function(self, func: FunctionDecl):
        """Emit a single function"""
        self.register_counter = 0
        self.label_counter = 0
        self.local_vars = {}  # Track local variables
        
        # Function signature
        return_type = self.get_llvm_type(func.return_type)
        params_str = self.get_params_string(func.params)
        
        func_name = self.mangle_function_name(func.name, func.is_export)
        
        self.output.append(f"define {return_type} @{func_name}({params_str}) {{")
        
        # Entry block
        self.output.append("entry:")
        
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
        if not self.output[-1].strip().startswith('ret'):
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
            self.output.append(f"  ret {value_type} {value_reg}")
    
    def emit_var_decl(self, stmt: VarDeclStmt):
        """Emit variable declaration"""
        # Allocate space
        var_type = self.get_llvm_type(stmt.type_name)
        alloca_reg = self.new_register()
        self.output.append(f"  {alloca_reg} = alloca {var_type}, align 8")
        
        # Store initial value
        init_reg, init_type = self.emit_expression(stmt.init)
        self.output.append(f"  store {init_type} {init_reg}, ptr {alloca_reg}, align 8")
        
        # Track variable
        self.local_vars[stmt.name] = (alloca_reg, var_type)
    
    def emit_expr_stmt(self, stmt: ExprStmt):
        """Emit expression statement"""
        self.emit_expression(stmt.expr)
    
    def emit_if(self, stmt: IfStmt):
        """Emit if statement"""
        # Evaluate condition
        cond_reg, _ = self.emit_expression(stmt.condition)
        
        # Convert to i1
        cond_i1 = self.new_register()
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
        if not self.output[-1].strip().startswith('ret'):
            self.output.append(f"  br label %{end_label}")
        
        # Else branch
        if stmt.else_branch:
            self.output.append(f"{else_label}:")
            self.emit_statement(stmt.else_branch)
            if not self.output[-1].strip().startswith('ret'):
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
        cond_reg, _ = self.emit_expression(stmt.condition)
        cond_i1 = self.new_register()
        self.output.append(f"  {cond_i1} = trunc i32 {cond_reg} to i1")
        self.output.append(f"  br i1 {cond_i1}, label %{body_label}, label %{end_label}")
        
        # Body
        self.output.append(f"{body_label}:")
        self.emit_statement(stmt.body)
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
            # 'this' is always %this parameter (first param in methods)
            return ("%this", "ptr")
        
        else:
            # Unknown expression
            return ("0", "i32")
    
    def emit_binary(self, expr: BinaryExpr) -> tuple:
        """Emit binary operation"""
        left_reg, left_type = self.emit_expression(expr.left)
        right_reg, right_type = self.emit_expression(expr.right)
        
        result_reg = self.new_register()
        
        # Arithmetic operators
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
        
        # Logical operators
        elif expr.op == '||':
            # Convert to i1, or, then back to i32
            left_i1 = self.new_register()
            right_i1 = self.new_register()
            or_i1 = self.new_register()
            self.output.append(f"  {left_i1} = trunc i32 {left_reg} to i1")
            self.output.append(f"  {right_i1} = trunc i32 {right_reg} to i1")
            self.output.append(f"  {or_i1} = or i1 {left_i1}, {right_i1}")
            self.output.append(f"  {result_reg} = zext i1 {or_i1} to i32")
            return (result_reg, "i32")
        elif expr.op == '&&':
            # Convert to i1, and, then back to i32
            left_i1 = self.new_register()
            right_i1 = self.new_register()
            and_i1 = self.new_register()
            self.output.append(f"  {left_i1} = trunc i32 {left_reg} to i1")
            self.output.append(f"  {right_i1} = trunc i32 {right_reg} to i1")
            self.output.append(f"  {and_i1} = and i1 {left_i1}, {right_i1}")
            self.output.append(f"  {result_reg} = zext i1 {and_i1} to i32")
            return (result_reg, "i32")
        
        # Comparison operators
        elif expr.op == '<':
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
        # Simple case: direct function call
        if isinstance(expr.callee, IdentifierExpr):
            func_name = self.mangle_function_name(expr.callee.name, False)
            
            # Evaluate arguments
            args = []
            for arg in expr.args:
                arg_reg, arg_type = self.emit_expression(arg)
                args.append(f"{arg_type} {arg_reg}")
            
            args_str = ', '.join(args) if args else ""
            
            # Call
            result_reg = self.new_register()
            self.output.append(f"  {result_reg} = call ptr @{func_name}({args_str})")
            return (result_reg, "ptr")
        
        # Method call
        elif isinstance(expr.callee, MemberExpr):
            # TODO: Implement method calls
            return ("null", "ptr")
        
        return ("null", "ptr")
    
    def emit_member(self, expr: MemberExpr) -> tuple:
        """Emit member access"""
        # TODO: Implement field access
        return ("0", "i32")
    
    def emit_new(self, expr: NewExpr) -> tuple:
        """Emit new expression"""
        # Call constructor
        result_reg = self.new_register()
        self.output.append(f"  {result_reg} = call ptr @{expr.class_name}_new()")
        return (result_reg, "ptr")
    
    def emit_assign(self, expr: AssignExpr) -> tuple:
        """Emit assignment"""
        # Get target address
        if isinstance(expr.target, IdentifierExpr):
            if expr.target.name in self.local_vars:
                alloca_reg, var_type = self.local_vars[expr.target.name]
                
                # Evaluate value
                value_reg, value_type = self.emit_expression(expr.value)
                
                # Store
                self.output.append(f"  store {value_type} {value_reg}, ptr {alloca_reg}, align 8")
                
                return (value_reg, value_type)
        
        # TODO: Handle member assignment
        return ("0", "i32")
    
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
        reg = f"%{self.register_counter}"
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
