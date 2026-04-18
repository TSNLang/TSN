# TSN Language Limitations & Compatibility

This document outlines the current status of TypeScript features that are intentionally not supported or deferred in the current version of TSN (v0.15.6).

## 🚫 Unsupported Type Features

The following types are currently **not supported** in TSN to maintain the integrity of the ownership model and deterministic memory management.

### 1. Intersection Types (`A & B`)
*   **Status**: Not Supported / Under Research.
*   **Reason**: Implementing intersection types for heap-allocated classes requires complex multi-vtable management or structural merging that conflicts with the current single-owner model.
*   **Workaround**: Use **Interfaces** and **Composition** instead. Define a new interface that extends multiple other interfaces if you need a type that satisfies multiple contracts.

### 2. The `any` Type
*   **Status**: Intentionally Not Supported.
*   **Reason**: TSN is a strictly typed systems programming language. The `any` type requires a runtime meta-object system (Type Erasure or Dynamic Dispatch) which introduces significant performance overhead and breaks memory safety guarantees.
*   **Recommendation**: Use **Union Types** (`A | B`) or **Generics** (`<T>`) to achieve type flexibility without losing safety.

### 3. The `never` Type
*   **Status**: Deferred.
*   **Reason**: While useful for exhaustiveness checking in TypeScript, the semantics of `never` in a native-compiled language require complex control-flow analysis and unreachable-code elimination that are currently under development.
*   **Workaround**: Use functions that return `void` or throw a runtime error for unreachable code paths.

---

## 🏗️ Future Roadmap

We are continuously evaluating these features. Our priority is to maintain **Zero-Overhead Abstractions** and **Memory Safety**.

*   **Intersection Types**: We are exploring "Interface-only Intersections" for future releases.
*   **Never**: Likely to be introduced alongside advanced pattern matching in version 0.17.x.

---
*Updated: April 2026*
