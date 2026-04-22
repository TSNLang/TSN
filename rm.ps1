# Danh sách các đuôi file cần xóa
$extensions = "*.ll", "*.exe", "*.txt", "*.tsn", "*.log", "*.c", "*.ts", "*.meta", "test*", "*.obj"

Write-Host "Đang dọn dẹp thư mục dự án..." -ForegroundColor Cyan

# Thực hiện xóa các file
Remove-Item -Path $extensions -ErrorAction SilentlyContinue

Write-Host "Đã dọn dẹp xong!" -ForegroundColor Green