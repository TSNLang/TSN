# Data Types

TSN provides a comprehensive type system with primitive types and standard library types.

## Primitive Types

### Integer Types

TSN supports signed and unsigned integers of various sizes:

| Type | Alias | Library | Description |
|------|-------|---------|-------------|
| `i8` | - | Built-in | 8-bit signed integer (-128 to 127) |
| `i16` | - | Built-in | 16-bit signed integer (-32,768 to 32,767) |
| `i32` | - | Built-in | 32-bit signed integer (-2,147,483,648 to 2,147,483,647) |
| `i64` | - | Built-in | 64-bit signed integer |
| `i128` | - | Built-in | 128-bit signed integer |
| `u8` | - | Built-in | 8-bit unsigned integer (0 to 255) |
| `u16` | - | Built-in | 16-bit unsigned integer (0 to 65,535) |
| `u32` | - | Built-in | 32-bit unsigned integer (0 to 4,294,967,295) |
| `u64` | - | Built-in | 64-bit unsigned integer |
| `u128` | - | Built-in | 128-bit unsigned integer |

### Floating-Point Types

TSN supports multiple floating-point formats for different precision and performance requirements:

| Type | Alias | Library | Description |
|------|-------|---------|-------------|
| `bfloat` | - | Built-in | Brain floating-point format (16-bit, optimized for ML) |
| `f16` | `half` | Built-in | 16-bit floating-point (half precision) |
| `f32` | - | Built-in | 32-bit floating-point (single precision) |
| `f64` | `number` | Built-in | 64-bit floating-point (double precision) |
| `f128` | - | Built-in | 128-bit floating-point (quadruple precision) |

### Boolean Type

| Type | Alias | Library | Description |
|------|-------|---------|-------------|
| `bool` | `boolean` | Built-in | Boolean value (`true` or `false`) |

### Platform-Dependent Integer Types

| Type | Alias | Library | Description |
|------|-------|---------|-------------|
| `isize` | - | Built-in | Signed integer with pointer size (32-bit or 64-bit depending on platform) |
| `usize` | - | Built-in | Unsigned integer with pointer size (32-bit or 64-bit depending on platform) |

## Enumerations

TSN supports enumerations (enums) for defining a set of named constants. There are two types of enums: regular `enum` and `const enum`.

### Regular Enum

Regular enums create both a type and a runtime object with the enum values.

**Syntax:**
```tsn
enum Name {
    Member1,
    Member2,
    Member3
}
```

**Examples:**
```tsn
// Basic enum with auto-incrementing values (0, 1, 2, ...)
enum Direction {
    North,
    South,
    East,
    West
}

let dir: Direction = Direction.North;  // 0
console.log(dir);  // 0

// Enum with explicit values
enum HttpStatus {
    OK = 200,
    Created = 201,
    BadRequest = 400,
    Unauthorized = 401,
    NotFound = 404,
    InternalError = 500
}

let status: HttpStatus = HttpStatus.OK;  // 200

// Enum with mixed auto and explicit values
enum Priority {
    Low = 1,
    Medium,      // 2 (auto-incremented)
    High,        // 3 (auto-incremented)
    Critical = 10
}

// String enums
enum LogLevel {
    Debug = "DEBUG",
    Info = "INFO",
    Warning = "WARN",
    Error = "ERROR"
}

let level: LogLevel = LogLevel.Info;  // "INFO"
```

**Enum Usage:**
```tsn
enum Color {
    Red = 0,
    Green = 1,
    Blue = 2
}

function getColorName(color: Color): string {
    if (color == Color.Red) {
        return "Red";
    } else if (color == Color.Green) {
        return "Green";
    } else if (color == Color.Blue) {
        return "Blue";
    }
    return "Unknown";
}

let myColor: Color = Color.Green;
console.log(getColorName(myColor));  // "Green"
```

### Const Enum

Const enums are **compile-time only** enums that are completely inlined at compile time, with no runtime overhead.

**Syntax:**
```tsn
const enum Name {
    Member1,
    Member2,
    Member3
}
```

**Examples:**
```tsn
// Const enum - no runtime object created
const enum Direction {
    North = 0,
    South = 1,
    East = 2,
    West = 3
}

let dir: Direction = Direction.North;
// Compiled to: let dir: i32 = 0;

// Const enum with explicit values
const enum FileAccess {
    None = 0,
    Read = 1,
    Write = 2,
    ReadWrite = 3
}

let access: FileAccess = FileAccess.ReadWrite;
// Compiled to: let access: i32 = 3;

// Const enum for bit flags
const enum Permissions {
    None = 0,
    Read = 1 << 0,    // 1
    Write = 1 << 1,   // 2
    Execute = 1 << 2  // 4
}

let perms: Permissions = Permissions.Read | Permissions.Write;
// Compiled to: let perms: i32 = 1 | 2;
```

### Enum vs Const Enum

| Feature | `enum` | `const enum` |
|---------|--------|--------------|
| Runtime object | ✅ Yes | ❌ No (inlined) |
| Reverse mapping | ✅ Yes (number enums) | ❌ No |
| Memory usage | Has runtime overhead | Zero runtime overhead |
| Compilation | Generates code | Inlined at compile-time |
| Use case | Need runtime enum object | Performance-critical, compile-time constants |
| String values | ✅ Supported | ✅ Supported |

