# Danh sách các đuôi file cần xóa
$extensions = "*.ll", "*.exe", "*.txt", "*.tsn", "*.log", "*.c", "*.ts", "*.meta", "test*", "*.obj"

Write-Host "Đang dọn dẹp thư mục dự án..." -ForegroundColor Cyan

# 1. Lấy danh sách tất cả các file khớp với định dạng
$filesToDelete = Get-ChildItem -Path . -Include $extensions -Recurse

# 2. Lọc bỏ các file không muốn xóa
$filteredFiles = $filesToDelete | Where-Object {
    # Điều kiện 1: Không xóa file bắt đầu bằng .git hoặc git
    $isGitFile = $_.Name -like ".git*" -or $_.Name -like "git*"
    
    # Điều kiện 2: Nếu là file *.tsn VÀ nằm trong thư mục "examples" thì bỏ qua
    $isTsnInExamples = $_.Extension -eq ".tsn" -and $_.FullName -like "*\examples\*"

    # Chỉ giữ lại những file KHÔNG vi phạm 2 điều kiện trên
    return (-not $isGitFile) -and (-not $isTsnInExamples)
}

# 3. Thực hiện xóa
$filteredFiles | Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "Đã dọn dẹp xong!" -ForegroundColor Green