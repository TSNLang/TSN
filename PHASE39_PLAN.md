# Phase 39: Parser Self-Compilation

**Goal**: Enable parser.tsn to compile itself  
**Status**: 🚧 Planning  
**Blocker**: Deep recursion causes stack overflow  
**Target**: v0.39.0

---

## 🎯 Problem Statement

### Current Situation:
```
❌ python bootstrap\compiler.py parser.tsn     → ✅ Works (Python has no recursion limit)
❌ .\compiler\tsnc.exe parser.tsn               → ❌ FAILS (Stack overflow)
```

### Root Cause:
```tsn
// In parser.tsn:
private parseExpression(): ASTNode {
    // ...
    if (isBinaryOp) {
        let right = parseExpression();  // ← RECURSIVE CALL
        // ...
    }
    return node;
}
```

**Problem**: Deep expression trees (e.g., `a + b + c + d + e + ...`) cause many nested calls.

**Current Stack**: ~1 MB default on Windows  
**Needed Stack**: ~8-16 MB for parser compilation

---

## 🛠️ Solution Approaches

### ⭐ Approach 1: Increase Stack Size (QUICK WIN)

**Description**: Modify linker flags to allocate larger stack

**Implementation**:
```powershell
# In bootstrap\build-v2.ps1:
# OLD:
clang -o compiler\tsnc.exe bootstrap\*.ll bootstrap\runtime.o

# NEW:
clang -Wl,/STACK:16777216 -o compiler\tsnc.exe bootstrap\*.ll bootstrap\runtime.o
#     └─────────────────┘
#     16 MB stack (vs 1 MB default)
```

**Advantages**:
- ✅ Takes 5 minutes to implement
- ✅ No code changes needed
- ✅ Works immediately
- ✅ Can ship v0.39.0 in days

**Disadvantages**:
- ⚠️ Not a "proper" compiler optimization
- ⚠️ Uses more memory per thread
- ⚠️ Doesn't scale to deeper recursion

**Timeline**: 1 day  
**Risk**: Very Low  
**Recommendation**: ✅ **DO THIS FIRST**

---

### ⭐⭐⭐ Approach 2: Tail-Call Optimization (PROPER SOLUTION)

**Description**: Detect tail calls and convert to jumps instead of call+ret

**Example**:
```tsn
// Source (TSN):
function factorial(n: i32, acc: i32): i32 {
    if (n <= 1) return acc;
    return factorial(n - 1, n * acc);  // ← TAIL CALL
}

// Current IR (BAD):
define i32 @factorial(i32 %n, i32 %acc) {
    ; ...
    %result = call i32 @factorial(i32 %n_minus_1, i32 %new_acc)
    ret i32 %result
}

// With TCO (GOOD):
define i32 @factorial(i32 %n, i32 %acc) {
    ; ...
    %result = musttail call i32 @factorial(i32 %n_minus_1, i32 %new_acc)
    ret i32 %result
}
```

**Key**: `musttail` tells LLVM to reuse stack frame.

**Implementation Plan**:

#### Step 1: Detect Tail Calls in Codegen
```tsn
// In codegen.tsn:
private emitReturn(ret: ReturnStmt): string {
    if (ret.value is CallExpr) {
        let call = ret.value as CallExpr;
        // Check if this is a tail call
        if (call.callee == currentFunctionName) {
            return emitTailCall(call);
        }
    }
    return emitNormalReturn(ret);
}
```

#### Step 2: Generate `musttail` Annotation
```tsn
private emitTailCall(call: CallExpr): string {
    let ir = "";
    // Evaluate arguments
    // ...
    // Generate tail call
    ir = ir + "  %result = musttail call " + returnType + " @" + call.callee + "(";
    // ... args
    ir = ir + ")\n";
    ir = ir + "  ret " + returnType + " %result\n";
    return ir;
}
```

#### Step 3: Test with Recursive Functions
```tsn
// test-tailcall.tsn
function countdown(n: i32): i32 {
    if (n <= 0) return 0;
    return countdown(n - 1);  // Should not overflow
}

function main(): i32 {
    return countdown(10000);  // Deep recursion
}
```

**Advantages**:
- ✅ Industry-standard optimization
- ✅ Enables functional programming style
- ✅ Solves recursion problem properly
- ✅ Makes TSN more powerful

**Disadvantages**:
- ⚠️ Requires understanding LLVM tail calls
- ⚠️ Need to detect tail call patterns
- ⚠️ Not all recursion is tail-recursive