**Example showing the difference:**
```tsn
// Regular enum - creates runtime object
enum Status {
    Active = 1,
    Inactive = 2
}

// Can access at runtime
let statusName: string = Status[1];  // "Active" (reverse mapping)
let statusValue: Status = Status.Active;  // 1

// Const enum - no runtime object
const enum Mode {
    Development = 0,
    Production = 1
}

// Inlined at compile-time
let mode: Mode = Mode.Production;
// Compiled to: let mode: i32 = 1;

// ❌ Cannot access at runtime
// let modeName = Mode[1];  // ERROR - no runtime object
```

### Enum Best Practices

1. **Use `const enum` for performance**: When you don't need runtime enum objects
2. **Use regular `enum` for runtime access**: When you need reverse mapping or iteration
3. **Explicit values for public APIs**: Makes the enum stable across versions
4. **Use string enums for debugging**: Easier to read in logs and debugger
5. **Bit flags with const enum**: Efficient for permission systems

**Examples:**

```tsn
// Good: Const enum for compile-time constants
const enum Config {
    MaxRetries = 3,
    TimeoutMs = 5000,
    BufferSize = 1024
}

// Good: Regular enum for runtime string mapping
enum ErrorCode {
    NetworkError = "NETWORK_ERROR",
    TimeoutError = "TIMEOUT_ERROR",
    ValidationError = "VALIDATION_ERROR"
}

function logError(code: ErrorCode): void {
    console.log("Error: " + code);  // Logs the string value
}

// Good: Const enum for bit flags
const enum Feature {
    None = 0,
    Logging = 1 << 0,
    Caching = 1 << 1,
    Compression = 1 << 2,
    All = Logging | Caching | Compression
}

let enabledFeatures: Feature = Feature.Logging | Feature.Caching;
```

### Enum Type Safety

TSN enums are type-safe and prevent invalid values:

```tsn
enum Status {
    Pending = 0,
    Active = 1,
    Completed = 2
}

let status: Status = Status.Active;  // ✅ OK

// ❌ Type error - cannot assign arbitrary number
// status = 5;  // ERROR

// ❌ Type error - cannot assign string
// status = "Active";  // ERROR

// ✅ Must use enum member
status = Status.Completed;  // OK
```

### Enum with Switch Statements

Enums work well with switch statements for exhaustive checking:

```tsn
enum TrafficLight {
    Red,
    Yellow,
    Green
}

function getAction(light: TrafficLight): string {
    switch (light) {
        case TrafficLight.Red:
            return "Stop";
        case TrafficLight.Yellow:
            return "Slow down";
        case TrafficLight.Green:
            return "Go";
        default:
            // Compiler ensures all cases are handled
            return "Unknown";
    }
}
```

### Differences from TypeScript

| Feature | TypeScript | TSN |
|---------|-----------|-----|
| Numeric enums | ✅ Supported | ✅ Supported |
| String enums | ✅ Supported | ✅ Supported |
| Const enums | ✅ Supported | ✅ Supported (fully inlined) |
| Reverse mapping | ✅ Numeric enums only | ✅ Numeric enums only |
| Heterogeneous enums | ✅ Allowed (mixed string/number) | ✅ Allowed |
| Computed values | ✅ Allowed | ⚠️ Limited (const expressions only) |
| Type safety | ⚠️ Can assign any number | ✅ Strict (only enum members) |

TSN's enums are **safer** than TypeScript:
- Stricter type checking (cannot assign arbitrary numbers)
- Const enums are always fully inlined (no `preserveConstEnums` flag)
- Better compile-time optimization
- Clearer error messages for invalid enum usage

### Advanced: Using Const Enum for Return Codes (Recommended)

TSN **recommends** using `const enum` instead of raw `i32` values for function return codes, including the `main()` function. This provides better type safety and self-documenting code.

**Traditional approach (less recommended):**
```tsn
function main(): i32 {
    if (networkFailed()) {
        return 1;  // What does 1 mean?
    }
    if (invalidInput()) {
        return 2;  // What does 2 mean?
    }
    return 0;  // Success
}
```

**Recommended approach with const enum:**
```tsn
const enum MainReturn {
    Success = 0,
    NetworkError = 1,
    InputValueError = 2,
    FileNotFound = 3,
    PermissionDenied = 4
}

function main(): MainReturn {
    if (networkFailed()) {
        return MainReturn.NetworkError;  // Clear and self-documenting
    }
    if (invalidInput()) {
        return MainReturn.InputValueError;  // Obvious what this means
    }
    return MainReturn.Success;
}
```

**Benefits:**

1. **Self-documenting code**: Return values have clear names
2. **Type safety**: Cannot accidentally return invalid codes
3. **Zero runtime overhead**: `const enum` is inlined at compile-time
4. **Easy to maintain**: Adding new error codes is straightforward
5. **IDE support**: Autocomplete shows all possible return values

**More examples:**

