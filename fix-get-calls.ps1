# Fix all Array_get_impl calls with undefined index variables
# Strategy: Find patterns like "while.body.XX:" followed by load ptr, then Array_get_impl
# Insert a load i32 instruction between them

$files = @(
    "self-hosting\mir-builder-flat_ts.ll",
    "self-hosting\mir-codegen-flat_ts.ll"
)

foreach ($file in $files) {
    Write-Host "Processing $file..."
    $content = Get-Content $file -Raw
    
    # Pattern: while.body or other label, then load ptr, then Array_get_impl with undefined var
    # We need to insert "    %XXX = load i32, ptr %i, align 4" before the Array_get_impl call
    
    # Match pattern: (label)\n    (%ptr) = load ptr...\n    %result = call ptr @Array_get_impl(ptr %ptr, i32 %undefined)
    # Replace with: (label)\n    (%ptr) = load ptr...\n    %undefined = load i32, ptr %i, align 4\n    %result = call ptr @Array_get_impl(ptr %ptr, i32 %undefined)
    
    $pattern = '(while\.body\.\d+:)\s+(\s+(%\d+) = load ptr, ptr %this\.addr, align 8)\s+(\s+(%\d+) = call ptr @Array_get_impl\(ptr \3, i32 (%\d+)\))'
    
    $replacement = '$1$2$4    $6 = load i32, ptr %i, align 4$4$5'
    
    $newContent = $content -replace $pattern, $replacement
    
    if ($newContent -ne $content) {
        $newContent | Set-Content $file -NoNewline
        Write-Host "  Fixed!"
    } else {
        Write-Host "  No matches found with pattern."
    }
}
