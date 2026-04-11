# Next Steps: Binary Expression Implementation

## Current Task: Phase 1.1 - Binary Expressions

### What We Need to Implement

1. **Parser: Binary Expression Parsing**
   - Operator precedence handling
   - Left-to-right associativity
   - Support operators: `+`, `-`, `*`, `/`, `==`, `!=`, `<`, `>`, `<=`, `>=`

2. **Codegen: Binary Expression Code Generation**
   - LLVM arithmetic: `add`, `sub`, `mul`, `sdiv`
   - LLVM comparisons: `icmp eq`, `icmp ne`, `icmp slt`, `icmp sgt`

3. **Testing**
   - Simple arithmetic: `2 + 3`
   - Complex expressions: `(a + b) * c`
   - Comparisons: `x > 0`

### Implementation Plan

#### Step 1: Add Token Constants to Parser
```typescript
// Add to Parser.tsn
const TK_PLUS: i32 = 19;
const TK_MINUS: i32 = 20;
const TK_STAR: i32 = 21;
const TK_SLASH: i32 = 22;
const TK_EQEQ: i32 = 17;
const TK_NE: i32 = 18;
const TK_LT: i32 = 14;
const TK_GT: i32 = 15;
```

#### Step 2: Implement Binary Expression Parser
```typescript
function parse_binary_expr(
    tokens: ptr<i32>,
    starts: ptr<i32>,
    lens: ptr<i32>,
    pos: ptr<i32>,
    nodes: ptr<ASTNode>,
    nodeCount: ptr<i32>
): i32 {
    // Parse left operand
    let left = parse_primary_expr(...);
    
    // Check for operator
    let op = tokens[pos[0]];
    if (op == TK_PLUS || op == TK_MINUS || ...) {
        pos[0] = pos[0] + 1;
        
        // Parse right operand
        let right = parse_primary_expr(...);
        
        // Create binary op node
        let binOpIdx = nodeCount[0];
        nodes[binOpIdx].kind = AST_BINARY_OP;
        nodes[binOpIdx].value1 = left;
        nodes[binOpIdx].value2 = right;
        nodes[binOpIdx].value3 = op;  // Store operator
        nodeCount[0] = binOpIdx + 1;
        
        return binOpIdx;
    }
    
    return left;
}
```

#### Step 3: Implement Binary Expression Codegen
```typescript
function codegen_binary_expr(
    nodes: ptr<ASTNode>,
    nodeIdx: i32,
    src: ptr<i8>,
    output: ptr<i8>,
    pos: ptr<i32>
): void {
    let leftIdx = nodes[nodeIdx].value1;
    let rightIdx = nodes[nodeIdx].value2;
    let op = nodes[nodeIdx].value3;
    
    // Generate left operand
    buffer_append(output, pos, "  %tmp");
    // ... generate unique temp variable
    buffer_append(output, pos, " = ");
    
    // Generate operation
    if (op == TK_PLUS) {
        buffer_append(output, pos, "add i32 ");
    } else if (op == TK_MINUS) {
        buffer_append(output, pos, "sub i32 ");
    }
    // ... etc
    
    // Generate operands
    codegen_expr(nodes, leftIdx, src, output, pos);
    buffer_append(output, pos, ", ");
    codegen_expr(nodes, rightIdx, src, output, pos);
    buffer_append(output, pos, "\n");
}
```

#### Step 4: Test Program
```typescript
// test_binary.tsn
function test(): i32 {
    return 2 + 3;
}
```

Expected LLVM IR:
```llvm
define i32 @test() {
entry:
  %tmp1 = add i32 2, 3
  ret i32 %tmp1
}
```

### Challenges

1. **Operator Precedence**: Need to handle `2 + 3 * 4` correctly
2. **Temporary Variables**: Need to generate unique temp names
3. **Type Handling**: All operations currently assume i32

### Simplified First Version

For the first version, let's simplify:
- Only support `+` and `-` operators
- No operator precedence (left-to-right only)
- Only i32 types
- No parentheses support

This gets us working quickly, then we can enhance.

### Ready to Start?

Would you like me to:
1. **Implement binary expressions now** (start coding)
2. **Review current Parser/Codegen first** (understand existing code better)
3. **Create test cases first** (TDD approach)

What's your preference?
