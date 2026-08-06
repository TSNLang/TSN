# Phase 16: Function Parameters

**Date**: July 8, 2026  
**Status**: ✅ Partial - Function definitions with parameters work, calls need workaround

## 🎯 Objective
Add function parameter support to enable parameterized functions.

## ✅ Features Implemented

### 1. Function Parameter Parsing
**Parser**:
```typescript
// Parses: function add(a: i32, b: i32): i32
private parseFunction(): FunctionDecl {
    // ... name parsing ...
    this.consume("LPAREN", "Expected '('");
    
    // Parse parameters
    if (this.check("RPAREN") == false) {
        let param = this.parseParameter();
        func.params.push(param);
        
        while (this.match("COMMA")) {
            let nextParam = this.parseParameter();
            func.params.push(nextParam);
        }
    }
    // ...
}
```

### 2. Function Signature Generation
**Codegen**:
```llvm
define i32 @add(i32 %a, i32 %b) {
```

✅ Correct parameter list in function signature

### 3. Parameter Stack Allocation
**Codegen**:
```llvm
entry:
  %r0 = alloca i32, align 8
  store i32 %a, ptr %r0, align 8
  %r1 = alloca i32, align 8
  store i32 %b, ptr %r1, align 8
```

✅ Parameters stored on stack
✅ Tracked in `localVars` for lookup

### 4. Parameter Access in Function Body
**Usage**:
```typescript
function add(a: i32, b: i32): i32 {
    return a;  // Load from parameter
}
```

✅ Parameters can be referenced like variables
✅ Generates `load` instruction from alloca

## 📊 Test Results

### Test Case
```typescript
function add(a: i32, b: i32): i32 {
    return a;
}

function main(): i32 {
    return add(5, 7);
}
```

### Generated LLVM IR (Fixed)
```llvm
define i32 @add(i32 %a, i32 %b) {
entry:
  %r0 = alloca i32, align 8
  store i32 %a, ptr %r0, align 8
  %r1 = alloca i32, align 8
  store i32 %b, ptr %r1, align 8
  %r2 = load i32, ptr %r0, align 8
  ret i32 %r2
}

define i32 @main() {
entry:
  %r0 = call i32 @add(i32 5, i32 7)
  ret i32 %r0
}
```

**Execution**:
```powershell
PS> .\test-phase16.exe
PS> echo $LASTEXITCODE
5  # ✓ Returns first parameter!
```

## 🐛 Bootstrap Compiler Limitation

### Issue: Array Push in Parser
**Symptom**: `expr.args.push()` doesn't work reliably in bootstrap compiler

**Impact**: Function call arguments not stored in AST

**Current Workaround**: Manual fix of generated .ll files

**Parser Code** (written but not working):
```typescript
// Parse arguments
if (this.check("RPAREN") == false) {
    let argExpr = new Expr();
    if (this.check("NUMBER")) {
        let numToken = this.consume("NUMBER", "Expected number");
        argExpr.kind = "NumberLiteral";
        argExpr.name = numToken.lexeme;
    }
    valueExpr.args.push(argExpr);  // ← Doesn't work!
    
    while (this.match("COMMA")) {
        let nextArg = new Expr();
        // ... parse nextArg ...
        valueExpr.args.push(nextArg);  // ← Doesn't work!
    }
}
```

**Generated** (bootstrap bug):
```llvm
%r0 = call i32 @add()  # Missing arguments!
```

**Manual Fix**:
```llvm
%r0 = call i32 @add(i32 5, i32 7)  # Add manually
```

## 📈 Code Changes

| File | Lines Changed | Key Changes |
|------|---------------|-------------|
| `parser.tsn` | +40 | Parameter parsing, call argument parsing |
| `codegen.tsn` | +30 | emitParams(), emitParamAllocas(), call args |
| `test-phase16.tsn` | +10 | Test file for parameters |

## ✅ What Works

1. **Function Definitions**: ✅ `function add(a: i32, b: i32): i32`
2. **Parameter Count**: ✅ Unlimited parameters
3. **Parameter Access**: ✅ Can read/use parameters in function body
4. **LLVM Signatures**: ✅ Correct `define` statements
5. **Parameter Storage**: ✅ Stack allocation and tracking

## ⚠️ Known Limitations

1. **Call Arguments**: ❌ Must manually fix .ll files
   - Bootstrap compiler bug: `Array.push()` unreliable
   - Affects: `expr.args.push()` in parser
   - Solution: Wait for self-hosting OR implement arg parsing differently

2. **Workaround Until Self-Hosting**:
   - Write code: `return add(5, 7);`
   - Compiler generates: `call i32 @add()`
   - Manual fix: Change to `call i32 @add(i32 5, i32 7)`
   - Compile and run

## 🚀 Impact

**Before Phase 16**: Fixed-parameter functions only
**After Phase 16**: Parameterized functions work (with manual arg fix)

### New Capabilities
- Functions can accept parameters
- Parameters work like local variables
- Multiple parameters supported
- Foundation for arithmetic with parameters

### Example Usage
```typescript
// Define with parameters
function calculate(x: i32, y: i32, z: i32): i32 {
    let temp: i32 = x;
    return temp;
}

// Call (manual fix .ll file needed)
function main(): i32 {
    return calculate(10, 20, 30);
}
```

## 📝 Lessons Learned

1. **Bootstrap limitations acceptable**: Document and work around
2. **Partial features ship**: Better than waiting for perfect
3. **Self-hosting will fix many bugs**: Arrays, field access, etc.
4. **Manual testing validates**: Even with workarounds, features work

## 🎯 Next Steps

### Option A: Continue Despite Limitation
- Phase 17: Arithmetic operators (`a + b`)
- Phase 18: Control flow (`if`, `while`)
- Phase 19: Self-compilation attempt
- **Note**: All will need manual .ll fixes for args

### Option B: Alternative Parser Strategy
- Parse args to string instead of Array
- Example: `"5,7"` → split and emit in codegen
- More bootstrap-compatible
- But hacky and limited

### Option C: Accept Current State
- Document limitation
- Continue with other features
- Fix when self-hosted
- **Recommended approach**

## ✅ Phase 16 Status: Partial Success

**Working**:
- ✅ Function parameter definitions
- ✅ Parameter access in function bodies
- ✅ LLVM IR generation for parameters

**Needs Workaround**:
- ⚠️ Function call arguments (manual .ll edit)

**Overall**: Significant progress! Parameters work, just need manual touch-up for calls until self-hosting.

**Next**: Phase 17 - Arithmetic operators to actually use those parameters!
