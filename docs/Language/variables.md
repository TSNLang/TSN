# Variables

TSN supports three types of variable declarations, each with different purposes and behaviors.

## Variable Types

### `let` - Mutable Variable

Variables declared with `let` can be reassigned after initialization.

**Syntax:**
```tsn
let name: type = value
```

**Examples:**
```tsn
let count: i32 = 0
count = 10  // OK - can be reassigned

let message: string = "Hello"
message = "World"  // OK
```

### `const` - Immutable Variable

Variables declared with `const` cannot be reassigned after initialization. The value is determined at runtime.

**Syntax:**
```tsn
const name: type = value
```

**Examples:**
```tsn
const maxUsers: i32 = 100
// maxUsers = 200  // ERROR - cannot reassign

const pi: f64 = 3.14159
const greeting: string = "Hello, TSN!"
```

### `constexpr` - Compile-time Constant

Variables declared with `constexpr` are constants computed and determined at compile-time. The value must be a constant expression that can be evaluated during compilation.

**Syntax:**
```tsn
constexpr name: type = value
```

**Examples:**
```tsn
constexpr bufferSize: i32 = 1024
constexpr maxThreads: i32 = 8
constexpr version: string = "1.0.0"

// Can be used in contexts requiring compile-time constants
constexpr arraySize: i32 = bufferSize * 2
```

## General Syntax

All variable types in TSN follow TypeScript-like syntax:

```tsn
keyword name: type = value
```

Where:
- `keyword`: `let`, `const`, or `constexpr`
- `name`: variable identifier
- `type`: data type of the variable
- `value`: initialization value

## Comparison

| Type | Mutable | Determined At | Use Case |
|------|----------------|-------------------|---------|
| `let` | ✅ Yes | Runtime | Variables that need to change |
| `const` | ❌ No | Runtime | Immutable runtime values |
| `constexpr` | ❌ No | Compile-time | Compile-time constants, optimization |

## Important Notes

- All variables must be initialized with a value at declaration
- Data types must be explicitly specified
- `constexpr` can only be used with expressions that can be evaluated at compile-time
- Use `const` whenever possible to increase code safety and clarity
- Use `constexpr` for constants that need performance optimization or are used in compile-time contexts

## Multiple Variable Declaration

TSN supports declaring and initializing multiple variables in a single statement:

**Syntax:**
```tsn
let var1: Type1, var2: Type2 = value1, value2;
```

**Examples:**
```tsn
// Declare and initialize multiple variables
let a: i32, b: i32 = 0, 1;
console.log(a);  // 0
console.log(b);  // 1

// Different types
let name: string, age: i32 = "Alice", 30;

// Multiple variables with same type
let x: f64, y: f64, z: f64 = 1.0, 2.0, 3.0;

// With const
const width: i32, height: i32 = 800, 600;

// With constexpr
constexpr MAX_WIDTH: i32, MAX_HEIGHT: i32 = 1920, 1080;
```

**Receiving multiple return values:**
```tsn
// Function with multiple return values
function getCoordinates(): f64, f64 {
    return 10.5, 20.3;
}

// Declare and receive multiple values
let x: f64, y: f64 = getCoordinates();

// Another example
function getUserInfo(): string, i32, bool {
    return "Bob", 25, true;
}

let userName: string, userAge: i32, isActive: bool = getUserInfo();
```

**Swapping variables:**
```tsn
// Traditional swap (requires temporary variable)
let a: i32 = 5;
let b: i32 = 10;
let temp: i32 = a;
a = b;
b = temp;

// Multiple assignment swap (cleaner)
let x: i32 = 5;
let y: i32 = 10;
x, y = y, x;  // Swap in one line
console.log(x);  // 10
console.log(y);  // 5
```

**Unpacking values:**
```tsn
// Unpack from function
function getStats(): i32, i32, i32 {
    return 100, 200, 300;
}

let min: i32, max: i32, avg: i32 = getStats();

// Ignore some values with underscore
let count: i32, _: i32, total: i32 = getStats();
// Only use count and total, ignore the middle value
```