```tsn
// File operations
const enum FileResult {
    Success = 0,
    NotFound = 1,
    PermissionDenied = 2,
    AlreadyExists = 3,
    IOError = 4
}

function openFile(path: string): FileResult {
    if (!fileExists(path)) {
        return FileResult.NotFound;
    }
    if (!hasPermission(path)) {
        return FileResult.PermissionDenied;
    }
    return FileResult.Success;
}

// Network operations
const enum NetworkStatus {
    Success = 0,
    Timeout = 1,
    ConnectionRefused = 2,
    DNSError = 3,
    SSLError = 4
}

function connectToServer(url: string): NetworkStatus {
    // Connection logic
    return NetworkStatus.Success;
}

// Validation
const enum ValidationResult {
    Valid = 0,
    EmptyInput = 1,
    InvalidFormat = 2,
    OutOfRange = 3,
    TooLong = 4
}

function validateEmail(email: string): ValidationResult {
    if (email.length == 0) {
        return ValidationResult.EmptyInput;
    }
    if (!email.includes("@")) {
        return ValidationResult.InvalidFormat;
    }
    return ValidationResult.Valid;
}
```

**Using with main():**

```tsn
const enum ExitCode {
    Success = 0,
    GeneralError = 1,
    MissingArgument = 2,
    InvalidConfig = 3,
    NetworkFailure = 4
}

function loadConfig(): ExitCode {
    // Load configuration
    if (configFileNotFound()) {
        return ExitCode.InvalidConfig;
    }
    return ExitCode.Success;
}

function processData(): ExitCode {
    // Process data
    if (networkError()) {
        return ExitCode.NetworkFailure;
    }
    return ExitCode.Success;
}

function main(): ExitCode {
    console.log("Starting application...");
    
    let configResult: ExitCode = loadConfig();
    if (configResult != ExitCode.Success) {
        console.log("Failed to load config");
        return configResult;
    }
    
    let processResult: ExitCode = processData();
    if (processResult != ExitCode.Success) {
        console.log("Failed to process data");
        return processResult;
    }
    
    console.log("Application completed successfully");
    return ExitCode.Success;
}
```

**Why const enum over regular enum:**

```tsn
// ❌ Regular enum - has runtime overhead
enum ExitCode {
    Success = 0,
    Error = 1
}

function main(): ExitCode {
    return ExitCode.Success;
}
// Generates runtime enum object (unnecessary overhead)

// ✅ Const enum - zero overhead
const enum ExitCode {
    Success = 0,
    Error = 1
}

function main(): ExitCode {
    return ExitCode.Success;
}
// Compiled to: return 0; (inlined, no overhead)
```

**Best practices for return code enums:**

1. **Always start with `Success = 0`**: Convention for success exit codes
2. **Use descriptive names**: `NetworkError` instead of `Error1`
3. **Group related codes**: Keep error codes logically organized
4. **Document special codes**: Add comments for non-obvious values
5. **Use const enum**: For zero runtime overhead

```tsn
const enum AppExitCode {
    // Success codes
    Success = 0,
    
    // User input errors (1-10)
    InvalidArgument = 1,
    MissingRequired = 2,
    
    // Configuration errors (11-20)
    ConfigNotFound = 11,
    ConfigInvalid = 12,
    
    // Runtime errors (21-30)
    NetworkError = 21,
    DatabaseError = 22,
    
    // System errors (31-40)
    OutOfMemory = 31,
    PermissionDenied = 32
}
```

This pattern makes TSN code more maintainable, readable, and type-safe while maintaining zero runtime overhead thanks to compile-time inlining.

## Standard Library Types

### Collection Types

| Type | Alias | Library | Description |
|------|-------|---------|-------------|
| `Array<T>` | - | `std:array` | Dynamic array (similar to `Vec<T>` in Rust or `std::vector<T>` in C++) |
| `ReadonlyArray<T>` | - | `std:array` | Immutable dynamic array (cannot be modified after creation) |
| `type[N]` | - | Built-in | Static array with fixed size `N` (stack-allocated) |
| `[Type1, Type2, ...]` | - | Built-in | Tuple - fixed-size collection of heterogeneous types |
| `Map<K, V>` | - | `std:map` | Hash map for key-value pairs |

#### Dynamic Arrays

Dynamic arrays grow and shrink at runtime:

**Example:**
```tsn
import * as array from "std:array";

let numbers: Array<i32> = array.create<i32>();
array.push(numbers, 10);
array.push(numbers, 20);
```

#### Readonly Arrays

Readonly arrays are immutable - they cannot be modified after creation. This is similar to TypeScript's `ReadonlyArray<T>`:

**Example:**
```tsn
import * as array from "std:array";

let numbers: ReadonlyArray<i32> = array.createReadonly<i32>([1, 2, 3, 4, 5]);

// ❌ These operations are not allowed
// array.push(numbers, 6);     // ERROR - cannot modify readonly array
// array.pop(numbers);          // ERROR - cannot modify readonly array
// numbers[0] = 10;             // ERROR - cannot modify elements

// ✅ Read operations are allowed
let first: i32 = array.get(numbers, 0);
let len: i32 = array.length(numbers);
```

**Use cases for ReadonlyArray:**
- Sharing data without allowing modifications
- Function parameters that shouldn't modify the array
- Immutable data structures
- Thread-safe read-only access

#### Static Arrays

Static arrays have a **fixed size** determined at compile-time and are allocated on the stack:

**Syntax:**
```tsn
type[N]  // N is the size (number of elements)
```

**Examples:**
```tsn
// Explicit size
let numbers: i32[5] = [1, 2, 3, 4, 5];
let matrix: f64[3] = [1.0, 2.0, 3.0];

// Size inference - TSN automatically infers size from initializer
let colors: string[] = ["red", "green", "blue"];  // Inferred as string[3]
let flags: bool[] = [true, false];                // Inferred as bool[2]

// Multi-dimensional static arrays
let grid: i32[3][3] = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
];
```

