# Phase 35: Self-Hosting Achievement - Plan

**Date**: 2026-08-02  
**Goal**: Achieve self-hosting (compiler compiles itself)

---

## 🎯 Strategy

### Challenge
Current `main.tsn` has hardcoded file path: `"compiler/test-methods-only.tsn"`

### Options Considered

#### Option A: Add Command-Line Args (Complex)
- ❌ Need to add runtime declarations for `tsn_get_argc()`, `tsn_get_argv()`
- ❌ Need to implement string parsing in TSN
- ❌ Need to regenerate all modules
- ⏱️ Estimated time: 2-3 hours

#### Option B: Environment Variable (Medium)
- ⚠️ Need env var support in runtime
- ⚠️ Cross-platform issues
- ⏱️ Estimated time: 1 hour

#### Option C: Fixed Input Path (Simple)
- ✅ Change hardcoded path to `INPUT.tsn`
- ✅ Copy/symlink source files as needed
- ⚠️ Not a "real" self-compile
- ⏱️ Estimated time: 10 minutes

#### Option D: Module-by-Module Approach (BEST)
- ✅ Use bootstrap compiler (already has args)
- ✅ Compile each module separately
- ✅ Link manually
- ✅ Test functionality incrementally
- ⏱️ Estimated time: 30 minutes

---

## ✅ Selected Strategy: Option D - Module-by-Module

### Phase 35 Plan

#### Step 1: Verify Bootstrap Works
```bash
# These already work from Phase 34.5:
python bootstrap\compiler.py compiler\src\ast.tsn -o gen1\ast.ll
python bootstrap\compiler.py compiler\src\lexer.tsn -o gen1\lexer.ll
python bootstrap\compiler.py compiler\src\parser.tsn -o gen1\parser.ll
python bootstrap\compiler.py compiler\src\codegen.tsn -o gen1\codegen.ll
python bootstrap\compiler.py compiler\src\main.tsn -o gen1\main.ll
```

#### Step 2: Link Gen1 Compiler
```bash
# Compile LLVM IR to object files:
llc gen1\ast.ll -filetype=obj -o gen1\ast.o
llc gen1\lexer.ll -filetype=obj -o gen1\lexer.o
llc gen1\parser.ll -filetype=obj -o gen1\parser.o
llc gen1\codegen.ll -filetype=obj -o gen1\codegen.o
llc gen1\main.ll -filetype=obj -o gen1\main.o

# Link with runtime:
gcc gen1\*.o bootstrap\runtime.o -o tsnc-gen1.exe
```

#### Step 3: Test Gen1 Functionality
```bash
# Test Gen1 compiles a simple file:
.\tsnc-gen1.exe compiler\test-phase1.tsn -o test-gen1-output.ll

# Verify output is valid LLVM IR:
llc test-gen1-output.ll -filetype=obj -o test-gen1-output.o
```

#### Step 4: Attempt Gen2 Compilation (Ultimate Test)
```bash
# Use Gen1 to compile ast.tsn:
.\tsnc-gen1.exe compiler\src\ast.tsn -o gen2\ast.ll

# If Gen1 doesn't support args yet, modify main.tsn first
```

#### Step 5: Compare Gen1 vs Gen2
```bash
# If Gen2 compiles successfully:
diff gen1\ast.ll gen2\ast.ll

# If identical → SELF-HOSTING ACHIEVED! 🎊
```

---

## 🐛 Expected Issues

### Issue 1: Hardcoded File Path
**Problem**: main.tsn reads from `"compiler/test-methods-only.tsn"`

**Solutions**:
1. **Quick Fix**: Modify main.tsn to read from a configurable path
2. **Proper Fix**: Add command-line arg support (Phase 36)

### Issue 2: String Constants
**Problem**: String literals use placeholder `inttoptr i32 0 to ptr`

**Impact**: May crash at runtime
**Solution**: Test with files that don't need string comparison

### Issue 3: Constructor Bodies
**Problem**: Constructor assignments like `this.name = n` may not codegen correctly

**Impact**: Classes with initialization may fail
**Solution**: Test with method-only classes first

---

## 📊 Success Criteria

### Minimum Success (70%)
- [x] Bootstrap compiles all modules ✅ (Phase 34.5)
- [ ] Gen1 executable links
- [ ] Gen1 runs without crashing
- [ ] Gen1 produces valid LLVM IR

### Good Success (85%)
- [ ] Gen1 compiles simple test files
- [ ] Gen1 output matches bootstrap output
- [ ] Gen1 compiles ast.tsn

### Perfect Success (100%)
- [ ] Gen1 compiles all compiler modules
- [ ] Gen2 IR matches Gen1 IR (fixed point)
- [ ] **SELF-HOSTING ACHIEVED** 🎊

---

## 🚀 Execution Plan

### Timeline: ~1 hour

**Minutes 0-10**: Create gen1 directory, compile modules with bootstrap
**Minutes 10-20**: Link Gen1 executable
**Minutes 20-30**: Test Gen1 with simple files
**Minutes 30-45**: Debug any issues
**Minutes 45-60**: Attempt Gen2 compilation or document blockers

### Commands to Run:

```powershell
# Setup
mkdir gen1

# Compile modules (already done in Phase 34.5, just copy)
Copy-Item bootstrap\ast.ll gen1\
Copy-Item bootstrap\lexer.ll gen1\
Copy-Item bootstrap\parser.ll gen1\
Copy-Item bootstrap\codegen.ll gen1\
Copy-Item bootstrap\main.ll gen1\

# Compile to object files
llc gen1\ast.ll -filetype=obj -o gen1\ast.o
llc gen1\lexer.ll -filetype=obj -o gen1\lexer.o
llc gen1\parser.ll -filetype=obj -o gen1\parser.o
llc gen1\codegen.ll -filetype=obj -o gen1\codegen.o
llc gen1\main.ll -filetype=obj -o gen1\main.o

# Link
gcc gen1\ast.o gen1\lexer.o gen1\parser.o gen1\codegen.o gen1\main.o bootstrap\runtime.o -o tsnc-gen1.exe -lstdc++

# Test
.\tsnc-gen1.exe
```

---

## 🎯 Fallback Plan

If Gen1 doesn't work due to hardcoded path:

### Quick Fix to main.tsn
Change line 21 from:
```tsn
let source = readText("compiler/test-methods-only.tsn");
```

To:
```tsn
// Try to read from INPUT.tsn
let source = readText("INPUT.tsn");
```

Then:
```bash
# Copy source to INPUT.tsn:
Copy-Item compiler\src\ast.tsn INPUT.tsn

# Run Gen1:
.\tsnc-gen1.exe dummy -o output.ll
```

---

## 📝 Notes

- Bootstrap compiler is our **golden reference** (works perfectly)
- Gen1 is **first self-compiled** version (may have issues)
- Gen2 is **second generation** (proves Gen1 works)
- Fixed point (Gen1 == Gen2) proves **true self-hosting**

---

**Phase 35: IN PROGRESS**  
**Strategy**: Module-by-module linking  
**Next**: Execute Step 1 - Create gen1 directory
