# Parser Implementation Progress

**Date**: 2026-04-14  
**Version**: v0.10.0-indev  
**Status**: 🔄 In Progress

## Current Status

### ✅ Completed
- Parser.tsn skeleton with all major functions implemented (~900 lines)
- Expression parsing with operator precedence (11 levels)
- Statement parsing (var, return, if, while, for, break, continue)
- Declaration parsing (function, interface, const/let)
- Token helper functions (match, check, advance, consume)
- AST node creation functions

### 🔄 In Progress
- Testing Parser.tsn compilation
- Fixing global array support

### ❌ Blocked
- **Critical Issue**: TypeScript compiler doesn't support global arrays
- Parser.tsn needs global arrays: `tokens[]`, `nodes[]`, `source[]`
- Current codegen only supports global number literals

## Problem Analysis

### Issue: Global Arrays Not Supported

**File**: `compiler-ts/src/codegen.ts`  
**Function**: `generateGlobalConst()`

```typescript
private generateGlobalConst(decl: VarDecl): void {
  // Only handles number literals!
  if (!decl.init || decl.init.kind !== ASTKind.NumberLiteral) {
    console.error(`Global ${decl.isConst ? 'const' : 'let'} ${decl.name} must have a number literal initializer`);
    return;
  }
  // ...
}
```

**What Parser.tsn needs**:
```tsn
let tokens: Token[10000];      // ❌ Not supported
let nodes: ASTNode[5000];      // ❌ Not supported
let source: i32[100000];       // ❌ Not supported
```

**What TypeScript compiler supports**:
```tsn
const MAX_TOKENS: i32 = 10000;  // ✅ Supported
let counter: i32 = 0;           // ✅ Supported
```

## Solutions

### Option 1: Extend TypeScript Compiler (Recommended)

Add global array support to `compiler-ts/src/codegen.ts`:

**Changes needed**:
1. Modify `generateGlobalConst()` to handle array types
2. Generate LLVM global array declarations:
   ```llvm
   @tokens = global [10000 x %Token] zeroinitializer, align 4
   @nodes = global [5000 x %ASTNode] zeroinitializer, align 4
   ```
3. Handle array initialization (zero-init for now)

**Pros**:
- ✅ Proper solution
- ✅ Enables full Parser.tsn compilation
- ✅ Needed for Codegen.tsn anyway

**Cons**:
- ⏱️ Takes time to implement (~1-2 hours)
- 🧪 Needs testing

**Estimated effort**: 1-2 hours

### Option 2: Refactor Parser.tsn (Workaround)

Remove global arrays and pass them as parameters:

```tsn
function parse_expression(tokens: Token[], nodes: ASTNode[], pos: i32): i32 {
    // ...
}
```

**Pros**:
- ⚡ Quick workaround
- 🧪 Can test parser logic immediately

**Cons**:
- ❌ Not scalable
- ❌ Makes code verbose
- ❌ Still need arrays eventually

**Estimated effort**: 30 minutes

### Option 3: Hybrid Approach (Pragmatic)

1. Create simplified test version without arrays (done: `test_parser_simple.tsn`)
2. Extend TypeScript compiler for arrays
3. Recompile full Parser.tsn

**Pros**:
- ✅ Test parser logic now
- ✅ Proper solution later
- ✅ Incremental progress

**Cons**:
- 🔄 Two-step process

**Estimated effort**: 2-3 hours total

## Recommendation

**Go with Option 1: Extend TypeScript Compiler**

Reasons:
1. We need global arrays for Codegen.tsn anyway
2. It's a one-time investment
3. Enables full self-hosting capability
4. Clean, proper solution

## Implementation Plan

### Phase 1: Add Global Array Support (1-2 hours)

**File**: `compiler-ts/src/codegen.ts`

