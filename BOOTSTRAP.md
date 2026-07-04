# TSN Compiler Bootstrap Process

## Current Status

The TSN self-hosted compiler is **partially working** but has runtime bugs when compiling complex programs including itself. Therefore, we use a **bootstrap approach** with the TypeScript-based compiler (via Deno).

## Bootstrap Requirement

**You need Deno (TypeScript runtime) to build the TSN compiler from source.**

This is a **bootstrap compiler** - it compiles TSN source code to LLVM IR, which is then used to build the self-hosted TSN compiler.

## Build Process

### Step 1: Compile TSN compiler modules with TypeScript compiler

```powershell
# Compile all compiler modules using Deno/TypeScript
deno run --allow-all src/src/main.ts self-hosting/ast.tsn -o self-hosting/ast_ts.ll
deno run --allow-all src/src/main.ts self-hosting/lexer.tsn -o self-hosting/lexer_ts.ll
deno run --allow-all src/src/main.ts self-hosting/ast-parser.tsn -o self-hosting/ast-parser_ts.ll
deno run --allow-all src/src/main.ts self-hosting/mir-flat.tsn -o self-hosting/mir-flat_ts.ll
deno run --allow-all src/src/main.ts self-hosting/mir-builder-flat.tsn -o self-hosting/mir-builder-flat_ts.ll
deno run --allow-all src/src/main.ts self-hosting/mir-codegen-flat.tsn -o self-hosting/mir-codegen-flat_ts.ll
deno run --allow-all src/src/main.ts self-hosting/main.tsn -o self-hosting/main_ts.ll
```

### Step 2: Build the compiler executable with Clang

```powershell
clang -o self-hosting/compiler_complete.exe `
  self-hosting/ast_ts.ll `
  self-hosting/lexer_ts.ll `
  self-hosting/ast-parser_ts.ll `
  self-hosting/mir-flat_ts.ll `
  self-hosting/mir-builder-flat_ts.ll `
  self-hosting/mir-codegen-flat_ts.ll `
  self-hosting/main_ts.ll `
  src/std/string.ll `
  src/std/array.ll `
  src/std/console.ll `
  src/std/memory.ll `
  src/std/array_token.ll `
  src/tsn_runtime_stubs_linking.ll `
  src/tsn_runtime.c `
  -Wno-override-module
```

### Step 3: Use the compiler

```powershell
.\self-hosting\compiler_complete.exe your-program.tsn
```

## Known Issues

### Array Index Bug in Self-Hosted Compilation

When the self-hosted TSN compiler compiles itself (or other complex programs), it generates **buggy LLVM IR** for array access in loops.

**Bug Pattern:**
```llvm
; WRONG: loads from array.length field pointer instead of loop variable
%length_ptr = getelementptr inbounds %Array, ptr %arr, i32 0, i32 3
%index = load i32, ptr %length_ptr, align 4  ; ← BUG: should load from %i
%result = call ptr @Array_get_impl(ptr %array, i32 %index)
```

**Should be:**
```llvm
; CORRECT: loads from loop variable
%index = load i32, ptr %i, align 4
%result = call ptr @Array_get_impl(ptr %array, i32 %index)
```

**Impact:**
- Affects ~72 locations across mir-builder-flat and mir-codegen-flat when compiled by self-hosted compiler
- Causes crashes, infinite loops, or incorrect results
- **Does NOT affect code compiled by TypeScript compiler**

**Workaround:**
- Use TypeScript/Deno compiler for bootstrap (current approach)
- A Python script `fix_array_get_v2.py` can detect and fix these bugs post-compilation

**Root Cause:**
Unknown - likely a bug in MIR code generation for loops with array access. The TypeScript compiler generates correct code, but the self-hosted compiler generates incorrect register references.

## Why Bootstrap with TypeScript?

1. **TypeScript compiler is stable** - generates correct LLVM IR
2. **Self-hosted compiler has runtime bugs** - crashes when compiling complex programs
3. **Traditional bootstrap approach** - many compilers (Rust, Go, etc.) use an existing compiler for initial builds

## Future Goals

- Debug and fix the array index bug in self-hosted compilation
- Achieve **100% self-hosting** - TSN compiler compiling itself without external dependencies
- Remove TypeScript/Deno requirement once self-hosted compiler is stable

## Testing Self-Hosted Compiler

Simple programs work fine:

```powershell
# This works
.\self-hosting\compiler_complete.exe examples/hello.tsn
```

But compiling the compiler itself fails:

```powershell
# This crashes with runtime errors
.\self-hosting\compiler_complete.exe self-hosting/mir-builder-flat.tsn
```

## Summary

✅ **Current approach**: TypeScript compiler → LLVM IR → Clang → TSN compiler binary  
❌ **Not yet working**: TSN compiler → LLVM IR → Clang → TSN compiler binary  
🎯 **Goal**: Remove TypeScript dependency and achieve full self-hosting
