<div align="center">
  <img src="resources/logo.png" alt="TSN Logo" width="200"/>
  
  # TSN - TSN Standard Notation
  
  **A recursive acronym: TSN Standard Notation**  
  *High-performance systems programming with TypeScript elegance.*
  
  [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
  [![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-blue)](https://github.com/TSNLang/TSN)
  [![Version](https://img.shields.io/badge/version-0.11.0--indev-orange)](https://github.com/TSNLang/TSN)
  [![Self-Hosting](https://img.shields.io/badge/self--hosting-ACTIVE-%E2%9C%85-green)](src/README.md)
  
  *Made with ❤️ in Ho Chi Minh City, Vietnam by [Sao Tin Developers](https://github.com/SaoTin)*
</div>

---

## 🎯 What is TSN?

**TSN** is a systems programming language that maintains the elegant syntax of TypeScript while compiling directly to native code via **LLVM IR**. 

Unlike standard TypeScript which runs on a VM (V8/JSC) with a Garbage Collector, TSN is designed for performance-critical applications, providing deterministic memory management and zero-overhead abstractions.

## 🚀 Version 0.11.0-indev: The Unified Path

In version 0.11.0, we have moved away from the dual-compiler architecture. **TSN and its compiler are now one.** 

The compiler is written in a subset of TypeScript that is also valid TSN code. This allows the compiler to:
1.  **Bootstrapping**: Run on any Node-standard compatible runtime (Node.js, Deno, Bun) during development.
2.  **Self-Hosting**: Compile itself into a standalone, highly-optimized native executable.
3.  **Parallel Development**: Language features and compiler improvements are developed simultaneously within the same codebase.

---

## 💪 Core Language Features

### 🛡️ Memory Management (ARC & ORC)
TSN implements a modern memory management system inspired by **Nim**, **Swift**, and **C++**:
-   **ARC (Automatic Reference Counting)**: Deterministic allocation/deallocation without GC pauses.
-   **ORC (Owned Reference Counting)**: Advanced cycle detection and ownership tracking to ensure memory safety without the overhead of a tracing garbage collector.

### ✨ Type System & OOP
-   **Native Types**: `i8`, `i32`, `i64`, `f32`, `f64`, `ptr<T>`, `bool`.
-   **Classes & Objects**: Full OOP support with constructors, methods, and member access, compiled to efficient native structs.
-   **Namespaces**: Nested namespaces for clean code organization.
-   **Type Aliases & Enums**: Familiar TypeScript-style declarations.
-   **FFI (Foreign Function Interface)**: Seamlessly call C/C++ libraries and system APIs using `@ffi.lib()`.

### ⚡ Performance
-   Compiles to **LLVM IR**, benefiting from world-class optimizations.
-   No runtime overhead from a heavy VM or JIT.
-   Small binary sizes (typically < 100KB for simple programs).

---

## 🛠️ Project Structure

```
.
├── src/                # The Unified Compiler (Written in TSN/TS)
│   ├── src/
│   │   ├── lexer.ts    - Lexical Analysis
│   │   ├── parser.ts   - AST Generation
│   │   ├── codegen.ts  - LLVM IR Generation
│   │   └── types.ts    - Type Definitions
│   └── main.ts         - Entry point
├── docs/               - Language Documentation
├── examples/           - Example TSN Programs
└── resources/          - Brand Assets
```

---

## 🚀 Quick Start

### Prerequisites
- **Deno** or **Node.js** (for bootstrapping the compiler)
- **Clang/LLVM** 14+ (for final native compilation)

### Compile and Run

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/TSNLang/TSN.git
    cd TSN
    ```

2.  **Compile a TSN program (e.g., test_class.ts)**:
    ```bash
    # Using the bootstrap compiler (Deno)
    deno run --allow-read --allow-write src/src/main.ts examples/test_class.ts -o test_class.ll
    ```

3.  **Build the native executable**:
    ```bash
    # Link with the TSN runtime
    clang test_class.ll src/tsn_runtime.c -o test_class.exe
    ```

4.  **Run**:
    ```bash
    ./test_class.exe
    ```

---

## �️ Roadmap (0.11.x - 1.0)

### 🚧 Current Phase: Self-Hosting & OOP Optimization
- [x] Basic Class & Method implementation.
- [x] Name Mangling for Namespaces and Classes.
- [x] Integrated Diagnostics system.
- [ ] **Inheritance & VTables**: Full polymorphism support.
- [ ] **ARC Implementation**: Automatic memory management in Codegen.

### 📅 Next: Standard Library & Ecosystem
- [ ] `std:io`, `std:fs`, `std:process` (Node.js compatible APIs).
- [ ] **Generics**: `List<T>`, `Map<K, V>`.
- [ ] **Package Manager**: Simple dependency management.

---

## 🤝 Contributing

TSN is an open-source project by **Sao Tin Developer**. We welcome all contributions, whether it's fixing bugs, adding features to the compiler, or improving documentation.

1.  Fork the repo.
2.  Create your feature branch.
3.  Submit a Pull Request.

---

<div align="center">
  
  **Made with ❤️ in Ho Chi Minh City, Vietnam**
  
  *Bringing the best of TypeScript to Systems Programming*
  
  ⭐ Star us on GitHub if you find TSN interesting!
  
</div>
