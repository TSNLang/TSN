# TSN Compiler Transition - C++ to TypeScript

## Lý do chuyển đổi

Việc triển khai compiler bằng C++ gặp nhiều vấn đề phức tạp:

1. **Bug khó debug**: Vấn đề với array element member assignment (`nodes[i].kind = value`) không được emit đúng
2. **Code phức tạp**: Quản lý memory, pointer, LLVM API phức tạp
3. **Phát triển chậm**: Mỗi thay đổi cần compile lại C++
4. **Khó maintain**: Code C++ dài và khó theo dõi

## Chiến lược mới: TypeScript + Bun

### Lợi ích

- **Đơn giản hơn nhiều**: Không cần quản lý memory, pointer
- **Debug dễ dàng**: Console.log bất cứ lúc nào
- **Phát triển nhanh**: Không cần compile, chỉ cần `bun run`
- **Giữ nguyên logic**: Port trực tiếp từ `bootstrap_compiler.tsn`
- **Self-host dễ**: Sau khi TS compiler hoạt động, compile chính nó

### Kế hoạch thực hiện

#### Phase 1: TypeScript Compiler (1-2 ngày)
- [x] Setup project structure
- [ ] Implement Lexer (port từ bootstrap_compiler.tsn)
- [ ] Implement Parser (port từ bootstrap_compiler.tsn)
- [ ] Implement Codegen (generate LLVM IR text)
- [ ] Test với examples/

#### Phase 2: Self-hosting (1 ngày)
- [ ] Compile bootstrap_compiler.tsn bằng TS compiler
- [ ] Verify LLVM IR output
- [ ] Test executable
- [ ] Đạt được self-hosting!

#### Phase 3: Optimization (optional)
- [ ] Thêm type checking
- [ ] Thêm optimization passes
- [ ] Improve error messages

## Cấu trúc dự án mới

```
TSN/
├── compiler-ts/          # NEW: TypeScript compiler
│   ├── src/
│   │   ├── lexer.ts
│   │   ├── parser.ts
│   │   ├── codegen.ts
│   │   ├── types.ts
│   │   └── main.ts
│   ├── package.json
│   └── tsconfig.json
├── src/                  # OLD: C++ compiler (giữ lại để tham khảo)
│   ├── main.cpp
│   ├── Lexer.tsn
│   ├── Parser.tsn
│   └── Codegen.tsn
├── examples/             # Test cases
├── std/                  # Standard library
├── bootstrap_compiler.tsn # Bootstrap compiler (TSN)
└── archive/              # Old files
```

## Timeline

- **Ngày 1**: Setup + Lexer + Parser
- **Ngày 2**: Codegen + Testing
- **Ngày 3**: Self-hosting achieved! 🎉

## Notes

- C++ compiler vẫn giữ lại trong `src/` để tham khảo
- Bootstrap compiler (`bootstrap_compiler.tsn`) là nguồn logic chính
- TypeScript compiler sẽ đơn giản hơn nhiều vì chỉ cần generate text (LLVM IR)