**Size Inference Rules:**
- If you omit `N` (write `type[]`), TSN infers the size from the initializer
- The initializer must be provided when size is omitted
- Size is determined at compile-time and cannot change

```tsn
// ✅ Valid - size inferred from initializer
let a: i32[] = [1, 2, 3, 4];  // Inferred as i32[4]

// ❌ Invalid - no initializer to infer size from
let b: i32[];  // ERROR - cannot infer size

// ✅ Valid - explicit size, can initialize later
let c: i32[10];
c[0] = 42;
```

#### Array vs Static Array

| Feature | `Array<T>` (Dynamic) | `type[N]` (Static) |
|---------|---------------------|-------------------|
| Size | Variable, grows/shrinks | Fixed at compile-time |
| Allocation | Heap | Stack |
| Performance | Slower (indirection) | Faster (direct access) |
| Memory | Requires allocation | No allocation overhead |
| Use case | Unknown size, needs to grow | Known fixed size |
| Library | `std:array` | Built-in |

#### Tuples

Tuples are **fixed-size collections** of heterogeneous types (different types). Unlike arrays, each element in a tuple can have a different type.

**Syntax:**
```tsn
[Type1, Type2, Type3, ...]
```

**Examples:**
```tsn
// Basic tuple
let person: [string, i32, bool] = ["Alice", 30, true];

// Accessing tuple elements by index
let name: string = person[0];    // "Alice"
let age: i32 = person[1];        // 30
let active: bool = person[2];    // true

// Tuple with different types
let response: [i32, string, f64] = [200, "OK", 1.5];

// Nested tuples
let nested: [string, [i32, i32]] = ["point", [10, 20]];

// Function returning tuple
function getCoordinates(): [f64, f64] {
    return [3.14, 2.71];
}

let coords: [f64, f64] = getCoordinates();
let x: f64 = coords[0];
let y: f64 = coords[1];
```

**Tuple Destructuring:**
```tsn
// Destructure tuple into variables
let [name, age, active]: [string, i32, bool] = ["Bob", 25, false];
// name = "Bob", age = 25, active = false

// Partial destructuring
let [status, message, _]: [i32, string, f64] = [200, "OK", 1.5];
// Ignore the third element with _
```

**Use cases for Tuples:**
- Returning multiple values from a function
- Grouping related but different-typed values
- Pattern matching and destructuring
- Lightweight data structures without defining a class

**Tuple vs Array:**
```tsn
import * as array from "std:array";
import * as map from "std:map";

let dynamic: Array<i32> = array.create<i32>();  // Heap-allocated, can grow
let static: i32[100];                            // Stack-allocated, fixed size
let tuple: [string, i32, bool] = ["test", 42, true];  // Fixed structure, mixed types

let scores: Map<string, i32> = map.create<string, i32>();
```

### Error Handling Types

| Type | Alias | Library | Description |
|------|-------|---------|-------------|
| `Optional<T>` | - | `std:option` | Represents an optional value (similar to `Option<T>` in Rust or `std::optional<T>` in C++) |
| `Result<T, E>` | - | `std:result` | Represents either success (`Ok<T>`) or failure (`Err<E>`) |

**Example:**
```tsn
import * as option from "std:option";
import * as result from "std:result";

function findUser(id: i32): Optional<string> {
    // Returns Some(user) or None
}

function parseNumber(s: string): Result<i32, string> {
    // Returns Ok(number) or Err(error_message)
}
```

### String Type

| Type | Alias | Library | Description |
|------|-------|---------|-------------|
| `string` | - | `std:string` | UTF-8 encoded string (C++/Rust-style implementation, not JavaScript-style) |

**Important Notes:**
- TSN strings are implemented similar to C++ and Rust, **not** JavaScript
- Strings are **UTF-8 encoded** by default
- Strings are **null-terminated** for C interoperability
- String operations work at the byte level, with UTF-8 aware functions available

**Example:**
```tsn
import * as string from "std:string";

let message: string = "Hello, 世界!";
let len: i32 = string.length(message);        // Character count (UTF-8 aware)
let byteLen: i32 = string.byteLength(message); // Byte count
let concat: string = string.concat("Hello", " World");
```

## Type Aliases

You can create type aliases using the `type` keyword:

```tsn
type UserId = i32;
type Point = { x: f64, y: f64 };
type Callback = (i32) => void;
```

## Interfaces and Object Types

TSN supports both `interface` and `type` for defining object structures, similar to TypeScript, but with safer implementation.

### Interface Declaration

Interfaces define the shape of an object:

**Syntax:**
```tsn
interface Name {
    property: Type;
    method(): ReturnType;
}
```

**Examples:**
```tsn
interface User {
    id: i32;
    name: string;
    email: string;
    age: i32;
}

interface Point {
    x: f64;
    y: f64;
}

interface Drawable {
    draw(): void;
    getArea(): f64;
}
```

### Type Object Literals

You can also define object types using `type`:

**Syntax:**
```tsn
type Name = {
    property: Type;
    method(): ReturnType;
};
```

