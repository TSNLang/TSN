# Phase 18: Self-Compilation Requirements Analysis

**Date**: July 8, 2026  
**Goal**: Phân tích chính xác compiler source cần gì để self-compile

## 📋 Compiler Source Code Analysis

### Files to Compile
1. `compiler/src/ast.tsn` (~200 lines)
2. `compiler/src/lexer.tsn` (~220 lines)
3. `compiler/src/parser.tsn` (~400 lines)
4. `compiler/src/codegen.tsn` (~300 lines)
5. `compiler/src/main.tsn` (~100 lines)

**Total**: ~1220 lines of TSN code

## 🔍 Language Features Used

### ✅ Already Implemented

| Feature | Usage in Compiler | Status |
|---------|------------------|--------|
| **Classes** | Token, Lexer, Parser, Codegen, etc. | ✅ Working |
| **Constructors** | All classes have constructors | ✅ Working |
| **Methods** | All operations are methods | ✅ Working |
| **Fields** | String, i32, Array fields | ✅ Working |
| **Functions** | Helper functions (intToString, etc.) | ✅ Working |
| **Parameters** | Methods have parameters | ✅ Working |
| **Variables** | `let x: i32 = ...` | ✅ Working |
| **Return** | All methods return values | ✅ Working |
| **String operations** | `.length`, `.slice()`, `.charCodeAt()` | ⚠️ Runtime only |
| **Method calls** | `this.scanToken()`, `lexer.tokenize()` | ✅ Working |

### ❌ Critical Missing Features

| Feature | Usage Examples | Blocker? | Workaround? |
|---------|----------------|----------|-------------|
| **Arithmetic** | `pos + 1`, `line - 1`, `i * 2` | 🔴 YES | ❌ No |
| **Comparisons** | `pos < length`, `ch == 32` | 🔴 YES | ⚠️ Maybe |
| **if statements** | `if (ch == 32) { ... }` | 🔴 YES | ❌ No |
| **while loops** | `while (pos < length) { ... }` | 🔴 YES | ❌ No |
| **Array.get()** | `tokens.get(i)` | 🟡 Medium | ✅ Yes |
| **Array.push()** | `tokens.push(token)` | 🟡 Medium | ✅ Yes |
| **Boolean logic** | `&&`, `||` | 🟡 Medium | ⚠️ Maybe |

## 🔴 Arithmetic Usage Analysis

### In Lexer (~220 lines):

```typescript
// Position tracking (occurs ~20 times)
this.pos = this.pos + 1;
this.column = this.column + 1;
this.line = this.line + 1;

// Bounds checking (occurs ~15 times)
if (this.pos < this.source.length)
if (this.pos + 1 >= this.source.length)

// Char code comparisons (occurs ~40 times)
if (ch == 32 || ch == 9 || ch == 13)
if (ch >= 65 && ch <= 90)
if (ch >= 48 && ch <= 57)

// Slicing
lexeme = this.source.slice(start, this.pos);
```

**Arithmetic operations needed**: `+`, `-`, `<`, `>`, `>=`, `<=`, `==`, `!=`

### In Parser (~400 lines):

```typescript
// Token navigation (occurs ~50 times)
this.current = this.current + 1;
this.current - 1;

// Array access (occurs ~100 times)
this.tokens.get(this.current)
this.tokens.get(i)

// Counting (occurs ~10 times)
while (i < array.length) {
    i = i + 1;
}
```

**Arithmetic operations needed**: `+`, `-`, `<`, `>`

### In Codegen (~300 lines):

```typescript
// Register counting (occurs ~20 times)
this.regCounter = this.regCounter + 1;

// Variable tracking with index math (occurs ~30 times)
let i = 0;
while (i < this.localVars.length) {
    let varName = this.localVars.get(i);
    let varReg = this.localVars.get(i + 1);
    i = i + 2;  // Skip by 2
}
```

**Arithmetic operations needed**: `+`, `-`, `<`

## 📊 Feature Frequency Analysis

| Feature | Occurrences | Criticality |
|---------|-------------|-------------|
| `i + 1`, `i - 1` | ~100 times | 🔴 Critical |
| `<`, `>`, `<=`, `>=` | ~80 times | 🔴 Critical |
| `==`, `!=` | ~120 times | 🔴 Critical |
| `if (...) { }` | ~150 times | 🔴 Critical |
| `while (...) { }` | ~30 times | 🔴 Critical |
| `Array.get(i)` | ~200 times | 🔴 Critical |
| `Array.push()` | ~50 times | 🟡 Medium |
| `&&`, `||` | ~20 times | 🟡 Medium |

## 🎯 Minimum Viable Feature Set for Self-Hosting

### Tier 1: Absolutely Required (Cannot self-compile without these)

1. **Arithmetic operators**: `+`, `-` (for counters, indexing)
2. **Comparison operators**: `<`, `>`, `<=`, `>=`, `==`, `!=`
3. **if/else statements**: Control flow
4. **while loops**: Iteration
5. **Array.get(i)**: Array access

