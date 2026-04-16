import { Lexer } from './src/lexer.ts';

// Test case 1: Simple function
const source1 = `
function add(a: i32, b: i32): i32 {
    return a + b;
}
`;

console.log('=== Test 1: Simple Function ===');
const lexer1 = new Lexer(source1);
const tokens1 = lexer1.tokenize();
tokens1.forEach(token => {
  console.log(`${token.kind.padEnd(15)} "${token.text}" at ${token.line}:${token.column}`);
});

// Test case 2: Variable declarations
const source2 = `
let x: i32 = 42;
const name = "hello";
`;

console.log('\n=== Test 2: Variable Declarations ===');
const lexer2 = new Lexer(source2);
const tokens2 = lexer2.tokenize();
tokens2.forEach(token => {
  console.log(`${token.kind.padEnd(15)} "${token.text}" at ${token.line}:${token.column}`);
});

// Test case 3: Control flow
const source3 = `
if (x == 10) {
    return true;
} else {
    return false;
}
`;

console.log('\n=== Test 3: Control Flow ===');
const lexer3 = new Lexer(source3);
const tokens3 = lexer3.tokenize();
tokens3.forEach(token => {
  console.log(`${token.kind.padEnd(15)} "${token.text}" at ${token.line}:${token.column}`);
});

// Test case 4: Array and member access
const source4 = `
nodes[idx].kind = 42;
`;

console.log('\n=== Test 4: Array and Member Access ===');
const lexer4 = new Lexer(source4);
const tokens4 = lexer4.tokenize();
tokens4.forEach(token => {
  console.log(`${token.kind.padEnd(15)} "${token.text}" at ${token.line}:${token.column}`);
});
