<div align="center">
  <img src="resources/logo.png" alt="TSN Logo" width="200"/>
  
  # TSN - TSN Standard Notation
  
  **A recursive acronym: TSN Standard Notation**  
  *High-performance systems programming with TypeScript elegance.*
  
  [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
  [![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-blue)](https://github.com/TSNLang/TSN)
  [![Version](https://img.shields.io/badge/version-0.16.3--indev-orange)](https://github.com/TSNLang/TSN)
  [![Self-Hosting](https://img.shields.io/badge/self--hosting-ACTIVE-%E2%9C%85-green)](src/README.md)
  
  *Made with ❤️ in Ho Chi Minh City, Vietnam by [Sao Tin Developers](https://github.com/SaoTin)*
</div>

---

## 🎯 What is TSN?

**TSN** is a systems programming language that maintains the elegant syntax of TypeScript while compiling directly to native code via **LLVM IR**.

Unlike standard TypeScript which runs on a VM (V8/JSC) with a Garbage Collector, TSN is designed for performance-critical applications, providing deterministic memory management and zero-overhead abstractions.

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