**Examples:**
```tsn
type User = {
    id: i32;
    name: string;
    email: string;
    age: i32;
};

type Point = {
    x: f64;
    y: f64;
};

type Callback = {
    onSuccess(data: string): void;
    onError(error: string): void;
};
```

### Interface vs Type

Both `interface` and `type` can define object shapes, but they have some differences:

| Feature | `interface` | `type` |
|---------|------------|--------|
| Object shapes | ✅ Yes | ✅ Yes |
| Extension/Inheritance | ✅ `extends` keyword | ✅ Intersection types `&` |
| Declaration merging | ✅ Yes (multiple declarations merge) | ❌ No (must be unique) |
| Union types | ❌ No | ✅ Yes (`type A = B \| C`) |
| Primitive aliases | ❌ No | ✅ Yes (`type ID = i32`) |
| Tuple types | ❌ No | ✅ Yes (`type Pair = [i32, string]`) |

**Examples:**
```tsn
// Interface extension
interface Animal {
    name: string;
    age: i32;
}

interface Dog extends Animal {
    breed: string;
    bark(): void;
}

// Type intersection
type Animal = {
    name: string;
    age: i32;
};

type Dog = Animal & {
    breed: string;
    bark(): void;
};

// Type unions (only with type)
type Result = Success | Error;
type ID = i32 | string;

// Declaration merging (only with interface)
interface Window {
    title: string;
}

interface Window {
    width: i32;
    height: i32;
}
// Window now has: title, width, height
```

### Safer Implementation than TypeScript

TSN's implementation of interfaces and types is **safer** than TypeScript:

#### 1. No Structural Typing Loopholes

In TypeScript, structural typing can lead to unexpected compatibility:

```typescript
// TypeScript - potentially unsafe
interface User {
    id: number;
    name: string;
}

let user: User = { id: 1, name: "Alice", password: "secret" };  // OK in TS
// Extra property 'password' is allowed
```

```tsn
// TSN - stricter checking
interface User {
    id: i32;
    name: string;
}

// ❌ ERROR - excess property 'password' not allowed
let user: User = { id: 1, name: "Alice", password: "secret" };

// ✅ Must match exactly
let user: User = { id: 1, name: "Alice" };
```

#### 2. No Implicit `any` in Interfaces

```typescript
// TypeScript - implicit any
interface Config {
    data;  // Type is 'any' if noImplicitAny is off
}
```

```tsn
// TSN - explicit types required
interface Config {
    data: string;  // Must specify type explicitly
}
```

#### 3. Mandatory Property Initialization

```tsn
interface User {
    id: i32;
    name: string;
    email: string;
}

// ❌ ERROR - missing properties
let user: User = { id: 1 };

// ✅ All properties must be provided
let user: User = {
    id: 1,
    name: "Alice",
    email: "alice@example.com"
};
```

#### 4. Optional Properties Must Be Explicit

```tsn
interface User {
    id: i32;
    name: string;
    email?: string;  // Explicitly optional with ?
    age?: i32;
}

let user1: User = { id: 1, name: "Alice" };  // OK - optional fields omitted
let user2: User = { id: 2, name: "Bob", email: "bob@example.com" };  // OK
```

#### 5. Readonly Properties

```tsn
interface User {
    readonly id: i32;      // Cannot be modified after initialization
    name: string;
}

let user: User = { id: 1, name: "Alice" };
// user.id = 2;  // ERROR - cannot modify readonly property
user.name = "Bob";  // OK - name is mutable
```

### Best Practices

1. **Use `interface` for object shapes**: Especially when you might extend them later
2. **Use `type` for unions and complex types**: Better for type composition
3. **Be explicit with optional properties**: Use `?` to mark optional fields
4. **Use `readonly` for immutable properties**: Prevents accidental modifications
5. **Prefer interfaces for public APIs**: They're more extensible and support declaration merging

**Example:**
```tsn
// Good: Interface for extensible object shape
interface ApiResponse {
    status: i32;
    data: string;
}

// Good: Type for union
type Result = ApiResponse | ErrorResponse;

// Good: Type for complex composition
type Handler = (request: Request) => Promise<Response>;
```

## Literal Types

TSN supports **literal types**, which allow you to specify exact values that a variable can hold. This is useful for creating more precise type definitions.

### String Literal Types

String literals restrict a value to specific string constants:

**Syntax:**
```tsn
type Name = "value1" | "value2" | "value3";
```

**Examples:**
```tsn
// Single string literal
type Direction = "north" | "south" | "east" | "west";

let dir1: Direction = "north";   // ✅ OK
let dir2: Direction = "south";   // ✅ OK
// let dir3: Direction = "up";   // ❌ ERROR - "up" is not a valid Direction

// HTTP methods
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

function request(method: HttpMethod, url: string): void {
    // method can only be one of the specified values
}

request("GET", "/api/users");     // ✅ OK
// request("INVALID", "/api");    // ❌ ERROR

// Status types
type Status = "pending" | "success" | "error";

let status: Status = "pending";
status = "success";  // ✅ OK
// status = "failed"; // ❌ ERROR
```

### Numeric Literal Types

Numeric literals restrict a value to specific numbers:

