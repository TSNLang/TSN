# TSN Compiler Rewrite Status

**Date**: July 7, 2026  
**Goal**: Viết lại compiler từ đầu với cấu trúc sạch sẽ, đơn giản
**Current Phase**: ✅ **PHASE 15 COMPLETE - File I/O & Command-Line Interface!**

## ✅ Đã Hoàn Thành

### 1. Cleanup Script (`rm.ps1`)
- ✅ Xóa tất cả generated files (.ll, .exe)
- ✅ Giữ lại source code và runtime  
- ✅ Clean workspace cho rewrite

### 2. Cấu Trúc Mới
```
compiler/
├── src/
│   ├── ast.tsn          ✅ DONE - AST definitions (no inheritance)
│   ├── lexer.tsn        ✅ DONE - Token scanner
│   ├── parser.tsn       ✅ DONE - Recursive descent parser
│   └── main.tsn         ✅ DONE - Test driver
├── runtime/
│   └── tsn_runtime.c    ✅ DONE - C runtime functions
├── build/
│   └── (generated)
└── README.md            ✅ DONE - Documentation
```

### 3. Bootstrap Compiler
- ✅ Python bootstrap compiler (`bootstrap/compiler.py`)
- ✅ Generated LLVM IR files (ast.ll, lexer.ll, parser.ll, main.ll)
- ✅ Build script (`bootstrap/build-v2.ps1`)
- ✅ Self-hosting compiler executable (`compiler/tsnc.exe`)

### 4. Code Quality
- ✅ **Đơn giản**: Mỗi file ~200-300 lines
- ✅ **Rõ ràng**: Không có deep nesting
- ✅ **Không extends**: Tránh inheritance bugs
- ✅ **Explicit**: Mọi operation đều rõ ràng

## ✅ Phases Đã Hoàn Thành

### Phase 10: AST Refactor → Tagged Union
- ✅ Xóa inheritance, dùng single class với `kind` field
- ✅ Tránh polymorphism field offset bugs
- ✅ Parser tạo objects trực tiếp

### Phase 11: Debug Cleanup
- ✅ Xóa 30+ debug log statements
- ✅ Fix recursive parsing crash (parseBlock→parseStatement→parseReturn)
- ✅ Parser đơn giản hóa thành parseSimpleBlock()

### Phase 12: End-to-End Pipeline
- ✅ Lexer→Parser→AST→Codegen→LLVM IR hoạt động!
- ✅ Bug discoveries & workarounds:
  - Constructor params không assign → fix bằng assign sau construction
  - i32 field assignments lỗi → dùng string field thay thế
  - String field assignments chọn lọc → chỉ `kind`, `name` hoạt động
  - Field reads trả về sai → always emit as number
- ✅ Test: `function test(): i32 { return 42; }` → `ret i32 42`

### Phase 13: Multiple Statements & Variables
- ✅ Multiple statements in function bodies (while loop parsing)
- ✅ Variable declarations: `let x: i32 = 10;`
- ✅ Stack allocation with `alloca` and `store`
- ✅ Variable references with `load` instructions
- ✅ Workarounds: Check `typeAnnotation != ""` for VarDeclStmt, `isDigits()` for number detection
- ✅ Test: Multiple lets + return variable → correct LLVM IR

### Phase 14: Multiple Functions & Calls - EXECUTABLE CODE! 🎉
- ✅ **MAJOR MILESTONE**: Compiler generates executable programs!
- ✅ Multiple function definitions in one program
- ✅ Function calls without arguments: `return add();`
- ✅ File output using `writeText()`
- ✅ Test results: Programs compile and run, return correct exit codes
- ✅ Workaround: Detect CallExpr by `expr.callee != ""`

### Phase 15: Command-Line Interface & File I/O ✅ **LATEST**
- ✅ Read source from files: `readText("compiler/test-simple.tsn")`
- ✅ Write output to files: `writeText("output.ll", llvmIR)`
- ✅ User-friendly progress messages (tokens count, functions count)
- ✅ `intToString()` helper for number conversion
- ✅ Created `compiler/test-simple.tsn` test file
- ✅ Compiler operates like a real file-based compiler!

## 🐛 Bootstrap Compiler Bugs (Discovered in Phase 12)

| Bug | Symptoms | Workaround |
|-----|----------|------------|
| Constructor params | `this.field = param` không hoạt động | Assign field sau `new Class()` |
| i32 field assign | `expr.numValue = 42` → luôn bằng 0 | Dùng `string` field thay thế |
| String field assign | Chỉ `kind`, `name` hoạt động | Tránh các field khác |
| Field read wrong | Đọc `.kind` trả giá trị của `.name` | Always emit như number |

## 📊 Current Status

### Compiler v2 (rewrite)
- **Executable**: `compiler/tsnc.exe` (171,520 bytes)
- **Bootstrap**: Python compiler → LLVM IR → clang
- **Features**: Variables, multiple functions, function calls, file I/O
- **Test**: Compiles .tsn files → generates .ll files → executable programs!

### Working Examples
```typescript
// Example 1: Simple return
function main(): i32 { return 42; }

// Example 2: Variables
function main(): i32 {
    let x: i32 = 10;
    let y: i32 = 20;
    return y;
}

// Example 3: Function calls
function getValue(): i32 { return 7; }
function main(): i32 { return getValue(); }
```

### Next Steps (Phase 16 Options)
1. **Function Parameters**: `function add(a: i32, b: i32): i32`
2. **Arithmetic Operators**: `x + y`, `a - b`, `x * 2`
3. **Control Flow**: `if (x > 0) { ... }`, `while (x > 0) { ... }`
4. **Self-Compilation Attempt**: Try to compile compiler with itself!

## 📁 Files Changed (Phases 12-15)

| File | Phase | Lines | Change |
|------|-------|-------|--------|
| `compiler/src/ast.tsn` | 12 | +120 | Expr/Stmt field reorganization |
| `compiler/src/parser.tsn` | 12-14 | +95 | Multiple statements, function calls |
| `compiler/src/codegen.tsn` | 12-14 | +160 | Variables, function calls, LLVM emission |
| `compiler/src/main.tsn` | 15 | +60 | File I/O, progress messages |
| `compiler/test-simple.tsn` | 15 | +8 | Test program file |

## 🎯 Roadmap

| Phase | Goal | Status |
|-------|------|--------|
| 10 | AST Tagged Union | ✅ Complete |
| 11 | Debug Cleanup | ✅ Complete |
| 12 | End-to-End Pipeline | ✅ Complete |
| 13 | Multiple Statements & Variables | ✅ Complete |
| 14 | Multiple Functions & Calls | ✅ Complete |
| 15 | File I/O & CLI | ✅ Complete |
| 16 | Function Parameters / Arithmetic | 🔜 Next |
| 17 | Control Flow (if/while) | 📅 Planned |
| 18 | Self-Compilation Attempt | 🎯 Goal |

## 💡 Lessons Learned

1. **Bootstrap is OK**: Nhiều compiler dùng bootstrap
2. **Workarounds là OK**: "Good enough" > perfect
3. **Document bugs**: Ghi chú rõ để sau này fix
4. **Test nhỏ từng bước**: Verify mỗi thay đổi
5. **File-based workflow**: Easier to test and debug
6. **Incremental progress**: Each phase builds on previous
7. **Executable feedback**: Running programs validates correctness

---

**Status**: Phase 15 complete! Compiler v2 is now a real file-based compiler that generates executable programs. Ready for Phase 16 - function parameters or arithmetic operations.
