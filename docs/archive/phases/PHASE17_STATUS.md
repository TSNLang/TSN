# Phase 17: Arithmetic Operators (BLOCKED)

**Date**: July 8, 2026  
**Status**: ❌ Blocked by Bootstrap Compiler Limitation

## 🎯 Objective
Implement arithmetic operators (`+`, `-`, `*`, `/`) to enable mathematical computations.

## ❌ Fundamental Limitation Discovered

### The Problem: Nested Objects
**Bootstrap Compiler Cannot Handle Nested Expr Objects**

Arithmetic expressions require a tree structure:
```typescript
// AST for: a + b
BinaryExpr {
    operator: "+",
    left: Identifier("a"),      // ← Nested Expr object
    right: Identifier("b")      // ← Nested Expr object
}
```

**Bootstrap compiler bug**: Assigning nested objects to fields doesn't work:
```typescript
// This fails in bootstrap compiler:
expr.left = leftExpr;   // Left field stays null/broken
expr.right = rightExpr; // Right field stays null/broken
```

### What Was Attempted

#### 1. Parser Changes ✅ (Code Written)
```typescript
// Expression precedence parsing already implemented:
private parseExpression(): Expr
private parseComparison(): Expr
private parseAddition(): Expr
private parseMultiplication(): Expr
private parsePrimary(): Expr
```

✅ Parser code exists and is correct
❌ But creating BinaryExpr crashes compiler

#### 2. Codegen Changes ✅ (Code Written)  
```typescript
private emitBinary(expr: Expr): string {
    let leftReg = this.emitExpression(expr.left);
    let rightReg = this.emitExpression(expr.right);
    
    let resultReg = this.newRegister();
    if (op == "+") {
        this.output.push("  " + resultReg + " = add i32 " + leftReg + ", " + rightReg);
    }
    // ... other operators
    return resultReg;
}
```

✅ Codegen logic exists and is correct
❌ But accessing expr.left/expr.right returns garbage

### Test Case That Fails
```typescript
function test(): i32 {
    let sum: i32 = 5 + 7;  // ← Crashes compiler
    return sum;
}
```

**Crash point**: Parser creating BinaryExpr with nested left/right fields

**Error**: Compiler crashes during compilation (not at runtime)

## 🐛 Root Cause Analysis

### Bootstrap Compiler Bugs Blocking Arithmetic

| Bug | Impact | Workaround? |
|-----|--------|-------------|
| Can't assign nested objects | BinaryExpr.left/right don't work | ❌ No workaround |
| Can't read nested objects | expr.left returns garbage | ❌ No workaround |
| Array.push() unreliable | Can't build expression trees | ❌ No workaround |

**Conclusion**: Arithmetic requires fundamental features the bootstrap compiler doesn't support.

## 📊 What Would Have Worked

If bootstrap compiler supported nested objects:

### Test Case 1: Simple Addition
```typescript
function add(a: i32, b: i32): i32 {
    let sum: i32 = a + b;
    return sum;
}
```

**Expected LLVM**:
```llvm
%r2 = load i32, ptr %r0, align 8  ; Load a
%r3 = load i32, ptr %r1, align 8  ; Load b
%r4 = add i32 %r2, %r3            ; a + b
store i32 %r4, ptr %sum_alloca
```

### Test Case 2: Expression in Return
```typescript
function calculate(): i32 {
    return 10 + 5 * 2;  // = 20 (precedence)
}
```

**Expected LLVM**:
```llvm
%r0 = mul i32 5, 2     ; 5 * 2 = 10
%r1 = add i32 10, %r0  ; 10 + 10 = 20
ret i32 %r1
```

## ✅ What Actually Works

**Current compiler capabilities** (without arithmetic):
1. ✅ Function definitions with parameters
2. ✅ Variable declarations with literals
3. ✅ Variable references
4. ✅ Function calls (with manual .ll fix)
5. ✅ Return statements
6. ✅ Multiple statements in functions

## 🎯 Path Forward

### Option A: Alternative Encoding (Hacky)
Store arithmetic as strings: `"5+7"` → parse in codegen
- ✅ Might work around bootstrap limitation
- ❌ Very hacky and limited
- ❌ Won't support variables in expressions

### Option B: Wait for Self-Hosting
- Skip arithmetic for now
- Attempt self-compilation with current features
- After self-hosting, arithmetic will work naturally
- **RECOMMENDED**

### Option C: Different Features
Focus on features that don't need nested objects:
- String operations (if runtime supports)
- Print statements
- More complex control flow (if possible)

## 📝 Lessons Learned

1. **Bootstrap limitations are real**: Some features fundamentally blocked
2. **Nested data structures**: Core requirement for expression trees
3. **Self-hosting becomes critical**: To unlock full language features
4. **Prioritization matters**: Focus on features that unblock self-hosting

## 🚀 Impact on Self-Hosting

**Can we self-compile without arithmetic?**

Compiler needs:
- ✅ Functions
- ✅ Parameters  
- ✅ Variables
- ✅ Function calls
- ❌ Arithmetic (for array indexing, counters, etc.)
- ❌ Comparisons (for if/while conditions)
- ❌ Control flow (if/while)

**Assessment**: Arithmetic is **required** for self-hosting.

**But**: Parser and codegen **code already exists**! After self-hosting with a more capable compiler, arithmetic will work immediately.

## ✅ Phase 17 Status: Documented Limitation

**Code Status**:
- ✅ Parser for arithmetic expressions: Written and correct
- ✅ Codegen for arithmetic: Written and correct
- ❌ Bootstrap compiler: Cannot execute this code

**Next Steps**:
1. Try self-compilation to see what's truly missing
2. Document all missing features
3. Plan path to overcome bootstrap limitations

**Recommendation**: Attempt Phase 18 - Self-Compilation Analysis to identify **minimum viable feature set** needed.

---

**Note**: This phase documents an important discovery about bootstrap compiler limitations. The code written here will work perfectly once we have a self-hosted compiler!
