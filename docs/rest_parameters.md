# TSN 0.16.12-indev - Rest Parameters Design Note

Rest Parameters (`...`) should be prioritized before expanding `std:hash` with many fixed-arity helpers such as `hashCombine3`, `hashCombine4`, and so on.

## Why this feature first

Rest parameters solve a broader language problem than `std:hash` alone.

They would enable cleaner APIs such as:

```ts
function combine(...parts: i32[]): i32 {
    // combine many hash values
}
```

This is preferable to maintaining many one-off variants:

```ts
function hashCombine2(a: i32, b: i32): i32
function hashCombine3(a: i32, b: i32, c: i32): i32
function hashCombine4(a: i32, b: i32, c: i32, d: i32): i32
```

## Current compiler state

The compiler already has part of the needed foundation:

- `...` is already tokenized as `TokenKind.Ellipsis` in `src/src/lexer.ts`
- spread elements already exist in the AST as `SpreadElementExpr`
- array literal spread lowering already exists in `src/src/codegen.ts`
- `Array<T>` already exists in `src/std/array.tsn`

This makes rest parameters a natural next step.

## Recommended lowering model

Use `Array<T>` as the initial lowering target for rest parameters.

Source-level form:

```ts
function combine(...parts: i32[]): i32 {
    return 0;
}
```

Implementation direction:

- the final parameter is marked as `isRest`
- the callee receives an `Array<T>` instance
- the caller collects trailing arguments into that array before the call

This keeps the feature aligned with current TSN container and ownership rules.

## Concrete compiler changes

### 1. AST / types

File: `src/src/types.ts`

Add rest metadata to `Parameter`:

```ts
export interface Parameter {
  name: string;
  type: TypeAnnotation;
  isRest?: boolean;
}
```

### 2. Parser

File: `src/src/parser.ts`

Update parameter parsing so it can read:

```ts
function f(...args: i32[]): void
```

Rules:

- only one rest parameter is allowed
- the rest parameter must be the last parameter
- if TSN keeps `...args: i32[]` syntax, parser validation should enforce an array element type or an equivalent lowering rule

### 3. Codegen

File: `src/src/codegen.ts`

Needed work:

- detect rest parameter declarations during function generation
- lower trailing call arguments into a temporary `Array<T>`
- pass that array as the final argument
- include rest metadata in mangling when needed

### 4. Type inference and call lowering

The most reusable existing logic is the current array literal spread path.

That logic already:

- instantiates `Array<T>`
- infers element types from expressions / iterators
- pushes values into the dynamic array

A first implementation of rest parameters should reuse as much of that path as possible.

## Suggested milestone scope

### Phase 1

- parser support for rest parameters in function declarations
- AST support via `Parameter.isRest`
- basic codegen for direct calls like `f(1, 2, 3)`

### Phase 2

- allow rest parameters in methods and constructors
- improve mangling and metadata handling
- allow generic rest parameters where practical

### Phase 3

- integrate rest parameters into `std:hash`
- replace the need for `hashCombine3`, `hashCombine4`, etc.

## Expected benefit for std:hash

Once this feature exists, `std:hash` can move toward a cleaner API such as:

```ts
let h = hash.combineMany(a, b, c, d);
```

or eventually:

```ts
let h = hash.combine(a, b, c, d);
```

This keeps the standard library smaller and the language more expressive.