### Tier 2: Highly Beneficial (Can work around, but painful)

6. **Array.push()**: Can use fixed-size arrays instead
7. **Boolean operators**: `&&`, `||` (can nest if statements)
8. **String comparisons**: Can use workarounds

### Tier 3: Nice to Have

9. **for loops**: Can use while instead
10. **switch/case**: Can use if/else chains
11. **Array.set(i, value)**: Can use fixed arrays with manual management

## 🐛 Bootstrap Limitations vs Requirements

### What Bootstrap Can't Do:

| Limitation | Blocks | Workaround? |
|------------|--------|-------------|
| Nested objects | Arithmetic, Comparisons | ❌ Fundamental |
| Array.push() | Dynamic arrays | ⚠️ Use fixed-size arrays |
| Field assignment bugs | Various | ⚠️ Use string encoding |

### The Core Problem:

**All expressions require nested Expr objects**:
- `a + b` → BinaryExpr with left/right
- `x < y` → BinaryExpr with left/right  
- `if (condition)` → needs condition Expr

**Bootstrap compiler cannot create/read nested objects** → Cannot implement ANY expressions!

## 💡 Potential Solutions

### Solution 1: Macro-Based Arithmetic (String Encoding)

**Idea**: Encode simple expressions as strings, expand in codegen

```typescript
// Instead of: let x: i32 = pos + 1;
// Write: let x: i32 = PLUS(pos, 1);  // Macro

// Codegen recognizes "PLUS" pattern:
if (init.name == "PLUS") {
    // Extract "pos" and "1" from name field
    // Emit: %r = load pos; %r2 = add %r, 1
}
```

**Pros**:
- ✅ Avoids nested objects
- ✅ Can implement common patterns

**Cons**:
- ❌ Very hacky
- ❌ Limited to simple cases
- ❌ Not real expressions

### Solution 2: Minimal Python Bootstrap Enhancement

**Idea**: Fix ONLY nested object support in bootstrap compiler

**What to fix**:
```python
# In bootstrap compiler.py, fix:
def visit_assign(node):
    # Currently: Only assigns primitives
    # Fix: Support assigning object references
    if isinstance(value, ObjectRef):
        self.emit_assign_object_field(...)
```

**Pros**:
- ✅ Surgical fix to ONE bug
- ✅ Unlocks ALL expressions
- ✅ No workarounds needed

**Cons**:
- ⚠️ Still using Python (temporary)
- ⚠️ Might take 1-2 hours

### Solution 3: Alternative Backend (C or LLVM IR directly)

**Idea**: Write minimal compiler in C that handles nested objects

**Pros**:
- ✅ Will work correctly
- ✅ Fast execution

**Cons**:
- ❌ Another language to maintain
- ❌ More bootstrap complexity

### Solution 4: Two-Stage Bootstrap

**Stage 1**: Compile simplified compiler (no expressions)
**Stage 2**: Use Stage 1 to compile full compiler

**Problem**: Stage 1 can't even compile itself without expressions!

## 🎖️ Recommendation

### Best Path Forward: **Solution 2 - Fix Nested Objects in Bootstrap**

**Why**:
1. **Surgical**: Fix ONE bug, unlock ALL features
2. **Time-bound**: ~1-2 hours of work
3. **Temporary**: Still plan to delete Python after self-host
4. **Unblocks**: Arithmetic, comparisons, control flow ALL work

**Alternative acceptable approach**:
- Document current state comprehensively
- Ship compiler v2 as "subset language compiler"
- Use it for simple programs
- Plan v3 with different bootstrap strategy

## 📋 Next Steps

### If Fixing Bootstrap (Recommended):

1. **Identify exact bug** in `bootstrap/compiler.py`
2. **Add nested object support** for Expr assignment
3. **Test** with simple arithmetic
4. **Recompile** all compiler sources
5. **Attempt self-compilation**

### If Not Fixing Bootstrap:

1. **Document current capabilities** thoroughly
2. **Ship as v2.0** - "TSN Subset Compiler"
3. **Plan v3 bootstrap** strategy
4. **Consider** Rust/C bootstrap instead

## 📊 Time Estimation

| Approach | Time | Success Chance |
|----------|------|----------------|
| Fix bootstrap nested objects | 1-2 hours | 90% |
| Macro-based workaround | 3-4 hours | 60% |
| Alternative backend | 8-12 hours | 95% |
| Two-stage bootstrap | 6-8 hours | 70% |

## ✅ Conclusion

**Self-compilation is VERY CLOSE but blocked by ONE fundamental bug: nested object assignment in bootstrap compiler.**

**Two viable paths**:
1. Fix the bug (fast, surgical, temporary)
2. Ship v2 as-is, plan better v3 bootstrap

**Your decision**: Which path do you prefer? 🤔
