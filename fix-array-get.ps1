# Script to fix missing variable definitions before Array_get_impl calls
# Pattern: Find "call ptr @Array_get_impl(ptr %X, i32 %Y)" where %Y is undefined
# Solution: Add "%Y = load i32, ptr %var, align 4" before the call

$files = @(
    "self-hosting\mir-builder-flat_ts.ll",
    "self-hosting\mir-codegen-flat_ts.ll"
)

foreach ($file in $files) {
    Write-Host "Processing $file..."
    
    $content = Get-Content $file -Raw
    $lines = Get-Content $file
    
    # Find all lines with Array_get_impl calls
    $lineNum = 0
    $modified = $false
    $newLines = @()
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        $newLines += $line
        
        # Check if this line has Array_get_impl call
        if ($line -match 'call ptr @Array_get_impl\(ptr (%\d+), i32 (%\d+)\)') {
            $ptrVar = $matches[1]
            $indexVar = $matches[2]
            
            # Check if indexVar is defined in previous 20 lines
            $isDefined = $false
            $startCheck = [Math]::Max(0, $i - 20)
            for ($j = $startCheck; $j -lt $i; $j++) {
                if ($lines[$j] -match "^\s*$indexVar\s*=") {
                    $isDefined = $true
                    break
                }
            }
            
            if (-not $isDefined) {
                # Try to find the variable name by looking at while loop context
                # Look backward for "load i32, ptr %varname" pattern
                for ($j = $i - 1; $j -ge [Math]::Max(0, $i - 30); $j--) {
                    if ($lines[$j] -match 'load i32, ptr (%\w+), align 4') {
                        $varName = $matches[1]
                        # Insert load instruction before the call
                        $indent = "    "
                        $loadLine = "$indent$indexVar = load i32, ptr $varName, align 4"
                        # Insert before current line
                        $newLines[$newLines.Count - 1] = $loadLine
                        $newLines += $line
                        $modified = $true
                        Write-Host "  Fixed $indexVar at line $($i+1) using $varName"
                        break
                    }
                }
            }
        }
    }
    
    if ($modified) {
        $newLines | Set-Content $file
        Write-Host "  File updated!"
    } else {
        Write-Host "  No changes needed."
    }
}

Write-Host "Done!"
