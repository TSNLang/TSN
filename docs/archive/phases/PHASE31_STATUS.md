# Phase 31: Lexer Enhancements - PARTIAL SUCCESS ⚠️

## Date: 2026-07-13

## Goal
Fix TSN lexer to compile full compiler source (ast.tsn, parser.tsn, etc.)

## What Was Added ✅

### New Tokens
1. **Array brackets**: `[`, `]` (LBRACK, RBRACK)
2. **Dot operator**: `.` (DOT)
3. **Logical operators**: `&&` (AND), `||` (OR), `!` (NOT)
4. **Not equals**: `!=` (NE)
5. **String literals**: `"..."` (STRING) with escape sequence support

### New Keywords
- `const`, `class`, `constructor`, `new`, `this`
- `export`, `import`, `from`
- `public`, `private`

### String Scanning
Added `scanString()` method with:
- Escape sequence support (`\"`, `\\`)
- Proper quote handling
- Multi-line string support

## Test Results

| Test File | Tokens | Functions | Output | Status |
|-----------|--------|-----------|--------|--------|
| test-simple.tsn | 32 | 2 | ✅ output.ll | ✅ Works |
| test-export.tsn (class) | 56 | 1 | ✅ output.ll | ✅ Works |
| test-import.tsn | ? | 1 | ✅ output.ll | ✅ Works |
| ast.tsn (first 150 lines) | ? | 3 | ✅ output.ll | ✅ Works |
| ast.tsn (first 160 lines) | ? | ? | ✅ output.ll | ✅ Works |
| ast.tsn (full 185 lines) | ? | 5 | ❌ No output | ❌ FAILS |

## Blocker Found: `else if` Not Supported 🐛

### Problem
TSN parser doesn't support `else if` syntax:

```tsn
if (x == 0) {
    return 0;
} else if (x == 1) {  // ← PARSER FAILS HERE
    return 1;
}
```

### Root Cause
Parser treats `else if` as:
```
else {
    if (condition) stmt
    // ← Missing closing brace!
}
```

### Where It Breaks
ast.tsn line 166-169:
```tsn
if (value == 0) expr.numValue = "0";
else if (value == 1) expr.numValue = "1";  // ← FAIL
else if (value == 42) expr.numValue = "42";
else expr.numValue = "?";
```

## Solutions

### Option A: Fix Parser (Proper Solution)
Add `else if` support to parser.tsn:

```tsn
private parseIf(): Stmt {
    // ... parse if ...
    
    if (match("ELSE")) {
        if (check("IF")) {  // Special case: else if
            elseBlock = this.parseIf();  // Recursive!
        } else {
            elseBlock = this.parseStatement();
        }
    }
}
```

### Option B: Rewrite Code (Workaround)
Change ast.tsn to avoid `else if`:

```tsn
// Before:
if (value == 0) expr.numValue = "0";
else if (value == 1) expr.numValue = "1";
else expr.numValue = "?";

// After:
if (value == 0) {
    expr.numValue = "0";
} else {
    if (value == 1) {
        expr.numValue = "1";
    } else {
        expr.numValue = "?";
    }
}
```

## Impact

**Cannot achieve true self-hosting without fixing `else if`!**

ast.tsn, parser.tsn, codegen.tsn all use `else if` extensively:
- ast.tsn: 10+ occurrences
- parser.tsn: 50+ occurrences  
- codegen.tsn: 30+ occurrences

Rewriting all of them is impractical.

## Next Steps

### Priority 1: Fix Parser to Support `else if` ✅ REQUIRED
1. Update parseIf() in parser.tsn
2. Handle `else if` as special case
3. Test with simple else-if chain
4. Recompile all modules with Python bootstrap
5. Test tsnc-self.exe with ast.tsn

### Priority 2: Test Full Self-Compilation
Once `else if` works:
1. Compile ast.tsn → ast.ll ✅
2. Compile lexer.tsn → lexer.ll
3. Compile parser.tsn → parser.ll
4. Compile codegen.tsn → codegen.ll
5. Compile main.tsn → main.ll
6. Link → tsnc-self2.exe
7. Test → Ultimate goal!

## Files Modified
- `compiler/src/lexer.tsn` - Added tokens, keywords, string scanning
- `self-lexer.ll` - Recompiled (53,529 bytes, was 38,030)

## Conclusion

**Phase 31: PARTIAL SUCCESS**

Lexer is now feature-complete for basic TSN code:
- ✅ All tokens supported
- ✅ All keywords supported
- ✅ String literals work
- ✅ Can compile simple classes, exports, imports

**Blocker**: Parser missing `else if` support

**Impact**: Cannot compile full compiler source until fixed

**Status**: Need Phase 32 to fix parser `else if` handling

