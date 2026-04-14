# build-compiler.ps1 - Build complete TSN compiler from modules

Write-Host "Building TSN Compiler..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Concatenate all modules
Write-Host "Step 1: Concatenating modules..." -ForegroundColor Yellow
deno run --allow-read --allow-write compiler-ts/concat-modules.ts `
  src/TSNCompiler.tsn `
  src/FullCompiler.tsn `
  src/Lexer.tsn `
  src/Parser.tsn `
  src/Codegen.tsn

if ($LASTEXITCODE -ne 0) {
  Write-Host "Concatenation failed!" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Modules concatenated to src/TSNCompiler.tsn" -ForegroundColor Green
Write-Host ""

# Step 2: Compile with TypeScript compiler
Write-Host "Step 2: Compiling TSN to LLVM IR..." -ForegroundColor Yellow
deno run --allow-read --allow-write compiler-ts/src/main.ts `
  src/TSNCompiler.tsn `
  src/TSNCompiler.ll

if ($LASTEXITCODE -ne 0) {
  Write-Host "Compilation failed!" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Generated src/TSNCompiler.ll" -ForegroundColor Green
Write-Host ""

# Step 3: Compile LLVM IR to executable
Write-Host "Step 3: Linking to executable..." -ForegroundColor Yellow
clang src/TSNCompiler.ll -o tsnc.exe

if ($LASTEXITCODE -ne 0) {
  Write-Host "Linking failed!" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Created tsnc.exe" -ForegroundColor Green
Write-Host ""
Write-Host "Build complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Usage: ./tsnc.exe input.tsn output.ll"
