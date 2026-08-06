# Phase 13: Multiple Statements & Variable Declarations

**Date**: July 7, 2026  
**Status**: ✅ Complete

## 🎯 Objective
Extend compiler to handle multiple statements and variable declarations within function bodies.

## ✅ Features Implemented

### 1. Multiple Statements
- Parser loops through statements until `}`
- Supports any number of statements in function body

### 2. Variable Declarations
```typescript
let x: i32 = 10;
let y: i32 = 7;
```

**Parser**:
- Parses `LET identifier : type = value ;`
- Creates VarDeclStmt AST nodes

**Codegen**:
- Emits `alloca i32` for stack allocation
- Emits `store i32 value, ptr %reg` to initialize
- Tracks variables in `localVars` array

### 3. Variable References
```typescript
return x;  // Load from variable
```

**Parser**:
- Distinguishes IDENTIFIER from NUMBER in return statements

**Codegen**:
- Looks up variable in `localVars`
- Emits `load i32, ptr %reg` to retrieve value
- Returns loaded register

## 🐛 Bootstrap Compiler Bugs & Workarounds

### Bug 1: Can't Check `kind` Field
**Symptom**: Reading `stmt.kind` returns value from different field

**Workaround**: Check distinctive fields instead
```typescript
// Instead of: if (stmt.kind == "VarDeclStmt")
// Use:
if (stmt.typeAnnotation != "") {  // VarDeclStmt has this field
    // Handle VarDecl
}
```

### Bug 2: Can't Distinguish Number vs Identifier
**Symptom**: Both stored in `name` field

**Workaround**: String matching
```typescript
private isDigits(s: string): bool {
    if (s == "0") return true;
    if (s == "1") return true;
    // ... etc
}
```

## 📊 Test Results

### Test Case
```typescript
function test(): i32 {
    let x: i32 = 5;
    let y: i32 = 7;
    return y;
}
```

### Generated LLVM IR
```llvm
define i32 @test() {
entry:
  %r0 = alloca i32, align 8
  store i32 5, ptr %r0, align 8
  %r1 = alloca i32, align 8
  store i32 7, ptr %r1, align 8
  %r2 = load i32, ptr %r1, align 8
  ret i32 %r2
}
```

✅ Correct allocation for x
✅ Correct allocation for y  
✅ Loads from y (%r1)
✅ Returns loaded value

## 📈 Code Changes

| File | Lines Changed | Key Changes |
|------|---------------|-------------|
| `parser.tsn` | +80 | Loop for multiple statements, LET parsing |
| `codegen.tsn` | +40 | VarDecl emission, Identifier lookup |
| `main.tsn` | +10 | Updated test case |

## 🚀 Impact

**Before Phase 13**: Only single return statement
**After Phase 13**: Full statement blocks with variables!

This unlocks:
- Real function implementations
- Local state management
- Foundation for control flow (if/while)

## 📝 Lessons Learned

1. **Field-based type checking works**: When kind field is broken, use distinctive fields
2. **String matching for literals**: Acceptable workaround for bootstrap limitations
3. **localVars array pattern**: Simple but effective variable tracking

## ✅ Phase 13 Complete!

**Next**: Phase 14 - Multiple functions & function calls