**Examples:**
```tsn
// HTTP status codes
type SuccessCode = 200 | 201 | 204;
type ErrorCode = 400 | 401 | 403 | 404 | 500;
type StatusCode = SuccessCode | ErrorCode;

function handleResponse(code: StatusCode): void {
    if (code == 200) {
        console.log("OK");
    }
}

handleResponse(200);  // ✅ OK
handleResponse(404);  // ✅ OK
// handleResponse(999); // ❌ ERROR

// Dice values
type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

let roll: DiceValue = 4;  // ✅ OK
// let invalid: DiceValue = 7;  // ❌ ERROR

// Port numbers
type CommonPort = 80 | 443 | 8080 | 3000;
```

### Boolean Literal Types

Boolean literals can be `true` or `false`:

**Examples:**
```tsn
// Always true
type AlwaysTrue = true;
let flag: AlwaysTrue = true;   // ✅ OK
// let flag2: AlwaysTrue = false; // ❌ ERROR

// Always false
type AlwaysFalse = false;

// Useful in conditional types and type guards
type IsEnabled = true;
type IsDisabled = false;
```

### Mixed Literal Types

You can combine different literal types:

**Examples:**
```tsn
// Mix string and number literals
type Config = "auto" | "manual" | 0 | 1 | 2;

let setting: Config = "auto";  // ✅ OK
setting = 1;                   // ✅ OK
// setting = "invalid";        // ❌ ERROR

// Response type with mixed literals
type ApiResult = 
    | { status: 200; data: string }
    | { status: 404; error: "Not Found" }
    | { status: 500; error: "Internal Error" };

function handleResult(result: ApiResult): void {
    if (result.status == 200) {
        console.log(result.data);
    } else {
        console.log(result.error);
    }
}
```

### Literal Types with Interfaces

Literal types work well with interfaces for discriminated unions:

**Examples:**
```tsn
interface SuccessResponse {
    type: "success";  // Literal type
    data: string;
}

interface ErrorResponse {
    type: "error";    // Literal type
    message: string;
}

type Response = SuccessResponse | ErrorResponse;

function handleResponse(response: Response): void {
    if (response.type == "success") {
        // TypeScript knows this is SuccessResponse
        console.log(response.data);
    } else {
        // TypeScript knows this is ErrorResponse
        console.log(response.message);
    }
}
```

### Template Literal Types (Advanced)

TSN supports template literal types for creating string patterns:

**Examples:**
```tsn
// CSS units
type CSSUnit = "px" | "em" | "rem" | "%";
type CSSValue = `${number}${CSSUnit}`;

let width: CSSValue = "100px";   // ✅ OK
let height: CSSValue = "50%";    // ✅ OK
// let invalid: CSSValue = "100";  // ❌ ERROR - missing unit

// Event names
type EventName = `on${string}`;
let onClick: EventName = "onClick";     // ✅ OK
let onHover: EventName = "onHover";     // ✅ OK
// let invalid: EventName = "click";    // ❌ ERROR - must start with "on"
```

### Use Cases for Literal Types

1. **Type-safe enums**: Better than magic strings/numbers
2. **Discriminated unions**: Pattern matching on literal fields
3. **API contracts**: Enforce exact values for parameters
4. **Configuration**: Restrict config values to valid options
5. **State machines**: Define valid states explicitly

**Example - State Machine:**
```tsn
type State = "idle" | "loading" | "success" | "error";

interface StateMachine {
    state: State;
    transition(newState: State): void;
}

let machine: StateMachine = {
    state: "idle",
    transition(newState: State): void {
        this.state = newState;
    }
};

machine.transition("loading");  // ✅ OK
// machine.transition("invalid"); // ❌ ERROR
```

### Benefits Over TypeScript

TSN's literal types are **safer** than TypeScript:

1. **Compile-time validation**: All literal checks happen at compile-time
2. **No runtime overhead**: Literals are optimized away in generated code
3. **Exhaustiveness checking**: Compiler ensures all cases are handled
4. **Better error messages**: Clear errors when using invalid literals

```tsn
type Color = "red" | "green" | "blue";

function setColor(color: Color): void {
    // Compiler ensures all cases are handled
    if (color == "red") {
        // ...
    } else if (color == "green") {
        // ...
    } else if (color == "blue") {
        // ...
    }
    // Compiler knows all cases are covered
}
```

## Union Types

Union types allow a variable to be **one of multiple types**. This is useful when a value can legitimately be different types in different situations.

### Basic Union Types

**Syntax:**
```tsn
Type1 | Type2 | Type3
```

**Examples:**
```tsn
// Variable can be string or number
let id: string | i32;
id = "user-123";  // ✅ OK
id = 42;          // ✅ OK
// id = true;     // ❌ ERROR - bool is not in the union

// Function parameter with union type
function printId(id: string | i32): void {
    console.log(id);
}

printId("abc");   // ✅ OK
printId(123);     // ✅ OK

// Multiple types in union
let value: i32 | f64 | string | bool;
value = 10;       // ✅ OK
value = 3.14;     // ✅ OK
value = "text";   // ✅ OK
value = true;     // ✅ OK
```

### Union with Null/Undefined

Unions are commonly used to make types nullable:

**Examples:**
```tsn
// Nullable string
let name: string | null = null;
name = "Alice";  // ✅ OK
name = null;     // ✅ OK

// Optional value
let age: i32 | undefined;
age = 25;        // ✅ OK
age = undefined; // ✅ OK

// Can be value, null, or undefined
let data: string | null | undefined;
```

### Type Guards with Unions

When using union types, you need **type guards** to narrow down the specific type:

