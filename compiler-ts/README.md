# TSN Compiler - TypeScript Implementation

Compiler TSN được viết bằng TypeScript, chạy trên **Deno runtime** (nhanh hơn Bun trên Windows).

## Mục tiêu

- Compiler đơn giản, dễ hiểu, dễ maintain
- Nhanh chóng đạt được self-hosting
- Generate LLVM IR từ TSN source code

## Cấu trúc

```
compiler-ts/
├── src/
│   ├── lexer.ts      # Tokenizer
│   ├── parser.ts     # AST Parser
│   ├── codegen.ts    # LLVM IR Generator
│   ├── types.ts      # Type definitions
│   └── main.ts       # Entry point
├── deno.json         # Deno configuration
└── README.md
```

## Cài đặt

```bash
# Cài đặt Deno (nếu chưa có)
# Windows: irm https://deno.land/install.ps1 | iex
# Linux/Mac: curl -fsSL https://deno.land/install.sh | sh
```

## Sử dụng

```bash
# Compile file TSN
deno run --allow-read --allow-write src/main.ts input.tsn -o output.ll

# Hoặc dùng task
deno task compile input.tsn -o output.ll

# Development mode (auto-reload)
deno task dev input.tsn
```

## Features

### ✅ Đã hoàn thành

- [x] **Lexer**: Tokenize source code
- [x] **Parser**: Build AST với đầy đủ cấu trúc
- [x] **Codegen**: Generate LLVM IR
- [x] **Array member assignment**: `nodes[idx].kind = 42` ✓ (Fixed bug từ C++ compiler!)
- [x] **FFI declarations**: `@ffi.lib("kernel32")` và `declare function`
- [x] **Basic types**: `i8`, `i16`, `i32`, `i64`, `u8`, `u16`, `u32`, `u64`, `bool`, `void`
- [x] **Pointer types**: `ptr<T>`
- [x] **Array types**: `T[N]`
- [x] **Struct types**: `interface`
- [x] **Control flow**: `if`, `else`, `while`, `break`, `continue`
- [x] **Operators**: Arithmetic, comparison, logical
- [x] **Literals**: Numbers, strings, booleans, null
- [x] **Addressof**: `addressof(variable)`

### 🚧 Đang phát triển

- [ ] For loops
- [ ] String helper functions (`string_length`, `string_char_at`)
- [ ] Const declarations
- [ ] Type inference

## Example

```typescript
// input.tsn
interface ASTNode {
    kind: i32;
    value: i32;
}

function test(): i32 {
    let nodes: ASTNode[3];
    let idx: i32 = 0;
    
    // Array member assignment - works perfectly!
    nodes[idx].kind = 42;
    nodes[idx].value = 100;
    
    return nodes[0].kind;
}

function main(): i32 {
    return test();
}
```

Compile và chạy:

```bash
# Compile TSN to LLVM IR
deno task compile input.tsn -o output.ll

# Compile LLVM IR to executable
clang output.ll -o program.exe

# Run
./program.exe
echo $?  # Output: 42
```

## So sánh với C++ Compiler

| Feature | C++ Compiler | TS Compiler (Deno) |
|---------|--------------|-------------------|
| Array member assignment | ❌ Bug | ✅ Hoạt động |
| Code complexity | 😰 ~3000 lines | 😊 ~700 lines |
| Debug | 😫 Khó | 😎 Dễ (console.log) |
| Development speed | 🐌 Chậm | 🚀 Nhanh |
| Performance | ⚡ Native | ⚡ V8 (rất nhanh) |
| Windows support | ⚠️ OK | ✅ Tốt hơn Bun |

## Roadmap

1. ✅ Setup project structure
2. ✅ Implement Lexer
3. ✅ Implement Parser
4. ✅ Implement Codegen
5. ✅ Fix array member assignment bug
6. ✅ Add FFI support
7. ⏳ Test với bootstrap_compiler.tsn
8. ⏳ Self-hosting achieved!

## Why Deno?

- ✅ **Nhanh hơn Bun trên Windows** (benchmark tốt hơn)
- ✅ **Built-in TypeScript** - không cần config phức tạp
- ✅ **Secure by default** - explicit permissions
- ✅ **Single executable** - dễ distribute
- ✅ **Standard library tốt** - không cần npm packages
- ✅ **Deno Deploy** - có thể host compiler online

## License

MIT
