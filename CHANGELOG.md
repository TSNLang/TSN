# Changelog

All notable changes to TSN will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.10.0-indev] - 2026-04-14

### Fixed
- **Critical Bug**: Fixed parameter vs local variable loading in TypeScript compiler codegen
  - Parameters now correctly load from `%name.addr`
  - Local variables correctly load from `%name`
  - Globals correctly load from `@name`
  - Added parameter tracking with `currentFunctionParams` set
  - Verified with integration test returning correct exit code (30)
  - Files: `compiler-ts/src/codegen.ts`, `src/test_integration.tsn`

### � Major Changes
- **Complete rewrite**: Moved from C++ to TypeScript/Deno + TSN
- **Dual compiler system**: TypeScript compiler for bootstrap, TSN compiler for self-hosting
- **Modular architecture**: Clean separation of Lexer, Parser, Codegen

### Added - TypeScript Compiler (compiler-ts/)
- Complete lexer with all token types
- Full parser with expression precedence
- Codegen for all TSN language features
- Support for global `const` and `let` declarations
- Support for optional braces in if/else/while/for
- For loop with assignment in init and update
- FFI annotations (`@ffi.lib()`)
- Successfully compiles `bootstrap_compiler.tsn` (1063 lines)
- Self-hosting proof: bootstrap compiler compiles itself

### Added - TSN Compiler (src/)
- Modular architecture design
- `Types.tsn` - Type definitions and constants
- `Lexer.tsn` - Lexical analyzer skeleton
- `Parser.tsn` - Syntax analyzer skeleton
- `Codegen.tsn` - Code generator skeleton
- `Main.tsn` - Entry point with FFI
- `Compiler.tsn` - All-in-one version
- Documentation and README

### Changed
- Retired C++ compiler (v0.1-0.8)
- New version numbering: 0.10.0 (skipping 0.9.0)
- Updated README to reflect new architecture
- Moved old documentation to `archive/`

### Technical Details
- TypeScript compiler runs on Deno runtime
- Generates valid LLVM IR
- Compiles to native executables via Clang
- No build step required for development

---

## [0.8.0] - 2026-04-12 (C++ Era - Final)

### Added
- Bootstrap compiler in TSN (`bootstrap_compiler.tsn`)
- Self-hosting achieved with C++ compiler
- Complete control flow support
- Structs, arrays, pointers, FFI
- File I/O operations

### Issues
- C++ compiler too complex to maintain
- Hard to debug and extend
- Slow compile times
- Required C++ knowledge for contributions

**Decision**: Complete rewrite in TypeScript/TSN for v0.10.0

---

## [0.1.0 - 0.7.0] - 2024-2026 (C++ Era)

### Summary
- Initial development with C++ compiler
- Basic language features
- LLVM IR generation
- Proof of concept

**See `archive/` for detailed history of C++ era**

---

## Version History

- **v0.10.0-indev** (Current) - TypeScript/TSN dual compiler system
- **v0.8.0** (Archived) - C++ compiler final version
- **v0.1.0-0.7.0** (Archived) - C++ compiler development

---

## Migration Guide

### From v0.8.0 (C++ Compiler) to v0.10.0 (TypeScript Compiler)

**Old way:**
```bash
mkdir build && cd build
cmake ..
cmake --build . --config Release
./build/Release/tsnc.exe input.tsn -o output.exe
```

**New way:**
```bash
# No build needed!
deno run --allow-read --allow-write compiler-ts/src/main.ts input.tsn output.ll
clang output.ll -o output.exe
```

**Benefits:**
- ✅ No build step
- ✅ Faster iteration
- ✅ Easier to debug
- ✅ Easier to contribute
- ✅ Cross-platform (Deno runs everywhere)

---

*For older changes, see `archive/CHANGELOG_v0.8.md`*
