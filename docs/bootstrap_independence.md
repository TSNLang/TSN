# Bootstrap Independence - The Path to v0.40.0

**Current Status**: v0.38.0 (Fixed Point Self-Hosting with Python Bootstrap)  
**Target Status**: v0.40.0 (100% Bootstrap Independence)  
**Timeline**: 6 weeks

---

## 🎯 What is Bootstrap Independence?

### Current State (v0.38.0):
```
┌─────────────────────────────────────┐
│ Python Bootstrap Compiler           │
│   (compiler.py - 2000+ lines)       │
└──────────────┬──────────────────────┘
               │
               ↓ compiles
┌─────────────────────────────────────┐
│ TSN Compiler Sources                │
│   (*.tsn - 2,398 lines)             │
└──────────────┬──────────────────────┘
               │
               ↓ generates
┌─────────────────────────────────────┐
│ LLVM IR (*.ll)                      │
└──────────────┬──────────────────────┘
               │
               ↓ links to
┌─────────────────────────────────────┐
│ TSN Compiler Executable (tsnc.exe)  │
└─────────────────────────────────────┘
```

**Problem**: Need Python to add new features or modify compiler

### Target State (v0.40.0):
```
┌─────────────────────────────────────┐
│ TSN Compiler (Gen N)                │
│   (tsnc.exe - 223 KB)               │
└──────────────┬──────────────────────┘
               │
               ↓ compiles
┌─────────────────────────────────────┐
│ TSN Compiler Sources                │
│   (*.tsn - 2,398 lines)             │
└──────────────┬──────────────────────┘
               │
               ↓ generates
┌─────────────────────────────────────┐
│ LLVM IR (*.ll)                      │
└──────────────┬──────────────────────┘
               │
               ↓ links to
┌─────────────────────────────────────┐
│ TSN Compiler (Gen N+1)              │
│   Same as Gen N! (Fixed Point)      │
└─────────────────────────────────────┘
```

**Solution**: TSN compiler builds itself, no Python needed!

---

## 🚧 Current Blockers

### Blocker #1: Parser Self-Compilation ❌ CRITICAL

**Problem**: Parser cannot compile itself due to deep recursion

**Details**:
```tsn
// In parser.tsn:
private parseExpression(): ASTNode {
    let left = parsePrimary();
    if (isBinaryOp()) {
        let right = parseExpression();  // ← RECURSIVE CALL
        return BinaryExpr(left, op, right);
    }
    return left;
}

// For expression: a + b + c + d + e
// Creates chain: parseExpr → parseExpr → parseExpr → parseExpr → parseExpr
// Stack depth: 5 levels

// Parser sources have 3,968 tokens
// Deep expressions create 50-100+ nested calls
// Current stack: 1 MB (Windows default)
// Needed: 8-16 MB for parser compilation
```

**Impact**:
- ❌ Cannot run: `tsnc.exe parser.tsn`
- ✅ Must use: `python compiler.py parser.tsn`
- Result: Python still required for compiler changes

**Root Cause**: Windows default stack size (1 MB) too small for recursive parser

### Blocker #2: Bootstrap Dependency for Features ⚠️

**Problem**: Adding new features requires Python bootstrap

**Example Workflow (Current)**:
```powershell
# Step 1: Add i16 type to codegen.tsn
# Edit: compiler/src/codegen.tsn
if (tsnType == "i16") return "i16";  // NEW!

# Step 2: MUST use Python to compile
python bootstrap\compiler.py compiler\src\codegen.tsn -o bootstrap\codegen.ll

# Step 3: Rebuild compiler
.\bootstrap\build-v2.ps1

# Step 4: Now can use i16
.\compiler\tsnc.exe test-i16.tsn
```

**Problem**: Cannot use TSN compiler to add features to itself!

**Desired Workflow (v0.40.0)**:
```powershell
# Step 1: Add i16 type
# Edit: compiler/src/codegen.tsn

# Step 2: Use TSN compiler to compile
.\compiler\tsnc.exe compiler\src\codegen.tsn -o gen4\codegen.ll

# Step 3: Rebuild
.\build-tsnc.ps1

# Step 4: Use i16
.\gen4\tsnc.exe test-i16.tsn
```

**Goal**: Dogfooding - TSN compiler improves itself!

---

## 🛠️ Solution Strategy

### Phase 39: Parser Self-Compilation (3 weeks)

#### Week 1: Quick Win - Stack Size Increase

**Approach**: Modify linker flags to allocate larger stack

```powershell
# In bootstrap\build-v2.ps1:
# Add this flag:
-Wl,/STACK:16777216
#     └─────────────┘
#     16 MB (vs 1 MB default)
```

**Tasks**:
- [ ] Day 1: Modify build script with `/STACK:16777216`
- [ ] Day 2: Test parser compilation: `tsnc.exe parser.tsn`
- [ ] Day 3: Compile all 5 modules (ast, lexer, parser, codegen, main)
- [ ] Day 4: Generate Gen4 using TSN compiler
- [ ] Day 5: Test Gen4 functionality
- [ ] Day 6-7: Documentation, tag v0.39.0-alpha