**Rules and restrictions:**
```tsn
// Number of variables must match number of values:
// ✅ Valid - same count
let a: i32, b: i32 = 1, 2;

// ❌ Invalid - mismatch
// let a: i32, b: i32 = 1;  // ERROR - not enough values
// let a: i32 = 1, 2;       // ERROR - too many values
```

```tsn
// Types must be explicitly specified:
// ✅ Valid - explicit types
let a: i32, b: string = 42, "hello";

// ❌ Invalid - missing types
// let a, b = 42, "hello";  // ERROR - types required
```

```tsn
// All variables must use same keyword:
// ✅ Valid - all let
let a: i32, b: i32 = 1, 2;

// ✅ Valid - all const
const x: i32, y: i32 = 10, 20;

// ❌ Invalid - mixed keywords not allowed
// let a: i32, const b: i32 = 1, 2;  // ERROR
```

**Use cases:**
```tsn
// 1. Coordinate pairs
let x: f64, y: f64 = 100.0, 200.0;

// 2. Dimensions
let width: i32, height: i32 = 1920, 1080;

// 3. Range values
let min: i32, max: i32 = 0, 100;

// 4. RGB colors
let r: u8, g: u8, b: u8 = 255, 128, 0;

// 5. Error handling pattern
function divide(a: i32, b: i32): i32, bool {
    if (b == 0) {
        return 0, false;  // result, success
    }
    return a / b, true;
}

let result: i32, ok: bool = divide(10, 2);
if (ok) {
    console.log("Result: " + result);
}
```

**Benefits:**
```tsn
// 1. Concise code: Declare multiple related variables together
// 2. Natural with multiple returns: Works seamlessly with functions returning multiple values
// 3. Atomic operations: Swap variables without temporary storage
// 4. Readability: Related variables grouped together
// 5. Type safety: Each variable has explicit type checking
```

**Comparison with TypeScript:**
```typescript
// TypeScript - destructuring from array/tuple
let [a, b] = [1, 2];
let [x, y] = getCoordinates();

// TypeScript - destructuring from object
let { name, age } = { name: "Alice", age: 30 };
```

```tsn
// TSN - direct multiple assignment
let a: i32, b: i32 = 1, 2;
let x: f64, y: f64 = getCoordinates();

// TSN - explicit and type-safe
let name: string, age: i32 = "Alice", 30;
```

TSN's multiple variable declaration is more explicit and type-safe than TypeScript's destructuring, while being more concise than declaring each variable separately.

## Differences from TypeScript

While TSN's syntax is inspired by TypeScript, there are important differences:

### No `var` keyword

TSN does not support the `var` keyword from JavaScript/TypeScript. The `var` keyword has problematic behaviors including:

- **Hoisting**: Variables declared with `var` are hoisted to the top of their function scope, allowing them to be used before declaration
- **Function scope**: `var` uses function scope instead of block scope, leading to unexpected behavior

These features violate the **RAII (Resource Acquisition Is Initialization)** principle, which is fundamental to TSN's design philosophy. RAII ensures that:
- Resources are acquired at the point of initialization
- Variables have well-defined lifetimes tied to their scope
- No undefined behavior from accessing uninitialized variables

**TypeScript code that won't work in TSN:**
```typescript
// ❌ Not supported in TSN
console.log(x);  // undefined in TypeScript (hoisting)
var x = 10;

if (true) {
	var y = 20;  // Function-scoped in TypeScript
}
console.log(y);  // 20 in TypeScript (accessible outside block)
```

**TSN equivalent:**
```tsn
// ✅ TSN enforces block scope and no hoisting
let x: i32 = 10
console.log(x)  // Must declare before use

if (true) {
	let y: i32 = 20
	// y is only accessible within this block
}
// console.log(y)  // ERROR - y is not in scope
```

### Block Scope Only

All TSN variables (`let`, `const`, `constexpr`) use **block scope**:
- Variables are only accessible within the block `{}` where they are declared
- Variables must be declared before use (no hoisting)
- This ensures predictable lifetime management and follows RAII principles

```tsn
{
	let x: i32 = 10
	// x is valid here
}
// x is not accessible here - already destroyed
```

This design ensures memory safety, predictable resource management, and eliminates entire classes of bugs common in JavaScript/TypeScript code.
