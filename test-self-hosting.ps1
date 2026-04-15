#!/usr/bin/env pwsh
# Test script for TSN self-hosting

Write-Host "=== TSN Self-Hosting Test Suite ===" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"
$testsPassed = 0
$testsFailed = 0

function Test-Compilation {
    param(
        [string]$Name,
        [string]$InputFile,
        [string]$OutputFile
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    Write-Host "  Input: $InputFile"
    
    # Compile
    Push-Location compiler-ts
    deno run --allow-read --allow-write src/main.ts $InputFile $OutputFile 2>&1 | Out-Null
    $compileResult = $LASTEXITCODE
    Pop-Location
    
    if ($compileResult -eq 0) {
        Write-Host "  ✅ Compilation successful" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ❌ Compilation failed" -ForegroundColor Red
        return $false
    }
}

function Test-Executable {
    param(
        [string]$Name,
        [string]$LLFile,
        [string]$ExeFile,
        [int]$ExpectedExitCode
    )
    
    Write-Host "Testing: $Name (executable)" -ForegroundColor Yellow
    
    # Link
    Push-Location compiler-ts
    clang $LLFile -o $ExeFile 2>&1 | Out-Null
    $linkResult = $LASTEXITCODE
    
    if ($linkResult -ne 0) {
        Write-Host "  ❌ Linking failed" -ForegroundColor Red
        Pop-Location
        return $false
    }
    
    # Run
    & ".\$ExeFile" 2>&1 | Out-Null
    $exitCode = $LASTEXITCODE
    Pop-Location
    
    if ($exitCode -eq $ExpectedExitCode) {
        Write-Host "  ✅ Exit code: $exitCode (expected: $ExpectedExitCode)" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ❌ Exit code: $exitCode (expected: $ExpectedExitCode)" -ForegroundColor Red
        return $false
    }
}

# Test 1: Types.tsn
Write-Host ""
Write-Host "--- Test 1: Types.tsn ---" -ForegroundColor Cyan
if (Test-Compilation "Types.tsn" "../src/Types.tsn" "Types.ll") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 2: Lexer.tsn
Write-Host ""
Write-Host "--- Test 2: Lexer.tsn ---" -ForegroundColor Cyan
if (Test-Compilation "Lexer.tsn" "../src/Lexer.tsn" "Lexer.ll") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 3: Parser.tsn
Write-Host ""
Write-Host "--- Test 3: Parser.tsn ---" -ForegroundColor Cyan
if (Test-Compilation "Parser.tsn" "../src/Parser.tsn" "Parser.ll") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 4: Simple program
Write-Host ""
Write-Host "--- Test 4: Simple Program ---" -ForegroundColor Cyan
if (Test-Compilation "test-simple.tsn" "test-simple.tsn" "test-simple.ll") {
    if (Test-Executable "test-simple" "test-simple.ll" "test-simple.exe" 42) {
        $testsPassed++
    } else {
        $testsFailed++
    }
} else {
    $testsFailed++
}

# Test 5: Binary expressions
Write-Host ""
Write-Host "--- Test 5: Binary Expressions ---" -ForegroundColor Cyan
if (Test-Compilation "test-binary.tsn" "test-binary.tsn" "test-binary.ll") {
    if (Test-Executable "test-binary" "test-binary.ll" "test-binary.exe" 14) {
        $testsPassed++
    } else {
        $testsFailed++
    }
} else {
    $testsFailed++
}

# Test 6: Types usage
Write-Host ""
Write-Host "--- Test 6: Types Usage ---" -ForegroundColor Cyan
if (Test-Compilation "test-types-usage.tsn" "test-types-usage.tsn" "test-types-usage.ll") {
    if (Test-Executable "test-types-usage" "test-types-usage.ll" "test-types-usage.exe" 42) {
        $testsPassed++
    } else {
        $testsFailed++
    }
} else {
    $testsFailed++
}

# Summary
Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "  Passed: $testsPassed" -ForegroundColor Green
Write-Host "  Failed: $testsFailed" -ForegroundColor Red
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "🎉 All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Some tests failed" -ForegroundColor Red
    exit 1
}
