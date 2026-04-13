# TSN Compiler v3.0 - Written in TSN

Đây là TSN compiler được viết hoàn toàn bằng TSN, không phụ thuộc vào C++.

## Kiến trúc

```
src/
├── Types.tsn      - Type definitions và constants
├── Lexer.tsn      - Lexical analyzer (tokenizer)
├── Parser.tsn     - Syntax analyzer (AST builder)
├── Codegen.tsn    - LLVM IR code generator
├── Main.tsn       - Entry point với file I/O
└── Compiler.tsn   - All-in-one version (dễ compile)
```

## Trạng thái hiện tại

### ✅ Đã hoàn thành:
- Kiến trúc modular với 5 modules riêng biệt
- Type definitions đầy đủ (Token, ASTNode, constants)
- Lexer cơ bản (tokenization)
- Parser cơ bản (AST generation)
- Codegen skeleton (LLVM IR generation)
- Main entry point với FFI cho file I/O

### 🚧 Đang phát triển:
- Lexer: Cần thêm keyword matching
- Parser: Cần implement đầy đủ expressions và statements
- Codegen: Cần implement đầy đủ code generation
- String handling: Cần xử lý string literals và operations

### 📋 Kế hoạch tiếp theo:
1. Hoàn thiện Lexer với keyword matching
2. Hoàn thiện Parser với full expression parsing
3. Hoàn thiện Codegen với complete LLVM IR generation
4. Test với simple programs
5. Self-host: TSN compiler compile chính nó!

## Compile

### Bước 1: Compile bằng TypeScript compiler
```bash
deno run --allow-read --allow-write compiler-ts/src/main.ts src/Compiler.tsn src/Compiler.ll
```

### Bước 2: Compile LLVM IR thành executable
```bash
clang src/Compiler.ll -o src/compiler_v1.exe
```

### Bước 3: Run
```bash
./src/compiler_v1.exe
```

## Ưu điểm của kiến trúc mới

1. **Không phụ thuộc C++**: Hoàn toàn viết bằng TSN
2. **Modular**: Dễ maintain và extend
3. **Self-hosting ready**: Sẵn sàng để tự compile
4. **Clean code**: Không có legacy code từ C++
5. **Incremental development**: Có thể phát triển từng module

## So sánh với bootstrap compiler

| Feature | Bootstrap Compiler | TSN Compiler v3.0 |
|---------|-------------------|-------------------|
| Language | TSN | TSN |
| Architecture | Monolithic | Modular |
| Lines of code | ~1063 | ~500 (growing) |
| Maintainability | Medium | High |
| Extensibility | Low | High |
| Self-hosting | ✅ Yes | 🚧 In progress |

## Mục tiêu cuối cùng

Tạo một TSN compiler hoàn chỉnh, viết bằng TSN, có thể:
1. Compile chính nó (self-hosting)
2. Compile bất kỳ TSN program nào
3. Generate optimized LLVM IR
4. Hỗ trợ đầy đủ TSN features
5. Có error reporting tốt
6. Có documentation đầy đủ

## Đóng góp

Compiler này đang được phát triển tích cực. Mỗi module có thể được improve độc lập.

---

**Status**: 🚧 Work in Progress  
**Version**: 3.0.0-alpha  
**Last Updated**: 2026-04-13
