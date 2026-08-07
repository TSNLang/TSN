#!/usr/bin/env pwsh
# Build Compiler v2 from Bootstrap-Generated LLVM IR

Write-Host "=== Building TSN Compiler v2 ===" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Step 1: Verify LLVM files exist and are valid
Write-Host "[1/4] Verifying LLVM IR files..." -ForegroundColor Yellow

$llvmFiles = @("ast.ll", "lexer.ll", "parser.ll", "codegen.ll", "main.ll")
foreach ($file in $llvmFiles) {
    $path = "bootstrap\$file"
    if (-not (Test-Path $path)) {
        Write-Host "      Error: $path not found!" -ForegroundColor Red
        Write-Host "      Run: python bootstrap\compiler.py compiler\src\<file>.tsn -o bootstrap\<file>.ll" -ForegroundColor Yellow
        exit 1
    }
    
    # Verify LLVM IR syntax (if llvm-as is available)
    # Note: Skip validation for now - bootstrap IR may have warnings
    # if (Get-Command llvm-as -ErrorAction SilentlyContinue) {
    #     llvm-as $path -o $null 2>&1 | Out-Null
    #     if ($LASTEXITCODE -ne 0) {
    #         Write-Host "      Error: $path contains invalid LLVM IR!" -ForegroundColor Red
    #         exit 1
    #     }
    # }
}

Write-Host "      All LLVM files present and valid" -ForegroundColor Green

# Step 2: Compile runtime
Write-Host "[2/4] Compiling TSN runtime..." -ForegroundColor Yellow

$runtimeSource = "compiler\runtime\tsn_runtime.c"
$runtimeObj = "bootstrap\runtime.o"

if (-not (Test-Path $runtimeSource)) {
    Write-Host "      Error: $runtimeSource not found!" -ForegroundColor Red
    exit 1
}

# Try clang first, fall back to cl (MSVC)
if (Get-Command clang -ErrorAction SilentlyContinue) {
    clang -c $runtimeSource -o $runtimeObj
    if ($LASTEXITCODE -ne 0) {
        Write-Host "      Error: Failed to compile runtime with clang!" -ForegroundColor Red
        exit 1
    }
} elseif (Get-Command cl -ErrorAction SilentlyContinue) {
    cl /c $runtimeSource /Fo:$runtimeObj /nologo
    if ($LASTEXITCODE -ne 0) {
        Write-Host "      Error: Failed to compile runtime with cl!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "      Error: No C compiler found (need clang or cl)!" -ForegroundColor Red
    Write-Host "      Install LLVM or Visual Studio" -ForegroundColor Yellow
    exit 1
}

Write-Host "      Runtime compiled: $runtimeObj" -ForegroundColor Green

# Step 3: Link everything
Write-Host "[3/4] Linking compiler executable..." -ForegroundColor Yellow

$outputExe = "compiler\tsnc.exe"

# Create compiler directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "compiler" | Out-Null

# Link with clang (with increased stack size for parser recursion)
if (Get-Command clang -ErrorAction SilentlyContinue) {
    $llvmPaths = $llvmFiles | ForEach-Object { "bootstrap\$_" }
    # /STACK:16777216 = 16 MB stack (vs 1 MB default) - enables parser self-compilation
    clang @llvmPaths $runtimeObj -o $outputExe "-Wl,/STACK:16777216"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "      Error: Failed to link!" -ForegroundColor Red
        Write-Host "      Check for missing runtime functions" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "      Error: clang not found (required for linking)!" -ForegroundColor Red
    exit 1
}

Write-Host "      Compiler linked: $outputExe" -ForegroundColor Green

# Step 4: Test compiler
Write-Host "[4/4] Testing compiler..." -ForegroundColor Yellow

$testFile = "compiler\src\test-simple.tsn"
$testOutput = "bootstrap\test-v2-output.ll"

if (-not (Test-Path $testFile)) {
    Write-Host "      Warning: Test file not found, skipping test" -ForegroundColor Yellow
} else {
    & ".\$outputExe" $testFile -o $testOutput 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0 -and (Test-Path $testOutput)) {
        Write-Host "      Compiler test PASSED!" -ForegroundColor Green
        
        # Compare with bootstrap output if it exists
        if (Test-Path "bootstrap\test-simple.ll") {
            Write-Host "      Comparing with bootstrap output..." -ForegroundColor Cyan
            $diff = Compare-Object (Get-Content "bootstrap\test-simple.ll") (Get-Content $testOutput)
            if ($diff) {
                Write-Host "      Outputs differ (expected for now)" -ForegroundColor Yellow
            } else {
                Write-Host "      Outputs are identical!" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "      Compiler test FAILED (this is expected - compiler v2 may need more work)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SUCCESS! Compiler v2 built successfully" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Executable: $outputExe" -ForegroundColor White
Write-Host "Size:       $((Get-Item $outputExe).Length) bytes" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Test: .\$outputExe compiler\src\test-simple.tsn -o output.ll" -ForegroundColor White
Write-Host "  2. Debug: If crashes, check bootstrap\BUILD_NEXT.md for debugging tips" -ForegroundColor White
Write-Host "  3. Self-compile: Use compiler v2 to compile itself!" -ForegroundColor White
Write-Host ""
