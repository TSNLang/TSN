// Token types
export enum TokenKind {
  // Literals
  Identifier = 'IDENTIFIER',
  Number = 'NUMBER',
  String = 'STRING',
  
  // Keywords
  Function = 'FUNCTION',
  Let = 'LET',
  Const = 'CONST',
  Return = 'RETURN',
  Enum = 'ENUM',
  Namespace = 'NAMESPACE',
  Class = 'CLASS',
  This = 'THIS',
  New = 'NEW',
  Constructor = 'CONSTRUCTOR',
  Public = 'PUBLIC',
  Private = 'PRIVATE',
  If = 'IF',
  Else = 'ELSE',
  While = 'WHILE',
  For = 'FOR',
  Break = 'BREAK',
  Continue = 'CONTINUE',
  Interface = 'INTERFACE',
  Declare = 'DECLARE',
  Null = 'NULL',
  True = 'TRUE',
  False = 'FALSE',
  Addressof = 'ADDRESSOF',
  Import = 'IMPORT',
  Export = 'EXPORT',
  From = 'FROM',
  As = 'AS',
  Type = 'TYPE',
  Struct = 'STRUCT',
  
  // Operators
  Plus = '+',
  Minus = '-',
  Star = '*',
  Slash = '/',
  Percent = '%',
  Equal = '=',
  EqualEqual = '==',
  NotEqual = '!=',
  Less = '<',
  LessEqual = '<=',
  Greater = '>',
  GreaterEqual = '>=',
  And = '&&',
  Or = '||',
  Not = '!',
  
  // Punctuation
  LParen = '(',
  RParen = ')',
  LBrace = '{',
  RBrace = '}',
  LBracket = '[',
  RBracket = ']',
  Semicolon = ';',
  Colon = ':',
  Comma = ',',
  Dot = '.',
  Arrow = '=>',
  At = '@',
  
  // Special
  EOF = 'EOF',
  Unknown = 'UNKNOWN',
}

export interface Token {
  kind: TokenKind;
  text: string;
  line: number;
  column: number;
  length: number;
}

// AST Node types
export enum ASTKind {
  // Expressions
  NumberLiteral = 'NumberLiteral',
  StringLiteral = 'StringLiteral',
  BoolLiteral = 'BoolLiteral',
  NullLiteral = 'NullLiteral',
  Identifier = 'Identifier',
  BinaryExpr = 'BinaryExpr',
  UnaryExpr = 'UnaryExpr',
  CallExpr = 'CallExpr',
  IndexExpr = 'IndexExpr',
  MemberExpr = 'MemberExpr',
  AddressofExpr = 'AddressofExpr',
  NewExpr = 'NewExpr',
  ThisExpr = 'ThisExpr',
  
  // Statements
  VarDecl = 'VarDecl',
  Assignment = 'Assignment',
  ReturnStmt = 'ReturnStmt',
  IfStmt = 'IfStmt',
  WhileStmt = 'WhileStmt',
  ForStmt = 'ForStmt',
  BreakStmt = 'BreakStmt',
  ContinueStmt = 'ContinueStmt',
  ExprStmt = 'ExprStmt',
  ClassField = 'ClassField',
  ClassMethod = 'ClassMethod',
  
  // Declarations
  FunctionDecl = 'FunctionDecl',
  InterfaceDecl = 'InterfaceDecl',
  TypeAliasDecl = 'TypeAliasDecl',
  EnumDecl = 'EnumDecl',
  NamespaceDecl = 'NamespaceDecl',
  ClassDecl = 'ClassDecl',
  StructDecl = 'StructDecl',
  ImportDecl = 'ImportDecl',
  ExportDecl = 'ExportDecl',
  
  // Program
  Program = 'Program',
}

export interface ASTNode {
  kind: ASTKind;
  line: number;
  column: number;
}

// Expressions
export interface NumberLiteral extends ASTNode {
  kind: ASTKind.NumberLiteral;
  value: number;
}

export interface StringLiteral extends ASTNode {
  kind: ASTKind.StringLiteral;
  value: string;
}

export interface BoolLiteral extends ASTNode {
  kind: ASTKind.BoolLiteral;
  value: boolean;
}

export interface NullLiteral extends ASTNode {
  kind: ASTKind.NullLiteral;
}

export interface Identifier extends ASTNode {
  kind: ASTKind.Identifier;
  name: string;
}

export interface BinaryExpr extends ASTNode {
  kind: ASTKind.BinaryExpr;
  operator: string;
  left: Expression;
  right: Expression;
}

export interface UnaryExpr extends ASTNode {
  kind: ASTKind.UnaryExpr;
  operator: string;
  operand: Expression;
}

export interface CallExpr extends ASTNode {
  kind: ASTKind.CallExpr;
  callee: Expression;
  args: Expression[];
}

export interface IndexExpr extends ASTNode {
  kind: ASTKind.IndexExpr;
  base: Expression;
  index: Expression;
}

export interface MemberExpr extends ASTNode {
  kind: ASTKind.MemberExpr;
  object: Expression;
  member: string;
}

