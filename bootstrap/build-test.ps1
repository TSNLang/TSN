# Test Python Bootstrap Compiler
Write-Host "=== Testing Python Bootstrap Compiler ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Simple function
Write-Host "Test 1: Compiling test-simple.tsn..." -ForegroundColor Yellow
python bootstrap/compiler.py compiler/src/test-simple.tsn -o bootstrap/test-simple.ll

if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Test 2: Compiling ast.tsn (classes)..." -ForegroundColor Yellow
python bootstrap/compiler.py compiler/src/ast.tsn -o bootstrap/test-ast.ll

if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✓ All tests passed!" -ForegroundColor Green
Write-Host ""
Write-Host "Generated files:" -ForegroundColor Cyan
Get-ChildItem bootstrap/*.ll | Select-Object Name, Length | Format-Table
