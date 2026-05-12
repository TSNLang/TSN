# Functions

TSN provides a comprehensive function system with strong type safety and multiple declaration styles.

## Function Declaration

### Basic Function Syntax

**Syntax:**
```tsn
function name(param1: Type1, param2: Type2): ReturnType {
    // function body
    return value;
}
```

**Examples:**
```tsn
// Simple function
function add(a: i32, b: i32): i32 {
    return a + b;
}

// Function with no return value
function greet(name: string): void {
    console.log("Hello, " + name);
}

// Function with multiple parameters
function calculateArea(width: f64, height: f64): f64 {
    return width * height;
}

// Function with complex return type
function getUser(id: i32): { name: string, age: i32 } {
    return { name: "Alice", age: 30 };
}
```

### Function Parameters

All parameters must have explicit type annotations:

```tsn
// ✅ Valid - explicit types
function process(value: i32, name: string): void {
    // ...
}

// ❌ Invalid - missing type annotations
// function process(value, name) {  // ERROR
//     // ...
// }
```

### Return Types

Return types must be explicitly specified:

```tsn
// ✅ Valid - explicit return type
function getValue(): i32 {
    return 42;
}

// ❌ Invalid - missing return type
// function getValue() {  // ERROR
//     return 42;
// }

// void for functions that don't return a value
function log(message: string): void {
    console.log(message);
    // No return statement needed
}
```

## Anonymous Functions and Arrow Functions

TSN supports anonymous functions, but with **important safety restrictions** compared to JavaScript/TypeScript.

### Function Expressions

**Syntax:**
```tsn
let name = function(param: Type): ReturnType {
    return value;
};
```

**Examples:**
```tsn
// Anonymous function assigned to variable
let multiply = function(a: i32, b: i32): i32 {
    return a * b;
};

let result: i32 = multiply(5, 3);  // 15

// Function as parameter
function execute(callback: (i32) => i32, value: i32): i32 {
    return callback(value);
}

let double = function(x: i32): i32 {
    return x * 2;
};

execute(double, 10);  // 20
```

### Arrow Functions

**Syntax:**
```tsn
(param1: Type1, param2: Type2): ReturnType => expression
(param1: Type1, param2: Type2): ReturnType => { statements }
```

**Examples:**
```tsn
// Single expression arrow function
let add = (a: i32, b: i32): i32 => a + b;

// Block body arrow function
let greet = (name: string): void => {
    console.log("Hello, " + name);
};

// Arrow function with single parameter
let square = (x: i32): i32 => x * x;

// Arrow function with no parameters
let getRandom = (): i32 => 42;
```

## Safety Improvements Over JavaScript/TypeScript

TSN makes anonymous functions and arrow functions **safer** by enforcing strict rules:

### 1. Explicit Type Annotations Required

Unlike JavaScript/TypeScript, TSN **requires explicit types** for all function parameters and return types:

**JavaScript/TypeScript (unsafe):**
```typescript
// TypeScript - types can be inferred or implicit
let add = (a, b) => a + b;  // Types inferred as 'any' without strict mode
let process = function(x) { return x * 2; };  // Implicit 'any'
```

**TSN (safe):**
```tsn
// ❌ ERROR - missing type annotations
// let add = (a, b) => a + b;

// ✅ Must specify types explicitly
let add = (a: i32, b: i32): i32 => a + b;
let process = function(x: i32): i32 { return x * 2; };
```

### 2. No `this` Binding Issues

JavaScript/TypeScript arrow functions have complex `this` binding rules that can lead to bugs. TSN **eliminates `this` binding confusion**:

**JavaScript/TypeScript (confusing):**
```typescript
class Counter {
    count = 0;
    
    // Regular function - 'this' depends on call context
    increment = function() {
        this.count++;  // 'this' can be wrong!
    }
    
    // Arrow function - 'this' is lexically bound
    decrement = () => {
        this.count--;  // 'this' is always Counter
    }
}
```

**TSN (clear):**
```tsn
class Counter {
    count: i32 = 0;
    
    // Methods have explicit 'self' parameter
    function increment(self: Counter): void {
        self.count++;
    }
    
    // No implicit 'this' - always explicit
    function decrement(self: Counter): void {
        self.count--;
    }
}
```

### 3. No Hoisting for Function Expressions

Function expressions and arrow functions are **not hoisted**, preventing order-dependent bugs:

**JavaScript/TypeScript (confusing):**
```typescript
// This works due to hoisting
console.log(add(1, 2));  // 3

function add(a: number, b: number): number {
    return a + b;
}

// This fails - arrow functions not hoisted
// console.log(multiply(2, 3));  // ERROR

const multiply = (a: number, b: number) => a * b;
```

**TSN (consistent):**
```tsn
// ❌ ERROR - must declare before use
// console.log(add(1, 2));

let add = (a: i32, b: i32): i32 => a + b;

// ✅ Must declare before use
let multiply = (a: i32, b: i32): i32 => a * b;
console.log(multiply(2, 3));  // OK
```

### 4. Explicit Capture of Variables

TSN requires **explicit capture** of variables from outer scopes, preventing accidental closures:

**JavaScript/TypeScript (implicit capture):**
```typescript
function makeCounter() {
    let count = 0;  // Implicitly captured
    return () => ++count;  // Closure created automatically
}
```

**TSN (explicit capture):**
```tsn
function makeCounter(): () => i32 {
    let count: i32 = 0;
    
    // Must explicitly capture variables
    return [count](): i32 => {  // Capture list [count]
        count++;
        return count;
    };
}
```

### 5. No `arguments` Object

JavaScript's `arguments` object is error-prone. TSN uses **rest parameters** instead:

**JavaScript/TypeScript (unsafe):**
```typescript
function sum() {
    let total = 0;
    for (let i = 0; i < arguments.length; i++) {
        total += arguments[i];  // No type safety
    }
    return total;
}
```

**TSN (safe):**
```tsn
// Use rest parameters with explicit types
function sum(...numbers: i32[]): i32 {
    let total: i32 = 0;
    for (let i = 0; i < numbers.length; i++) {
        total += numbers[i];
    }
    return total;
}

sum(1, 2, 3, 4, 5);  // Type-safe
```

## Function Types

You can define function types for type safety:

**Syntax:**
```tsn
type FunctionType = (param1: Type1, param2: Type2) => ReturnType;
```

**Examples:**
```tsn
// Define function type
type BinaryOp = (a: i32, b: i32) => i32;

// Use function type
let add: BinaryOp = (a: i32, b: i32): i32 => a + b;
let subtract: BinaryOp = (a: i32, b: i32): i32 => a - b;

// Function accepting function type
function apply(op: BinaryOp, x: i32, y: i32): i32 {
    return op(x, y);
}

apply(add, 10, 5);       // 15
apply(subtract, 10, 5);  // 5

// Complex function types
type Callback = (result: string | null) => void;
type Transformer = (input: string) => string;
type Predicate = (value: i32) => bool;
```

## Optional Parameters

Parameters can be marked as optional with `?`:

**Syntax:**
```tsn
function name(required: Type, optional?: Type): ReturnType {
    // ...
}
```

**Examples:**
```tsn
function greet(name: string, greeting?: string): void {
    if (greeting != undefined) {
        console.log(greeting + ", " + name);
    } else {
        console.log("Hello, " + name);
    }
}

greet("Alice");              // "Hello, Alice"
greet("Bob", "Hi");          // "Hi, Bob"

// Optional parameters must come after required ones
function createUser(name: string, age?: i32, email?: string): void {
    // ...
}

createUser("Alice");                    // OK
createUser("Bob", 30);                  // OK
createUser("Charlie", 25, "c@ex.com");  // OK
```

## Default Parameters

Parameters can have default values:

**Syntax:**
```tsn
function name(param: Type = defaultValue): ReturnType {
    // ...
}
```

**Examples:**
```tsn
function greet(name: string, greeting: string = "Hello"): void {
    console.log(greeting + ", " + name);
}

greet("Alice");              // "Hello, Alice"
greet("Bob", "Hi");          // "Hi, Bob"

function multiply(a: i32, b: i32 = 1): i32 {
    return a * b;
}

multiply(5);      // 5
multiply(5, 3);   // 15

// Default parameters can use previous parameters
function createRange(start: i32, end: i32 = start + 10): i32[] {
    // ...
}
```

## Rest Parameters

Rest parameters collect remaining arguments into an array:

**Syntax:**
```tsn
function name(...rest: Type[]): ReturnType {
    // rest is an array of Type
}
```

