# Script dọn dẹp file rác và chuẩn bị cho rewrite
# Xóa tất cả generated files, giữ lại source code và runtime

Write-Host "=== TSN Cleanup Script ===" -ForegroundColor Cyan
Write-Host "Dọn dẹp file generated, giữ lại source và runtime..." -ForegroundColor Yellow
Write-Host ""

# Files cần GIỮ LẠI
$keepPatterns = @(
    # Source code TypeScript compiler
    "src/src/*.ts",
    "src/tsconfig.json",
    "src/package.json",
    
    # Runtime (working, keep it!)
    "src/tsn_runtime.c",
    "src/tsn_runtime_stubs.c",
    "src/tsn_runtime_stubs.ll",
    "src/tsn_runtime_stubs_linking.ll",
    "src/tsn_runtime_stubs_minimal.ll",
    "src/windows_api_stubs.ll",
    "src/main_wrapper*.c",
    "src/tsn_main_wrapper.c",
    
    # Standard library (pre-compiled, working)
    "src/std/*.tsn",
    "src/std/*.ll",
    "src/std/*.meta",
    
    # Examples
    "examples/*.tsn",
    
    # Old self-hosting (will move to backup)
    "self-hosting/*.tsn",
    "self-hosting/*.js",
    
    # Documentation
    "docs/**",
    "*.md",
    
    # Build scripts
    "*.ps1",
    "*.sh",
    
    # Git
    ".git/**",
    ".gitignore",
    "gitattributes.txt",
    
    # Resources
    "resources/**",
    
    # Config
    "*.json"
)

# Xóa TẤT CẢ .ll files trong self-hosting (quá nhiều duplicate)
Write-Host "Xóa tất cả .ll files trong self-hosting/..." -ForegroundColor Yellow
Get-ChildItem -Path "self-hosting" -Filter "*.ll" | Remove-Item -Force
Get-ChildItem -Path "self-hosting" -Filter "*.meta" | Remove-Item -Force

# Xóa executables
Write-Host "Xóa executables..." -ForegroundColor Yellow
Get-ChildItem -Path "." -Filter "*.exe" -Recurse | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path "self-hosting" -Filter "*.exe" | Remove-Item -Force -ErrorAction SilentlyContinue

# Xóa test files
Write-Host "Xóa test files..." -ForegroundColor Yellow
Get-ChildItem -Path "." -Filter "test*.tsn" | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path "." -Filter "test*.ll" | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path "." -Filter "test*.exe" | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path "." -Filter "output.ll" | Remove-Item -Force -ErrorAction SilentlyContinue

# Xóa temp/debug files
Write-Host "Xóa temp files..." -ForegroundColor Yellow
Get-ChildItem -Path "." -Filter "*.log" -Recurse | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path "." -Filter "*.tmp" -Recurse | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path "." -Filter "*.bak" -Recurse | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path "." -Filter "codegen_debug.txt" -Recurse | Remove-Item -Force -ErrorAction SilentlyContinue

# Xóa Python scripts cũ (không cần nữa)
Write-Host "Xóa Python fix scripts..." -ForegroundColor Yellow
Remove-Item -Path "fix_*.py" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "patch-*.ps1" -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== Cleanup Complete ===" -ForegroundColor Green
Write-Host "Đã xóa:" -ForegroundColor Green
Write-Host "  - Tất cả .ll files trong self-hosting/" -ForegroundColor Gray
Write-Host "  - Tất cả executables" -ForegroundColor Gray
Write-Host "  - Test files" -ForegroundColor Gray
Write-Host "  - Temp/log files" -ForegroundColor Gray
Write-Host ""
Write-Host "Đã GIỮ LẠI:" -ForegroundColor Green
Write-Host "  ✓ Runtime C code (src/tsn_runtime*.c)" -ForegroundColor Gray
Write-Host "  ✓ Standard library (src/std/*.tsn, *.ll)" -ForegroundColor Gray
Write-Host "  ✓ TypeScript compiler (src/src/*.ts)" -ForegroundColor Gray
Write-Host "  ✓ TSN source files (self-hosting/*.tsn)" -ForegroundColor Gray
Write-Host "  ✓ Examples (examples/*.tsn)" -ForegroundColor Gray
Write-Host "  ✓ Documentation (docs/, *.md)" -ForegroundColor Gray
Write-Host ""
Write-Host "Sẵn sàng để viết lại compiler!" -ForegroundColor Cyan