# TSN Compiler v2 - Clean Rewrite

Đây là phiên bản **viết lại từ đầu** với kiến trúc đơn giản, sạch sẽ.

## Mục tiêu

1. **Đơn giản hóa**: Loại bỏ abstraction không cần thiết
2. **Dễ debug**: Code path rõ ràng, ngắn gọn
3. **Tự host được**: Compiler có thể compile chính nó
4. **Không có bug array index**: Fix từ thiết kế

## Cấu trúc

```
compiler/
├── src/
│   ├── lexer.tsn          # Tokenizer
│   ├── parser.tsn         # Recursive descent parser
│   ├── ast.tsn            # AST definitions
│   ├── mir.tsn            # Medium IR definitions
│   ├── mir_builder.tsn    # AST → MIR
│   ├── codegen.tsn        # MIR → LLVM IR
│   └── main.tsn           # Compiler entry point
└── build/
    └── (generated LLVM IR)
```

## Nguyên tắc thiết kế

### 1. Keep It Simple
- Mỗi function chỉ làm MỘT việc
- Không có deep nesting
- Tên biến rõ ràng, có ý nghĩa

### 2. Explicit Over Implicit
- Không dùng register caching
- Mỗi lần cần value → load mới
- Rõ ràng hơn là clever

### 3. Test-Driven
- Test mỗi module riêng lẻ
- Regression tests cho mọi bug
- Examples làm integration tests

## Phase 1: Minimal Compiler

**Mục tiêu**: Compile được function đơn giản

```typescript
function add(a: i32, b: i32): i32 {
    return a + b;
}
```

**Features**:
- ✅ Lexer: keywords, identifiers, numbers, operators
- ✅ Parser: function declarations, expressions, statements
- ✅ AST: minimal nodes
- ✅ MIR Builder: function → MIR
- ✅ Codegen: MIR → LLVM IR

**Không support**:
- ❌ Classes
- ❌ Loops
- ❌ Imports
- ❌ Generics

## Phase 2: Add Control Flow

```typescript
function max(a: i32, b: i32): i32 {
    if (a > b) {
        return a;
    } else {
        return b;
    }
}
```

## Phase 3: Add Loops

```typescript
function sum(n: i32): i32 {
    let result: i32 = 0;
    let i: i32 = 0;
    while (i < n) {
        result = result + i;
        i = i + 1;
    }
    return result;
}
```

## Phase 4: Add Classes

```typescript
class Point {
    x: i32;
    y: i32;
    
    constructor(x: i32, y: i32) {
        this.x = x;
        this.y = y;
    }
}
```

## Phase 5: Self-hosting

Compile compiler chính nó!

## So sánh với version cũ

| Feature | Old | New |
|---------|-----|-----|
| Files | 70+ .ll files | Clean build/ dir |
| Complexity | High nesting | Flat, simple |
| Debuggability | Hard | Easy |
| Array bug | Yes | Fixed by design |
| Code size | ~3000 lines/file | ~500 lines/file |

## Build

```powershell
# Build script sẽ được tạo sau
.\build-compiler-v2.ps1
```