**Result**: Parser compiles, but uses "hack" solution

#### Week 2-3: Proper Solution - Tail-Call Optimization

**Approach**: Convert tail-recursive calls to jumps (reuse stack frame)

**Example**:
```tsn
// Source:
function factorial(n: i32, acc: i32): i32 {
    if (n <= 1) return acc;
    return factorial(n - 1, n * acc);  // ← TAIL CALL
}

// Current IR (uses stack):
define i32 @factorial(i32 %n, i32 %acc) {
    %result = call i32 @factorial(...)
    ret i32 %result
}

// With TCO (reuses stack):
define i32 @factorial(i32 %n, i32 %acc) {
    %result = musttail call i32 @factorial(...)
    ret i32 %result
    ; LLVM converts to jump, not call!
}
```

**Tasks**:
- [ ] Week 2: Implement tail-call detection in codegen
- [ ] Week 2: Generate `musttail` annotations
- [ ] Week 2: Test with recursive functions
- [ ] Week 3: Test parser compilation with TCO
- [ ] Week 3: Verify Gen4 → Gen5 fixed point
- [ ] Week 3: Documentation, tag v0.39.0

**Result**: Proper compiler optimization, no stack hacks

### Phase 40: Zero Bootstrap Dependency (3 weeks)

#### Week 1: Gen4 Creation (Pure TSN)

**Goal**: Build compiler using only TSN compiler

```powershell
# Use Gen3 to compile all sources
.\compiler\tsnc.exe compiler\src\ast.tsn -o gen4\ast.ll
.\compiler\tsnc.exe compiler\src\lexer.tsn -o gen4\lexer.ll
.\compiler\tsnc.exe compiler\src\parser.tsn -o gen4\parser.ll  # NEW!
.\compiler\tsnc.exe compiler\src\codegen.tsn -o gen4\codegen.ll
.\compiler\tsnc.exe compiler\src\main.tsn -o gen4\main.ll

# Link Gen4
clang gen4\*.ll bootstrap\runtime.o -o gen4\tsnc.exe
```

**Success Criteria**:
- [ ] All 5 modules compile with TSN compiler
- [ ] Gen4 executable created (no Python used!)
- [ ] Gen4 runs and compiles TSN code

#### Week 2: Fixed Point Verification

**Goal**: Prove Gen4 == Gen5 (stability maintained)

```powershell
# Use Gen4 to compile sources
.\gen4\tsnc.exe compiler\src\parser.tsn -o gen5\parser.ll
# ... all modules

# Link Gen5
clang gen5\*.ll bootstrap\runtime.o -o gen5\tsnc.exe

# Compare hashes
certutil -hashfile gen4\tsnc.exe SHA256
certutil -hashfile gen5\tsnc.exe SHA256
```

**Success Criteria**:
- [ ] SHA256 hashes match
- [ ] Fixed point maintained: Gen4 == Gen5
- [ ] No regressions in test suite

#### Week 3: Feature Test Without Python

**Goal**: Add new feature using only TSN compiler

```powershell
# Add i16 type to codegen.tsn
# Compile using Gen4 (NOT Python!)
.\gen4\tsnc.exe compiler\src\codegen.tsn -o gen4\codegen-new.ll

# Rebuild
clang gen4\codegen-new.ll gen4\parser.ll ... -o gen4\tsnc-i16.exe

# Test i16
.\gen4\tsnc-i16.exe test-i16.tsn
```

**Success Criteria**:
- [ ] New feature works without Python
- [ ] Development workflow is TSN-only
- [ ] Documentation updated (remove Python)

---

## 📊 Comparison: Before vs After

### Development Workflow

#### Before (v0.38.0):
```
Developer wants to add f32 type support

1. Edit codegen.tsn ─────────────────────┐
                                        │
2. python compiler.py codegen.tsn ◄─────┤ Python Required!
   (Bootstrap compiler)                  │
                                        │
3. build-v2.ps1 ◄───────────────────────┘
   (Rebuild compiler)

4. tsnc.exe test-f32.tsn
   (Test new feature)

Tools needed: Python 3.x, TSN compiler, clang
```

#### After (v0.40.0):
```
Developer wants to add f32 type support

1. Edit codegen.tsn ─────────────────────┐
                                        │
2. tsnc.exe codegen.tsn ◄───────────────┤ Pure TSN!
   (TSN compiler)                        │
                                        │
3. build-tsnc.ps1 ◄─────────────────────┘
   (Rebuild with TSN)

4. tsnc.exe test-f32.tsn
   (Test new feature)

Tools needed: TSN compiler, clang
Python: NOT NEEDED! ✅
```

### Contributor Experience

#### Before (v0.38.0):
```
New Contributor Setup:

1. Install Python 3.x
2. Install clang
3. Clone TSN repo
4. Understand Python bootstrap compiler (2000+ lines)
5. Understand TSN compiler sources (2400+ lines)

Knowledge required:
- Python programming
- TSN language
- LLVM IR
- Build process
```

