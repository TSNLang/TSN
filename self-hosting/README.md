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
