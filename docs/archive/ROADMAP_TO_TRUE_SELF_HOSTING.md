# Lộ Trình Đến True Self-Hosting

## Hiện Trạng
- ✅ TSN compiler compile được simple programs (exit code đúng)
- ✅ TSN compiler được compile bởi Python bootstrap thành tsnc-self.exe
- ✅ tsnc-self.exe chạy được, compile test cases đúng
- ❌ tsnc-self.exe CHƯA compile được full compiler source (ast.tsn fails)
- ❌ Main.tsn dùng hardcoded paths (chưa có command-line args)

## Blockers Còn Lại

### 1. Lexer - Unknown Characters ❌
**Problem**: Khi compile ast.tsn, lexer báo "Unknown character"

**Possible Causes**:
- Ký tự `@` trong comments
- Ký tự đặc biệt nào đó trong TSN source
- Line ending issues (CRLF vs LF)

**TODO**:
- Debug: In ra character code của "unknown character"
- Thêm support cho các ký tự còn thiếu
- Test với full compiler source

### 2. Command-Line Arguments ❌
**Problem**: main.tsn dùng hardcoded path `"compiler/test-phase23.tsn"`

**TODO**:
- Thêm runtime function `getArgs(): Array<string>`
- Parse arguments trong main.tsn
- Support `-o output.ll` flag

### 3. Full Compiler Test ❌
**Problem**: Chưa test compile ALL 5 modules với tsnc-self.exe

**TODO**:
- Fix lexer issues
- Compile lexer.tsn, ast.tsn, parser.tsn, codegen.tsn, main.tsn
- Link thành tsnc-self2.exe
- Test tsnc-self2.exe compile test cases
- **Ultimate test**: tsnc-self2.exe compile lại 5 modules → tsnc-self3.exe
- So sánh tsnc-self2.exe vs tsnc-self3.exe (phải giống nhau!)

## Action Items (Theo Độ Ưu Tiên)

### Priority 1: Debug Lexer Issue
```
1. Add debug output to lexer.tsn
2. Print character code when "Unknown character" occurs
3. Identify what character is missing
4. Add support for that character
5. Recompile with Python bootstrap
6. Test again
```

### Priority 2: Add Basic CLI Support
```
1. Add getArgs() to runtime
2. Parse args in main.tsn: input file, -o output
3. Test với: tsnc-self.exe compiler/test-simple.tsn -o simple.ll
```

### Priority 3: Full Self-Compilation Test
```
1. Compile all 5 modules with tsnc-self.exe
2. Link → tsnc-self2.exe
3. Verify tsnc-self2.exe == tsnc-self.exe behavior
```

### Priority 4: True Bootstrap
```
1. tsnc-self2.exe compile 5 modules → tsnc-self3.exe
2. Binary diff: tsnc-self2.exe vs tsnc-self3.exe
3. If identical → DONE! Bootstrap can be deleted!
```

## Khi Nào Có Thể Bỏ Bootstrap?

Chỉ khi:
1. ✅ tsnc-self.exe compile được ALL 5 compiler modules
2. ✅ tsnc-self2.exe (compiled by tsnc-self) hoạt động đúng
3. ✅ tsnc-self2.exe compile 5 modules → tsnc-self3.exe
4. ✅ tsnc-self2.exe binary == tsnc-self3.exe binary (hoặc behavior giống nhau)

Đó là "fixpoint" - compiler stable, có thể tự compile chính nó mà không thay đổi!

## Timeline Ước Tính

| Task | Effort | Status |
|------|--------|--------|
| Debug lexer unknown char | 1-2 hours | 🔴 TODO |
| Add CLI args | 2-3 hours | 🔴 TODO |
| Test full compilation | 1 hour | 🔴 TODO |
| Bootstrap cycle 2 | 30 min | 🔴 TODO |
| Verify fixpoint | 30 min | 🔴 TODO |

**Total**: ~5-7 hours work remaining

## Kết Luận

**CÓ THỂ bỏ bootstrap, nhưng CẦN thêm 5-7 giờ công việc nữa!**

Hiện tại nên giữ `bootstrap/compiler.py` để:
- Fix bugs nhanh hơn (Python dễ debug hơn LLVM IR)
- Thêm features dễ hơn
- Test được nhiều cases hơn

Nhưng đây KHÔNG phải blocking issue - chúng ta đã đạt "partial self-hosting" và đang trên đường đến "true self-hosting"!

🎯 **Next immediate goal**: Fix lexer để compile được ast.tsn
