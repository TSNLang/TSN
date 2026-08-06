# Phase 33: Object Model + Member Assignment — INCOMPLETE ⚠️

## Status: Cannot fully compile compiler source yet.

### Achievements:
1. `new ClassName(args)` — parser + codegen
2. `obj.field` read/write — parser + codegen
3. Field offset table — hardcoded for Expr, Stmt, Token, etc.
4. `let tok: Token = new Token(...)`, `tok.lexeme` — compiles
5. Call args `let x = add(5, 8)` — fixed double-parse bug

### Test-case object-full:
```
let tok: Token = new Token("ID", "hello", 1, 1);
let s: string = tok.lexeme;
```
Output: Token_new call, GEP offset 24 (correct Token.lexeme), load lexeme.

### ast.tsn self-test:
Compilation succeeded, but output.ll:
```
ret i32 %r9   ← ERROR: %r9 is ptr, expected i32
```
Codegen emits `ret i32 %r9` for `return stmt` because emitReturn hardcodes `ret i32`.

Fix: emitReturn should detect value type.

### parser.tsn self-test:
Tokens/Functions/classes parsed (Functions: 0? Actually classes: 1), but output.ll has only headers: parser.tsn has no functions at module level (only class methods). `program.functions.length` is 0, so no IR emitted.

Fix main.tsn: emit class methods too.

### Blocker for self-hosting:
1. Codegen only emits module-level functions, not class methods.
2. emitReturn always emit `ret i32` for any value.
3. String literals emit as `inttoptr i32 0 to ptr ; string:` placeholder (not real string constants).
4. Missing runtime declarations (class_alloc, string ops).
5. Type mismatches (ptr vs i32) in many places.

## Next:
Phase 34 focuses on **class methods & self-compilation basics**:
- emit class constructors and methods
- fix emitReturn for ptr types
- emit string literal constants
- emit runtime declarations

## Files Changed:
- compiler/src/ast.tsn — Stmt default block init
- compiler/src/parser.tsn — args temp vars, else-expr, new/member/string/this/true/false in parsePrimary + parseMemberChain
- compiler/src/codegen.tsn — emitVarDecl typed allocas, emitExpression with NewExpr/MemberExpr/StringLiteral/MethodCallExpr, emitAssign field offset, emitMemberRead offset, emitNew, field offset table
- bootstrap/compiler.py — _get_obj_struct_name MemberExpr chain support