**Examples:**
```tsn
function sum(...numbers: i32[]): i32 {
    let total: i32 = 0;
    for (let i = 0; i < numbers.length; i++) {
        total += numbers[i];
    }
    return total;
}

sum(1, 2, 3);           // 6
sum(10, 20, 30, 40);    // 100

// Rest parameter with other parameters
function format(template: string, ...values: string[]): string {
    // ...
}

format("Hello %s %s", "Alice", "Bob");

// Rest parameter must be last
function log(level: string, ...messages: string[]): void {
    console.log(level + ": " + messages.join(" "));
}
```

## Function Overloading

TSN supports function overloading with explicit signatures:

**Examples:**
```tsn
// Overload signatures
function process(value: string): string;
function process(value: i32): i32;
function process(value: bool): string;

// Implementation
function process(value: string | i32 | bool): string | i32 {
    if (typeof value == "string") {
        return value.toUpperCase();
    } else if (typeof value == "number") {
        return value * 2;
    } else {
        return value ? "true" : "false";
    }
}

process("hello");  // "HELLO"
process(42);       // 84
process(true);     // "true"
```

## Multiple Return Values

TSN supports **multiple return values** similar to Go, making it easy to return multiple values from a function without creating a tuple or object.

**Syntax:**
```tsn
function name(): Type1, Type2, Type3 {
    return value1, value2, value3;
}
```

**Examples:**
```tsn
// Return multiple values
function getUser(): string, i32 {
    return "Admin", 200;
}

// Receive multiple values
let name: string, status: i32 = getUser();
console.log(name);    // "Admin"
console.log(status);  // 200

// More complex example
function divmod(a: i32, b: i32): i32, i32 {
    let quotient: i32 = a / b;
    let remainder: i32 = a % b;
    return quotient, remainder;
}

let q: i32, r: i32 = divmod(17, 5);
console.log(q);  // 3
console.log(r);  // 2

// Return different types
function parseResponse(): bool, string, i32 {
    return true, "Success", 200;
}

let success: bool, message: string, code: i32 = parseResponse();

// Return with error handling pattern (Go-style)
function readFile(path: string): string, bool {
    if (fileExists(path)) {
        return fileContent, true;   // data, success
    }
    return "", false;  // empty, failure
}

let content: string, ok: bool = readFile("config.txt");
if (ok) {
    console.log("File content: " + content);
} else {
    console.log("Failed to read file");
}
```

**Multiple return values with different types:**
```tsn
// Database query result
function queryUser(id: i32): string, i32, bool {
    // name, age, found
    if (id > 0) {
        return "Alice", 30, true;
    }
    return "", 0, false;
}

let userName: string, userAge: i32, found: bool = queryUser(1);

// Coordinate calculation
function getCoordinates(): f64, f64, f64 {
    return 10.5, 20.3, 5.7;  // x, y, z
}

let x: f64, y: f64, z: f64 = getCoordinates();

// API response
function fetchData(): i32, string, string {
    return 200, "OK", "response data";  // status, message, data
}

let statusCode: i32, statusMsg: string, data: string = fetchData();
```

**Ignoring return values:**
```tsn
// Use underscore to ignore values you don't need
function getStats(): i32, i32, i32 {
    return 100, 200, 300;  // count, sum, average
}

let count: i32, _: i32, average: i32 = getStats();
// Only use count and average, ignore sum
```

**Comparison with other approaches:**
```tsn
// ❌ Traditional approach - using tuple (verbose)
function getUserTuple(): [string, i32] {
    return ["Admin", 200];
}
let result: [string, i32] = getUserTuple();
let name: string = result[0];
let status: i32 = result[1];

// ❌ Traditional approach - using object (verbose)
function getUserObject(): { name: string, status: i32 } {
    return { name: "Admin", status: 200 };
}
let result2 = getUserObject();
let name2: string = result2.name;
let status2: i32 = result2.status;

// ✅ Multiple return values (clean and direct)
function getUser(): string, i32 {
    return "Admin", 200;
}
let name3: string, status3: i32 = getUser();
```

**Benefits of multiple return values:**
1. **Cleaner syntax**: No need to create tuples or objects
2. **Go-style error handling**: Natural pattern for returning data and error status
3. **Type safety**: Each return value has explicit type
4. **Performance**: No allocation overhead for temporary objects
5. **Readability**: Clear what each value represents

