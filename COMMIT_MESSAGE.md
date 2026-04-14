fix(codegen): Distinguish parameters from local variables in identifier loading

Fixed critical bug in TypeScript compiler where all identifiers were being
loaded from %name.addr, which only works for function parameters.

Changes:
- Added currentFunctionParams: Set<string> to track function parameters
- Updated generateFunction() to populate parameter set on entry
- Modified generateIdentifier() to check identifier type:
  * Global constants: load from @name
  * Function parameters: load from %name.addr
  * Local variables: load from %name

Verification:
- Created test_integration.tsn with function calls and local variables
- Generated LLVM IR now correctly distinguishes all three cases
- Compiled executable returns correct exit code (30 = 10 + 20)

Files changed:
- compiler-ts/src/codegen.ts (parameter tracking logic)
- src/test_integration.tsn (integration test)
- src/test_integration.ll (generated LLVM IR)
- BUG_FIXED.md (detailed documentation)
- CHANGELOG.md (version history)

This fix enables the TypeScript compiler to correctly compile TSN programs
with functions, parameters, and local variables - a critical step toward
self-hosting.
