# Phase 30: Constructor Parameters & Field Access Fix - COMPLETE ✅

## Date: 2026-07-08

## Bug Fixed: Wrong GEP Field Index

### Root Cause
`_lookup_field(name)` searched ALL classes and returned the FIRST match.

When both `Lexer` (has `tokens` at index 4) and `Parser` (has `tokens` at index 2) exist:
- `_lookup_field('tokens')` → returned Lexer's index 4 ❌
- Should return Parser's index 2 ✅

### Fix
Added class-specific lookup **before** global fallback in both `emit_member` and `emit_assign`:

```python
# Prefer class-specific lookup
struct_name = self._get_obj_struct_name(obj_expr)
field_info = None
if struct_name and struct_name in self.class_fields:
    field_info = self.class_fields[struct_name].get(member)
if field_info is None:
    field_info = self._lookup_field(member)  # fallback
```

## Test Results

### ✅ Simple constructor with primitives
```tsn
constructor(type: string, lexeme: string, line: i32) {
    this.type = type;
    this.lexeme = lexeme;
    this.line = line;
}
let tok = new Token("IDENTIFIER", "hello", 42);
tok.getLine() == 42  ✅
```

### ✅ Complex constructor (like Lexer/Parser pattern)
```tsn
class Lexer { source: string; pos: i32; tokens: Array<string>; }
class Parser { tokens: Array<string>; current: i32; }

let lexer = new Lexer("hello world");  // 3 tokens added
let parser = new Parser(toks);         // advance twice → current=2
count + current == 5  ✅
```

### ✅ TSN Compiler (tsnc5.exe) still works

## All Blockers CLEARED! 🎉

| Feature | Status |
|---------|--------|
| Generic types | ✅ |
| Import/export | ✅ |
| MemberExpr (`this.field`) | ✅ |
| String operations | ✅ |
| Array methods | ✅ |
| Constructor parameters | ✅ |

## Next: Self-Compilation Attempt! 🚀
