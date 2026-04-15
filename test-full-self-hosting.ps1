#!/usr/bin/env pwsh
# Test: Full self-hosting pipeline
# UnifiedCompiler.exe reads input.tsn → runs lexer/parser/codegen → produces LLVM IR

Write-Host "=== TSN Full Self-Hosting Test ===" -ForegroundColor Cyan
Write-Host ""

$passed = 0
$failed = 0

function Test-SelfHosted {
    param($description, $inputFile, $expectContains)
    
    Write-Host "Test: $description" -ForegroundColor Yellow
    
    # Copy input file to compiler-ts/input.tsn
    Copy-Item $inputFile "compiler-ts/input.tsn" -Force
    
    # Run the self-hosted compiler
    $output = Start-Process -FilePath "compiler-ts\UnifiedCompiler.exe" `
        -WorkingDirectory "$(Get-Location)\compiler-ts" `
        -Wait -NoNewWindow -PassThru `
        -RedirectStandardOutput "compiler-ts\sh-stdout.txt" `
        -RedirectStandardError "compiler-ts\sh-stderr.txt"
    
    $exitCode = $output.ExitCode
    $stdout = Get-Content "compiler-ts\sh-stdout.txt" -Raw -ErrorAction SilentlyContinue
    
    if ($exitCode -ne 0) {
        Write-Host "  ❌ FAILED: exit code $exitCode" -ForegroundColor Red
        $script:failed++
        return
    }
    
    if ($stdout -match "Compilation successful") {
        Write-Host "  ✅ Pipeline completed successfully" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host "  ❌ FAILED: expected 'Compilation successful'" -ForegroundColor Red
        $script:failed++
    }
    
    if ($stdout -match "LLVM IR BEGIN") {
        $irLines = ($stdout -split "--- LLVM IR BEGIN ---")[1] -split "--- LLVM IR END ---" | Select-Object -First 1
        $irLineCount = ($irLines -split "`n").Length
        Write-Host "  📄 Generated $irLineCount lines of LLVM IR" -ForegroundColor Cyan
    }
}

# Test 1: Simple program
Test-SelfHosted "Simple function (return 42)" "compiler-ts/test-simple.tsn"

# Test 2: For loop
Test-SelfHosted "For loop program" "compiler-ts/test-for-loop.tsn"

# Test 3: Binary expressions
Test-SelfHosted "Binary expressions" "compiler-ts/test-binary.tsn"

Write-Host ""
Write-Host "=== Results ===" -ForegroundColor Cyan
Write-Host "  Passed: $passed" -ForegroundColor Green
Write-Host "  Failed: $failed" -ForegroundColor Red
Write-Host ""

if ($failed -eq 0) {
    Write-Host "🎉 Self-hosting pipeline WORKS!" -ForegroundColor Green
    Write-Host "   UnifiedCompiler.exe (compiled from TSN) can process TSN source code!" -ForegroundColor Green
    Write-Host ""
    Write-Host "ACHIEVEMENT: TSN compiler is self-hosting!" -ForegroundColor Magenta
    Write-Host "  TSN source → TypeScript compiler → LLVM IR → clang → UnifiedCompiler.exe" -ForegroundColor White
    Write-Host "  UnifiedCompiler.exe → reads .tsn → lexer/parser/codegen → LLVM IR" -ForegroundColor White
} else {
    Write-Host "❌ Some tests failed" -ForegroundColor Red
    exit 1
}