**Examples:**
```tsn
function processValue(value: string | i32): void {
    // Type guard using typeof
    if (typeof value == "string") {
        // value is string here
        console.log(value.length);
    } else {
        // value is i32 here
        console.log(value * 2);
    }
}

function handleResult(result: string | null): void {
    // Type guard using null check
    if (result != null) {
        // result is string here
        console.log(result.toUpperCase());
    } else {
        // result is null here
        console.log("No result");
    }
}
```

### Discriminated Unions (Tagged Unions)

Discriminated unions use a common literal property to distinguish between types:

**Examples:**
```tsn
interface Circle {
    kind: "circle";  // Discriminant
    radius: f64;
}

interface Rectangle {
    kind: "rectangle";  // Discriminant
    width: f64;
    height: f64;
}

interface Triangle {
    kind: "triangle";  // Discriminant
    base: f64;
    height: f64;
}

type Shape = Circle | Rectangle | Triangle;

function getArea(shape: Shape): f64 {
    // Type narrowing based on discriminant
    if (shape.kind == "circle") {
        // shape is Circle here
        return 3.14159 * shape.radius * shape.radius;
    } else if (shape.kind == "rectangle") {
        // shape is Rectangle here
        return shape.width * shape.height;
    } else {
        // shape is Triangle here
        return 0.5 * shape.base * shape.height;
    }
}

let circle: Shape = { kind: "circle", radius: 10.0 };
let rect: Shape = { kind: "rectangle", width: 5.0, height: 10.0 };

console.log(getArea(circle));  // Uses circle formula
console.log(getArea(rect));    // Uses rectangle formula
```

### Union with Literal Types

Combining unions with literal types creates powerful type constraints:

**Examples:**
```tsn
// Success or error status
type Status = "success" | "error" | "pending";

// HTTP method
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

// Mixed literal and primitive types
type Port = 80 | 443 | 8080 | "auto";

let port: Port = 80;      // ✅ OK
port = "auto";            // ✅ OK
// port = 3000;           // ❌ ERROR - not in union
```

### Union Return Types

Functions can return different types using unions:

**Examples:**
```tsn
// Return string on success, null on failure
function findUser(id: i32): string | null {
    if (id > 0) {
        return "User found";
    }
    return null;
}

// Return different types based on condition
function getValue(useString: bool): string | i32 {
    if (useString) {
        return "text";
    }
    return 42;
}

// Multiple return types
function parse(input: string): i32 | f64 | string {
    // Try to parse as integer
    // Try to parse as float
    // Return as string if parsing fails
    return input;
}
```

### Array of Union Types

Arrays can contain elements of union types:

**Examples:**
```tsn
import * as array from "std:array";

// Array of mixed types
let mixed: Array<string | i32> = array.create<string | i32>();
array.push(mixed, "hello");
array.push(mixed, 42);
array.push(mixed, "world");
array.push(mixed, 100);

// Process mixed array
for (let i = 0; i < array.length(mixed); i++) {
    let item: string | i32 = array.get(mixed, i);
    if (typeof item == "string") {
        console.log("String: " + item);
    } else {
        console.log("Number: " + item);
    }
}
```

### Union Type Narrowing

TSN provides several ways to narrow union types:

**1. Type Guards (`typeof`):**
```tsn
function process(value: string | i32 | bool): void {
    if (typeof value == "string") {
        // value is string
    } else if (typeof value == "number") {
        // value is i32
    } else {
        // value is bool
    }
}
```

**2. Equality Checks:**
```tsn
function handle(value: string | null): void {
    if (value == null) {
        // value is null
    } else {
        // value is string
    }
}
```

**3. Discriminant Property:**
```tsn
type Result = 
    | { success: true; data: string }
    | { success: false; error: string };

function handle(result: Result): void {
    if (result.success) {
        // result.data is available
        console.log(result.data);
    } else {
        // result.error is available
        console.log(result.error);
    }
}
```

### Best Practices

1. **Use discriminated unions for complex types**: Makes type narrowing easier
2. **Prefer `Optional<T>` over `T | null`**: More explicit and type-safe
3. **Keep unions small**: Too many types in a union can be hard to manage
4. **Use type guards**: Always narrow union types before accessing type-specific properties
5. **Document union types**: Explain when each type variant is used

**Example:**
```tsn
// Good: Small, focused union
type Result = Success | Error;

// Good: Discriminated union
interface Success {
    type: "success";
    data: string;
}

interface Error {
    type: "error";
    message: string;
}

// Avoid: Too many types
// type Value = string | i32 | f64 | bool | null | undefined | Array<string> | ...;
```

### Differences from TypeScript

| Feature | TypeScript | TSN |
|---------|-----------|-----|
| Union syntax | `Type1 \| Type2` | `Type1 \| Type2` (same) |
| Type narrowing | Runtime checks | Compile-time + runtime checks |
| Exhaustiveness | Optional (with `never`) | Enforced by compiler |
| Null in unions | Implicit (without strictNullChecks) | Must be explicit |
| Performance | Runtime type checks | Optimized at compile-time |

TSN's union types are **safer** because:
- Compiler enforces exhaustive checking
- Type narrowing is validated at compile-time
- No implicit null/undefined in unions
- Better optimization in generated code

## TypeScript Compatibility Aliases

