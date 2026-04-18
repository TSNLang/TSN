<div align="center">
  <img src="resources/logo.png" alt="TSN Logo" width="200"/>
  
  # TSN - TSN Standard Notation
  
  **A recursive acronym: TSN Standard Notation**  
  *High-performance systems programming with TypeScript elegance.*
  
  [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
  [![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-blue)](https://github.com/TSNLang/TSN)
  [![Version](https://img.shields.io/badge/version-0.15.2--indev-orange)](https://github.com/TSNLang/TSN)
  [![Self-Hosting](https://img.shields.io/badge/self--hosting-ACTIVE-%E2%9C%85-green)](src/README.md)
  
  *Made with ❤️ in Ho Chi Minh City, Vietnam by [Sao Tin Developers](https://github.com/SaoTin)*
</div>

---

## 🎯 What is TSN?

**TSN** is a systems programming language that maintains the elegant syntax of TypeScript while compiling directly to native code via **LLVM IR**.

Unlike standard TypeScript which runs on a VM (V8/JSC) with a Garbage Collector, TSN is designed for performance-critical applications, providing deterministic memory management and zero-overhead abstractions.

## 🚀 Version 0.15.2-indev: Unsafe Context & Raw Pointers

TSN provides low-level control when needed, but with clear boundaries:

1.  **Raw Pointers `rawPtr<T>`**: C-style pointers with no safety checks or automatic management.
2.  **Unsafe Decorator `@unsafe`**: A mandatory marker for functions or blocks that use raw pointers, making high-risk code explicitly visible.
3.  **The `.address()` Property**: A cleaner syntax to obtain the memory address of a variable, replacing the traditional address-of operator in specific contexts.
4.  **No RAII for Raw Pointers**: Use `rawPtr<T>` when you need maximum performance or manual memory layout control.

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
- **Super**: Support for `super()` constructor chaining and `super.method()` static dispatch.
- **FFI (Foreign Function Interface)**: Seamlessly call C/C++ libraries and system APIs using `@ffi.lib()`.

### ⚡ Performance

- Compiles directly to **LLVM IR**, benefiting from world-class optimizations.
- No VM overhead or Garbage Collector pauses.
- Execution speed comparable to C++/Rust.

---

## 🛠️ Project Structure

```
.
├── src/                # The Unified Compiler (Written in TSN/TS)
│   ├── src/
│   │   ├── lexer.ts    - Lexical Analysis
│   │   ├── parser.ts   - AST Generation
│   │   ├── codegen.ts  - LLVM IR Generation & OOP Logic
│   │   └── types.ts    - AST & Token Definitions
│   └── main.ts         - Entry point
├── docs/               - Language Documentation (Ownership Model, etc.)
├── examples/           - Example TSN Programs
└── resources/          - Brand Assets
```

---

## 🚀 Quick Start

### Prerequisites

- **Deno** (Recommended for running the bootstrap compiler)
- **Clang/LLVM** 14+ (For final native code generation)

### Compile and Run

1.  **Compile a TSN program (e.g., test_inheritance.ts)**:

    ```bash
    # Using the bootstrap compiler (Deno)
    deno run --allow-read --allow-write src/src/main.ts test_inheritance.ts
    ```

2.  **Build the native executable**:

    ```bash
    # Link with the TSN C runtime
    clang test_inheritance.ll src/tsn_runtime.c -o test_inheritance.exe
    ```

3.  **Run**:
    ```bash
    ./test_inheritance.exe
    ```

---

## 🗺️ Roadmap (Current Status)

### 🚧 Current Phase: Data Types & Performance (v0.15.x)

- [x] UTF-8 String implementation (Built-in struct/class).
- [x] String API: `.length`, `.includes()`, `.indexOf()`, etc.
- [x] Managed Pointers `ptr<T>` with RAII (Manual/Auto boxing).
- [x] The `.get()` accessor for pointers.
- [ ] Raw Pointers `rawPtr<T>` and `@unsafe` context.
- [ ] The `.address()` accessor.
- [ ] Array improvements & Generic Collections.

### ✅ Completed: Generics & Standard Library (v0.14.x)

- [x] Generic Interfaces & Implements.
- [x] Generic Classes & Functions.
- [x] Standard Library: Initial `Option<T>`, `Result<T, E>`.
- [x] Enhanced Module Resolution.

### 📅 Future: Self-Hosting & Optimization

- [ ] Self-Hosting: TSN compiling itself to native binary.
- [ ] LLVM Optimization Passes integration.

---

## 🤝 Contributing

TSN is an open-source project by **Sao Tin Developers**. We welcome all contributions, from bug fixes and compiler features to documentation improvements.

---

<div align="center">
  
  **Made with ❤️ in Ho Chi Minh City, Vietnam**
  
  *Bringing the best of TypeScript to Systems Programming*
  
  ⭐ Star us on GitHub if you find TSN interesting!
  
</div>
