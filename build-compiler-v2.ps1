# TSN Compiler v2 Build Script
# Bootstrap với TypeScript compiler

Write-Host "=== TSN Compiler v2 Build ===" -ForegroundColor Cyan
Write-Host "Phase 1: Lexer + Parser" -ForegroundColor Yellow
Write-Host ""

# Compile modules
$modules = @(
    @{src="compiler/src/ast.tsn"; out="compiler/build/ast.ll"},
    @{src="compiler/src/lexer.tsn"; out="compiler/build/lexer.ll"},
    @{src="compiler/src/parser.tsn"; out="compiler/build/parser.ll"},
    @{src="compiler/src/main.tsn"; out="compiler/build/main.ll"}
)

foreach ($mod in $modules) {
    Write-Host "Compiling $($mod.src)..." -ForegroundColor Yellow
    deno run --allow-all src/src/main.ts $mod.src -o $mod.out
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to compile $($mod.src)" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Linking..." -ForegroundColor Yellow

clang -o compiler/tsnc-phase1.exe `
    compiler/build/ast.ll `
    compiler/build/lexer.ll `
    compiler/build/parser.ll `
    compiler/build/main.ll `
    src/std/string.ll `
    src/std/array.ll `
    src/std/console.ll `
    src/std/memory.ll `
    src/std/array_token.ll `
    src/tsn_runtime_stubs_linking.ll `
    src/tsn_runtime.c `
    -Wno-override-module

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Linking failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Build Complete ===" -ForegroundColor Green
Write-Host "Compiler: compiler/tsnc-phase1.exe" -ForegroundColor Green
Write-Host ""
Write-Host "Testing..." -ForegroundColor Cyan

cd compiler
.\tsnc-phase1.exe
cd ..

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
