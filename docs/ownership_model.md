# TSN Memory Ownership Model (v0.12+)

TSN adopts a modern, deterministic memory management system based on **Ownership** and **Automated Borrowing**. This model provides the safety of Rust and the performance of C++, while maintaining the syntax elegance of TypeScript.

## 1. Core Principles

### 1.1 Ownership (Classes)
Every `class` instance in TSN has exactly **one owner** at any given time.
- The owner is the variable or data structure that is responsible for the object's lifetime.
- When the owner goes out of scope, the object is **immediately and automatically destroyed**.
- `class` instances are allocated on the **Heap**.

### 1.2 Move Semantics
When a `class` instance is assigned to another variable or passed to a function, the ownership is **moved**.
```typescript
let a = new Point(1, 2); // Assuming Point is a class
let b = a; // 'a' moves to 'b'. 'a' is now invalid.
```

### 1.3 Value Semantics (Structs)
`struct` in TSN is a **Value Type** (similar to C, C++, or Swift).
- Assignments of structs result in a **Copy** of the data.
- Structs are allocated on the **Stack** or inline within a `class`.
- They do not participate in the ownership tracking system because they are trivially copied.

### 1.4 Contracts (Interfaces)
`interface` in TSN defines an abstract contract.
- It contains only method signatures (no fields for now).
- Classes and Structs can **implement** interfaces.
- Used for polymorphism and dynamic dispatch (VTables).


---

## 2. Automated Borrowing

To keep the language simple like TypeScript, TSN uses **Automated Borrowing** for function calls.

### 2.1 The Borrowing Rule
When you pass a class instance to a function, the compiler defaults to **Borrowing** unless specified otherwise.
- The caller retains ownership.
- The callee (the function being called) receives a temporary reference.
- The callee cannot destroy the object or store it longer than the function call execution.

```typescript
function printPoint(p: Point) { // 'p' is borrowed automatically
    print(p.x);
} // No cleanup happens here because 'p' is borrowed.

function main() {
    let myPoint = new Point(10, 20); // 'myPoint' owns the Point
    printPoint(myPoint);            // Borrowing occurs
    print(myPoint.y);               // 'myPoint' is still valid here
} // 'myPoint' goes out of scope -> Point is destroyed.
```

### 2.2 Immutable vs Mutable Borrowing
- By default, borrows are **Immutable** (Read-only).
- If a function needs to modify a borrowed object, the parameter must be marked (syntax TBD, e.g., `mut p: Point`).

---

## 3. Advanced Concepts

### 3.1 Destructive Moves for Return
Functions that return a new object "transfer" ownership to the caller.
```typescript
function createPoint(): Point {
    let p = new Point(0, 0);
    return p; // Ownership of 'p' is transferred to the caller.
}
```

### 3.2 Escaping References
If an object needs to be stored in a long-lived data structure (like a global list or another class), ownership must be explicitly transferred, or a reference management strategy (like a `UniquePtr` or `SharedPtr` container) must be used.

### 3.3 Cycle Prevention
Because every object has a single owner, the ownership graph is a **Directed Acyclic Graph (DAG)**. Circular references are impossible in the ownership model, eliminating the need for complex cycle collectors (like ORC).

---

## 4. Comparison

| Feature | TypeScript (V8) | Rust | TSN (Ownership) |
| :--- | :--- | :--- | :--- |
| **Memory Management** | Tracing GC | Manual/Borrow Checker | **Automated Ownership** |
| **Runtime Overhead** | High (GC pauses) | Zero | **Zero** |
| **Safety** | High | Maximum (Strict) | **High (Inferred)** |
| **Syntax Complexity** | Low | High (`&`, `&mut`, `'a`) | **Low (TS-like)** |

## 5. Implementation Status
- [x] Concept Design
- [ ] Compiler: Liveness Analysis
- [ ] Compiler: Automated `free` insertion
- [ ] Compiler: Move semantics validation