**Timeline**: 1 week  
**Risk**: Medium  
**Recommendation**: ✅ **DO THIS FOR v0.39.0 FINAL**

---

### Approach 3: Iterative Parser (MASSIVE REFACTOR)

**Description**: Rewrite parser to use loops instead of recursion

**Example**:
```tsn
// Before (Recursive):
private parseExpression(): ASTNode {
    let left = parsePrimary();
    if (isBinaryOp()) {
        let right = parseExpression();  // ← RECURSION
        return BinaryExpr(left, op, right);
    }
    return left;
}

// After (Iterative with explicit stack):
private parseExpression(): ASTNode {
    let stack: ASTNode[] = [];
    let opStack: string[] = [];
    
    stack.push(parsePrimary());
    
    while (isBinaryOp()) {
        opStack.push(currentOp());
        advance();
        stack.push(parsePrimary());
    }
    
    // Build tree from stacks
    while (opStack.length > 0) {
        let right = stack.pop();
        let op = opStack.pop();
        let left = stack.pop();
        stack.push(BinaryExpr(left, op, right));
    }
    
    return stack.pop();
}
```

**Advantages**:
- ✅ No recursion at all
- ✅ Predictable stack usage
- ✅ Potentially faster

**Disadvantages**:
- ❌ Huge code refactor (783 lines)
- ❌ Reduces code clarity
- ❌ Need arrays (not implemented yet!)
- ❌ Weeks of work
- ❌ High risk of bugs

**Timeline**: 2-3 weeks  
**Risk**: Very High  
**Recommendation**: ❌ **DO NOT DO THIS** (too much work)

---

## 📋 Recommended Plan

### Phase 39.1: Quick Win (Week 1)

**Goal**: Get parser self-compiling ASAP

**Tasks**:
- [ ] Day 1: Modify `build-v2.ps1` to add `/STACK:16777216` flag
- [ ] Day 1: Rebuild compiler with larger stack
- [ ] Day 2: Test parser self-compilation: `tsnc.exe parser.tsn`
- [ ] Day 2: Compare output: Python bootstrap vs TSN compiler
- [ ] Day 3: Compile all 5 modules using TSN compiler
- [ ] Day 3: Create Gen4 using only TSN compiler (no Python!)
- [ ] Day 4: Test Gen4 functionality thoroughly
- [ ] Day 5: Run all 36 test files
- [ ] Day 6: Documentation and commit
- [ ] Day 7: Tag v0.39.0-alpha

**Deliverable**: v0.39.0-alpha (works, but uses stack size hack)

### Phase 39.2: Proper Solution (Week 2-3)

**Goal**: Implement tail-call optimization

**Week 2 Tasks**:
- [ ] Day 1: Research LLVM tail call conventions
- [ ] Day 2: Design TCO detection algorithm
- [ ] Day 3: Implement tail call detection in codegen
- [ ] Day 4: Generate `musttail` annotations
- [ ] Day 5: Test with simple recursive functions
- [ ] Day 6-7: Debug and fix issues

**Week 3 Tasks**:
- [ ] Day 1: Test parser compilation with TCO
- [ ] Day 2: Benchmark: before vs after TCO
- [ ] Day 3: Verify all tests still pass
- [ ] Day 4: Create Gen4-TCO (with optimization)
- [ ] Day 5: Comprehensive testing
- [ ] Day 6: Documentation
- [ ] Day 7: Tag v0.39.0

**Deliverable**: v0.39.0 (production-ready with TCO)

---

## 🧪 Testing Strategy

### Test 1: Simple Recursion
```tsn
// test-recursion-simple.tsn
function factorial(n: i32): i32 {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

function main(): i32 {
    return factorial(10);  // Should return 3628800
}
```

**Expected**: Compiles and runs correctly

### Test 2: Deep Recursion (Tail Call)
```tsn
// test-recursion-deep.tsn
function sum(n: i32, acc: i32): i32 {
    if (n <= 0) return acc;
    return sum(n - 1, acc + n);  // Tail call
}

function main(): i32 {
    return sum(1000, 0);  // Deep recursion
}
```

**Expected**: With TCO, no stack overflow

### Test 3: Parser Self-Compilation
```powershell
# Compile parser using TSN compiler
.\compiler\tsnc.exe compiler\src\parser.tsn -o test\parser.ll

# Compare with Python bootstrap output
python bootstrap\compiler.py compiler\src\parser.tsn -o test\parser-py.ll

# Check if outputs are similar (not byte-identical, but functionally same)
clang test\parser.ll bootstrap\runtime.o -o test\parser-tsn.exe
clang test\parser-py.ll bootstrap\runtime.o -o test\parser-py.exe

# Both should work
```

