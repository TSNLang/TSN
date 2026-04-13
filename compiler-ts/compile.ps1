# Simple TSN compiler script
param([string]$file)

if (-not $file) {
    Write-Host "Usage: .\compile.ps1 <file.tsn>"
    exit 1
}

$ll = $file -replace '\.tsn$', '.ll'
$exe = $file -replace '\.tsn$', '.exe'

Write-Host "🔨 Compiling $file..." -ForegroundColor Cyan
deno run --allow-read --allow-write src/main.ts $file -o $ll

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n🔧 Creating executable..." -ForegroundColor Cyan
    clang $ll -o $exe 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Success! Running..." -ForegroundColor Green
        Write-Host ""
        & ".\$exe"
        Write-Host "`nExit code: $LASTEXITCODE"
    }
}
