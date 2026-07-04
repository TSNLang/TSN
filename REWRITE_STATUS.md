# TSN Compiler Rewrite Status

**Date**: July 5, 2026  
**Goal**: Viết lại compiler từ đầu với cấu trúc sạch sẽ, đơn giản

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
├── build/
│   └── (generated)
└── README.md            ✅ DONE - Documentation
```

### 3. Code Quality
- ✅ **Đơn giản**: Mỗi file ~200-300 lines
- ✅ **Rõ ràng**: Không có deep nesting
- ✅ **Không extends**: Tránh inheritance bugs
- ✅ **Explicit**: Mọi operation đều rõ ràng

## ❌ Vấn Đề Phát Sinh

### TypeScript Compiler Bugs

**Hiện tượng**: TypeScript compiler (deno) **crash silent** khi compile files mới

```powershell
# Không có error message, chỉ exit code 1
deno run --allow-all src/src/main.ts compiler/src/ast.tsn -o compiler/build/ast.ll
# Exit Code: 1 (no output)
```

**Nguyên nhân có thể**:
1. Import paths với `.tsn` extension không được handle
2. Circular imports
3. Generic Array<T> issues
4. Parser bugs trong TS compiler

## 🎯 Giải Pháp Đề Xuất

### Option 1: Debug TS Compiler ⚠️
- Mất nhiều thời gian
- TS compiler code phức tạp
- Không phải mục tiêu chính

### Option 2: Viết Minimal Bootstrap Compiler ✅ RECOMMENDED
**Dùng Python/C++ viết một minimal compiler**:

```python
# bootstrap.py - Minimal TSN compiler in Python
# CHỈ compile đủ để build compiler v2

Features needed:
- Parse function declarations
- Parse simple expressions
- Generate basic LLVM IR
- NO generics, NO classes yet
```

**Workflow**:
1. Python compiler → compile `ast.tsn`, `lexer.tsn`, `parser.tsn`
2. Link với runtime → tạo compiler v2  
3. Compiler v2 tự compile chính nó
4. Bỏ Python bootstrap

### Option 3: Fix Current Compiler 🔧
- Clean up old self-hosting code
- Fix array index bug
- Test và iterate

## 📊 So Sánh Options

| Aspect | Option 1 (Debug TS) | Option 2 (Python) | Option 3 (Fix Old) |
|--------|---------------------|-------------------|-------------------|
| Time | 🔴 Weeks | 🟡 Days | 🟢 Hours |
| Complexity | 🔴 High | 🟡 Medium | 🔴 High |
| Clean Result | 🟢 Yes | 🟢 Yes | 🔴 No |
| Risk | 🟡 Medium | 🟢 Low | 🔴 High |

## 💡 Khuyến Nghị

**Recommended: Option 2 - Python Bootstrap**

**Lý do**:
1. ✅ Python dễ viết, debug
2. ✅ Tạo được minimal working compiler nhanh
3. ✅ Compiler v2 code đã sẵn sàng (ast.tsn, lexer.tsn, parser.tsn)
4. ✅ Sau khi bootstrap xong, bỏ Python đi

**Roadmap**:
```
Week 1: Python bootstrap compiler
  - Day 1-2: Lexer + Parser in Python
  - Day 3-4: LLVM IR codegen
  - Day 5: Test + fix

Week 2: Bootstrap compiler v2
  - Compile ast.tsn, lexer.tsn, parser.tsn với Python
  - Link → compiler v2
  - Test self-compilation

Week 3: Add features
  - Loops, if/else
  - Classes
  - Full self-hosting
```

## 📁 Files Created

Đã tạo:
- `compiler/src/ast.tsn` - AST definitions
- `compiler/src/lexer.tsn` - Tokenizer
- `compiler/src/parser.tsn` - Parser
- `compiler/src/main.tsn` - Test driver
- `compiler/README.md` - Documentation
- `build-compiler-v2.ps1` - Build script
- `rm.ps1` - Cleanup script (updated)

## 🎬 Next Steps

### Immediate (Ngay bây giờ):
1. **Quyết định approach**: Python bootstrap hoặc fix old compiler?
2. Nếu Python: Tạo `bootstrap/compiler.py`
3. Nếu Fix old: Debug array index bug trong mir-builder-flat.tsn

### Short Term (Tuần này):
- Có được working compiler (bằng cách nào đó)
- Compile được simple functions
- Test với examples

### Long Term (Tháng này):
- Self-hosting 100%
- Bỏ TypeScript dependency
- Production-ready compiler

## 📝 Lessons Learned

1. **KISS Principle**: Keep It Simple, Stupid
2. **Bootstrap là OK**: Nhiều compiler dùng bootstrap
3. **Clean code > Clever code**: Đơn giản hơn là thông minh
4. **Test early**: Nên test từng module nhỏ

---

**Kết luận**: Chúng ta đã sẵn sàng cho rewrite, nhưng cần một bootstrap compiler (Python hoặc fix old compiler) để build compiler v2.
