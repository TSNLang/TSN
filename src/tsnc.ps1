# TSN Compiler wrapper script for Windows
param(
    [Parameter(Mandatory=$true)]
    [string]$InputFile,
    
    [string]$OutputFile = "",
    
    [switch]$Run,
    
    [switch]$Help
)

if ($Help) {
    Write-Host "TSN Compiler - TypeScript Implementation (Runtime Agnostic)"
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\tsnc.ps1 <input.tsn> [-OutputFile output.ll] [-Run]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -OutputFile  Output LLVM IR file (default: input.ll)"
    Write-Host "  -Run         Compile and run the program"
    Write-Host "  -Help        Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\tsnc.ps1 test.tsn"
    Write-Host "  .\tsnc.ps1 test.tsn -Run"
    exit 0
}

# Default output file
if ($OutputFile -eq "") {
    $OutputFile = $InputFile -replace '\.tsn$', '.ll'
}

# Find a suitable runtime
$Runtime = "node"
if (Get-Command "bun" -ErrorAction SilentlyContinue) {
    $Runtime = "bun"
} elseif (Get-Command "node" -ErrorAction SilentlyContinue) {
    $Runtime = "node"
} elseif (Get-Command "deno" -ErrorAction SilentlyContinue) {
    $Runtime = "deno"
}

Write-Host "🔨 Compiling $InputFile using $Runtime..." -ForegroundColor Cyan

if ($Runtime -eq "deno") {
    deno run --allow-read --allow-write --allow-run src/src/main.ts $InputFile -o $OutputFile
} elseif ($Runtime -eq "bun") {
    bun src/src/main.ts $InputFile -o $OutputFile
} else {
    # Node might need tsx or similar if running .ts directly, 
    # but we assume the environment is set up to handle it or using a loader.
    node src/src/main.ts $InputFile -o $OutputFile
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Compilation failed!" -ForegroundColor Red
    exit 1
}

if ($Run) {
    $ExeFile = $OutputFile -replace '\.ll$', '.exe'
    
    Write-Host ""
    Write-Host "🔧 Compiling LLVM IR to executable..." -ForegroundColor Cyan
    clang $OutputFile -o $ExeFile 2>&1 | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ LLVM compilation failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Executable created: $ExeFile" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Running..." -ForegroundColor Cyan
    Write-Host "----------------------------------------"
    if (Test-Path ".\$ExeFile") {
        & ".\$ExeFile"
    } else {
        & "$ExeFile"
    }
    $exitCode = $LASTEXITCODE
    Write-Host "----------------------------------------"
    Write-Host "Exit code: $exitCode" -ForegroundColor $(if ($exitCode -eq 0) { "Green" } else { "Yellow" })
}
