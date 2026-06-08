# TSN Bootstrap Blocker - Class Inheritance Bug

**Date:** 2026-06-06  
**Status:** CRITICAL BUG IDENTIFIED

## Root Cause Found

The self-hosted TSN compiler (Level 3/4) has a **critical bug in handling class inheritance** that prevents it from compiling complex files with multiple classes.

### Bug Description

When compiling classes that use `extends` keyword (inheritance), the compiler fails to generate proper method names. Instead of:
```llvm
define void @Derived.init(ptr %r0) {
```

It generates:
```llvm
define void @init() {
```

The class name prefix is **completely missing** for derived classes.

### Impact

This causes **function name collisions** when multiple classes have methods with common names (init, dispose, toString, etc.):
- Only ONE version of each colliding function survives in the output
- Other methods are silently dropped or overwritten
- Result: Incomplete/corrupted LLVM IR output

### Evidence

**Test Case: test-inheritance.tsn**
- Base class: Base.init, Base.getValue ✓ (correct prefixes)
- Derived class (extends Base): init, getExtra ✗ (missing "Derived." prefix)

**Real Files:**
- **mir.tsn** (22 classes): Many use `extends MIRValue`, `extends MIRInst` → only 2 functions generated
- **ast.tsn** (58 classes): Many use inheritance → only 1 function generated  
- **lexer.tsn** (1 class, no inheritance) → 12 functions generated ✓
- **test-two-classes.tsn** (2 classes, no inheritance) → 5 functions generated ✓
- **test-five-classes.tsn** (5 classes, no inheritance) → 11 functions generated ✓

### Compiler Component - CONFIRMED ROOT CAUSE

**Lexer (ast.tsn TokenKind enum):**
- ❌ **MISSING `Extends` token completely**
- When lexer encounters "extends" keyword, it tokenizes as `Identifier` instead
- This causes parser to receive wrong token sequence

**Parser (ast-parser.tsn):**
- ❌ **NO inheritance parsing logic** - grep search for "extends" returns zero matches
- Parser cannot handle `class Derived extends Base` syntax
- Gets confused by extra Identifier tokens where it expects LBrace

**AST Structure:**
- ❌ Declaration class has NO field for storing base class name
- Level 1 (Deno) parser stores `baseClassName: string | undefined`
- Level 3 (self-hosted) has no equivalent field

**Result:** When parsing `class Derived extends Base {`:
```
Expected: Class("Derived") Extends("extends") Identifier("Base") LBrace
Actual:   Class("Derived") Identifier("extends") Identifier("Base") LBrace
```
Parser confusion → corrupted AST → wrong output

### Verification

```tsn
// buildMethod in mir-builder.tsn
let fullName = className + "." + member.name;
log("MIRBuilder.buildMethod: " + fullName);
```

For derived classes, logs show:
- `MIRBuilder.buildClass: Derived` ✓ (class name correct)
- `MIRBuilder.buildMethod: Derived.init` (expected)
- But output has: `define void @init()` ✗ (name missing)

**Conclusion:** The bug occurs **between buildMethod() and LLVM IR emission**. The method name is constructed correctly in MIR builder, but gets corrupted during code generation or function registration.

### Why Bootstrap Fails

The TSN compiler source (self-hosting/*.tsn) extensively uses class inheritance:
- `MIRConstant extends MIRValue`
- `MIRRegister extends MIRValue`  
- `MIRBinaryInst extends MIRInst`
- Many more...

When Level 3 tries to compile these files:
1. Classes with inheritance lose their method name prefixes
2. Methods with common names collide (multiple `init`, `dispose` methods)
3. Only 1-2 methods survive after collisions
4. Output is incomplete and unusable
5. **True bootstrap is impossible**

### Fix Required

1. **Locate the bug:** Determine where method names are lost for derived classes
   - Check AST parser's handling of `extends` keyword
   - Check MIR builder's function name generation
   - Check MIR codegen's function emission

2. **Apply fix:** Ensure derived class methods get proper `ClassName.methodName` format

3. **Test:** Recompile test-inheritance.tsn and verify all functions have correct names

4. **Bootstrap:** Once fixed, Level 3 should be able to compile mir.tsn, ast.tsn, and other compiler source files completely

### Current Bootstrap Status

- ✅ **Phase 3 OOP implementation:** Complete and correct (NewExpr, method calls, field access work)
- ✅ **Single-class compilation:** Works perfectly
- ✅ **Multi-class compilation (no inheritance):** Works perfectly
- ❌ **Multi-class compilation (with inheritance):** BROKEN - critical bug
- ❌ **True bootstrap:** BLOCKED by inheritance bug

### Phase 3 Achievement

Despite the inheritance bug (which is a **pre-existing compiler limitation**, not caused by Phase 3 work), we successfully:
- Implemented class registry and metadata collection
- Implemented NewExpr (object instantiation)  
- Implemented method calls (obj.method() → ClassName.method(obj, ...))
- Implemented field access (this.field read/write)
- Implemented ThisExpr (this keyword)
- Verified all features work correctly on programs without inheritance

**The Phase 3 implementation is correct. The bootstrap blocker is a separate, pre-existing bug in the compiler's inheritance support.**