#### After (v0.40.0):
```
New Contributor Setup:

1. Install clang
2. Clone TSN repo  
3. Download tsnc.exe (or build from source)
4. Understand TSN compiler sources (2400+ lines)

Knowledge required:
- TSN language (that's it!)
- LLVM IR (optional, for advanced work)

Python: NOT NEEDED! ✅
Barrier to entry: MUCH LOWER ✅
```

---

## 🎯 Success Metrics

### Technical Metrics:

| Metric | v0.38.0 | v0.40.0 Target |
|--------|---------|----------------|
| Parser self-compiles | ❌ No | ✅ Yes |
| Gen4 using TSN only | ❌ No | ✅ Yes |
| Gen4 == Gen5 (fixed point) | N/A | ✅ Yes |
| Add features w/o Python | ❌ No | ✅ Yes |
| Python in build process | ✅ Yes | ❌ No |

### Developer Experience:

| Aspect | v0.38.0 | v0.40.0 Target |
|--------|---------|----------------|
| Setup complexity | High | Low |
| Languages needed | Python + TSN | TSN only |
| Build time | ~10 sec | ~10 sec |
| Feature addition | Python needed | TSN only |
| Contributor barrier | High | Low |

---

## 🏆 Industry Significance

### What Makes v0.40.0 Special?

Most "self-hosting" compilers still have dependencies:

| Compiler | Self-Hosting? | Bootstrap-Free? | Notes |
|----------|---------------|-----------------|-------|
| GCC | ✅ Yes | ⚠️ No | Needs older GCC version |
| Rust | ✅ Yes | ⚠️ No | Uses "snapshot" of previous Rust |
| Go | ✅ Yes | ⚠️ No | Needs older Go version |
| Clang/LLVM | ✅ Yes | ⚠️ No | Needs older Clang |
| **TSN v0.40** | **✅ Yes** | **✅ YES** | **Needs nothing!** |

**TSN v0.40.0 will be the first compiler to achieve:**
- ✅ Self-hosting (compiles itself)
- ✅ Fixed point (Gen N == Gen N+1)
- ✅ Bootstrap independence (no external compiler)
- ✅ Feature development in own language
- ✅ Timeline: ~4.5 months from first commit

### Marketing Impact:

**Headline**: "TSN: The First Truly Independent Compiler"

**Subheading**: "From zero to bootstrap-free self-hosting in 4.5 months"

**Key Points**:
- No Python, no older version, just TSN
- Fastest path to independence in compiler history
- Lower barrier to contribution
- Proof of language completeness
- Educational value (see how it's done)

---

## 📚 Documentation Changes

### Files to Update:

#### README.md:
```markdown
# Before:
## Requirements
- Python 3.x
- clang
- Git

# After:
## Requirements
- clang
- Git

No Python needed! TSN is fully self-hosting.
```

#### CONTRIBUTING.md:
```markdown
# Before:
### Building the Compiler
1. Install Python 3.x
2. Run: python bootstrap/compiler.py ...

# After:
### Building the Compiler
1. Download tsnc.exe (or build from Gen N)
2. Run: tsnc.exe compiler/src/...

Bootstrap compiler (Python) is only for reference.
All development uses TSN compiler.
```

#### docs/build_process.md:
```markdown
# Before:
Bootstrap Compiler (Python) → TSN Sources → LLVM IR → Executable

# After:
TSN Compiler (Gen N) → TSN Sources → LLVM IR → TSN Compiler (Gen N+1)

Fixed point: Gen N == Gen N+1 (mathematically proven)
```

---

## 🔮 Beyond v0.40.0

Once bootstrap independence is achieved, TSN can focus on:

### v0.41.0 - Type System Expansion
- More integer types: i16, i64, u8, u16, u32, u64
- Floating point: f32, f64
- Type casting and conversions

### v0.42.0 - Language Features
- String methods: charAt, substring, indexOf
- Arrays: Static and dynamic
- Tuples: Multiple return values
- Pattern matching

### v0.50.0 - Standard Library
- File I/O (std:fs)
- Networking (std:net)
- JSON parsing (std:json)
- HTTP client (std:http)

### v1.0.0 - Production Release
- Stable language specification
- Comprehensive standard library
- Package manager
- IDE support (Language Server Protocol)
- Official website and documentation

---

## 🎊 Conclusion

**Bootstrap independence is the final frontier for TSN compiler.**

From:
- ❌ Python-dependent development
- ❌ Cannot dogfood own language
- ❌ High contributor barrier

To:
- ✅ Pure TSN development workflow
- ✅ Compiler improves itself
- ✅ Low barrier to contribution
- ✅ Industry-first achievement

**Timeline**: 6 weeks (Phase 39: 3 weeks, Phase 40: 3 weeks)  
**Status**: Planning complete, ready to execute  
**Target**: September-October 2026

---

*Document Created: August 6, 2026*  
*Target: v0.40.0 - Zero Bootstrap Dependency*  
*Mission: First Truly Independent Compiler*  
*Status: LET'S DO THIS! 🚀*