export interface AddressofExpr extends ASTNode {
  kind: ASTKind.AddressofExpr;
  operand: Expression;
}

export type Expression =
  | NumberLiteral
  | StringLiteral
  | BoolLiteral
  | NullLiteral
  | Identifier
  | BinaryExpr
  | UnaryExpr
  | CallExpr
  | IndexExpr
  | MemberExpr
  | AddressofExpr
  | NewExpr
  | ThisExpr;

// Statements
export interface VarDecl extends ASTNode {
  kind: ASTKind.VarDecl;
  name: string;
  type?: TypeAnnotation;
  init?: Expression;
  isConst: boolean;
}

export interface Assignment extends ASTNode {
  kind: ASTKind.Assignment;
  target: Expression;
  value: Expression;
}

export interface ReturnStmt extends ASTNode {
  kind: ASTKind.ReturnStmt;
  value?: Expression;
}

export interface IfStmt extends ASTNode {
  kind: ASTKind.IfStmt;
  condition: Expression;
  thenBranch: Statement[];
  elseBranch?: Statement[];
}

export interface WhileStmt extends ASTNode {
  kind: ASTKind.WhileStmt;
  condition: Expression;
  body: Statement[];
}

export interface ForStmt extends ASTNode {
  kind: ASTKind.ForStmt;
  init?: Statement;
  condition?: Expression;
  update?: Statement;
  body: Statement[];
}

export interface BreakStmt extends ASTNode {
  kind: ASTKind.BreakStmt;
}

export interface ContinueStmt extends ASTNode {
  kind: ASTKind.ContinueStmt;
}

export interface ExprStmt extends ASTNode {
  kind: ASTKind.ExprStmt;
  expr: Expression;
}

export type Statement =
  | VarDecl
  | Assignment
  | ReturnStmt
  | IfStmt
  | WhileStmt
  | ForStmt
  | BreakStmt
  | ContinueStmt
  | ExprStmt;

// Declarations
export interface Parameter {
  name: string;
  type: TypeAnnotation;
}

export interface FunctionDecl extends ASTNode {
  kind: ASTKind.FunctionDecl;
  name: string;
  params: Parameter[];
  returnType: TypeAnnotation;
  body: Statement[];
  isDeclare: boolean;
  ffiLib?: string; // For @ffi.lib("kernel32")
}

export interface InterfaceField {
  name: string;
  type: TypeAnnotation;
}

export interface InterfaceDecl extends ASTNode {
  kind: ASTKind.InterfaceDecl;
  name: string;
  fields: InterfaceField[];
}

export interface TypeAliasDecl extends ASTNode {
  kind: ASTKind.TypeAliasDecl;
  name: string;
  type: TypeAnnotation;
}

export interface EnumMember {
  name: string;
  value?: number;
}

export interface EnumDecl extends ASTNode {
  kind: ASTKind.EnumDecl;
  name: string;
  members: EnumMember[];
}

export interface NamespaceDecl extends ASTNode {
  kind: ASTKind.NamespaceDecl;
  name: string;
  body: Declaration[];
}

// Import/Export declarations
export interface ImportSpecifier {
  imported: string;  // Original name in module
  local: string;     // Local name (for 'as' alias)
}

export interface ImportDecl extends ASTNode {
  kind: ASTKind.ImportDecl;
  specifiers: ImportSpecifier[];  // For: import { foo, bar as baz } from "module"
  namespace?: string;              // For: import * as name from "module"
  source: string;                  // Module path
}

export interface ExportDecl extends ASTNode {
  kind: ASTKind.ExportDecl;
  declaration: Declaration;  // The thing being exported
}

export interface StructDecl extends ASTNode {
  kind: ASTKind.StructDecl;
  name: string;
  fields: InterfaceField[]; // Reuse InterfaceField for simplicity
}

export type Declaration = FunctionDecl | InterfaceDecl | TypeAliasDecl | EnumDecl | NamespaceDecl | ClassDecl | StructDecl | VarDecl | ImportDecl | ExportDecl;

// Program
export interface Program extends ASTNode {
  kind: ASTKind.Program;
  declarations: Declaration[];
}

// Type annotations
export interface TypeAnnotation {
  name: string;
  isPointer: boolean;
  isArray: boolean;
  arraySize?: number;
  genericArgs?: TypeAnnotation[];
}

export interface ClassMember extends ASTNode {
  isPublic: boolean;
}

export interface ClassField extends ClassMember {
  name: string;
  type: TypeAnnotation;
}

export interface ClassMethod extends ClassMember {
  name: string;
  params: Parameter[];
  returnType: TypeAnnotation;
  body: Statement[];
}

export interface ClassDecl extends ASTNode {
  kind: ASTKind.ClassDecl;
  name: string;
  fields: ClassField[];
  methods: ClassMethod[];
  constructorDecl?: ClassMethod;
}

export interface NewExpr extends ASTNode {
  kind: ASTKind.NewExpr;
  className: string;
  args: Expression[];
}

export interface ThisExpr extends ASTNode {
  kind: ASTKind.ThisExpr;
}
