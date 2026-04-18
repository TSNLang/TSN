<div align="center">
  <img src="resources/logo.png" alt="TSN Logo" width="200"/>
  
  # TSN - TSN Standard Notation
  
  **A recursive acronym: TSN Standard Notation**  
  *High-performance systems programming with TypeScript elegance.*
  
  [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
  [![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-blue)](https://github.com/TSNLang/TSN)
  [![Version](https://img.shields.io/badge/version-0.15.6--indev-orange)](https://github.com/TSNLang/TSN)
  [![Self-Hosting](https://img.shields.io/badge/self--hosting-ACTIVE-%E2%9C%85-green)](src/README.md)
  
  *Made with ❤️ in Ho Chi Minh City, Vietnam by [Sao Tin Developers](https://github.com/SaoTin)*
</div>

---

## 🎯 What is TSN?

**TSN** is a systems programming language that maintains the elegant syntax of TypeScript while compiling directly to native code via **LLVM IR**.

Unlike standard TypeScript which runs on a VM (V8/JSC) with a Garbage Collector, TSN is designed for performance-critical applications, providing deterministic memory management and zero-overhead abstractions.

## 🚀 Version 0.16.1-indev: TSN stdlib `std:console` on Windows

TSN 0.16.1 begins replacing small parts of the C runtime with real TSN standard library modules.

The first migrated piece is `std:console` on Windows. `console.log(...)`, `console.warn(...)`, and `console.error(...)` are now implemented in [src/std/console.tsn](src/std/console.tsn) via Win32 FFI instead of the older hardcoded compiler mapping.

```ts
import * as console from "std:console";

function main(): void {
    console.log("stdout message");
    console.warn("stdout warning");
    console.error("stderr message");
}
```

Current scope:

- Windows only
- `std:console` implemented as TSN stdlib source
- `console.log(...)` writes to stdout
- `console.warn(...)` writes to stdout
- `console.error(...)` writes to stderr
- implemented via Win32 `GetStdHandle` + `WriteFile`

## 🚀 Version 0.16.0-indev: `@target_os()`

TSN 0.16.0 starts a roadmap focused on FFI, decorators, gradually replacing parts of the C runtime, and rewriting the standard library in TSN itself.

First new decorator:

```ts
@target_os("windows")
function win_only(): void {
    // compiled only on Windows
}

@target_os("windows")
declare function MessageBoxA(hwnd: ptr<void>, text: string): i32;

@target_os("linux", "macos", "bsd", "android")
declare function write(fd: i32, buf: ptr<u8>, len: i32): i32;

@target_os("windows", "linux")
function dual_target(): void {}
```

Supported values: `windows`, `linux`, `macos`, `bsd`, `android`, `posix`.

`posix` is a common target name for POSIX / IEEE 1003 operating systems such as `linux`, `macos`, `bsd`, and `android`.

`@target_os(...)` supports one or more values. If any value matches the current host OS, the compiler includes the function in the generated LLVM IR, including `declare function`.

## 🚀 Version 0.15.6-indev: Safe Nullability

TSN now supports memory-safe `null` and `undefined` handling using Tagged Unions:

1.  **Strict Null Checks**: Types are non-nullable by default. Use `T | null` or `T | undefined` for optional values.
2.  **Tagged Implementation**: `null` and `undefined` are implemented as safe unit types within the union struct.
3.  **Automatic Protection**: The compiler manages memory layout and tag checking, preventing common null-pointer exceptions at the native level.

## 🚀 Version 0.15.5-indev: Safe Union Types

TSN supports memory-safe Union types (Tagged Unions):

1.  **Union Definition**: Combine multiple types using the pipe operator, e.g., `type Result = string | i32`.
2.  **Tagged Implementation**: Unions are implemented as `{ i32, [MaxLen x i8] }`, ensuring type safety at runtime.

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
