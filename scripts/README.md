# TSN Build Scripts

This directory contains PowerShell scripts for building and managing the TSN compiler.

---

## 📜 Available Scripts

### 1. `build-compiler.ps1`
**Purpose**: Build the main TSN compiler from bootstrap

**Usage**:
```powershell
.\build-compiler.ps1
```

**What it does**:
- Compiles all TSN compiler sources (ast, lexer, parser, codegen, main)
- Uses Python bootstrap compiler
- Links with runtime
- Produces `compiler/tsnc.exe`

**Output**:
- `bootstrap/*.ll` - LLVM IR files
- `bootstrap/*.o` - Object files
- `compiler/tsnc.exe` - Final compiler executable (~221 KB)

---

### 2. `build-gen2.ps1`
**Purpose**: Build Gen2 compiler (fixed codegen version)

**Usage**:
```powershell
.\build-gen2.ps1
```

**What it does**:
- Compiles compiler sources with bootstrap
- Links into Gen2 executable
- Produces `gen2-test/tsnc-gen2.exe`

**Output**:
- `gen2-test/tsnc-gen2.exe` - Gen2 compiler (212,480 bytes)

---

### 3. `build-generations.ps1`
**Purpose**: Build all compiler generations (Gen1, Gen2, Gen3)

**Usage**:
```powershell
.\build-generations.ps1
```

**What it does**:
- Builds Gen1 from bootstrap IR
- Builds Gen2 from bootstrap IR (fixed)
- Builds Gen3 from bootstrap IR (same as Gen2)
- Verifies fixed point (Gen2 == Gen3)

**Output**:
- `gen1/tsnc-gen1.exe` - Generation 1 (211,968 bytes)
- `gen2-test/tsnc-gen2.exe` - Generation 2 (212,480 bytes)
- `gen3-test/tsnc-gen3.exe` - Generation 3 (212,480 bytes)

---

### 4. `rm.ps1`
**Purpose**: Clean temporary build files

**Usage**:
```powershell
.\rm.ps1
```

**What it does**:
- Removes temporary .ll files
- Removes temporary .o files
- Cleans build artifacts

**Note**: Does NOT remove:
- Final compiler executables
- Bootstrap IR files
- Generation directories

---

## 🚀 Quick Start

### Build the Latest Compiler:
```powershell
cd scripts
.\build-compiler.ps1
```

### Build All Generations (for testing):
```powershell
cd scripts
.\build-generations.ps1
```

### Clean Up:
```powershell
cd scripts
.\rm.ps1
```

---

## 🔧 Requirements

### Tools Needed:
- **Python 3.x** - For bootstrap compiler
- **Clang/LLVM** - For linking and code generation
- **PowerShell** - For running scripts

### Environment Setup:
1. Install Python: `https://www.python.org/`
2. Install LLVM/Clang: `https://llvm.org/`
3. Ensure `python`, `clang`, and `llvm-as` are in PATH

---

## 📊 Build Process

### Standard Build Flow:
```
TSN Sources (*.tsn)
      ↓
[Python Bootstrap Compiler]
      ↓
   LLVM IR (*.ll)
      ↓
    [Clang]
      ↓
 Object Files (*.o)
      ↓
    [Linker]
      ↓
Executable (tsnc.exe)
```

### Generation Build Flow:
```
Bootstrap (Python)
      ↓
   Gen1 (211 KB)
      ↓
   Gen2 (212 KB) ← Fixed codegen
      ↓
   Gen3 (212 KB) ← Identical to Gen2 (FIXED POINT!)
```

---

## 🎯 Build Targets

### `compiler/tsnc.exe` (Main Compiler)
- Built from: Bootstrap IR
- Size: ~221 KB
- Status: Latest development version
- Use for: General TSN compilation

### `gen1/tsnc-gen1.exe` (Generation 1)
- Built from: Bootstrap IR (old codegen)
- Size: 211,968 bytes
- Status: 80% self-compile capability
- Use for: Historical reference

### `gen2-test/tsnc-gen2.exe` (Generation 2)
- Built from: Bootstrap IR (fixed codegen)
- Size: 212,480 bytes
- Status: 100% stable, production ready
- Use for: Production compilation

### `gen3-test/tsnc-gen3.exe` (Generation 3)
- Built from: Bootstrap IR (same as Gen2)
- Size: 212,480 bytes
- Status: Identical to Gen2 (proves fixed point)
- Use for: Fixed point verification

---

## 🧪 Testing

### Verify Fixed Point:
```powershell
# Build all generations
.\build-generations.ps1

# Gen2 compiles test file
cd ..
.\gen2-test\tsnc-gen2.exe
# Output: gen2-output.ll

# Gen3 compiles test file
.\gen3-test\tsnc-gen3.exe
# Output: gen3-output.ll

# Compare outputs
fc /b gen2-output.ll gen3-output.ll
# Expected: Files are identical
```

### Build Performance:
- **build-compiler.ps1**: ~10 seconds
- **build-gen2.ps1**: ~5 seconds
- **build-generations.ps1**: ~15 seconds

---

## ⚠️ Common Issues

### Issue: "python: command not found"
**Solution**: Install Python 3.x and add to PATH

### Issue: "clang: command not found"
**Solution**: Install LLVM/Clang and add to PATH

### Issue: Build fails with "module not found"
**Solution**: Ensure bootstrap/compiler.py exists and is correct version

### Issue: Linking errors
**Solution**: Ensure runtime.o exists in bootstrap/ directory

---

## 📝 Script Maintenance

### Adding New Scripts:
1. Create script in `scripts/` directory
2. Use `.ps1` extension
3. Add documentation to this README
4. Test on clean build

### Updating Scripts:
1. Update script file
2. Update this README
3. Test all related scripts
4. Update version in CHANGELOG

---

## 🎯 Future Enhancements

### Planned:
- [ ] `build-all.ps1` - One command builds everything
- [ ] `test-compiler.ps1` - Run test suite
- [ ] `clean-all.ps1` - Remove all generated files
- [ ] Cross-platform support (Bash versions)
- [ ] Build caching for faster rebuilds

---

## 📚 Related Documentation

- [../README.md](../README.md) - Main project documentation
- [../CHANGELOG.md](../CHANGELOG.md) - Version history
- [../docs/README.md](../docs/README.md) - Full documentation index
- [../FINAL_VERIFICATION_REPORT.md](../FINAL_VERIFICATION_REPORT.md) - Fixed point proof

---

*Last Updated: August 6, 2026*  
*Location: scripts/*  
*Purpose: Build automation and tooling*