1. **Modify `generateGlobalConst()`**:
   ```typescript
   private generateGlobalConst(decl: VarDecl): void {
     const llvmType = decl.type ? this.getLLVMType(decl.type) : 'i32';
     
     // Handle arrays
     if (decl.type?.isArray) {
       const size = decl.type.arraySize || 0;
       const elementType = this.getLLVMType({ name: decl.type.name, isPointer: false, isArray: false });
       this.emit(`@${decl.name} = global [${size} x ${elementType}] zeroinitializer, align 4`);
       return;
     }
     
     // Handle number literals (existing code)
     if (!decl.init || decl.init.kind !== ASTKind.NumberLiteral) {
       console.error(`Global ${decl.isConst ? 'const' : 'let'} ${decl.name} must have a number literal initializer`);
       return;
     }
     
     const value = (decl.init as NumberLiteral).value;
     if (decl.isConst) {
       this.emit(`@${decl.name} = constant ${llvmType} ${value}, align ${this.getAlignment(llvmType)}`);
     } else {
       this.emit(`@${decl.name} = global ${llvmType} ${value}, align ${this.getAlignment(llvmType)}`);
     }
   }
   ```

2. **Update `getLLVMType()` to handle struct arrays**:
   ```typescript
   private getLLVMType(type: TypeAnnotation | undefined): string {
     if (!type) return 'i32';
     
     let baseType = type.name;
     
     // Map TSN types to LLVM types
     if (baseType === 'i32') baseType = 'i32';
     else if (baseType === 'i64') baseType = 'i64';
     else if (baseType === 'f32') baseType = 'float';
     else if (baseType === 'f64') baseType = 'double';
     else if (baseType === 'void') baseType = 'void';
     else if (baseType === 'bool') baseType = 'i1';
     else baseType = `%${baseType}`; // Struct type
     
     if (type.isPointer) {
       return 'ptr';
     }
     
     return baseType;
   }
   ```

3. **Test with simple array**:
   ```tsn
   let numbers: i32[10];
   let tokens: Token[100];
   ```

### Phase 2: Test Parser.tsn Compilation (30 min)

1. Remove `declare` keywords from Parser.tsn
2. Compile with extended TypeScript compiler
3. Check generated LLVM IR
4. Fix any issues

### Phase 3: Integration Test (30 min)

1. Create test program that uses Parser functions
2. Compile and run
3. Verify parser creates correct AST nodes

## Current Files

### Completed
- ✅ `src/Types.tsn` - Type definitions and constants
- ✅ `src/Lexer.tsn` - Lexical analyzer (23 functions, ~400 lines)
- ✅ `src/Parser.tsn` - Syntax analyzer (40+ functions, ~900 lines)
- ✅ `src/test_parser_simple.tsn` - Simple parser test

### In Progress
- 🔄 `compiler-ts/src/codegen.ts` - Needs global array support

### TODO
- ⏳ `src/Codegen.tsn` - Code generator (~800-1200 lines)
- ⏳ `src/Main.tsn` - Entry point with FFI
- ⏳ `src/FullCompiler.tsn` - Integrated compiler

## Metrics

- **Parser.tsn**: ~900 lines, 40+ functions
- **Functions implemented**:
  - Token helpers: 10 functions
  - Expression parsing: 10 functions (with precedence)
  - Statement parsing: 8 functions
  - Declaration parsing: 4 functions
  - AST node creation: 1 function
  - Type parsing: 1 function
  - Main parse: 1 function

## Next Steps

1. **Immediate**: Extend TypeScript compiler for global arrays
2. **Then**: Test Parser.tsn compilation
3. **Then**: Start Codegen.tsn implementation
4. **Finally**: Integration and self-hosting test

## Timeline Estimate

- Global array support: 1-2 hours
- Parser testing: 30 minutes
- Codegen implementation: 4-6 hours
- Integration: 1-2 hours
- **Total**: 7-11 hours of focused work

## Confidence Level

- Parser logic: ✅ High (based on TypeScript parser)
- Global arrays: ✅ High (straightforward LLVM IR)
- Integration: 🟡 Medium (needs testing)
- Self-hosting: 🟡 Medium (complex but achievable)

---

**Status**: Ready to implement global array support in TypeScript compiler!

**Next Action**: Modify `compiler-ts/src/codegen.ts` to support global arrays
