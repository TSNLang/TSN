# TSN Compiler - TypeScript Implementation

Compiler TSN được viết bằng TypeScript và dùng **Node standard APIs** để có thể chạy trên nhiều runtime tương thích như **Node**, **Bun**, và **Deno**.

## Mục tiêu

- Compiler đơn giản, dễ hiểu, dễ maintain
- Ưu tiên TypeScript compatibility và clean architecture
- Generate LLVM IR từ TSN source code
- Trì hoãn self-hosting cho tới khi compiler đủ mature

## Cấu trúc

```text
src/
├── src/
│   ├── lexer.ts           # Tokenizer
│   ├── parser.ts          # AST parser
│   ├── codegen.ts         # LLVM IR generator
│   ├── module-resolver.ts # Module metadata loader/resolver
│   ├── types.ts           # Type definitions
│   └── main.ts            # CLI entry point
├── concat-modules.ts      # Helper for concatenating TSN modules
├── deno.json              # Optional Deno convenience tasks
├── package.json
├── tsconfig.json
├── tsn_runtime.c
└── README.md
```

## Runtime policy

Compiler không nên phụ thuộc vào Deno-specific hay Bun-specific APIs.

Nguyên tắc hiện tại:

- dùng `node:*` standard modules khi cần file system, path, hoặc process APIs
- giữ CLI chạy được trên mọi runtime hỗ trợ Node compatibility
- xem `deno.json` như convenience config, không phải canonical runtime definition

## Sử dụng

### Node

```bash
node src/main.ts input.tsn output.ll
```

### Bun

```bash
bun src/main.ts input.tsn output.ll
```

### Deno

```bash
deno run --allow-read --allow-write --allow-run src/main.ts input.tsn output.ll
```

### Dùng npm-style scripts

```bash
npm run compile:node -- input.tsn output.ll
```

```bash
npm run compile:bun -- input.tsn output.ll
```

```bash
npm run compile:deno -- input.tsn output.ll
```

## Features

### ✅ Đã có

- Lexer: tokenize source code
- Parser: build AST
- Codegen: generate LLVM IR
- Basic types: `i8`, `i16`, `i32`, `i64`, `u8`, `u16`, `u32`, `u64`, `bool`, `void`
- Pointer types: `ptr<T>`
- Array types: `T[N]`
- Struct-like types: `interface`
- Control flow: `if`, `else`, `while`, `for`, `break`, `continue`
- Operators: arithmetic, comparison, logical
- Literals: numbers, strings, booleans, null
- Addressof: `addressof(variable)`
- FFI declarations và `declare function`
- Decorator `@target_os(...)` cho function-level conditional compilation
- Hỗ trợ một hoặc nhiều giá trị: `@target_os("windows")`, `@target_os("windows", "linux")`
- Giá trị hợp lệ: `windows`, `linux`, `macos`, `bsd`, `android`, `posix`
- `posix` hoạt động như target nhóm cho `linux`, `macos`, `bsd`, `android`
- `std:console` trên Windows đã được chuyển sang TSN stdlib thật tại [src/std/console.tsn](std/console.tsn)
- `console.log(...)` và `console.warn(...)` ghi ra stdout qua Win32 console APIs
- `console.error(...)` ghi ra stderr qua Win32 console APIs

### 🚧 Đang phát triển

- TypeScript compatibility coverage rộng hơn
- Module system hoàn thiện hơn
- Diagnostics tốt hơn
- TSN-specific extensions rõ ràng hơn

## Example

```typescript
interface ASTNode {
    kind: i32;
    value: i32;
}

function test(): i32 {
    let nodes: ASTNode[3];
    let idx: i32 = 0;

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
node src/main.ts input.tsn output.ll
clang output.ll -o program.exe
./program.exe
```

## Development notes

- Canonical compiler source nằm trong `src/`
- Khi sửa compiler behavior, ưu tiên giữ code portable giữa Node, Bun, và Deno
- Tránh re-introduce runtime-specific APIs nếu có lựa chọn `node:*` tương đương
- Nếu thêm docs hay scripts mới, mô tả Deno như optional runtime chứ không phải runtime mặc định

## Roadmap

1. Mở rộng TypeScript compatibility
2. Ổn định LLVM IR generation
3. Hoàn thiện module/import workflow
4. Cải thiện diagnostics
5. Quay lại self-hosting ở giai đoạn phù hợp hơn

## License

MIT
