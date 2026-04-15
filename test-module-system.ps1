#!/usr/bin/env pwsh
# Test module system end-to-end

Write-Host "=== TSN Module System Test ===" -ForegroundColor Cyan
Write-Host ""

$passed = 0
$failed = 0

function RunTest($name, $tsn, $expected) {
    Write-Host "Test: $name" -ForegroundColor Yellow
    
    Push-Location compiler-ts
    deno run --allow-read --allow-write src/main.ts $tsn test-mod-out.ll 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ❌ Compile failed" -ForegroundColor Red
        $script:failed++
        Pop-Location
        return
    }
    clang test-mod-out.ll tsn_runtime.c -o test-mod-out.exe 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ❌ Link failed" -ForegroundColor Red
        $script:failed++
        Pop-Location
        return
    }
    $output = ./test-mod-out.exe 2>&1 | Out-String
    Pop-Location
    
    $output = $output.Trim()
    if ($output -eq $expected) {
        Write-Host "  ✅ Output: '$output'" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host "  ❌ Expected: '$expected'" -ForegroundColor Red
        Write-Host "     Got:      '$output'" -ForegroundColor Red
        $script:failed++
    }
}

# Test 1: Hello World with import
Set-Content "compiler-ts/test-console.tsn" @"
import * as console from "std:console";

function main(): i32 {
    console.log("Hello, World!");
    return 0;
}
"@
RunTest "Hello World via import" "test-console.tsn" "Hello, World!"

# Test 2: examples/hello.tsn
RunTest "examples/hello.tsn" "../examples/hello.tsn" "hello from tsn mvp"

# Test 3: math_demo
$t3 = "compiler-ts/test-mod3.tsn"
Set-Content $t3 @"
import * as console from "std:console";

function add(a: i32, b: i32): i32 {
    return a + b;
}

function main(): i32 {
    let result = add(10, 32);
    if (result == 42) {
        console.log("math works!");
    }
    return 0;
}
"@
RunTest "Math with console" "test-mod3.tsn" "math works!"

# Summary
Write-Host ""
Write-Host "=== Results ===" -ForegroundColor Cyan
Write-Host "  Passed: $passed" -ForegroundColor Green
Write-Host "  Failed: $failed" -ForegroundColor Red
if ($failed -eq 0) {
    Write-Host ""
    Write-Host "🎉 All module system tests passed!" -ForegroundColor Green
    Write-Host "   import * as X from 'std:module' WORKS!" -ForegroundColor Cyan
} else {
    exit 1
}
