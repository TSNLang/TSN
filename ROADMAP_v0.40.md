# TSN Compiler v0.40.0 Roadmap - 100% Bootstrap Independence

**Current Version**: v0.38.0 (Fixed Point Self-Hosting)  
**Target Version**: v0.40.0 (Zero External Dependencies)  
**Status**: 🚧 In Planning  
**Date**: August 6, 2026

---

## 🎯 Mission Statement

**Eliminate 100% dependency on Python bootstrap compiler**

Version 0.40.0 will be the **first truly independent TSN compiler** that:
- ✅ Compiles itself completely (including parser)
- ✅ Supports all new features without external tools
- ✅ Requires ONLY TSN compiler to build TSN compiler
- ✅ No Python, no scripts, pure TSN self-hosting

---

## 📊 Current Status (v0.38.0)

### What Works:
- ✅ Fixed point self-hosting (Gen2 == Gen3)
- ✅ Classes, methods, generics work perfectly
- ✅ Codegen, lexer, AST, main all self-compile
- ✅ 96-day development, 302 commits

### Current Limitations:

#### 🔴 **Critical Blocker #1: Parser Self-Compilation**
```
Status: ❌ Parser cannot compile itself
Reason: Deep recursion in parser methods causes stack overflow
Impact: Must use Python bootstrap for parser.tsn → parser.ll
```

**Root Cause**: 
- `parseExpression()` calls itself recursively
- TSN Gen2/Gen3 cannot handle deep recursion
- Python bootstrap has no recursion limit

#### 🟡 **Limitation #2: Bootstrap Dependency for New Features**
```
Status: ⚠️  New features require Python bootstrap
Example: Adding i8 type needed Python to compile codegen.tsn
Impact: Cannot dogfood new feature development
```

**Current Workflow**:
1. Modify compiler source (e.g., add i16 type)
2. Run Python bootstrap: `python compiler.py codegen.tsn`
3. Rebuild compiler
4. Test new feature

**Desired Workflow**:
1. Modify compiler source
2. Run TSN compiler: `tsnc.exe codegen.tsn`
3. Test new feature

---

## 🚀 v0.40.0 Goals

### Primary Goals:

#### Goal 1: Parser Self-Compilation ✨ CRITICAL
**Objective**: Parser can compile itself without Python

**Technical Requirements**:
- [ ] Implement tail-call optimization OR
- [ ] Increase stack size for TSN executables OR
- [ ] Refactor parser to use iteration instead of recursion OR
- [ ] Implement trampoline-style recursion

**Success Criteria**:
- `tsnc.exe parser.tsn` succeeds
- Generated parser.ll is valid
- Resulting parser executable works correctly
- Gen4 = Gen(parser self-compiled)

#### Goal 2: Zero Bootstrap Dependency 🎯 CRITICAL
**Objective**: Add new features using only TSN compiler

**Technical Requirements**:
- [ ] Goal 1 must be complete
- [ ] Gen4 can compile all compiler sources
- [ ] Gen4 → Gen5 maintains fixed point
- [ ] New feature test: Add i16 type using only TSN

**Success Criteria**:
- Can develop TSN compiler using TSN compiler
- No Python needed in build process
- `build-tsnc.tsn` script can build compiler
- Documentation updated to remove Python references

#### Goal 3: Feature Complete Self-Hosting 🏆
**Objective**: Every compiler feature works in self-hosting

**Technical Requirements**:
- [ ] String methods: charAt, substring, length
- [ ] More integer types: i16, i64
- [ ] Floating point: f32, f64
- [ ] Arrays: Basic array support
- [ ] Command-line args: Parse args in TSN

**Success Criteria**:
- Can write complex TSN programs
- Standard library covers common use cases
- Compiler accepts CLI arguments
- Error messages are helpful

---

## 🛠️ Technical Strategy

### Phase 39: Parser Self-Compilation (CRITICAL PATH)

#### Option A: Tail-Call Optimization (Preferred)
**Approach**: Optimize tail-recursive calls to iterations

**Advantages**:
- ✅ Elegant solution
- ✅ Enables functional programming style
- ✅ Standard compiler optimization

