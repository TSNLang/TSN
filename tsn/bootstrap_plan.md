# TSN Self-Hosting Bootstrap Plan

## Chiến lược
Self-host ngay từ bây giờ, thêm tính năng vào C++ compiler khi cần.

## Tính năng cần thiết tối thiểu

### Phase 1: Lexer (DONE ✓)
- [x] Character classification functions
- [x] Basic tokenization
- [x] Keyword recognition
- [x] Working lexer_simple.tsn

### Phase 2: Essential Features (IN PROGRESS)
- [ ] **Fixed-size arrays**: `let tokens: i32[100];`
- [ ] **Array indexing for write**: `tokens[i] = value;`
- [ ] **Struct member access**: `token.kind`, `token.start`
- [ ] **String comparison**: So sánh keywords (có thể dùng manual byte comparison)

### Phase 3: Parser
- [ ] Parse functions
- [ ] Parse statements (let, return, if, while)
- [ ] Parse expressions
- [ ] Build simple AST (có thể dùng arrays thay vì dynamic structures)

### Phase 4: Code Generator
- [ ] Generate LLVM IR as string
- [ ] Write to file using FFI
- [ ] Basic function generation
- [ ] Basic statement generation

### Phase 5: Integration
- [ ] Main compiler driver
- [ ] File I/O
- [ ] Command-line arguments
- [ ] Bootstrap: compile TSN compiler with itself

## Simplified Approach

Thay vì implement đầy đủ dynamic arrays và memory management, ta sẽ:

1. **Fixed-size arrays**: `let tokens: i32[1000];` - đủ cho hầu hết files
2. **Manual memory**: Không cần ARC/GC, chỉ dùng stack arrays
3. **Simple strings**: Dùng `ptr<i8>` và manual comparison
4. **Flat AST**: Dùng parallel arrays thay vì tree structures

## Current Status

✅ Lexer works
✅ C++ compiler can compile TSN code
🔄 Need: arrays, struct access
⏳ Next: Implement fixed-size arrays in C++ compiler

## Example Target Code

```typescript
// This should compile with TSN
interface Token {
    kind: i32;
    start: i32;
    len: i32;
}

function lex(src: ptr<i8>, len: i32): i32 {
    let tokens: Token[100];  // Fixed-size array
    let count = 0;
    
    // ... lexing logic ...
    
    tokens[count].kind = 1;
    tokens[count].start = 0;
    count = count + 1;
    
    return count;
}
```
