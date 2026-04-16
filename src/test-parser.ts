import { Lexer } from './src/lexer.ts';
import { Parser } from './src/parser.ts';

// Helper function to pretty print AST
function printAST(node: any, indent: number = 0): void {
  const spaces = '  '.repeat(indent);
  
  if (Array.isArray(node)) {
    node.forEach(item => printAST(item, indent));
    return;
  }

  if (typeof node !== 'object' || node === null) {
    return;
  }

  console.log(`${spaces}${node.kind}`);
  
  for (const [key, value] of Object.entries(node)) {
    if (key === 'kind' || key === 'line' || key === 'column') continue;
    
    if (Array.isArray(value)) {
      if (value.length > 0) {
        console.log(`${spaces}  ${key}:`);
        value.forEach(item => printAST(item, indent + 2));
      }
    } else if (typeof value === 'object' && value !== null) {
      console.log(`${spaces}  ${key}:`);
      printAST(value, indent + 2);
    } else {
      console.log(`${spaces}  ${key}: ${value}`);
    }
  }
}

// Test 1: Simple function
console.log('=== Test 1: Simple Function ===');
const source1 = `
function add(a: i32, b: i32): i32 {
    return a + b;
}
`;
const lexer1 = new Lexer(source1);
const tokens1 = lexer1.tokenize();
const parser1 = new Parser(tokens1);
const ast1 = parser1.parse();
printAST(ast1);

// Test 2: Interface and function with struct
console.log('\n=== Test 2: Interface Declaration ===');
const source2 = `
interface Node {
    kind: i32;
    value: i32;
}

function test(): i32 {
    let x: i32 = 42;
    return x;
}
`;
const lexer2 = new Lexer(source2);
const tokens2 = lexer2.tokenize();
const parser2 = new Parser(tokens2);
const ast2 = parser2.parse();
printAST(ast2);

// Test 3: Array and member access (the critical test!)
console.log('\n=== Test 3: Array Member Assignment ===');
const source3 = `
interface ASTNode {
    kind: i32;
    value: i32;
}

function parse(): i32 {
    let nodes: ASTNode[10];
    let idx = 0;
    
    nodes[idx].kind = 42;
    nodes[idx].value = 100;
    
    return nodes[0].kind;
}
`;
const lexer3 = new Lexer(source3);
const tokens3 = lexer3.tokenize();
const parser3 = new Parser(tokens3);
const ast3 = parser3.parse();
printAST(ast3);

// Test 4: Control flow
console.log('\n=== Test 4: Control Flow ===');
const source4 = `
function test(x: i32): i32 {
    if (x == 10) {
        return 1;
    } else {
        return 0;
    }
}
`;
const lexer4 = new Lexer(source4);
const tokens4 = lexer4.tokenize();
const parser4 = new Parser(tokens4);
const ast4 = parser4.parse();
printAST(ast4);
