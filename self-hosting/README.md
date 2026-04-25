# TSN 0.17.x Self-Hosting

Muc tieu cua nhanh `0.17.x` la dua TSN vao giai doan self-hosting tung phan, bat dau tu mot compiler subset viet bang chinh TSN.

## Muc tieu gan

- bootstrap mot compiler subset trong `self-hosting/`
- uu tien `lexer`, `parser`, va `AST` truoc `codegen`
- giu TypeScript compiler hien tai lam bootstrap compiler
- on dinh ownership/move semantics du de compiler viet bang TSN khong tu vo

## Lo trinh toi thieu

### 0.17.0
- `ast.tsn`: cac kieu du lieu cot loi cho token va AST, bao gom counter toi thieu va summary toi gian cho parser subset, ke ca constructor/member summary dau tien, summary gop cho member dau tien, field type summary dau tien, method return summary dau tien, method param summary dau tien, constructor param summary dau tien, function param summary dau tien, function return summary dau tien, class type parameter summary dau tien, method type parameter summary dau tien, va function type parameter summary dau tien
- `lexer.tsn`: lexer subset da tokenize duoc identifier, number, string, comment, decorator va keyword co ban cho bootstrap, bao gom ca `constructor`, `public`, `private`, `protected`, `static`, `async`, va `export`
- `parser.tsn`: parser subset da dem duoc `import`, `export`, `function`, `class`, `let`, `return`, va bat dau quet them `param` / `method` / `field` / `constructor` / modifier co ban theo huong token-driven toi thieu, dong thoi ghi lai summary dau tien cho function/class/member/modifier, mot member summary gop dang nho gon, field type summary dau tien khi gap type annotation ro rang, method return summary dau tien khi gap return type ro rang, method param summary dau tien o muc chuoi toi thieu, constructor param summary dau tien, function param summary dau tien, function return summary dau tien, class type parameter summary dau tien, method type parameter summary dau tien, va function type parameter summary dau tien
- `main.tsn`: diem vao bootstrap, build qua TypeScript compiler hien tai va xac nhan runtime qua `deno -> clang -> exe`

### 0.17.1
- parser/lexer tu-host cho tap mau nho
- mo rong diagnostics va module loading subset
- bat dau so sanh output giua TypeScript compiler va TSN bootstrap compiler

### 0.17.2+
- dua them resolver va codegen vao nhanh self-hosting
- bat dau bootstrapping A -> B
- giam dan phan compiler TypeScript cu

## Cau truc hien tai

- `self-hosting/ast.tsn`: token va AST toi thieu
- `self-hosting/lexer.tsn`: lexer subset TSN cho bootstrap compiler source
- `self-hosting/parser.tsn`: parser subset dang duoc mo rong theo cach toi thieu, uu tien token count va structure count truoc
- `self-hosting/main.tsn`: diem vao bootstrap parser

## Trang thai hien tai

- build path that su da duoc xac nhan qua `deno run ... -> clang ... -> self-hosting/main.exe`
- tap mau bootstrap hien tai da dem dung:
  - `import = 1`
  - `export = 1`
  - `function = 1`
  - `class = 1`
  - `let = 2`
  - `return = 3`
  - `if = 1`
  - `while = 0`
  - `for = 0`
  - `param = 6`
  - `method = 1`
  - `field = 4`
  - `constructor = 1`
  - `public = 3`
  - `private = 1`
  - `protected = 1`
  - `static = 1`
  - `async = 2`
- tap mau bootstrap hien tai da in duoc summary toi gian:
  - `firstFunctionName = main`
  - `firstFunctionTypeParamSummary = main<V>`
  - `firstFunctionParamSummary = main(value: i32, flag: bool)`
  - `firstFunctionReturnSummary = main: i32`
  - `firstClassName = Box`
  - `firstClassTypeParamSummary = Box<T>`
  - `firstMethodTypeParamSummary = push<U>`
  - `firstMethodName = push`
  - `firstFieldName = value`
  - `firstConstructorName = constructor`
  - `firstConstructorModifierSummary = public`
  - `firstMethodModifierSummary = public,async`
  - `firstFieldModifierSummary = public`
  - `firstMemberModifierSummary = public`
  - `firstMemberSummary = public field value`
  - `firstFieldTypeSummary = value: i32`
  - `firstMethodReturnSummary = push: i32`
  - `firstMethodParamSummary = push(item: i32, count: i32)`
  - `firstConstructorParamSummary = constructor(seed: i32, enabled: bool)`
