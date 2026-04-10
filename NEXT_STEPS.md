# TSN Self-Hosting - Next Steps

## Current Status (Week 1-2)
✅ Lexer hoàn thành (mini_compiler_v2.tsn)
✅ FFI hoạt động (test_ffi_simple.tsn)
✅ String operations hoạt động
⚠️ File I/O gặp vấn đề với nhiều FFI declarations

## Chiến lược tiếp theo: PARSER FIRST

### Tại sao Parser trước, File I/O sau?

1. **Parser là core logic** - Đây là trái tim của compiler
2. **Test dễ hơn** - Có thể test với hardcoded strings
3. **Không phụ thuộc File I/O** - Parser chỉ cần string input
4. **Incremental development** - Từng bước một, dễ debug

### Roadmap chi tiết:

#### Phase 1: Expression Parser (2-3 days)
```tsn
// Cần parse được:
42                    // Number literal
x                     // Identifier  
x + y                 // Binary expression
x + y * z             // Precedence
foo()                 // Function call
foo(a, b)             // Call with args
```

**File: `tsn/expr_parser.tsn`**
- Parse primary expressions (numbers, identifiers)
- Parse binary operators với precedence
- Parse function calls
- Test với hardcoded token arrays

#### Phase 2: Statement Parser (2-3 days)
```tsn
// Cần parse được:
let x = 42;           // Variable declaration
x = 100;              // Assignment
return x;             // Return statement
if (x > 0) { ... }    // If statement
while (x < 10) { ... } // While loop
```

**File: `tsn/stmt_parser.tsn`**
- Parse declarations
- Parse assignments
- Parse control flow
- Build AST nodes

#### Phase 3: Function Parser (1-2 days)
```tsn
// Cần parse được:
function add(a: i32, b: i32): i32 {
    return a + b;
}
```

**File: `tsn/func_parser.tsn`**
- Parse function signatures
- Parse parameter lists
- Parse return types
- Parse function bodies

#### Phase 4: Integration (1 day)
**File: `tsn/mini_compiler_v4.tsn`**
```tsn
function compile(source: ptr<i8>): void {
    // Lexer (đã có)
    let tokens = lex(source);
    
    // Parser (mới)
    let ast = parse(tokens);
    
    // Codegen (đã có từ v2)
    let ir = codegen(ast, source);
    
    // Output to console (chưa cần file)
    console.log(ir);
}
```

#### Phase 5: File I/O (sau khi parser xong)
- Đơn giản hóa: chỉ dùng 2 FFI functions
- Hoặc: output ra stdout, dùng shell redirect
- Hoặc: viết wrapper C++ nhỏ cho file I/O

### Tại sao approach này tốt hơn?

1. **Testable**: Mỗi phase có thể test độc lập
2. **Incremental**: Từng bước nhỏ, dễ debug
3. **No blockers**: Không bị block bởi File I/O issues
4. **Clear progress**: Thấy rõ tiến độ từng ngày

### Test Strategy

```tsn
// Test expression parser
let test1 = "42";
let tokens1 = lex(test1);
let ast1 = parse_expr(tokens1);
// Verify AST structure

// Test statement parser  
let test2 = "let x = 42;";
let tokens2 = lex(test2);
let ast2 = parse_stmt(tokens2);
// Verify AST structure

// Test function parser
let test3 = "function add(a: i32): i32 { return a; }";
let tokens3 = lex(test3);
let ast3 = parse_func(tokens3);
// Verify AST structure
```

## Timeline

**Week 2 (Current):**
- Day 1-2: Expression parser
- Day 3-4: Statement parser  
- Day 5: Function parser
- Day 6-7: Integration + testing

**Week 3:**
- Day 1-2: LLVM IR generator improvements
- Day 3-4: File I/O (simplified approach)
- Day 5-7: Bootstrap testing

## Success Metrics

### Week 2 End Goal:
```tsn
// mini_compiler_v4.tsn có thể compile:
function answer(): i32 {
    let x = 40;
    let y = 2;
    return x + y;
}
```

### Week 3 End Goal:
```bash
# Self-hosting achieved!
tsnc_cpp tsn/compiler.tsn -o tsnc_v1.exe
tsnc_v1.exe tsn/compiler.tsn -o tsnc_v2.exe
# tsnc_v1 và tsnc_v2 produce identical output
```

## Next Immediate Action

**START HERE:**
1. Create `tsn/expr_parser.tsn`
2. Implement `parse_primary()` - parse numbers and identifiers
3. Implement `parse_binary()` - parse x + y
4. Test with hardcoded token arrays
5. Iterate until expressions work

**Command to start:**
```bash
# Create new file
touch tsn/expr_parser.tsn

# Start with simple structure
import * as console from "std:console";

function parse_primary(tokens: ptr<i32>, pos: ptr<i32>): i32 {
    // TODO: implement
    return 0;
}

function main(): void {
    console.log("Expression parser test");
}
```

---

**Kết luận:** Tập trung vào Parser trước, File I/O sau. Parser là core logic và có thể test độc lập. File I/O chỉ là I/O wrapper, có thể giải quyết sau.

**Ready to start? Let's build the parser! 🚀**