**Implementation**:
```tsn
// Before (recursive):
private parseExpression(): ASTNode {
    if (condition) {
        return parseExpression();  // Tail call
    }
    return node;
}

// After (TCO in codegen):
// Detect tail calls and convert to jumps
br label %entry  // Instead of call + ret
```

**Effort**: 2-3 days  
**Risk**: Medium (LLVM IR complexity)

#### Option B: Stack Size Increase (Quick Fix)
**Approach**: Increase executable stack size

**Advantages**:
- ✅ Very quick to implement
- ✅ No code changes needed
- ✅ Works immediately

**Implementation**:
```powershell
# In build script:
clang -Wl,/STACK:16777216 ...  # 16 MB stack
```

**Effort**: 1 hour  
**Risk**: Low (but not a "real" solution)

#### Option C: Iterative Parser Refactor (Most Work)
**Approach**: Rewrite recursive functions iteratively

**Advantages**:
- ✅ No recursion at all
- ✅ Predictable stack usage
- ✅ Potentially faster

**Disadvantages**:
- ❌ Major code refactor
- ❌ May reduce code clarity
- ❌ Weeks of work

**Effort**: 1-2 weeks  
**Risk**: High (major refactor)

#### Option D: Trampoline Pattern (Clever)
**Approach**: Manual CPS-style trampolines

**Advantages**:
- ✅ Keeps recursive style
- ✅ No stack growth
- ✅ Explicit control

**Implementation**:
```tsn
class Thunk {
    fn: function;
    args: any[];
}

function trampoline(fn: function): any {
    let result = fn();
    while (result instanceof Thunk) {
        result = result.fn(...result.args);
    }
    return result;
}
```

**Effort**: 3-5 days  
**Risk**: Medium-High (complex pattern)

#### **RECOMMENDED**: Option A + Option B Hybrid
1. Implement stack size increase (1 hour) → Immediate fix
2. Work on tail-call optimization (2-3 days) → Proper solution
3. Ship v0.39.0 with stack fix, v0.40.0 with TCO

---

### Phase 40: Zero Bootstrap (DEPENDS ON PHASE 39)

#### Step 1: Verify Gen4 Self-Compilation
```powershell
# Use Gen3 to compile all sources
.\compiler\tsnc.exe compiler\src\parser.tsn -o gen4\parser.ll
.\compiler\tsnc.exe compiler\src\lexer.tsn -o gen4\lexer.ll
.\compiler\tsnc.exe compiler\src\ast.tsn -o gen4\ast.ll
.\compiler\tsnc.exe compiler\src\codegen.tsn -o gen4\codegen.ll
.\compiler\tsnc.exe compiler\src\main.tsn -o gen4\main.ll

# Link Gen4
clang gen4\*.ll bootstrap\runtime.o -o gen4\tsnc.exe
```

**Success**: Gen4 executable created

#### Step 2: Verify Gen4 == Gen5 (Fixed Point)
```powershell
# Use Gen4 to compile all sources
.\gen4\tsnc.exe compiler\src\parser.tsn -o gen5\parser.ll
.\gen4\tsnc.exe compiler\src\lexer.tsn -o gen5\lexer.ll
# ... etc

# Compare outputs
certutil -hashfile gen4\tsnc.exe SHA256
certutil -hashfile gen5\tsnc.exe SHA256
```

**Success**: SHA256 hashes match → Fixed point maintained!

#### Step 3: Feature Test Without Bootstrap
```powershell
# Add i16 type to codegen.tsn
# Compile using Gen4 (NOT Python!)
.\gen4\tsnc.exe compiler\src\codegen.tsn -o gen4\codegen-new.ll

# Rebuild compiler
clang gen4\codegen-new.ll gen4\parser.ll ... -o gen4\tsnc-i16.exe

# Test i16 feature
.\gen4\tsnc-i16.exe compiler\test-i16-simple.tsn
```

**Success**: New feature works without Python!

#### Step 4: Remove Python from Build Process
- [ ] Delete `bootstrap/compiler.py` (optional, keep as reference)
- [ ] Update `build-v2.ps1` to use `tsnc.exe` instead of Python
- [ ] Create `build-tsnc.tsn` - TSN script to build compiler
- [ ] Update all documentation to remove Python references

