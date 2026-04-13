# Version 0.10.0-indev: Complete Rewrite

## 🎉 Major Milestone: TypeScript/TSN Dual Compiler System

This is a complete architectural rewrite of TSN, moving away from C++ to a more maintainable and community-friendly approach.

### What Changed

**Retired:**
- ❌ C++ compiler (v0.1-0.8) - Too complex, hard to maintain
- ❌ CMake build system
- ❌ C++ dependencies

**New:**
- ✅ TypeScript compiler (`compiler-ts/`) - Bootstrap compiler
- ✅ TSN compiler (`src/`) - Self-hosting compiler
- ✅ Deno runtime - No build step needed
- ✅ Modular architecture - Easy to understand and extend

### TypeScript Compiler (compiler-ts/)

**Complete implementation:**
- Lexer: All tokens, comments, operators
- Parser: Full expression precedence, all statements
- Codegen: Complete LLVM IR generation
- Features: For loops, global variables, optional braces, FFI

**Achievement:**
- ✅ Compiles `bootstrap_compiler.tsn` (1063 lines)
- ✅ Self-hosting proof: Bootstrap compiler compiles itself
- ✅ Generates valid, working LLVM IR

### TSN Compiler (src/)

**Modular design:**
- `Types.tsn` - Constants and type definitions
- `Lexer.tsn` - Lexical analyzer
- `Parser.tsn` - Syntax analyzer
- `Codegen.tsn` - Code generator
- `Main.tsn` - Entry point with FFI
- `Compiler.tsn` - All-in-one version

**Status:** Architecture complete, implementation in progress

### Why This Matters

**Old approach problems:**
1. C++ too complex for community contributions
2. Slow compile times (CMake + C++)
3. Hard to debug and extend
4. Dependency on C++ toolchain

**New approach benefits:**
1. ✅ Easy to contribute (TypeScript or TSN)
2. ✅ Fast iteration (no build step)
3. ✅ Easy to debug (Deno DevTools)
4. ✅ Clear path to self-hosting
5. ✅ Sustainable development

### Files Changed

**Added:**
- `compiler-ts/` - Complete TypeScript compiler
- `src/` - TSN compiler modules
- `CHANGELOG.md` - Version history
- `COMMIT_MESSAGE.md` - This file

**Modified:**
- `README.md` - Updated for v0.10.0
- `bootstrap_compiler.tsn` - Now compiles with TypeScript compiler

**Archived:**
- Old C++ code moved to `archive/` (for reference)
- Old documentation preserved

### How to Use

**Compile TSN programs:**
```bash
deno run --allow-read --allow-write compiler-ts/src/main.ts input.tsn output.ll
clang output.ll -o program.exe
./program.exe
```

**No build step needed!** Just Deno and Clang.

### Next Steps

1. Complete TSN compiler implementation
2. Achieve full self-hosting (TSN compiler compiles itself)
3. Retire TypeScript compiler
4. Develop standard library

### Commit Details

- **Version:** 0.10.0-indev
- **Date:** 2026-04-14
- **Breaking Changes:** Yes (complete rewrite)
- **Migration:** See CHANGELOG.md

---

**This is a major milestone in TSN's journey to becoming a truly self-hosting, community-driven language!** 🚀
