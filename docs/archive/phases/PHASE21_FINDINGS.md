# Phase 21: Control Flow (if/else, while) - BLOCKED

**Date**: July 8, 2026  
**Status**: ❌ Blocked by Same Nested Object Issue

## 🎯 Objective
Implement if/else statements and while loops for control flow.

## ❌ Same Fundamental Limitation

### The Nested Object Problem Returns

Control flow statements require nested block structures:

```typescript
class Stmt {
    // IfStmt fields
    condition: Expr;        // ← Nested object
    thenBlock: BlockStmt;   // ← Nested object!
    elseBlock: BlockStmt;   // ← Nested object!
    
    // WhileStmt fields
    body: BlockStmt;        // ← Nested object!
}
```

### What Happens

1. ✅ Added if/while fields to AST
2. ✅ Added if/while parsing to parser
3. ✅ Added if/while codegen
4. 🔄 Compiled with Python bootstrap
5. ❌ **Compiler crashes** - same as arithmetic!

### Root Cause

**Same bug as Phase 17**: Python bootstrap generates incorrect LLVM IR for nested object field assignments.

```typescript
// In parser.tsn:
stmt.thenBlock = block;  // ← Python generates buggy IR!
```

When compiled, this assignment doesn't work correctly.

## 📊 Impact Assessment

### Features Requiring Nested Objects

| Feature | Needs | Status |
|---------|-------|--------|
| Arithmetic | `expr.left`, `expr.right` | ❌ Blocked |
| Comparisons | Same as arithmetic | ❌ Blocked |
| if/else | `stmt.thenBlock`, `stmt.elseBlock` | ❌ Blocked |
| while loops | `stmt.body` | ❌ Blocked |
| Function calls with args | `expr.args` array (push bug) | ⚠️ Partial |

**Conclusion**: ALL advanced features blocked by nested object bug!

## 💡 Why This Matters for Self-Compilation

### Compiler Source Code Uses These Features Heavily

From Phase 18 analysis:
- **if statements**: ~150 occurrences
- **while loops**: ~30 occurrences
- **Arithmetic**: ~100 occurrences
- **Comparisons**: ~200 occurrences

**Self-compilation requires ALL of these!**

## 🔄 Alternative Approaches Considered

### Option 1: Flat Statement Array
Store all statements in flat array with indices instead of nesting:
```typescript
class Stmt {
    thenStartIdx: i32;  // Index of first statement in then block
    thenEndIdx: i32;    // Index of last statement
}
// Store all statements in Program.allStatements array
```

**Pros**: No nested objects
**Cons**: Major AST redesign, complex to manage

### Option 2: String-Encoded Blocks
Encode blocks as strings, parse later:
```typescript
stmt.thenCode = "{ return 5; }";
```

**Pros**: No nested objects
**Cons**: Very hacky, limited functionality

### Option 3: Skip Control Flow Entirely
Focus on other features that don't need nesting.

**Pros**: Avoid blocked features
**Cons**: Can't self-compile without control flow!

## 🎯 The Core Blocker

### Everything Circles Back to Python Bootstrap

**The Pattern**:
1. Try to add feature X
2. Feature X needs nested objects
3. Python generates buggy IR
4. Compiled compiler crashes
5. Feature X blocked

**Features Attempted**:
- Phase 17: Arithmetic ❌
- Phase 21: Control Flow ❌

**Both blocked by same bug!**

## 📋 What Actually Works

### Current TSN v2 Compiler Can Compile:

✅ **Simple Programs**:
```typescript
function test(): i32 {
    let x: i32 = 10;
    return x;
}
```

✅ **Multiple Functions**:
```typescript
function helper(): i32 { return 5; }
function main(): i32 { return helper(); }
```

✅ **Parameters** (definitions):
```typescript
function add(a: i32, b: i32): i32 {
    return a;  // Can return parameter
}
```

❌ **Cannot Compile**:
- Arithmetic: `a + b`
- Comparisons: `x < y`
- if/else: `if (x) { ... }`
- while: `while (x) { ... }`
- Arrays with expressions
- Function calls with arguments

## 🎖️ Critical Realization

### The Bootstrap Compiler is the Bottleneck

**Python bootstrap compiler**:
- ✅ Good enough for simple code
- ✅ Can compile basic classes and methods
- ❌ **CANNOT handle nested object fields**
- ❌ This blocks 90% of language features!

**To unlock full language**:
1. Must fix Python bootstrap, OR
2. Use different bootstrap (Rust/C), OR  
3. Manual workarounds for every feature (unsustainable)

## 📊 Time Investment Analysis

**Phases 17-21 Investigation**:
- Phase 17: 2 hours (arithmetic analysis)
- Phase 18: 1 hour (self-compile requirements)
- Phase 19: 2 hours (Python investigation)
- Phase 20: 1 hour (decision point)
- Phase 21: 1 hour (control flow attempt)

**Total**: 7 hours investigating same root cause!

**Outcome**: Confirmed that nested object bug blocks everything.

## ✅ Recommendation

### Stop Trying to Work Around Bootstrap Bug

**Reasoning**:
1. Every feature hits same wall
2. Workarounds are complex and limited
3. Time better spent on solution

**Two Real Options**:

### Option A: Fix Python Bootstrap Properly
**What**: Fix `emit_assign()` in `compiler.py`
**Time**: 3-4 hours (one-time fix)
**Benefit**: Unlocks ALL features
**Risk**: Moderate - might break things

### Option B: Ship v2.0, Plan v3 with Better Bootstrap
**What**: Document v2.0 capabilities and limitations
**Time**: 2 hours
**Benefit**: Clean milestone, clear path forward
**v3 Strategy**: Use Rust/C bootstrap or enhanced Python

## 🎯 Decision Time

**Phase 21 proves**: We've hit the ceiling of what bootstrap can do.

**Next Action Must Be**:
1. Fix the bootstrap, OR
2. Ship v2.0 and plan v3

**Continuing to try new features will hit the same wall every time.**

---

**Your call**: Fix Python bootstrap now, or document v2.0 and plan v3? 🤔