**Expected**: Both executables work identically

### Test 4: All Modules Self-Compile
```powershell
# Use Gen3 to compile all sources
.\compiler\tsnc.exe compiler\src\ast.tsn -o gen4\ast.ll
.\compiler\tsnc.exe compiler\src\lexer.tsn -o gen4\lexer.ll
.\compiler\tsnc.exe compiler\src\parser.tsn -o gen4\parser.ll
.\compiler\tsnc.exe compiler\src\codegen.tsn -o gen4\codegen.ll
.\compiler\tsnc.exe compiler\src\main.tsn -o gen4\main.ll

# Link Gen4
clang gen4\*.ll bootstrap\runtime.o -o gen4\tsnc.exe
```

**Expected**: Gen4 compiles and works

### Test 5: Fixed Point Maintained
```powershell
# Use Gen4 to compile all sources
.\gen4\tsnc.exe compiler\src\parser.tsn -o gen5\parser.ll
# ... all modules

# Link Gen5
clang gen5\*.ll bootstrap\runtime.o -o gen5\tsnc.exe

# Compare Gen4 vs Gen5 outputs
certutil -hashfile gen4\tsnc.exe SHA256
certutil -hashfile gen5\tsnc.exe SHA256
```

**Expected**: SHA256 hashes match (fixed point!)

---

## 📊 Success Criteria

### Phase 39.1 Success (Alpha):
- [ ] Parser.tsn compiles using TSN compiler (with stack increase)
- [ ] All 5 modules compile using TSN compiler
- [ ] Gen4 created without Python
- [ ] All 36 tests pass
- [ ] Binary size ≤ 250 KB

### Phase 39.2 Success (Final):
- [ ] Tail-call optimization implemented
- [ ] Parser.tsn compiles with standard stack size
- [ ] TCO test cases pass (deep recursion works)
- [ ] Gen4-TCO maintains fixed point (Gen4 == Gen5)
- [ ] No performance regression (≤ 2x slower)
- [ ] Documentation complete

---

## 🔥 Known Risks

### Risk 1: Stack Size Might Not Be Enough
**Probability**: Low  
**Impact**: Medium

**Mitigation**: 
- Try 16 MB first (16777216 bytes)
- If not enough, try 32 MB or 64 MB
- Monitor actual usage during compilation

### Risk 2: TCO Detection Might Miss Cases
**Probability**: Medium  
**Impact**: Low

**Mitigation**:
- Start with simple tail calls only
- Add more patterns incrementally
- Accept that not all recursion is optimized

### Risk 3: LLVM Might Not Honor `musttail`
**Probability**: Low  
**Impact**: High

**Mitigation**:
- Test with simple examples first
- Check LLVM documentation for requirements
- May need specific calling conventions

### Risk 4: Performance Regression
**Probability**: Low  
**Impact**: Medium

**Mitigation**:
- Benchmark before and after
- Only apply TCO where beneficial
- Accept reasonable slowdown for correctness

---

## 📚 References

### LLVM Tail Calls:
- [LLVM Lang Ref: `musttail`](https://llvm.org/docs/LangRef.html#call-instruction)
- [LLVM Tail Call Optimization](https://llvm.org/docs/CodeGenerator.html#tail-call-optimization)

### Stack Size on Windows:
- [MSVC Linker: /STACK](https://docs.microsoft.com/en-us/cpp/build/reference/stack-stack-allocations)
- Default: 1 MB (1048576 bytes)
- Recommended: 16 MB (16777216 bytes) for recursive code

### Recursive Parser Design:
- [Pratt Parsing](https://en.wikipedia.org/wiki/Operator-precedence_parser#Pratt_parsing)
- [Recursive Descent Parsing](https://en.wikipedia.org/wiki/Recursive_descent_parser)

---

## 🎯 Next Steps

1. **Review this plan** with team
2. **Choose approach**: Recommend Stack + TCO hybrid
3. **Start Phase 39.1**: Implement stack size increase
4. **Test thoroughly**: Ensure parser self-compiles
5. **Move to Phase 39.2**: Implement TCO properly
6. **Ship v0.39.0**: Parser self-compilation achieved!

---

*Plan Created: August 6, 2026*  
*Target: v0.39.0 in 3 weeks*  
*Status: Ready to implement*  
*Next: Modify build-v2.ps1 with /STACK flag*

**LET'S MAKE PARSER SELF-HOSTING!** 🚀

