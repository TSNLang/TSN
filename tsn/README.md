# TSN Self-Hosting Compiler

Đây là TSN compiler được viết bằng chính TSN, nhằm mục tiêu self-hosting.

## Cấu trúc

- `ast.tsn` - AST node definitions và constants
- `lexer.tsn` - Tokenizer (đang phát triển)
- `lexer_simple.tsn` - Lexer đơn giản (hoạt động ✓)
- `parser_v2.tsn` - Parser v2 (đang phát triển)
- `parser_debug.tsn` - Parser debug version (hoạt động ✓)
- `mini_compiler.tsn` - Mini compiler (hoạt động ✓)
- `token_buffer.tsn` - Token storage (TODO: cần arrays)
- `bootstrap_plan.md` - Kế hoạch chi tiết

## Trạng thái hiện tại

✅ **Lexer hoạt động**
- Character classification
- Token recognition
- Keyword detection

✅ **Parser cơ bản hoạt động**
- Function counting
- Keyword matching
- Simple parsing logic

✅ **Mini compiler hoạt động**
- Parse TSN code
- Count functions
- Basic compilation flow

🔄 **Đang cần từ C++ compiler:**
- Fixed-size arrays: `let arr: i32[100];`
- Struct member access: `token.kind` (đã có parsing, cần codegen)
- Array element assignment: `arr[i] = value;`

## Milestone đạt được

🎉 **TSN compiler đầu tiên viết bằng TSN đã chạy được!**

Đây là bước quan trọng trong hành trình self-hosting. Mặc dù còn đơn giản, nhưng đã chứng minh:
1. TSN có thể compile code TSN
2. Lexer và parser cơ bản hoạt động
3. Có thể phát triển tiếp bằng TSN

## Chạy

```bash
# Compile mini compiler
build\Release\tsnc.exe tsn\mini_compiler.tsn --emit=exe -o build\mini_compiler.exe

# Run
build\mini_compiler.exe
```

Output:
```
TSN Mini Compiler v0.1
Compilation successful
Compiler test PASSED
```

## Bước tiếp theo

1. Thêm fixed-size arrays vào C++ compiler
2. Hoàn thiện struct member access codegen
3. Implement full parser với AST
4. Implement LLVM IR codegen
5. Bootstrap: compile TSN compiler bằng chính nó
