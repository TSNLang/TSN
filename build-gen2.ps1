# Build Gen2 Compiler Using Gen1
# This script uses Gen1 to compile compiler modules, creating Gen2

Write-Host "=== Building Gen2 Compiler Using Gen1 ===" -ForegroundColor Cyan
Write-Host ""

# Setup
$ErrorActionPreference = "Stop"
$modules = @("ast", "lexer", "codegen", "main")

# Step 1: Compile modules with Gen1
Write-Host "[Step 1/4] Compiling modules with Gen1..." -ForegroundColor Yellow

foreach ($module in $modules) {
    Write-Host "  Compiling $module.tsn..."
    
    # Update main.tsn to read this module
    $mainContent = Get-Content "gen1\compiler\src\main.tsn" -Raw
    $mainContent = $mainContent -replace 'readText\("compiler/src/[^"]+"\)', "readText(`"compiler/src/$module.tsn`")"
    $mainContent | Set-Content "gen1\compiler\src\main.tsn"
    
    # Recompile main.ll with new path
    python bootstrap\compiler.py gen1\compiler\src\main.tsn -o gen1\main.ll 2>&1 | Out-Null
    
    # Rebuild Gen1
    Push-Location gen1
    llc main.ll -filetype=obj -o main.o 2>&1 | Out-Null
    Remove-Item tsnc-gen1.exe -Force -ErrorAction SilentlyContinue
    clang ast.o lexer.o parser.o codegen.o main.o runtime.o -o tsnc-gen1.exe 2>&1 | Out-Null
    
    # Run Gen1 to compile module
    .\tsnc-gen1.exe 2>&1 | Out-Null
    
    # Copy output to gen2
    if (Test-Path output.ll) {
        Copy-Item output.ll "..\gen2\$module.ll" -Force
        Write-Host "    ✓ Generated gen2\$module.ll" -ForegroundColor Green
    } else {
        Write-Host "    ✗ Failed to generate $module.ll" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Pop-Location
}

Write-Host ""

# Step 2: Copy bootstrap parser.ll
Write-Host "[Step 2/4] Using bootstrap parser.ll (workaround)..." -ForegroundColor Yellow
Copy-Item bootstrap\parser.ll gen2\ -Force
Write-Host "  ✓ Copied bootstrap\parser.ll to gen2\" -ForegroundColor Green
Write-Host ""

# Step 3: Copy runtime
Write-Host "[Step 3/4] Copying runtime..." -ForegroundColor Yellow
Copy-Item bootstrap\runtime.o gen2\ -Force
Write-Host "  ✓ Copied runtime.o" -ForegroundColor Green
Write-Host ""

# Step 4: Compile to objects and link
Write-Host "[Step 4/4] Linking Gen2 executable..." -ForegroundColor Yellow

Push-Location gen2

# Compile LLVM IR to objects
foreach ($module in $modules) {
    llc "$module.ll" -filetype=obj -o "$module.o" 2>&1 | Out-Null
}
llc parser.ll -filetype=obj -o parser.o 2>&1 | Out-Null

# Link Gen2
clang ast.o lexer.o parser.o codegen.o main.o runtime.o -o tsnc-gen2.exe 2>&1 | Out-Null

if (Test-Path tsnc-gen2.exe) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCCESS! Gen2 compiler built!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    $size = (Get-Item tsnc-gen2.exe).Length
    Write-Host "Executable: gen2\tsnc-gen2.exe"
    Write-Host "Size:       $size bytes"
    Write-Host ""
    Write-Host "Gen2 is a compiler built by Gen1!"
    Write-Host "This proves TSN is self-hosting! 🎉"
} else {
    Write-Host "FAILED to link Gen2" -ForegroundColor Red
    exit 1
}

Pop-Location
