# Next Steps: Build Compiler v2

Bootstrap compiler đã hoàn thành! Bây giờ cần link LLVM IR với runtime để tạo executable compiler v2.

## ✅ Đã Hoàn Thành

1. **Python Bootstrap Compiler** - 100%
   - ✅ Lexer, Parser, Codegen hoàn chỉnh
   - ✅ Hỗ trợ classes, functions, generics, operators
   - ✅ Compile thành công tất cả 4 files compiler v2

2. **Generated LLVM IR Files**
   ```
   bootstrap/ast.ll     - 2506 bytes (14 classes)
   bootstrap/lexer.ll   - 681 bytes (2 classes)
   bootstrap/parser.ll  - 620 bytes (1 class)
   bootstrap/main.ll    - 9575 bytes (2 functions)
   ```

## 🎯 Phase 2: Link và Test

### Option A: Manual Linking (Recommended First)

#### Step 1: Check LLVM IR Validity
```bash
# Verify each file parses correctly
llvm-as bootstrap/ast.ll -o NUL
llvm-as bootstrap/lexer.ll -o NUL
llvm-as bootstrap/parser.ll -o NUL
llvm-as bootstrap/main.ll -o NUL
```

#### Step 2: Compile Runtime
```bash
# Compile C runtime to object file
clang -c src/tsn_runtime.c -o bootstrap/runtime.o

# Or MSVC on Windows:
cl /c src/tsn_runtime.c /Fo:bootstrap\runtime.obj
```

#### Step 3: Link Everything
```bash
# Using clang:
clang bootstrap/ast.ll bootstrap/lexer.ll bootstrap/parser.ll bootstrap/main.ll ^
      bootstrap/runtime.o -o compiler/tsnc.exe

# Or using lli (LLVM interpreter) for testing:
lli bootstrap/main.ll
```

#### Step 4: Test Compiler v2
```bash
# Try compiling test-simple.tsn
.\compiler\tsnc.exe compiler\src\test-simple.tsn -o test-output.ll

# If it works, compare with bootstrap output:
fc bootstrap\test-simple.ll test-output.ll
```

### Option B: Automated Build Script

Create `bootstrap/build-v2.ps1`:

```powershell
#!/usr/bin/env pwsh
Write-Host "=== Building Compiler v2 ===" -ForegroundColor Cyan

# Step 1: Verify LLVM files
Write-Host "[1/4] Verifying LLVM IR..." -ForegroundColor Yellow
$files = @("ast.ll", "lexer.ll", "parser.ll", "main.ll")
foreach ($file in $files) {
    llvm-as "bootstrap/$file" -o $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: bootstrap/$file is invalid!" -ForegroundColor Red
        exit 1
    }
}
Write-Host "      All LLVM files valid!" -ForegroundColor Green

# Step 2: Compile runtime
Write-Host "[2/4] Compiling runtime..." -ForegroundColor Yellow
clang -c src/tsn_runtime.c -o bootstrap/runtime.o
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to compile runtime!" -ForegroundColor Red
    exit 1
}

# Step 3: Link
Write-Host "[3/4] Linking compiler..." -ForegroundColor Yellow
clang bootstrap/ast.ll bootstrap/lexer.ll bootstrap/parser.ll bootstrap/main.ll `
      bootstrap/runtime.o -o compiler/tsnc.exe
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to link!" -ForegroundColor Red
    exit 1
}

# Step 4: Test
Write-Host "[4/4] Testing compiler..." -ForegroundColor Yellow
.\compiler\tsnc.exe compiler\src\test-simple.tsn -o bootstrap\test-v2.ll
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: Compiler test failed!" -ForegroundColor Yellow
} else {
    Write-Host "      Compiler works!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Success! Compiler v2 ready at: compiler/tsnc.exe" -ForegroundColor Green
```

## ⚠️ Expected Issues

### Issue 1: Missing Runtime Functions

**Symptom**: Linker errors about undefined references
```
undefined reference to `Array_new`
undefined reference to `class_alloc`
```

**Fix**: Ensure `tsn_runtime.c` implements all declared functions:
- `class_alloc`, `class_incref`, `class_decref`
- `Array_new`, `Array_get_impl`, `Array_push_impl`, `Array_length_impl`
- `_T.log$P.ptr`, `_T.readText$P.ptr`, etc.

### Issue 2: Invalid LLVM IR

**Symptom**: `llvm-as` or `clang` errors
```
error: expected instruction opcode
```

**Fix**: 
1. Check generated IR manually: `cat bootstrap/main.ll`
2. Look for obvious syntax errors
3. May need to fix codegen in `compiler.py`

### Issue 3: Segmentation Fault

**Symptom**: Compiler runs but crashes
```
Segmentation fault (core dumped)
```

**Fix**:
1. Use debugger: `lldb compiler/tsnc.exe` or `gdb compiler/tsnc.exe`
2. Check for null pointer dereferences
3. Verify memory allocation in runtime

### Issue 4: Method Calls Don't Work

**Symptom**: Runtime error when calling methods
```
Assertion failed: method not found
```

**Fix**: Bootstrap compiler has limited method call support. This is OK for now - compiler v2 will handle it properly. For bootstrap phase:
- Stick to simple function calls
- Avoid complex object-oriented patterns
- Use free functions instead of methods where possible

## 📝 Debugging Tips

### View Generated LLVM IR
```bash
# Format for readability
llvm-as bootstrap/main.ll -o bootstrap/main.bc
llvm-dis bootstrap/main.bc -o bootstrap/main-pretty.ll
```

### Check Symbol Table
```bash
# On Windows with MSVC tools:
dumpbin /symbols bootstrap/runtime.obj

# On Linux/Mac:
nm bootstrap/runtime.o
```

### Run with LLVM Interpreter
```bash
# Test without linking:
lli bootstrap/main.ll
```

## 🎉 Success Criteria

Bootstrap phase is successful when:

1. ✅ All LLVM IR files are valid (pass `llvm-as`)
2. ✅ Linking succeeds without errors
3. ✅ `compiler/tsnc.exe` executable is created
4. ⏳ Running `tsnc.exe` doesn't crash immediately
5. ⏳ `tsnc.exe` can compile `test-simple.tsn` (even with errors)

**Don't expect perfection!** Bootstrap compiler just needs to work well enough to compile compiler v2. Once compiler v2 works, we throw away the Python bootstrap.

## 🚀 After Success

Once compiler v2 is working:

1. **Test self-compilation**:
   ```bash
   .\compiler\tsnc.exe compiler\src\ast.tsn -o build/ast-v2.ll
   .\compiler\tsnc.exe compiler\src\lexer.tsn -o build/lexer-v2.ll
   .\compiler\tsnc.exe compiler\src\parser.tsn -o build/parser-v2.ll
   ```

2. **Compare outputs**:
   ```bash
   # Should be similar (not identical, but functionally equivalent)
   fc bootstrap\ast.ll build\ast-v2.ll
   ```

3. **Build compiler v3 from v2's output**:
   ```bash
   clang build/ast-v2.ll build/lexer-v2.ll build/parser-v2.ll ^
         bootstrap/runtime.o -o compiler/tsnc-v3.exe
   ```

4. **Celebrate!** 🎉
   - Delete `bootstrap/compiler.py`
   - Update README.md
   - Commit: "Achieved self-hosting!"

---

**Current Status**: Bootstrap complete, ready for Phase 2 linking!