**Common patterns:**
```tsn
// Pattern 1: Data + Success flag
function operation(): ResultType, bool {
    if (success) {
        return data, true;
    }
    return defaultValue, false;
}

// Pattern 2: Data + Error message
function operation2(): ResultType, string {
    if (success) {
        return data, "";  // empty string = no error
    }
    return defaultValue, "error message";
}

// Pattern 3: Multiple data values
function getPosition(): f64, f64, f64 {
    return x, y, z;
}

// Pattern 4: Status + Data
function apiCall(): i32, string {
    return statusCode, responseBody;
}
```

**Note:** While TSN supports multiple return values, for complex return types or when you need named fields, consider using:
- `Result<T, E>` for error handling
- `Optional<T>` for nullable values
- Custom types/interfaces for structured data

## Best Practices

1. **Always specify types explicitly**: Never rely on type inference for function signatures
2. **Use arrow functions for callbacks**: More concise and clear intent
3. **Prefer named functions for complex logic**: Better for debugging and stack traces
4. **Use function types for consistency**: Define reusable function type aliases
5. **Keep functions small and focused**: Single responsibility principle
6. **Use rest parameters over `arguments`**: Type-safe and clearer
7. **Document function behavior**: Especially for public APIs

**Example:**
```tsn
// Good: Clear, typed, focused
type Validator = (value: string) => bool;

function validateEmail(email: string): bool {
    // Email validation logic
    return email.includes("@");
}

function validateInput(value: string, validator: Validator): bool {
    return validator(value);
}

// Usage
let isValid: bool = validateInput("test@example.com", validateEmail);
```

## Program Entry Point: `main()` Function

TSN requires all code to be inside functions - **there is no global scope for executable code**. The program entry point is the `main()` function.

### Main Function Signature

The `main()` function can have two possible signatures:

**1. Return `void` (no return value):**
```tsn
function main(): void {
    console.log("Hello, World!");
    // No return statement needed
}
```

**2. Return `i32` (exit code):**
```tsn
function main(): i32 {
    console.log("Hello, World!");
    return 0;  // Exit code: 0 = success
}
```

**3. Return `const enum` (recommended for better type safety):**
```tsn
const enum ExitCode {
    Success = 0,
    Error = 1,
    InvalidInput = 2
}

function main(): ExitCode {
    console.log("Hello, World!");
    return ExitCode.Success;
}
```

