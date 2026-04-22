# Cross-Module Generic Instantiation Issue

## Problem

When importing generic functions from stdlib modules (like `Some<T>()` from `std:option`), the compiler cannot instantiate the generic classes (`Optional<T>`) that these functions return.

## Root Cause

1. When a module like `std:option` is compiled, it exports functions (`Some`, `None`) but **not** the generic class `Optional<T>`
2. The `exports.symbols` array only contains function symbols, not class symbols
3. When `processImport()` tries to import symbols, it only gets functions, not the classes they depend on
4. When `instantiateFunction("Some", [i32])` is called, it tries to instantiate `Optional<i32>` but cannot find `Optional` in `genericClasses` map

## Current Behavior

```typescript
// std:option exports
export class Optional<T> { ... }  // NOT in exports.symbols
export function Some<T>(): Optional<T> { ... }  // IN exports.symbols
```

When compiling:
```typescript
import { Some } from "std:option";
let x = Some<i32>(10);  // FAILS: Cannot find Optional in genericClasses
```

## Attempted Solutions

1. **Auto-import from return types**: Tried to scan function return types and auto-import classes, but `exports.symbols` doesn't contain class symbols
2. **Scan exports.program**: Tried to scan the module's AST, but generic classes are not included in the program declarations (they're filtered out during compilation)

## Proper Solution (TODO)

The proper fix requires changes to the module compilation and export system:

1. **Update `getExportedSymbols()`**: Make it collect and export generic class declarations
2. **Update module compilation**: Ensure generic classes are included in `exports.symbols`
3. **Update `processImport()`**: Import generic classes along with functions

## Workaround

For now, generic functions that return generic classes only work within the same module where the class is defined. Cross-module usage requires manual instantiation.

## Related Files

- `src/src/codegen.ts`: `processImport()`, `instantiateClass()`, `getExportedSymbols()`
- `src/src/module-resolver.ts`: `ModuleExports` interface
- `src/std/option.tsn`, `src/std/result.tsn`: Affected stdlib modules

## Status

This is a **blocking issue** for Stdlib Generic Coverage. It needs to be fixed before generic stdlib utilities can work properly across modules.
