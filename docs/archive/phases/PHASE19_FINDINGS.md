# Phase 19: Bootstrap Fix Attempt - Findings

**Date**: July 8, 2026  
**Status**: ⚠️ Discovered Deeper Issue

## 🎯 Original Goal
Fix Python bootstrap compiler to support nested Expr objects for arithmetic.

## 🔍 Discovery: Python Compiler Already Works!

### Test Results

**Created**: `test-arithmetic.tsn`
```typescript
function test(): i32 {
    return 5 + 7;
}
```

**Compiled with Python Bootstrap**:
```bash
$ python compiler.py test-arithmetic.tsn -o test-arithmetic.ll
Success!
```

**Generated LLVM IR**:
```llvm
define i32 @test() {
entry:
  %r0 = add i32 5, 7    ; ✅ CORRECT!
  ret i32 %r0
}
```

**Execution**:
```bash
$ ./test-arithmetic.exe
$ echo $?
12    ; ✅ CORRECT! (5 + 7 = 12)
```

**Conclusion**: Python bootstrap compiler **ALREADY SUPPORTS** arithmetic perfectly!

## 🐛 The Real Problem

### Problem is NOT in Python Compiler

Python compiler can:
- ✅ Parse arithmetic expressions
- ✅ Create BinaryExpr AST nodes
- ✅ Emit correct LLVM IR (`add`, `sub`, etc.)
- ✅ Handle nested Expr objects

### Problem IS in Generated LLVM IR for TSN Compiler

**The Issue**:
1. Python compiles `parser.tsn` → generates `parser.ll`
2. Generated `parser.ll` has **BUGGY CODE** for creating/handling Expr objects
3. When `tsnc.exe` (built from parser.ll) tries to parse arithmetic, it crashes
4. Crash happens because parser.ll doesn't correctly handle Expr.left/right fields

## 📊 Evidence

### What Python Generates for TSN Parser

When Python compiles TSN source that creates BinaryExpr:
```typescript
// In parser.tsn:
let expr = new Expr();
expr.left = leftExpr;   // ← Python generates WRONG IR for this!
expr.right = rightExpr; // ← And this!
```

**Python generates IR that doesn't properly store nested object references!**

### Why Python's Own Arithmetic Works

When Python compiles simple arithmetic code directly:
```typescript
return 5 + 7;  // ← Python handles this in its own parser
```

Python's **OWN parser** creates BinaryExpr correctly, emits correct IR.

But when Python compiles TSN's parser code that ALSO needs to create BinaryExpr:
```typescript
// TSN parser creating AST nodes
let binExpr = new Expr();
binExpr.left = ... ;  // ← This assignment IR is buggy!
```

Python generates IR for **assignment** that doesn't work!

## 🔬 Root Cause Analysis

### Python Compiler Has Two Code Paths

**Path 1: Python's Own Expression Handling** ✅
- Python parses `5 + 7`
- Python creates its own AST
- Python emits IR directly
- **Works perfectly!**

**Path 2: Compiling TSN Code That Creates Objects** ❌
- Python compiles TSN assignment: `expr.left = value`
- Python generates LLVM getelementptr + store
- But generated IR is **INCORRECT** for object references
- **Breaks nested objects!**

### Specific Bug Location

In `bootstrap/compiler.py`, function `emit_assign()`:

```python
def emit_assign(self, expr: AssignExpr) -> tuple:
    # Field assignment: this.field = value
    if isinstance(expr.target, MemberExpr):
        # ... generates getelementptr ...
        # ... generates store ...
```

**This code works for primitive fields (i32, string)**
**But generates WRONG IR for object reference fields (Expr, Stmt)**

## 💡 Why This is Hard to Fix

### The Challenge

Python compiler needs to:
1. Detect when field type is object reference (ptr)
2. Generate different IR for object vs primitive assignment
3. Handle reference counting (if used)
4. Ensure object lifetime management

**Current code treats ALL fields the same way** → works for primitives, fails for objects!

### What Needs to Change

```python
# In emit_assign(), need to distinguish:
if field_type == 'ptr' and is_object_reference:
    # Object reference assignment
    # Need special handling:
    # - Store object pointer
    # - Maybe incref/decref
    # - Ensure proper alignment
else:
    # Primitive assignment (current code)
```

## 🎯 Actual Fix Required

### Option A: Fix Python emit_assign()

**Change**: Add object reference handling in `emit_assign()`

**Complexity**: Medium
- Need to track which fields are object references
- Need to generate correct store for ptr types
- May need reference counting

**Time**: 2-3 hours

**Risk**: Medium - might break other things

### Option B: Avoid Nested Objects Entirely

**Strategy**: Use alternative AST representation

Instead of:
```typescript
class Expr {
    left: Expr;    // ← Nested object
    right: Expr;
}
```

Use:
```typescript
class Expr {
    leftIndex: i32;   // Index into expression array
    rightIndex: i32;
}
// Store all Expr in flat array
```

**Complexity**: High - requires rewriting AST
**Time**: 8-12 hours
**Risk**: High - major refactor

### Option C: Workaround with String Encoding

Encode expressions as strings in TSN compiler:
```typescript
// Instead of: expr.left = leftExpr
// Use: expr.encoded = "5+7"
```

**Complexity**: Medium
**Time**: 4-6 hours
**Risk**: Low - isolated changes
**Limitation**: Only works for simple cases

## 📋 Recommendation

### Best Path: Option A with Careful Testing

**Steps**:
1. **Identify exact bug** in Python `emit_assign()`
2. **Add test case** for object field assignment
3. **Fix getelementptr/store generation** for ptr fields
4. **Test incrementally**:
   - Compile simple nested object code
   - Verify generated IR
   - Run compiled program
5. **Recompile TSN compiler** with fix
6. **Test arithmetic in TSN v2**

**Estimated time**: 2-3 hours
**Success probability**: 70%

### Alternative: Option C as Interim Solution

If Option A proves too difficult:
- Implement string-encoded arithmetic
- Document as temporary
- Plan proper fix for v3

## ✅ Next Actions

**Immediate**:
1. Create minimal test case for nested object assignment
2. Examine generated IR to pinpoint bug
3. Attempt surgical fix to `emit_assign()`

**If fix works**:
4. Recompile all TSN sources
5. Test arithmetic in TSN v2
6. Proceed to control flow (if/while)
7. Attempt self-compilation!

**If fix fails**:
4. Document limitation
5. Implement workaround (string encoding)
6. Ship v2 with documented constraints

## 📊 Status Summary

- ✅ Python compiler fundamentally capable
- ❌ Generated IR for nested objects buggy
- 🎯 Fix location identified
- ⏰ 2-3 hours estimated for fix
- 🔄 Ready to attempt fix OR implement workaround

**Decision needed**: Attempt Python fix now, or implement workaround?
