# TSN Compiler Build Script
# Builds the self-hosted TSN compiler using TypeScript/Deno bootstrap

Write-Host "=== TSN Compiler Build Script ===" -ForegroundColor Cyan
Write-Host ""

# Check if Deno is installed
Write-Host "Checking for Deno..." -ForegroundColor Yellow
$denoVersion = deno --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Deno is not installed!" -ForegroundColor Red
    Write-Host "Please install Deno from: https://deno.land/" -ForegroundColor Red
    exit 1
}
Write-Host "Deno found: $($denoVersion -split '\n' | Select-Object -First 1)" -ForegroundColor Green
Write-Host ""

# Check if Clang is installed
Write-Host "Checking for Clang..." -ForegroundColor Yellow
$clangVersion = clang --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Clang is not installed!" -ForegroundColor Red
    Write-Host "Please install LLVM/Clang from: https://llvm.org/" -ForegroundColor Red
    exit 1
}
Write-Host "Clang found: $($clangVersion -split '\n' | Select-Object -First 1)" -ForegroundColor Green
Write-Host ""

# Step 1: Compile TSN modules with TypeScript compiler
Write-Host "Step 1: Compiling TSN compiler modules with TypeScript..." -ForegroundColor Cyan

$modules = @(
    @{name="ast"; src="self-hosting/ast.tsn"; out="self-hosting/ast_ts.ll"},
    @{name="lexer"; src="self-hosting/lexer.tsn"; out="self-hosting/lexer_ts.ll"},
    @{name="ast-parser"; src="self-hosting/ast-parser.tsn"; out="self-hosting/ast-parser_ts.ll"},
    @{name="mir-flat"; src="self-hosting/mir-flat.tsn"; out="self-hosting/mir-flat_ts.ll"},
    @{name="mir-builder-flat"; src="self-hosting/mir-builder-flat.tsn"; out="self-hosting/mir-builder-flat_ts.ll"},
    @{name="mir-codegen-flat"; src="self-hosting/mir-codegen-flat.tsn"; out="self-hosting/mir-codegen-flat_ts.ll"},
    @{name="main"; src="self-hosting/main.tsn"; out="self-hosting/main_ts.ll"}
)

foreach ($module in $modules) {
    Write-Host "  Compiling $($module.name)..." -ForegroundColor Yellow
    deno run --allow-all src/src/main.ts $module.src -o $module.out
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to compile $($module.name)" -ForegroundColor Red
        exit 1
    }
}

Write-Host "All modules compiled successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Link with Clang
Write-Host "Step 2: Linking with Clang..." -ForegroundColor Cyan

clang -o self-hosting/tsnc.exe `
    self-hosting/ast_ts.ll `
    self-hosting/lexer_ts.ll `
    self-hosting/ast-parser_ts.ll `
    self-hosting/mir-flat_ts.ll `
    self-hosting/mir-builder-flat_ts.ll `
    self-hosting/mir-codegen-flat_ts.ll `
    self-hosting/main_ts.ll `
    src/std/string.ll `
    src/std/array.ll `
    src/std/console.ll `
    src/std/memory.ll `
    src/std/array_token.ll `
    src/tsn_runtime_stubs_linking.ll `
    src/tsn_runtime.c `
    -Wno-override-module

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Linking failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Linking successful!" -ForegroundColor Green
Write-Host ""

# Success
Write-Host "=== Build Complete ===" -ForegroundColor Green
Write-Host "TSN Compiler built successfully: self-hosting/tsnc.exe" -ForegroundColor Green
Write-Host ""
Write-Host "Usage: .\self-hosting\tsnc.exe your-program.tsn" -ForegroundColor Cyan
