<div align="center">
  <img src="resources/logo.png" alt="TSN Logo" width="200"/>
  
  # TSN - TSN Standard Notation
  
  **A recursive acronym: TSN Standard Notation**  
  *High-performance systems programming with TypeScript elegance.*
  
  [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
  [![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-blue)](https://github.com/TSNLang/TSN)
  [![Version](https://img.shields.io/badge/version-0.17.0--indev-orange)](https://github.com/TSNLang/TSN)
  [![Self-Hosting](https://img.shields.io/badge/self--hosting-BOOTSTRAP-%E2%9C%85-green)](self-hosting/README.md)
  
  *Made with ❤️ in Ho Chi Minh City, Vietnam by [Sao Tin Developers](https://github.com/SaoTin)*
</div>

---

## 🎯 What is TSN?

**TSN** is a systems programming language that maintains the elegant syntax of TypeScript while compiling directly to native code via **LLVM IR**.

Unlike standard TypeScript which runs on a VM (V8/JSC) with a Garbage Collector, TSN is designed for performance-critical applications, providing deterministic memory management and zero-overhead abstractions.

## 🚀 Version 0.17.0-indev: Self-Hosting Bootstrap

TSN 0.17.0-indev shifts the active focus from generic stabilization to the first real self-hosting bootstrap path.

**Completed foundation:**
- ✅ **Generic Stabilization Landed**: Cross-module generics, generic methods, generic constructors, and nested generic instantiation are stable enough to support compiler migration work
- ✅ **Stdlib Generic Coverage Path**: Core generic stdlib flows such as `std:array`, `std:option`, and `std:result` compile and validate through the documented `deno -> clang` path
- ✅ **Ownership-Oriented Cleanup**: Compiler cleanup logic now follows TSN ownership/borrowing semantics instead of older ARC-style assumptions
- ✅ **Use-After-Move Checks**: Owner values now trigger compile-time diagnostics after destructive move
- ✅ **Self-Hosting Scaffold**: Minimal `self-hosting/` bootstrap layout exists for AST, lexer, parser, and main entry
- ✅ **Compiler Can Build Self-Hosting Bootstrap**: `self-hosting/main.tsn` now compiles to LLVM IR, links with `clang`, and runs successfully
- ✅ **Bootstrap Lexer Subset**: The TSN lexer subset handles identifiers, numbers, strings, comments, punctuation, decorators, and initial keyword coverage needed for early compiler source parsing

**Active 0.17.0 direction:**
- 🔄 **Expand Self-Hosting Parser**: Grow `self-hosting/parser.tsn` from skeleton into a useful compiler subset parser
- 🔄 **Broaden Self-Hosting Coverage**: Continue moving compiler knowledge from TypeScript bootstrap code into TSN modules incrementally
- 🔄 **Keep Build Path Honest**: Validate progress with the real documented `deno run ... -> clang ...` workflow, not hand-edited LLVM IR

Key highlights:
- **0.17.x = Self-Hosting**: The main roadmap is now practical self-host migration rather than adding unrelated surface-area features first
- **Minimal Bootstrap First**: AST, lexer, parser, and bootstrap entry stay intentionally small so the compiler can begin proving itself in TSN step by step
- **Compiler Fixes Over IR Patches**: Self-hosting work only fixes the compiler and runtime path, never generated `.ll` files directly
- **Ownership/Borrowing Alignment**: Self-hosting progress follows TSN's ownership and automated borrowing model, not CRuntime-era mental models
- **Roadmap Available**: See `self-hosting/README.md` for the current bootstrap plan and milestones

## 🚀 Version 0.16.14-indev: Generic for Everything (Completed)

TSN 0.16.14-indev focused on making generics work reliably across the whole language before pushing deeper into self-hosting.

Completed highlights:
- ✅ **Nested Generic Support**: `Optional<Array<i32>>`, `Array<Optional<T>>` now work correctly
- ✅ **Cross-Module Generic Instantiation**: Imported generic functions and classes instantiate cleanly
- ✅ **Parser Enhancement**: `>>` token splitting for nested generic close (`Optional<Array<i32>>`)
- ✅ **Type Substitution**: Cycle-safe nested generic parameter replacement in monomorphization
- ✅ **Generic Function Inference**: `inferExprType()` now handles generic function calls with `genericArgs`
- ✅ **Generic Class Methods**: Methods on generic classes work correctly (e.g., `Container<T>.get()`, `Container<T>.set()`)
- ✅ **Generic Methods**: Methods with their own type parameters now work on non-generic classes
- ✅ **Generic Methods on Generic Classes**: Methods with type parameters on generic classes are fully functional
- ✅ **Generic Constructors**: Generic classes with constructors work correctly

## 🚀 Version 0.16.13-indev: `std:hash` Completion

TSN 0.16.13-indev uses the new Rest Parameters (`...`) foundation to make `std:hash` more practical for real multi-value hashing APIs.

Key highlights:
- **Variadic Hash Composition**: `std:hash` now moves beyond only pairwise composition with rest-parameter-based helpers such as `combineMany(...parts: i32[])`.
- **Batch Integer Hashing**: `hashI32Many(...values: i32[])` provides a direct path for hashing multiple `i32` values without manually nesting `combine(...)` calls.
- **String Group Hashing**: `combineStrings(...values: string[])` makes ordered multi-string hashing available directly in the stdlib.
- **Rest Parameters in Stdlib Calls**: Compiler call lowering now packs rest arguments for imported/internal stdlib functions too, not only direct local calls.
- **Foundation for Future Collections**: This keeps `std:hash` aligned with future `Map<K, V>` / compound-key work while staying within features the compiler now supports for real.

## 🚀 Version 0.16.12-indev: Rest Parameters (...)

TSN 0.16.12-indev prioritized Rest Parameters (`...`) so the language can express flexible APIs without multiplying one-off helper overloads.

Key highlights:
- **Rest Parameters First**: Instead of adding `hashCombine3`, `hashCombine4`, and more fixed-arity helpers, TSN moves toward variadic-style source ergonomics through rest parameters.
- **`std:hash` Roadmap**: This feature is the preferred foundation for APIs such as `hash.combine(a, b, c, d)` and broader multi-value hashing utilities.
- **Compiler Reuse Strategy**: TSN already supported the `...` token and spread lowering in array literals, and now extends that groundwork into function parameter lists and call lowering.
- **Container-Based Lowering**: The current implementation lowers rest arguments into `Array<T>` so the feature stays aligned with existing TSN ownership and collection rules.

## 🚀 Version 0.16.11-indev: `std:hash` Foundation

TSN 0.16.11-indev begins the groundwork for hashed collections by introducing a real `std:hash` module in the TSN standard library.

Key highlights:
- **`std:hash` Module**: Added foundational hashing helpers for integers, booleans, raw pointers, byte ranges, UTF-8 strings, and floating-point values.
- **Float Hashing**: `hashF32(...)` and `hashF64(...)` now hash the in-memory bit pattern of IEEE-754 values for stable low-level identity-style hashing.
- **String Hashing**: `hashString(...)` operates on the current runtime string byte representation through `std:string.byteLength(...)`.
- **Composable Hashing**: `combine(...)` and `finalize(...)` provide reusable primitives for future compound-key and container hashing.
- **Collections Roadmap**: This release prepares the low-level building blocks needed by future `Map<K, V>` and related hash-based containers.

## 🚀 Version 0.16.10-indev: Spread Operator Expansion (...)

TSN 0.16.10 bridges the user-friendly TypeScript syntax realm with LLVM IR memory instructions by natively supporting Collection Spread Operators.

Key highlights:
- **Lexical Spread Analyser (`...`)**: Inserted 3-character lookaheads within the Lexer token engine to correctly intercept the Ellipsis (`...`) syntax without splitting.
- **Array Literal Dispatch (`[ ]`)**: Overhauled Parser mechanisms handling Square Brackets (`[  ]`) to actively return native `ArrayLiteralExpr` structures matching their true intentions, obsoleting their false parsing into static tuple bindings.
- **Destructuring Dynamic Vectors**: Rewrote `codegen.ts` to fully emulate implicit `class_alloc` instantiations during runtime for variables using `let arr = [...iter]`, auto-generating `while` iterations binding to `Array<T>.push()` and `Iterator<T>.unwrap()` underneath.
- **VTable Null-Pointer Hotfix**: Stabilized dynamically embedded LLVM IR collections avoiding catastrophic `0x00 Null Virtual Pointer Call` segfaults during dynamic VTable Virtual lookups.

## 🚀 Version 0.16.9-indev: std:os Iterators & Type Inference Engine

TSN 0.16.9 implements standard OS modules, generic typing engine stabilization, and recursive expression inference processing.

Key highlights:
- **Recursive Type Inference**: Upgraded `inferExprType` to correctly dive deeply into chained method calls (ex: `os.args().toArray()`), accurately mapping their real object signatures.
- **Generic VTable Shield**: Blocked uninitialized generic templates from emitting undefined/false LLVM IR tables which corrupt the Linker phase.
- **Struct Memory Footprint Calculations**: Heavily updated `getTypeSize` so objects evaluated via FFI/`class_alloc` are treated as comprehensive memory clusters instead of simplified 8-byte pointer chunks.
- **Deep Type Cloning in Arrays**: Eliminated parameter slicing when instantiating parameter templates (`<T>`) within wrappers like `rawPtr<T>`, preserving explicit memory boundaries over integers.
- **`std:os` Command-Line Args Wrapper**: Implemented an overarching `os.args()` loop capable of exporting string elements securely via `ArgsIterator` and `Array<string>`.

## 🚀 Version 0.16.8-indev: std:time & Compiler Stabilization

TSN 0.16.8 introduces the system time module and significantly stabilizes namespaced class handling and FFI operations.

Key highlights:
- **`std:time` Module**: High-precision timing support.
    - `time.now()`: Returns current Unix timestamp in milliseconds.
    - `time.sleep(ms)`: Native thread sleeping.
    - `StopWatch` class: High-resolution performance measurement (nanoseconds/microseconds).
- **`std:string` Enhancement**: Added `fromInt(n: i64): string` for native integer-to-string conversion.
- **Compiler Stabilization**:
    - **Namespaced Classes**: Fixed VTable and struct generation for classes imported via `import * as ns`.
    - **FFI Precision**: Fixed `ptr` type defaulting to `i32` (address truncation); it now correctly maps to 64-bit LLVM pointer.
    - **Member Address**: Enabled `.address` property on class fields for raw pointer manipulation of internal state.
    - **Non-Generic Class Safety**: Fixed compiler crashes during monomorphization of non-generic classes.

## 🚀 Version 0.16.7-indev: Dynamic Array<T> & Compiler sizeof

TSN 0.16.7 introduces the first native dynamic collection and advanced compiler features.

Key highlights:
- **`std:array` Module**: Introduced `Array<T>` generic class for dynamic, resizable arrays.
- **Static vs Dynamic**: Clarified `T[]` as static-size buffer and `Array<T>` as dynamic-size collection.
- **Compiler `sizeof`**: Added support for `sizeof(Type)` operator to compute memory layout sizes at compile time.
- **Implicit Casts**: Improved i32 to i64 implicit promotion for better compatibility with memory APIs.

## 🚀 Version 0.16.6-indev: Complete Native Memory & String Module

TSN 0.16.6 marks a major milestone by completely isolating string and memory operations from the C Runtime, implementing them purely via native OS APIs and direct memory manipulation.

Key highlights:
- **Native `std:memory`:** Full implementation using Win32 Heap API (`HeapAlloc`, etc.) along with raw pointer manipulation (`rawPtr<T>.get()` and `rawPtr<T>.set(value)`).
- **Refactored `std:string`:** Completely rewritten to be C-string independent. Incorporates full UTF-8 capabilities for length evaluation and native functions for string arithmetic.
- **Compiler Expansions:** Introduced support for bitwise operators (`&`, `|`, `^`, `~`, `<<`, `>>`), hexadecimal literals (`0x`), and increment/decrement operators (`++`, `--`).
- **FFI Enhancements:** The LLVM IR generator now automatically handles external `declare` function bindings correctly for seamless API integration.

## 🚀 Version 0.16.5-indev: native std:memory & CRuntime removal

TSN 0.16.5 focuses on the core foundation of a CRuntime-free environment by introducing a native memory management module.

The goal is to move away from `malloc`, `free`, and other C-derived functions in favor of direct OS system calls, ensuring TSN has full control over its memory layout.

Planned scope:

- `std:memory` module using Win32 `HeapAlloc` and POSIX wrappers.
- Reduced reliance on `stdlib.h` and `string.h` in the runtime helper.
- Explicit `@unsafe` enforcement for raw memory manipulation.
- Providing a foundation for high-performance `std:collections` (Vector, Map).

## 🚀 Version 0.16.4-indev: roadmap for safe `std:fs`

TSN 0.16.4 is planned to focus on a native `std:fs` designed for TSN itself, not a Node compatibility layer.

The direction is:

- build `std:fs` as a real TSN-first standard library module
- use TSN-safe file APIs with ownership and RAII in mind
- keep file handles and file operations explicit and safe
- avoid depending on `std:result` for the filesystem core
- do not try to mimic Node.js semantics inside `std:fs`
- keep `node:*` compatibility for a later phase

Planned scope:

- `std:fs` first
- safe file read/write APIs
- RAII-oriented file handle design
- Windows/Linux backend implementations
- `0.17.x` reserved for `node:*` compatibility on top of `std:*`

## 🚀 Version 0.16.3-indev: simpler `std:process.exit()`

TSN 0.16.3 continues moving runtime-facing APIs into real TSN standard library modules with a simpler Node-compatible shape.

`std:process` now exposes a minimal `exit(code)` API from TSN stdlib source, so code can use the familiar Node-style form:

```ts
import * as process from "std:process";

function main(): void {
    process.exit(0);
}
```

Current scope:

- `std:process.exit(code)` available from TSN stdlib source
- compatible with Node-style `process.exit(...)` usage
- implemented via runtime `exit()` bridge

## 🚀 Version 0.16.2-indev: TSN stdlib `std:console` on Windows and Linux

TSN 0.16.2 continues replacing small parts of the C runtime with real TSN standard library modules.

The first migrated piece is `std:console`. `console.log(...)`, `console.warn(...)`, and `console.error(...)` are now implemented in [src/std/console.tsn](src/std/console.tsn) instead of the older hardcoded compiler mapping.

```ts
import * as console from "std:console";

function main(): void {
    console.log("stdout message");
    console.warn("stdout warning");
    console.error("stderr message");
}
```

Current scope:

- Windows and Linux
- `std:console` implemented as TSN stdlib source
- `console.log(...)` writes to stdout
- `console.warn(...)` writes to stdout
- `console.error(...)` writes to stderr
- Windows uses Win32 `GetStdHandle` + `WriteFile`
- Linux uses POSIX `write(1, ...)` and `write(2, ...)`

---

## 💪 Core Language Features

### 🛡️ Memory Management (Ownership Model)

TSN employs a state-of-the-art memory management system:

- **`struct` (Value Type)**: Stack-allocated, using **Copy Semantics**.
- **`class` (Reference Type)**: Heap-allocated, using **Move Semantics** (Destructive move). Memory is automatically `free`'d as soon as the owner goes out of scope (RAII).
- **Automated Borrowing**: Automatically handles reference borrowing for function calls, keeping the syntax clean like TypeScript while remaining as safe as Rust.

### ✨ Type System & OOP

- **Native Types**: `i8`, `i16`, `i32`, `i64`, `ptr<T>`, `bool`, `string`.
- **Inheritance**: Full support for `extends` in both classes and structs (Field flattening).
- **Polymorphism**: Virtual methods and **VTables** for dynamic dispatch.
- **Interfaces**: Define contracts with `interface` and implement them with `implements`.
- **FFI (Foreign Function Interface)**: Seamlessly call C/C++ libraries and system APIs using `@ffi.lib()`.

### ⚡ Performance

- Compiles directly to **LLVM IR**, benefiting from world-class optimizations.
- No VM overhead or Garbage Collector pauses.
- Execution speed comparable to C++/Rust.

---

## ⚠️ Known Limitations

TSN prioritizes performance and memory safety. Some TypeScript features are intentionally omitted or deferred:
- **Intersection Types**: Currently not supported due to memory layout complexity.
- **`any` Type**: Not supported to maintain strict type safety and performance.
- **`never` Type**: Deferred until advanced control-flow analysis is implemented.

For more details, see [Language Limitations](docs/limitations.md).

---

## 🛠️ Project Structure
