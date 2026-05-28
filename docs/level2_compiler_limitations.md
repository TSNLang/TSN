# Level 2 Compiler Limitations

## Overview

The Level 2 compiler (self-hosting/main.tsn) is a simplified TSN compiler written in TSN itself. It successfully compiles simple TSN programs but has fundamental limitations that prevent it from achieving full self-hosting (compiling itself).

## Current Status

- **Link Errors**: Reduced from 6 to 4 through extensive improvements
- **Latest Commits**: 
  - ea2197c: Comprehensive Level 2 compiler improvements
  - 24ac02e: Fixed function parameter tracking bug
  - b629fb5: Added conditionals test
  - 23eb76b: Added loops test
- **Compilation Success**: Can compile single-file programs without OOP features
- **Verified Working**: Arithmetic operations, conditionals, loops with function parameters

## Implemented Features

### ✅ Working Features

1. **Lexer**
   - Tokenization with all token types
   - Escape sequence decoding (\n, \r, \t, \0, \\, \", \')
   - String literals with proper handling

2. **Parser**
   - Full AST construction
   - Expression parsing (binary, unary, literals, identifiers)
   - Statement parsing (if, while, return, variable declarations)
   - Function declarations

3. **MIR Builder**
   - Basic type inference for primitives (i32, i64, i8, bool, string, ptr)
   - Null literal and identifier handling
   - IntToPtr casts for pointer arithmetic
   - NewExpr type inference (returns ptr)
   - MemberExpr callee handling for qualified calls (e.g., memory.offset())
   - Extensive function return type hints
   - Pointer arithmetic type coercion
   - **Function parameter tracking** (fixed in 24ac02e) - parameters now properly tracked in locals table

4. **Code Generation**
   - LLVM IR emission
   - Function definitions
   - Basic blocks with proper terminators
   - Conditional declares (log, print_i32, offset)
   - Windows API declares

## Missing Features (Blocking Self-Hosting)

### ❌ Not Implemented

1. **Field Assignment**
   - Cannot generate code for `object.field = value`
   - Example: `state.source = fsResult.value()`
   - Impact: Cannot compile code that modifies object fields

2. **Field Access Type Inference**
   - Cannot determine type of `object.field`
   - Example: `state.tokens` type is unknown
   - Impact: All field accesses return default i32 type

3. **Method Call Resolution**
   - Cannot resolve method calls on objects
   - Example: `pLen.get()` where pLen is rawPtr<i32>
   - Impact: Method calls become `@unknown` or return wrong types

4. **Local Variable Type Tracking**
   - Cannot track types through assignments in function body
   - Example: `let x = someFunction(); return x;` loses type information
   - Impact: Return statements may have wrong types

5. **Generic Type Resolution**
   - Cannot handle generic types like `rawPtr<T>`, `Array<T>`
   - Impact: Cannot determine element types or method return types

6. **Module Resolution**
   - No module resolver (single-file compilation only)
   - Cannot resolve imports across files
   - Impact: Must compile all modules separately

7. **Class Compilation**
   - Methods become stubs (empty functions returning 0)
   - No vtable generation
   - No field layout calculation
   - Impact: Cannot compile OOP code

## Remaining Link Errors (4 total)

### 1. main-l2.ll:81 - Invalid operand type
```llvm
%r7 = add ptr null, %r6
```
**Cause**: Field assignment `state.source = fsResult.value()` generates invalid pointer arithmetic
**Root Issue**: No field assignment codegen support

### 2. fs-l2.ll:227 - Undefined value %r59
```llvm
%r28 = load i32, ptr %r59
```
**Cause**: Unreachable code after early return still references undefined variables
**Root Issue**: Control flow analysis bug - generates code after return statements

### 3. memory-l2.ll:96 - Return type mismatch
```llvm
define ptr @offset(...) {
  ret i32 %r8  // Should be ptr
}
```
**Cause**: Local variable type tracking lost through assignments
**Root Issue**: No type propagation in function body

### 4. string-l2.ll:45 - Return type mismatch
```llvm
define i32 @byteLength(...) {
  ret ptr %r7  // Should be i32
}
```
**Cause**: Method call `pLen.get()` returns wrong type
**Root Issue**: No method call type inference

## Workarounds Attempted

1. ✅ **Function return type hints**: Hardcoded return types for known functions
2. ✅ **MemberExpr callee handling**: Resolve qualified calls like `memory.offset()`
3. ✅ **Conditional declares**: Avoid redefinition errors
4. ❌ **Field assignment**: No viable workaround without full codegen
5. ❌ **Method calls**: Cannot distinguish between different method names

## Why Full Self-Hosting is Not Achievable

To compile itself, Level 2 compiler needs to compile:
- `self-hosting/main.tsn` - Uses CompilerState class with field assignments
- `self-hosting/mir-builder.tsn` - Uses extensive OOP with method calls
- `src/std/*.tsn` - Uses generic types and method calls

All of these require features that Level 2 fundamentally lacks:
- **Type system**: Track types through assignments, field access, method calls
- **OOP compilation**: Generate code for classes, methods, fields
- **Generic resolution**: Handle parameterized types

Implementing these features would require:
1. Full type inference engine
2. Symbol table with scope tracking
3. Class definition storage and lookup
4. Method resolution with receiver type checking
5. Generic instantiation logic

This is equivalent to **rewriting the entire Level 1 compiler in TSN** - defeating the purpose of a "simplified" Level 2 compiler.

## Conclusion

Level 2 compiler successfully demonstrates:
- ✅ TSN can compile simple procedural programs
- ✅ Self-hosting is theoretically possible
- ✅ LLVM IR generation works correctly

But achieving **true self-hosting** requires:
- ❌ Full type system (not feasible in simplified compiler)
- ❌ OOP compilation (architectural limitation)
- ❌ Module resolution (out of scope for Level 2)

**Recommendation**: Level 2 compiler serves as a proof-of-concept. For production self-hosting, implement full type system in Level 1 compiler first, then port to TSN.
