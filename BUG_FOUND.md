# 🐛 CRITICAL BUG FOUND IN C++ COMPILER

## Summary
C++ compiler skips function body statements, causing bootstrap compiler to fail.

## Root Cause
When compiling `test_array_pass.tsn`:
```tsn
function fill_array(arr: ptr<i32>): void {
    arr[0] = 42;  // ← These statements are MISSING in LLVM IR!
    arr[1] = 100;
}
```

Generated LLVM IR:
```llvm
define void @fill_array(ptr %0) {
entry:
  %arr = alloca ptr, align 8
  store ptr %0, ptr %arr, align 8
  ret void  // ← Function body is EMPTY!
}
```

## Impact
- Bootstrap compiler's `lex` function doesn't populate `tokens` array
- `tokens[0]` remains 0 (TK_END) instead of 30 (TK_KW_FUNCTION)
- Parser fails because first token is not recognized
- No LLVM IR is generated

## Debug Trail
1. ✅ Self-hosting achieved with C++ compiler
2. ✅ Bootstrap compiler compiles and runs
3. ❌ Bootstrap compiler generates empty output.ll
4. 🔍 Found: `outputLen = 0` (no LLVM IR generated)
5. 🔍 Found: `nodeCount = 0` (no AST nodes)
6. 🔍 Found: `tokens[0] = 0` (TK_END instead of TK_KW_FUNCTION)
7. 🔍 Found: `tokenCount > 0` but tokens array not populated
8. 🐛 **ROOT CAUSE**: C++ compiler skips function body statements!

## Next Steps
1. Fix C++ compiler to emit all statements in function bodies
2. Recompile bootstrap compiler
3. Verify bootstrap compiler works end-to-end

## Files Affected
- `src/main.cpp` - C++ compiler (needs fix)
- `bootstrap_compiler.tsn` - Works correctly, just needs proper compilation
- `test_array_pass.tsn` - Minimal test case demonstrating the bug
