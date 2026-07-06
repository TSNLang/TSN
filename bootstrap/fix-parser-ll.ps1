# Fix parser.ll to add factory function declarations
$parserFile = "bootstrap\parser.ll"
$content = Get-Content $parserFile -Raw

# Find the position after the runtime declarations
$insertAfter = "declare i32 @tsn_string_length(ptr)"

# Declarations to add
$declarations = @"

; Factory function declarations (from ast.tsn)
declare ptr @BinaryExpr(ptr, ptr, ptr)
declare ptr @NumberLiteral(i32)
declare ptr @Identifier(ptr)
declare ptr @ReturnStmt(ptr)
declare ptr @ExprStmt(ptr)
declare ptr @VarDeclStmt(ptr, ptr, ptr)
declare ptr @CallExpr(ptr)
"@

# Insert declarations if not already there
if ($content -notmatch "@BinaryExpr") {
    $content = $content -replace "($insertAfter)", "`$1$declarations"
    Set-Content $parserFile $content -NoNewline
    Write-Host "Added factory function declarations to parser.ll"
} else {
    Write-Host "Declarations already present in parser.ll"
}