> **Note:** TSN recommends using `const enum` for return codes instead of raw `i32` values. See the [Data Types - Enumerations](data-types.md#advanced-using-const-enum-for-return-codes-recommended) section for more details.

### Why TSN Uses `function` Keyword

TSN uses the `function` keyword for function declarations **for TypeScript compatibility**, even though it differs from some modern languages.

**Rationale:**
```
import * as console from "std:console";
import * as array from "std:array";

// Global constants
const APP_NAME: string = "MyApp";
constexpr VERSION: i32 = 1;

// Type definitions
type User = {
    id: i32;
    name: string;
};

// Helper functions
function createUser(id: i32, name: string): User {
    return { id: id, name: name };
}

function printUser(user: User): void {
    console.log("User: " + user.name);
}

// Entry point
function main(): i32 {
    console.log(APP_NAME + " v" + VERSION);
    
    let user: User = createUser(1, "Alice");
    printUser(user);
    
    let users: Array<User> = array.create<User>();
    array.push(users, user);
    
    console.log("Program completed successfully");
    return 0;
}
```

### No Global Executable Code

Unlike JavaScript/TypeScript, TSN **does not allow** executable code at the global scope:

**JavaScript/TypeScript (allowed):**
```typescript
// Global executable code - runs immediately
console.log("This runs at module load");
let x = 10;
x = x + 5;

function main() {
    console.log("Main function");
}

main();
```

**TSN (not allowed):**
```tsn
// ❌ ERROR - no global executable code allowed
// console.log("This is not allowed");
// let x = 10;
// x = x + 5;  // ERROR - cannot execute at global scope

// ✅ All code must be in functions
function main(): void {
    console.log("This is allowed");
    let x: i32 = 10;
    x = x + 5;  // OK - inside function
}
```

### What Can Be at Global Scope

Only **declarations** are allowed at global scope:

**Allowed at global scope:**
- Function declarations
- Type declarations (`type`, `interface`)
- Class declarations
- Constant declarations (`const`, `constexpr`)
- Import statements
- Export statements

**Not allowed at global scope:**
- Executable statements
- Function calls
- Variable assignments (except initialization)
- Control flow statements (`if`, `for`, `while`, etc.)

**Examples:**
```tsn
// ✅ Allowed - declarations
import * as console from "std:console";

const PI: f64 = 3.14159;
constexpr MAX_SIZE: i32 = 1024;

type Point = { x: f64, y: f64 };

interface User {
    name: string;
    age: i32;
}

function helper(x: i32): i32 {
    return x * 2;
}

class Calculator {
    function add(a: i32, b: i32): i32 {
        return a + b;
    }
}

// ✅ Entry point
function main(): i32 {
    // All executable code goes here
    console.log("Program started");
    
    let result: i32 = helper(10);
    console.log(result);
    
    return 0;
}

// ❌ Not allowed - executable code
// console.log("This would be an error");
// let x = helper(5);  // ERROR
```

### Exit Codes

When `main()` returns `i32`, the value is used as the program's exit code:

```tsn
function main(): i32 {
    // Success
    if (everythingOk()) {
        return 0;  // Exit code 0 = success
    }
    
    // Error conditions
    if (fileNotFound()) {
        return 1;  // Exit code 1 = file not found
    }
    
    if (invalidInput()) {
        return 2;  // Exit code 2 = invalid input
    }
    
    return -1;  // Exit code -1 = unknown error
}
```

### Benefits of No Global Scope

TSN's restriction on global executable code provides several benefits:

1. **Predictable initialization order**: No hidden side effects from module loading
2. **Better testability**: All code is in functions that can be tested
3. **Clearer dependencies**: Explicit function calls show execution flow
4. **RAII compliance**: Resources are acquired in functions with clear lifetimes
5. **No initialization order issues**: Common problem in C++ and JavaScript
6. **Easier to reason about**: All execution starts from `main()`

**Comparison:**
```
| Feature | JavaScript/TypeScript | TSN |
|---------|----------------------|-----|
| Global executable code | ✅ Allowed | ❌ Not allowed |
| Entry point | Optional (module load) | **Required** (`main()`) |
| Initialization order | Unpredictable | Predictable |
| Side effects on import | Possible | Impossible |
| RAII compliance | No | Yes |
```

### Example Program Structure

**Complete TSN program:**
```tsn
import * as console from "std:console";
import * as array from "std:array";

// Global constants
const APP_NAME: string = "MyApp";
constexpr VERSION: i32 = 1;

// Type definitions
type User = {
    id: i32;
    name: string;
};

// Helper functions
function createUser(id: i32, name: string): User {
    return { id: id, name: name };
}

function printUser(user: User): void {
    console.log("User: " + user.name);
}

// Entry point
function main(): i32 {
    console.log(APP_NAME + " v" + VERSION);
    
    let user: User = createUser(1, "Alice");
    printUser(user);
    
    let users: Array<User> = array.create<User>();
    array.push(users, user);
    
    console.log("Program completed successfully");
    return 0;
}
```

### Module Initialization

If you need initialization logic, put it in a function and call it from `main()`:

```tsn
import * as console from "std:console";

// Configuration
const CONFIG_FILE: string = "config.json";

// Initialization function
function initialize(): bool {
    console.log("Initializing application...");
    // Load config, setup resources, etc.
    return true;
}

// Cleanup function
function cleanup(): void {
    console.log("Cleaning up resources...");
    // Release resources
}

// Entry point
function main(): i32 {
    if (!initialize()) {
        console.log("Initialization failed");
        return 1;
    }
    
    // Main program logic
    console.log("Running main logic...");
    
    cleanup();
    return 0;
}
```

## Differences from JavaScript/TypeScript

| Feature | JavaScript/TypeScript | TSN |
|---------|----------------------|-----|
| Type annotations | Optional (can be inferred) | **Required** (always explicit) |
| `this` binding | Complex, context-dependent | **No implicit `this`** (explicit `self`) |
| Hoisting | Function declarations hoisted | **No hoisting** (declare before use) |
| `arguments` object | Available in regular functions | **Not available** (use rest parameters) |
| Closure capture | Implicit | **Explicit capture lists** |
| Return type | Can be inferred | **Must be explicit** |
| Parameter types | Can be `any` | **Must be explicit** |

TSN's function system is **safer** because:
- ✅ No implicit `any` types
- ✅ No `this` binding confusion
- ✅ No hoisting surprises
- ✅ Explicit variable capture
- ✅ Type-safe rest parameters
- ✅ Compile-time type checking
- ✅ Better error messages