---

## 📈 Development Timeline

### Week 1-2: Phase 39.1 - Stack Size Fix
**Goal**: Quick fix for parser self-compilation

**Tasks**:
- [ ] Day 1: Modify build scripts to increase stack size
- [ ] Day 2: Test parser self-compilation with larger stack
- [ ] Day 3: Verify all compiler sources compile
- [ ] Day 4: Create Gen4 using TSN compiler
- [ ] Day 5: Run comprehensive tests
- [ ] Day 6-7: Fix any issues, documentation

**Deliverable**: v0.39.0-alpha (parser self-compiles with stack fix)

### Week 3-4: Phase 39.2 - Tail-Call Optimization
**Goal**: Proper solution for recursion

**Tasks**:
- [ ] Week 3: Research LLVM tail-call optimization
- [ ] Week 3: Implement TCO detection in codegen
- [ ] Week 3: Generate `musttail` or `tail` annotations
- [ ] Week 4: Test with parser compilation
- [ ] Week 4: Benchmark performance impact
- [ ] Week 4: Documentation and tests

**Deliverable**: v0.39.0 (proper TCO implementation)

### Week 5-6: Phase 40 - Zero Bootstrap
**Goal**: Eliminate Python dependency

**Tasks**:
- [ ] Week 5: Generate Gen4 using Gen3 (TSN-only)
- [ ] Week 5: Verify Gen4 == Gen5 fixed point
- [ ] Week 5: Test new feature addition (i16) without Python
- [ ] Week 6: Update build process and scripts
- [ ] Week 6: Remove Python bootstrap from workflow
- [ ] Week 6: Comprehensive testing and docs

**Deliverable**: v0.40.0 (100% bootstrap independence)

### Estimated Total Time: 6 weeks

---

## 🎯 Success Metrics

### v0.40.0 Acceptance Criteria:

#### Technical Criteria:
- [ ] Parser compiles itself successfully
- [ ] All 5 compiler modules self-compile
- [ ] Gen4 → Gen5 maintains fixed point (SHA256 match)
- [ ] Can add new features without Python bootstrap
- [ ] Build process uses only TSN compiler

#### Quality Criteria:
- [ ] No regressions in existing tests (36 tests pass)
- [ ] Compilation speed ≤ 2x current speed
- [ ] Binary size ≤ 250 KB (current: 223 KB)
- [ ] Documentation updated and accurate

#### Practical Criteria:
- [ ] Developer can build compiler with: `build-tsnc.ps1` (no Python!)
- [ ] New contributors don't need Python installed
- [ ] Can develop new features using TSN only
- [ ] README reflects bootstrap independence

---

## 🔥 Risks and Mitigations

### Risk 1: Tail-Call Optimization Too Complex
**Probability**: Medium  
**Impact**: High (blocks v0.40.0)

**Mitigation**:
- Start with stack size increase as fallback
- Ship v0.39.0 with stack fix if TCO takes too long
- Consider Option D (trampolines) as alternative

### Risk 2: Performance Degradation
**Probability**: Low  
**Impact**: Medium

**Mitigation**:
- Benchmark before and after TCO
- Accept 2x slowdown as acceptable
- Future optimization passes can improve

### Risk 3: Fixed Point Breaks
**Probability**: Low  
**Impact**: Very High

**Mitigation**:
- Test Gen4 vs Gen5 thoroughly
- Keep Gen3 as known-good backup
- Git tag before major changes

### Risk 4: New Bugs in Self-Hosting
**Probability**: Medium  
**Impact**: High

**Mitigation**:
- Extensive testing at each step
- Keep Python bootstrap as reference
- Compare outputs: Python vs TSN compiler

---

## 📚 Documentation Updates

### Files to Create/Update:

#### New Files:
- [ ] `ROADMAP_v0.40.md` (this file)
- [ ] `docs/tail_call_optimization.md`
- [ ] `docs/build_without_python.md`
- [ ] `PHASE39_PLAN.md`
- [ ] `PHASE40_PLAN.md`

