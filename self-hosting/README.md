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
- `lexer.tsn`: lexer subset du cho compiler source
- `parser.tsn`: parser subset cho function/import/class co ban
- `main.tsn`: diem vao bootstrap, doc file va parse

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
- `self-hosting/lexer.tsn`: bo khung lexer TSN subset
- `self-hosting/parser.tsn`: bo khung parser TSN subset
- `self-hosting/main.tsn`: diem vao bootstrap parser

Day la skeleton toi thieu de chot huong `0.17.x = self-hosting`.
