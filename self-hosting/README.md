# TSN 0.17.x Self-Hosting

Muc tieu cua nhanh `0.17.x` la dua TSN vao giai doan self-hosting tung phan, bat dau tu mot compiler subset viet bang chinh TSN.

## Muc tieu gan

- bootstrap mot compiler subset trong `self-hosting/`
- uu tien `lexer`, `parser`, va `AST` truoc `codegen`
- giu TypeScript compiler hien tai lam bootstrap compiler
- on dinh ownership/move semantics du de compiler viet bang TSN khong tu vo

## Lo trinh toi thieu

### 0.17.0
- `ast.tsn`: cac kieu du lieu cot loi cho token va AST
- `lexer.tsn`: lexer subset da tokenize duoc identifier, number, string, comment, decorator va keyword co ban cho bootstrap
- `parser.tsn`: parser subset da dem duoc `import`, `function`, `class`, `let`, `return` tren tap mau bootstrap
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
  - `function = 1`
  - `class = 1`
  - `let = 1`
  - `return = 2`
- huong di van giu toi gian: parser subset truoc, diagnostics/module loading sau

Day khong con chi la skeleton ban dau nua ma la mot bootstrap subset dang chay duoc qua compiler hien tai.
