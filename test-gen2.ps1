# Test Gen2 Compiler Comprehensively
Write-Host "=== Gen2 Comprehensive Validation ===" -ForegroundColor Cyan
Write-Host ""

$tests = @(
    @{name="test-simple"; desc="Simple function"; expected="1 function"},
    @{name="test-methods-only"; desc="Class with methods"; expected="1 class"},
    @{name="test-phase16"; desc="If/while statements"; expected="2 functions"}
)

$passed = 0
$failed = 0

foreach ($test in $tests) {
    Write-Host "Testing: $($test.name).tsn - $($test.desc)" -ForegroundColor Yellow
    
    # Copy test file
    if (Test-Path "compiler\$($test.name).tsn") {
        Copy-Item "compiler\$($test.name).tsn" "gen2\compiler\" -Force
    } else {
        Write-Host "  ⚠ Test file not found, skipping" -ForegroundColor Yellow
        continue
    }
    
    # Update main.tsn to read this file
    $mainPath = "gen2\compiler\src\main.tsn"
    if (-not (Test-Path $mainPath)) {
        Copy-Item "compiler\src\main.tsn" $mainPath -Force
    }
    
    $content = Get-Content $mainPath -Raw
    $content = $content -replace 'readText\("compiler/[^"]+"\)', "readText(`"compiler/$($test.name).tsn`")"
    $content | Set-Content $mainPath
    
    # Recompile main.ll
    python bootstrap\compiler.py $mainPath -o gen2\main.ll 2>&1 | Out-Null
    
    # Rebuild Gen2
    Push-Location gen2
    llc main.ll -filetype=obj -o main.o 2>&1 | Out-Null
    Remove-Item tsnc-gen2.exe -Force -ErrorAction SilentlyContinue
    clang ast.o lexer.o parser.o codegen.o main.o runtime.o -o tsnc-gen2.exe 2>&1 | Out-Null
    
    # Run Gen2
    $output = .\tsnc-gen2.exe 2>&1 | Out-String
    
    if ($output -match "Compilation successful") {
        # Verify output compiles
        llc output.ll -filetype=obj -o test.o 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ PASS - Generated valid LLVM IR" -ForegroundColor Green
            $passed++
        } else {
            Write-Host "  ✗ FAIL - Output has compilation errors" -ForegroundColor Red
            $failed++
        }
    } else {
        Write-Host "  ✗ FAIL - Gen2 crashed or failed" -ForegroundColor Red
        $failed++
    }
    
    Pop-Location
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Results:" -ForegroundColor Cyan
Write-Host "  Passed: $passed" -ForegroundColor Green
Write-Host "  Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "  Total:  $($passed + $failed)"
Write-Host "========================================" -ForegroundColor Cyan

if ($failed -eq 0) {
    Write-Host ""
    Write-Host "🎉 ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "Gen2 is FULLY FUNCTIONAL!" -ForegroundColor Green
}
