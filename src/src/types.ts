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
  Super = 'SUPER',
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
  Extends = 'EXTENDS',
  Implements = 'IMPLEMENTS',
  Undefined = 'UNDEFINED',
  Sizeof = 'SIZEOF',
  
  // Operators
  Plus = '+',
  PlusPlus = '++',
  Minus = '-',
  MinusMinus = '--',
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
  Pipe = '|',
  Ampersand = '&',
  Caret = '^',
  Tilde = '~',
  LessLess = '<<',
  GreaterGreater = '>>',
  
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
  Ellipsis = '...',
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
  SuperExpr = 'SuperExpr',
  TupleExpr = 'TupleExpr',
  UndefinedLiteral = 'UndefinedLiteral',
  SizeofExpr = 'SizeofExpr',
  CastExpr = 'CastExpr',
  ArrayLiteralExpr = 'ArrayLiteralExpr',
  SpreadElementExpr = 'SpreadElementExpr',
  
  
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
  isPostfix?: boolean;
}

export interface CallExpr extends ASTNode {
  kind: ASTKind.CallExpr;
  callee: Expression;
  genericArgs?: TypeAnnotation[];
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

export interface SizeofExpr extends ASTNode {
  kind: ASTKind.SizeofExpr;
  targetType: TypeAnnotation;
}

export interface CastExpr extends ASTNode {
  kind: ASTKind.CastExpr;
  expr: Expression;
  targetType: TypeAnnotation;
}

export interface NewExpr extends ASTNode {
  kind: ASTKind.NewExpr;
  className: string;
  genericArgs?: TypeAnnotation[];
  args: Expression[];
}

export interface ThisExpr extends ASTNode {
  kind: ASTKind.ThisExpr;
}

export interface SuperExpr extends ASTNode {
  kind: ASTKind.SuperExpr;
}

export interface SpreadElementExpr extends ASTNode {
  kind: ASTKind.SpreadElementExpr;
  expr: Expression;
}

export interface ArrayLiteralExpr extends ASTNode {
  kind: ASTKind.ArrayLiteralExpr;
  elements: Expression[];
}

export interface TupleExpr extends ASTNode {
  kind: ASTKind.TupleExpr;
  elements: Expression[];
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
  | ThisExpr
  | SuperExpr
  | TupleExpr
  | ArrayLiteralExpr
  | SpreadElementExpr;


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
  isRest?: boolean;
}

export interface FunctionDecl extends ASTNode {
  kind: ASTKind.FunctionDecl;
  name: string;
  typeParameters?: string[];
  params: Parameter[];
  returnType: TypeAnnotation;
  body: Statement[];
  isDeclare: boolean;
  ffiLib?: string; // For @ffi.lib("kernel32")
  isUnsafe?: boolean;
  targetOS?: string[];
}

export interface InterfaceField {
  name: string;
  type: TypeAnnotation;
}

export interface InterfaceMethod extends ASTNode {
  kind: ASTKind.ClassMethod; // Reuse for simplicity or use a dedicated one
  name: string;
  params: Parameter[];
  returnType: TypeAnnotation;
}

export interface InterfaceDecl extends ASTNode {
  kind: ASTKind.InterfaceDecl;
  name: string;
  typeParameters?: string[];
  fields: InterfaceField[];
  methods: InterfaceMethod[];
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
  defaultImport?: string;          // For: import Name from "module"
  source: string;                  // Module path
}

export interface ExportDecl extends ASTNode {
  kind: ASTKind.ExportDecl;
  declaration: Declaration;  // The thing being exported
}

export interface StructDecl extends ASTNode {
  kind: ASTKind.StructDecl;
  name: string;
  typeParameters?: string[];
  baseStructName?: string;
  implements?: TypeAnnotation[];
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
  isRawPointer?: boolean;
  isArray: boolean;
  arraySize?: number;
  genericArgs?: TypeAnnotation[];
    isTuple?: boolean;
  tupleElements?: TypeAnnotation[];
  isUnion?: boolean;
  unionTypes?: TypeAnnotation[];
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
  typeParameters?: string[];
  params: Parameter[];
  returnType: TypeAnnotation;
  body: Statement[];
  isUnsafe?: boolean;
}

export interface ClassDecl extends ASTNode {
  kind: ASTKind.ClassDecl;
  name: string;
  typeParameters?: string[];
  baseClassName?: string;
  implements?: TypeAnnotation[];
  fields: ClassField[];
  methods: ClassMethod[];
  constructorDecl?: ClassMethod;
}

export interface SuperExpr extends ASTNode {
  kind: ASTKind.SuperExpr;
}




