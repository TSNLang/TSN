# Phase 32: Parser else-if Support - PARTIAL SUCCESS ⚠️

## Date: 2026-07-13

## Goal
Add `else if` syntax support to TSN parser and codegen

## Changes Made ✅

### 1. Parser: Added parseIfStatement() Method
**File**: `compiler/src/parser.tsn`

Added recursive `parseIfStatement()` to handle `else if` chains:
```tsn
private parseIfStatement(): Stmt {
    this.consume("IF", "Expected 'if'");
    this.consume("LPAREN", "Expected '('");
    let condExpr = this.parseExpression();
    this.consume("RPAREN", "Expected ')'");
    let thenBlock = this.parseSimpleBlock();
    
    let elseBlock = new BlockStmt();
    if (this.check("ELSE")) {
        this.consume("ELSE", "Expected 'else'");
        if (this.check("IF")) {
            // Recursive else-if!
            let elseIfStmt = this.parseIfStatement();
            elseBlock.statements.push(elseIfStmt);
        } else {
            elseBlock = this.parseSimpleBlock();
        }
    }
    // ... create and return IfStmt
}
```

Updated main parsing loop to call `parseIfStatement()` for else-if detection.

### 2. AST: Fixed Stmt Constructor
**File**: `compiler/src/ast.tsn`

**Critical Bug Fixed**: Stmt constructor didn't initialize BlockStmt fields!

**Before**:
```tsn
constructor() {
    this.kind = "";
    this.name = "";
    this.typeAnnotation = "";
    // thenBlock, elseBlock, body NOT initialized → CRASH!
}
```

**After**:
```tsn
constructor() {
    this.kind = "";
    this.name = "";
    this.typeAnnotation = "";
    // Initialize to prevent null pointer access
    this.thenBlock = new BlockStmt();
    this.elseBlock = new BlockStmt();
    this.body = new BlockStmt();
}
```

### 3. Codegen: Added Statement Type Detection
**File**: `compiler/src/codegen.tsn`

**Bug Fixed**: emitStatement() only handled VarDeclStmt and ReturnStmt!

**Added**:
```tsn
private emitStatement(stmt: Stmt): void {
    // Detect VarDeclStmt
    if (stmt.name != "" && stmt.typeAnnotation != "") {
        this.emitVarDecl(stmt);
        return;
    }
    
    // Detect IfStmt (NEW!)
    let hasThenBlock = stmt.thenBlock.statements.length > 0;
    if (hasThenBlock) {
        this.emitIf(stmt);
        return;
    }
    
    // Detect WhileStmt (NEW!)
    let hasBody = stmt.body.statements.length > 0;
    if (hasBody) {
        this.emitWhile(stmt);
        return;
    }
    
    // Default: ReturnStmt
    // ...
}
```

### 4. Codegen: Added Comparison Operators
**File**: `compiler/src/codegen.tsn`

**Critical Missing Feature**: emitBinary() had NO comparison operators!

**Added**:
- `==` → `icmp eq` + `zext i1 to i32`
- `!=` → `icmp ne` + `zext i1 to i32`
- `<` → `icmp slt` + `zext i1 to i32`
- `>` → `icmp sgt` + `zext i1 to i32`
- `<=` → `icmp sle` + `zext i1 to i32`
- `>=` → `icmp sge` + `zext i1 to i32`

All comparisons convert i1 result to i32 for consistency.

## Test Results

| Test File | Python Bootstrap | TSN Self-Compiler | Status |
|-----------|------------------|-------------------|--------|
| test-simple.tsn | ✅ Works | ✅ Works | ✅ |
| test-export.tsn | ✅ Works | ✅ Works | ✅ |
| test-nested-if.tsn (with braces) | ✅ Exit 1 | ❌ No output.ll | ⚠️ |
| test-elseif-noparam.tsn | ✅ Exit 1 | ⚠️ Invalid IR | ⚠️ |

## Current Blocker: Invalid LLVM IR 🐛

Test file:
```tsn
function test(): i32 {
    let x: i32 = 1;
    if (x == 0) return 0;
    else if (x == 1) return 1;
    else return 2;
}
```

TSN compiler generates:
```llvm
if.then.1:
  ret i32 1
  ret i32 2     ← ERROR: Two returns in same block!
  br label %if.end.1
```

Python bootstrap generates (CORRECT):
```llvm
if.then.3:
  ret i32 1
if.else.4:
  ret i32 2
```

### Root Cause
parseSimpleBlock() parses ONE statement, but somehow both "return 1" and "return 2" end up in the same block.

**Hypothesis**: Statement-form if/else (without braces) confuses parseSimpleBlock().

## Files Modified
- `compiler/src/parser.tsn` - Added parseIfStatement(), updated parsing loop (+5.1 KB)
- `compiler/src/ast.tsn` - Fixed Stmt constructor initialization (+505 bytes)
- `compiler/src/codegen.tsn` - Added emitStatement detection + comparison operators (+23.7 KB!)

## Compiled Sizes
- self-main.ll: 24,122 bytes
- self-lexer.ll: 53,529 bytes
- self-ast.ll: 16,019 bytes (was 15,514)
- self-parser.ll: 63,100 bytes (was 57,993)
- self-codegen.ll: 113,797 bytes (was 88,725)

**Total**: ~271 KB LLVM IR for full compiler!

## Next Steps

### Debug parseSimpleBlock() Issue
Need to understand why statement-form else-if generates invalid IR.

Options:
1. **Force braces**: Rewrite ast.tsn to use braces for all if/else
2. **Fix parseSimpleBlock()**: Debug why it parses multiple statements
3. **Test with braces**: Use `{ }` around all if bodies in compiler source

### Temporary Workaround
Rewrite problematic code in compiler source files:
```tsn
// Instead of:
if (x == 0) expr.numValue = "0";
else if (x == 1) expr.numValue = "1";
else expr.numValue = "?";

// Write:
if (x == 0) {
    expr.numValue = "0";
} else {
    if (x == 1) {
        expr.numValue = "1";
    } else {
        expr.numValue = "?";
    }
}
```

## Status

**Phase 32: PARTIAL SUCCESS**

✅ Achievements:
- Parser supports `else if` syntax
- Codegen detects IfStmt and WhileStmt properly
- Comparison operators added
- Stmt constructor fixed (critical!)

❌ Remaining Issues:
- Statement-form if/else generates invalid IR
- Need braces around all if bodies for now

**Impact**: Can compile most code, but need to rewrite statement-form if/else with braces.

**Estimated time to full fix**: 1-2 hours to debug parseSimpleBlock() issue.

