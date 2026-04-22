# TSN 0.16.14-indev - Generic Stabilization

TSN 0.16.14-indev should focus on making generics reliable across the whole language before deeper self-hosting work begins.

## Why this now

Generics are already present in TSN, but they still behave like a feature that works in many cases rather than a foundation that can be trusted everywhere.

That is enough for early stdlib work such as `Array<T>`, `Optional<T>`, and parts of `std:hash`, but it is not yet strong enough for:

- a clean `std:map` design
- large cross-module generic programs
- self-hosting meaningful compiler subsystems in TSN itself

## Goal

Move from partial generic support to "generic for everything" as a compiler direction.

That means generic code should work consistently in:

- local source files
- imported modules
- `std:*` modules
- generic classes
- generic functions
- generic constructors
- generic methods
- nested generic compositions

## Priority areas

### 1. Cross-module generic instantiation

The compiler should instantiate imported generic classes and functions without losing:

- external declarations
- imported dependency wiring
- runtime type metadata
- mangled name consistency
- vtable and method registration

This is currently one of the most fragile parts of the system.

### 2. Nested generics

The following patterns should become routine:

```ts
Array<Optional<T>>
Optional<Array<T>>
ptr<Array<T>>
Array<Array<T>>
```

Nested generic substitutions should preserve the real inner types all the way through parsing, monomorphization, codegen, and call lowering.

### 3. Generic methods and constructors

The compiler should ensure that instantiated classes keep working through:

- constructors
- instance methods
- method calls through imported modules
- method calls inside generic stdlib code
- method calls after nested substitution

### 4. Generic function stability

Generic functions should instantiate with the same reliability as generic classes.

That includes:

- imported generic functions
- generic functions returning generic classes
- generic functions accepting nested generic parameters
- function metadata and external declaration handling

### 5. Stdlib generic coverage

The standard library should become the real proving ground for generic stability.

Existing and likely targets include:

- `Array<T>`
- `Optional<T>`
- `Iterator<T>`
- `Result<T, E>` in the future
- helper utilities built on top of those containers

## Relationship to self-hosting

Self-hosting should not be treated as separate from generic stabilization.

A serious self-host effort will naturally require:

- generic token containers
- generic AST helper collections
- generic diagnostics lists
- generic parser utilities
- reusable generic stdlib building blocks

Because of that, generic stabilization is the practical prerequisite for self-hosting, not a distraction from it.

## Relationship to std:map

`std:map` remains postponed for now.

The reason is not only hashing. A real generic map also depends on generics being reliable enough across module boundaries and complex container internals.

A stronger generic foundation will make later `std:map` work much cleaner and reduce the amount of one-off compiler patches.

## Suggested checklist

- imported generic class instantiation is stable
- imported generic function instantiation is stable
- nested generic substitution is preserved correctly
- generic constructor calls work across modules
- generic method calls work across modules
- stdlib generic dependencies keep their declarations/imports intact
- mangling stays consistent for instantiated symbols
- rest-parameter lowering continues to work with generic containers
- smoke examples exist for each major generic scenario

## Expected outcome

If 0.16.14-indev succeeds, TSN should be able to treat generics as a normal everyday tool rather than a limited advanced feature.

That is the point where deeper self-hosting work becomes realistic.