- parser subset da bat dau chuyen tu raw keyword count sang declaration-body structure count toi thieu, trong do class body da tach duoc `field`, `method`, `constructor`, modifier co ban, va giu lai summary modifier/member dau tien theo dang gop don gian kem field type summary, method return summary, method param summary, constructor param summary, function param summary, function return summary, class type parameter summary, method type parameter summary, va function type parameter summary toi thieu
- huong di van giu toi gian: parser subset truoc, diagnostics/module loading sau

Day khong con chi la skeleton ban dau nua ma la mot bootstrap subset dang chay duoc qua compiler hien tai.

## Self-parse smoke test (0.17.1)

Parser subset da tu-parse chinh no (`parser.tsn`) va xac nhan cac ket qua sau:

- `self-parse: import = 2`
- `self-parse: export = 1`
- `self-parse: class = 1`
- `self-parse: constructor = 1`
- `self-parse: method = 25`
- `self-parse: field = 2`
- `self-parse: let = 151`
- `self-parse: return = 37`
- `self-parse: if = 133`
- `self-parse: while = 16`
- `self-parse: private = 26`
- `self-parse: firstClassName = Parser`
- `self-parse: firstMethodName = parse`
- `self-parse: firstFieldName = tokens`
- `self-parse: firstConstructorParamSummary = constructor(tokens: Array<Token>)`

Parser subset cung da tu-parse `lexer.tsn` va xac nhan cac ket qua sau:

- `self-parse lexer: import = 2`
- `self-parse lexer: export = 1`
- `self-parse lexer: class = 1`
- `self-parse lexer: constructor = 1`
- `self-parse lexer: method = 13`
- `self-parse lexer: field = 4`
- `self-parse lexer: let = 10`
- `self-parse lexer: return = 47`
- `self-parse lexer: if = 53`
- `self-parse lexer: while = 8`
- `self-parse lexer: private = 16`
- `self-parse lexer: firstClassName = Lexer`
- `self-parse lexer: firstMethodName = tokenize`
- `self-parse lexer: firstFieldName = source`
- `self-parse lexer: firstConstructorParamSummary = constructor(source: string)`

Parser subset cung da tu-parse `ast.tsn` va xac nhan cac ket qua sau:

- `self-parse ast: import = 0`
- `self-parse ast: export = 4` (1 enum + 3 classes)
- `self-parse ast: class = 3` (Token, FunctionDecl, Program)
- `self-parse ast: constructor = 3`
- `self-parse ast: method = 0`
- `self-parse ast: field = 42` (Token=4, FunctionDecl=1, Program=37)
- `self-parse ast: let = 0`
- `self-parse ast: return = 0`
- `self-parse ast: if = 0`
- `self-parse ast: public = 42`
- `self-parse ast: firstClassName = Token`
- `self-parse ast: firstFieldName = kind`
- `self-parse ast: firstConstructorParamSummary = constructor(kind: i32, lexeme: string, line: i32, column: i32)`

Parser subset cung da tu-parse `main.tsn` va xac nhan cac ket qua sau:

- `self-parse main: import = 4`
- `self-parse main: export = 0`
- `self-parse main: function = 1`
- `self-parse main: class = 0`
- `self-parse main: let = 29`
- `self-parse main: return = 1`
- `self-parse main: if = 4`
- `self-parse main: while = 0`
- `self-parse main: firstFunctionName = main`
- `self-parse main: firstFunctionParamSummary = (empty — main() takes no params)`
- `self-parse main: firstFunctionReturnSummary = main: i32`

### 0.17.4 Milestone: Track Logic Operators và Assignment

Parser subset đã được mở rộng để track các toán tử logic và phép gán:
- Toán tử logic: `&` (`amp`), `|` (`pipe`)
- Phép gán: `=` (`assign`)
- Track thêm dấu chấm `.` (`dot`) và ngoặc vuông `[` (`bracket`)

Kết quả self-parse (`parser.tsn`):
- `self-parse: import = 2`
- `self-parse: export = 1`
- `self-parse: class = 1`
- `self-parse: constructor = 1`
- `self-parse: method = 26`
- `self-parse: let = 201`
- `self-parse: return = 38`
- `self-parse: if = 142`
- `self-parse: while = 19`
- `self-parse: new = 3`
- `self-parse: this = 166`
- `self-parse: dot = 875`

*Ghi chú: Một số chỉ số (amp, pipe, assign) đang gặp vấn đề hiển thị giá trị rác do giới hạn runtime hiện tại khi xử lý Program lớn, sẽ được tối ưu trong các bản sau.*