#### Update Files:
- [ ] `README.md` - Remove Python requirements
- [ ] `docs/build_process.md` - New build process
- [ ] `CHANGELOG.md` - Add v0.39.0 and v0.40.0 entries
- [ ] `PROJECT_SUMMARY.md` - Update achievements

---

## 🎊 Expected Achievements (v0.40.0)

When v0.40.0 is released, TSN will be:

### 🏆 First Self-Hosting Compiler to Achieve:
1. **Zero External Dependencies**: No Python, no scripts, pure TSN
2. **100% Self-Compilation**: Every single module compiles itself
3. **96 Days + 6 Weeks**: Fastest path to complete independence
4. **Fixed Point Maintained**: Mathematical proof still holds

### 📊 Industry Comparison:

| Compiler | Self-Hosting | Bootstrap-Free | Time to Independence |
|----------|--------------|----------------|----------------------|
| GCC | ✅ | ⚠️ (uses older GCC) | ~5 years |
| Rust | ✅ | ⚠️ (snapshot) | ~3 years |
| Go | ✅ | ⚠️ (older Go) | ~6 years |
| **TSN** | **✅** | **✅ TARGET** | **~4.5 months** |

**Note**: Most "self-hosting" compilers still need an older version of themselves. TSN v0.40.0 will need NOTHING except standard tools (clang for linking).

### 🎯 What This Enables:

#### For Developers:
- Develop TSN compiler in TSN (dogfooding)
- Add features without external tools
- Faster development cycle
- Better understanding of compiler

#### For Community:
- Lower barrier to contribution (no Python knowledge needed)
- Easier to port to new platforms
- Trustworthy bootstrapping process
- Educational value (see how it's done)

#### For TSN Language:
- Proves language is complete enough for real work
- Validates design decisions
- Demonstrates production readiness
- Marketing advantage ("first truly independent")

---

## 🔮 Beyond v0.40.0

### v0.41.0 - Feature Expansion
- [ ] i16, i64, u8, u16, u32, u64 types
- [ ] f32, f64 floating-point
- [ ] String methods (charAt, substring, indexOf)
- [ ] Basic arrays

### v0.42.0 - Optimization
- [ ] Dead code elimination
- [ ] Constant folding
- [ ] Inline small functions
- [ ] Register allocation improvements

### v0.50.0 - Standard Library
- [ ] File I/O
- [ ] Networking (basic sockets)
- [ ] JSON parsing
- [ ] HTTP client

### v1.0.0 - Production Release
- [ ] Stable language spec
- [ ] Comprehensive stdlib
- [ ] Package manager
- [ ] IDE support (LSP)

---

## 📞 Call to Action

### For Current Team:
1. Review this roadmap
2. Identify risks we haven't considered
3. Choose implementation approach (A, B, C, or D)
4. Start Phase 39 implementation

### For New Contributors:
1. Read FINAL_VERIFICATION_REPORT.md (understand where we are)
2. Read this roadmap (understand where we're going)
3. Pick a task from Phase 39 or 40
4. Join the journey to bootstrap independence!

---

## 📊 Tracking Progress

### Current Status:
```
[████████████████████────────] 60% Complete

✅ Lexer self-compiles
✅ AST self-compiles  
✅ Codegen self-compiles
✅ Main self-compiles
❌ Parser self-compiles (IN PROGRESS)
❌ Zero bootstrap dependency (BLOCKED)
```

### When v0.40.0 Ships:
```
[████████████████████████████] 100% Complete

✅ All modules self-compile
✅ Zero bootstrap dependency
✅ Fixed point maintained
✅ Feature development in TSN only
```

---

*Roadmap Created: August 6, 2026*  
*Target Release: September-October 2026*  
*Mission: 100% Bootstrap Independence*  
*Status: LET'S DO THIS! 🚀*

---

**FROM PYTHON-ASSISTED TO PURE TSN**  
**FROM FIXED POINT TO TOTAL INDEPENDENCE**  
**FROM v0.38.0 TO v0.40.0**  
**THE FINAL FRONTIER!** 🎊🎉✨