To help developers transition from TypeScript to TSN, the following built-in type aliases are provided:

| TSN Type | TypeScript-style Alias | Description |
|----------|------------------------|-------------|
| `f64` | `number` | Maps to TypeScript's `number` type (64-bit float) |
| `bool` | `boolean` | Maps to TypeScript's `boolean` type |

**Example:**
```tsn
// Both declarations are equivalent
let x: f64 = 3.14;
let y: number = 3.14;  // Using TypeScript-style alias

let flag: bool = true;
let isActive: boolean = true;  // Using TypeScript-style alias
```

**Note:** While these aliases exist for convenience, it's recommended to use the explicit TSN types (`f64`, `bool`) in new code for clarity about the underlying representation.

## Null and Undefined Handling

TSN takes a strict approach to null safety, different from JavaScript/TypeScript.

### Explicit Null/Undefined Types

By default, **no type can be assigned `null` or `undefined`** unless explicitly declared:

```tsn
// ❌ Not allowed - types are non-nullable by default
let x: i32 = null;        // ERROR
let y: string = undefined; // ERROR
let z: f64 = null;        // ERROR
```

To allow `null` or `undefined`, you must **explicitly declare** it in the type:

```tsn
// ✅ Explicitly nullable types
let x: i32 | null = null;           // OK
let y: string | undefined = undefined; // OK
let z: f64 | null | undefined = null;  // OK - can be null or undefined
```

### Union Types with Null

When a variable can be null, use union types:

```tsn
function findUser(id: i32): string | null {
    if (id > 0) {
        return "User";
    }
    return null;  // Explicitly return null
}

let user: string | null = findUser(42);

// Must check for null before using
if (user != null) {
    // user is string here
    console.log(user);
}
```

### Recommended: Use Optional<T> Instead

Instead of using `null` or `undefined`, TSN recommends using `Optional<T>` from the standard library:

```tsn
import * as option from "std:option";

function findUser(id: i32): Optional<string> {
    if (id > 0) {
        return option.Some("User");
    }
    return option.None<string>();
}

let user: Optional<string> = findUser(42);

// Type-safe pattern matching
if (option.isSome(user)) {
    let value: string = option.unwrap(user);
    console.log(value);
}
```

### Differences from TypeScript

| Feature | TypeScript | TSN |
|---------|-----------|-----|
| Default nullability | All types nullable by default | All types non-nullable by default |
| Null assignment | `let x: number = null` (with strictNullChecks off) | `let x: i32 = null` ❌ ERROR |
| Explicit nullable | `let x: number \| null` | `let x: i32 \| null` ✅ Required |
| Undefined | Implicit everywhere | Must be explicitly declared |
| Recommended pattern | `\| null \| undefined` | `Optional<T>` from std:option |

### Benefits of Explicit Null Handling

1. **Null safety by default**: Eliminates entire classes of null pointer errors
2. **Clear intent**: When a value can be null, it's explicit in the type signature
3. **Better tooling**: Compiler can enforce null checks at compile-time
4. **RAII compliance**: Ensures resources are always initialized with valid values

**Example of compile-time safety:**
```tsn
function getLength(s: string): i32 {
    return s.length;  // Safe - s cannot be null
}

function getLengthSafe(s: string | null): i32 {
    // return s.length;  // ERROR - must check for null first
    
    if (s == null) {
        return 0;
    }
    return s.length;  // OK - null check performed
}
```

## Differences from JavaScript/TypeScript

### No Implicit Type Coercion

Unlike JavaScript, TSN does **not** perform implicit type conversions:

```tsn
// ❌ Not allowed in TSN
let x: i32 = 10;
let y: f64 = x;  // ERROR - must explicitly cast

// ✅ Correct in TSN
let x: i32 = 10;
let y: f64 = x as f64;  // Explicit cast required
```

### String Implementation

TSN strings are fundamentally different from JavaScript strings:

| Feature | JavaScript/TypeScript | TSN |
|---------|----------------------|-----|
| Encoding | UTF-16 | UTF-8 |
| Implementation | Immutable, reference-counted | C-style, null-terminated |
| Memory | Managed by GC | Manual memory management |
| Indexing | Character-based | Byte-based (with UTF-8 helpers) |

```tsn
// TSN strings require explicit memory management
import * as string from "std:string";

let s1: string = "Hello";
let s2: string = string.concat(s1, " World");  // Allocates new memory
// Memory must be managed according to RAII principles
```

### Number Types

JavaScript has only one number type (`number`), while TSN has explicit integer and floating-point types with different sizes:

```typescript
// JavaScript/TypeScript
let x: number = 42;        // Could be integer or float
let y: number = 3.14;      // Same type as x
```

```tsn
// TSN
let x: i32 = 42;           // Explicitly 32-bit integer
let y: f64 = 3.14;         // Explicitly 64-bit float
// let z: i32 = 3.14;      // ERROR - type mismatch
```

## Best Practices

1. **Choose the right integer size**: Use `i32` for most cases, `i64` for large numbers, `isize` for array indices
2. **Use `f64` for general floating-point**: Unless you have specific precision or performance requirements
3. **Prefer `Optional<T>` over null checks**: Makes null handling explicit and type-safe
4. **Use `Result<T, E>` for error handling**: Better than exceptions for predictable error flows
5. **Be explicit with types**: TSN requires explicit type annotations for clarity and safety
