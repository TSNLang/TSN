# Build script for self-hosted TSN compiler
# Compiles all modules and links them together

$ErrorActionPreference = "Stop"

Write-Host "=== Self-Hosted TSN Compiler Build ===" -ForegroundColor Cyan

$COMPILER = ".\self-hosting\compiler_fixed.exe"
$OUTDIR = ".\self-hosting\self-built"

# Create output directory
if (!(Test-Path $OUTDIR)) {
    New-Item -ItemType Directory -Path $OUTDIR | Out-Null
}

Write-Host "`n[1/7] Compiling ast.tsn..." -ForegroundColor Yellow
& $COMPILER self-hosting\ast.tsn "$OUTDIR\ast.ll"
if ($LASTEXITCODE -ne 0) { 
    Write-Host "Failed to compile ast.tsn" -ForegroundColor Red
    exit 1 
}

Write-Host "`n[2/7] Compiling mir-flat.tsn..." -ForegroundColor Yellow  
& $COMPILER self-hosting\mir-flat.tsn "$OUTDIR\mir-flat.ll"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to compile mir-flat.tsn" -ForegroundColor Red
    exit 1
}

Write-Host "`n[3/7] Compiling lexer.tsn..." -ForegroundColor Yellow
& $COMPILER self-hosting\lexer.tsn "$OUTDIR\lexer.ll"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to compile lexer.tsn" -ForegroundColor Red
    exit 1
}

Write-Host "`n[4/7] Compiling ast-parser.tsn..." -ForegroundColor Yellow
& $COMPILER self-hosting\ast-parser.tsn "$OUTDIR\ast-parser.ll"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to compile ast-parser.tsn" -ForegroundColor Red
    exit 1
}

Write-Host "`n[5/7] Compiling mir-builder-flat.tsn..." -ForegroundColor Yellow
& $COMPILER self-hosting\mir-builder-flat.tsn "$OUTDIR\mir-builder-flat.ll"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to compile mir-builder-flat.tsn" -ForegroundColor Red
    exit 1
}

Write-Host "`n[6/7] Compiling mir-codegen-flat.tsn..." -ForegroundColor Yellow
& $COMPILER self-hosting\mir-codegen-flat.tsn "$OUTDIR\mir-codegen-flat.ll"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to compile mir-codegen-flat.tsn" -ForegroundColor Red
    exit 1
}

Write-Host "`n[7/7] Compiling main.tsn..." -ForegroundColor Yellow
& $COMPILER self-hosting\main.tsn "$OUTDIR\main.ll"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to compile main.tsn" -ForegroundColor Red
    exit 1
}

Write-Host "`n[Linking] Creating executable..." -ForegroundColor Yellow

# Rename main function for wrapper
(Get-Content "$OUTDIR\main.ll" -Raw) -replace '@main\(', '@main_renamed(' | Set-Content "$OUTDIR\main-fixed.ll"

# Link all modules
clang "$OUTDIR\main-fixed.ll" `
      "$OUTDIR\lexer.ll" `
      "$OUTDIR\ast-parser.ll" `
      "$OUTDIR\ast.ll" `
      "$OUTDIR\mir-flat.ll" `
      "$OUTDIR\mir-builder-flat.ll" `
      "$OUTDIR\mir-codegen-flat.ll" `
      "d:\TSN\TSN\src\tsn_runtime.c" `
      "d:\TSN\TSN\src\tsn_runtime_stubs.c" `
      "d:\TSN\TSN\src\main_wrapper_direct.c" `
      -o "$OUTDIR\compiler.exe" `
      -Xlinker /force:multiple 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to link executable" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Build complete! Executable: $OUTDIR\compiler.exe" -ForegroundColor Green

# Test the compiler
Write-Host "`n[Test] Running self-built compiler..." -ForegroundColor Cyan
& "$OUTDIR\compiler.exe" 2>&1 | Select-Object -First 3

Write-Host "`n[Test] Compiling test file..." -ForegroundColor Cyan
& "$OUTDIR\compiler.exe" self-hosting\test-minimal.tsn "$OUTDIR\test-output.ll" 2>&1 | Select-Object -Last 5

if (Test-Path "$OUTDIR\test-output.ll") {
    $size = (Get-Item "$OUTDIR\test-output.ll").Length
    Write-Host "`n✅ Test successful! Output size: $size bytes" -ForegroundColor Green
} else {
    Write-Host "`n❌ Test failed - no output generated" -ForegroundColor Red
}
