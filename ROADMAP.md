# Roadmap: TSN (TSN Standard Notation)

TSN là một ngôn ngữ lấy cảm hứng từ TypeScript (recursive acronym: TSN Standard Notation), được thiết kế để biên dịch trực tiếp sang mã máy thông qua LLVM IR. Mục tiêu là giữ 90% cú pháp của TypeScript nhưng mang lại hiệu năng của C/C++.

**Lưu ý**: TSN là dự án độc lập, không liên kết với Microsoft hay TypeScript team.

## 🎯 Tầm nhìn (Vision)
Xây dựng một trình biên dịch Self-hosted (tự biên dịch chính nó) có khả năng tạo ra các file thực thi `.exe` (Windows) và `.elf` (Linux) siêu nhỏ gọn, không cần Runtime nặng nề (No V8, No Node.js).

---

## 🏗️ Lộ trình thực hiện (Roadmap)

### Giai đoạn 1: MVP Core (Hoàn tất 95%)
- [x] **Lexer & Parser cơ bản:** Identifier, Number, String, Keywords.
- [x] **LLVM IR Generation:** Xuất ra file `.ll`, `.obj`, `.exe`.
- [x] **Cấu trúc điều khiển:** `if/else`, `while` loop, `for` loop.
- [x] **Hàm (Functions):** Tham số, giá trị trả về, gọi hàm đệ quy.
- [x] **Kiểu dữ liệu nguyên thủy:** `i8`, `i32`, `i64`, `bool`, `ptr<T>`.
- [x] **Kiểu số thực (Floating-point):** `f32`, `f64`, `number` (ánh xạ sang `f64`).
- [x] **Pointer & Array:** Indexing `ptr[index]`, lấy địa chỉ `addressof(variable)`.
- [x] **Linker Windows:** Tự động liên kết `kernel32.lib`, `msvcrt.lib`.

### Giai đoạn 2: Hệ thống Kiểu & Cấu trúc (Hoàn tất 85%)
- [x] **Interfaces & Classes (Data Structures):** 
    - Định nghĩa cấu trúc dữ liệu dùng `interface Name { field: type }` hoặc `class`.
    - Parsing và LLVM struct type generation.
- [x] **Fixed-size Arrays:**
    - Syntax: `let arr: i32[100];`
    - LLVM array type generation.
    - Declaration without initialization.
- [x] **Array Operations:**
    - Array element access: `arr[i]`
    - Array element write: `arr[i] = value;`
- [x] **Struct Member Read:**
    - Truy cập thuộc tính `obj.field` (read-only).
- [x] **Struct Initialization:**
    - Hỗ trợ khởi tạo đối tượng theo kiểu TS: `let x: Name = { field: value };`.
    - Object literal syntax hoàn toàn giống TypeScript.
- [x] **Struct Member Write:**
    - Gán giá trị cho thuộc tính: `obj.field = value;`
    - Hoàn thiện struct support!
- [ ] **Memory Management (ARC & ORC):**
    - Cơ chế quản lý bộ nhớ tự động dựa trên **Automatic Reference Counting (ARC)** và **Owned Reference Counting (ORC)** giống như Nim và Swift.
    - Không dùng Garbage Collector (GC) nặng nề, đảm bảo hiệu năng Native ổn định.
- [ ] **String Manipulation:** Hỗ trợ cộng chuỗi, lấy độ dài, slice (dựa trên ARC).

### Giai đoạn 3: Self-Hosting (Đang thực hiện - 40%)
- [x] **TSN-in-TSN Lexer:** Viết lại Lexer bằng TSN (Hoạt động ✓).
- [x] **TSN-in-TSN Parser:** Parser cơ bản đếm functions (Hoạt động ✓).
- [x] **Mini Compiler:** TSN compiler đầu tiên viết bằng TSN (Hoạt động ✓).
- [ ] **Full Parser:** Parse statements, expressions, build AST.
- [ ] **TSN-in-TSN Emitter:** Sinh mã LLVM IR từ TSN.
- [ ] **Bootstrapping:** Dùng trình biên dịch C++ hiện tại để biên dịch trình biên dịch TSN mới.

### Giai đoạn 4: TypeScript-Inspired Compatibility (Mở rộng)
- [ ] **Type Inference:** Tự động suy luận kiểu dữ liệu.
- [ ] **Standard Library (std):** 
    - `std:fs`: Đọc/Ghi file native (tương thích API Node.js `fs`)
    - `std:process`: Tham số dòng lệnh, environment variables (tương thích Node.js `process`)
    - `std:path`: Xử lý đường dẫn (tương thích Node.js `path`)
    - `std:net`: Networking (tương thích Node.js `net`)
- [ ] **FFI (Foreign Function Interface):** Gọi hàm từ các file `.dll` hoặc `.so` dễ dàng hơn qua Decorators `@ffi.lib`.

### Giai đoạn 5: NPM Ecosystem Integration (Tương lai)
- [ ] **Package Manager:** Tích hợp với npm/yarn để sử dụng thư viện TypeScript
- [ ] **Import Rewriting:** Tự động chuyển đổi `node:*` sang `std:*`
- [ ] **Library Compatibility:** Hỗ trợ các thư viện TypeScript phổ biến
- [ ] **Module Resolution:** Tương thích với cơ chế resolve module của Node.js
- [ ] **Type Definitions:** Sử dụng `@types/*` từ DefinitelyTyped

---

## 🛠️ Quy tắc cú pháp (Syntax Rules)

TSN tuân thủ cú pháp lấy cảm hứng từ TypeScript nhưng có một số điều chỉnh để phù hợp với môi trường Native:

1. **Kiểu dữ liệu tường minh:** 
   - Thay vì chỉ có `number`, TSN chia nhỏ thành `i32`, `f64`, `u8`... để tối ưu bộ nhớ.
   - `number` trong TypeScript gốc sẽ được ánh xạ sang `f64` (IEEE 754 double precision).
   - Số nguyên có thể dùng `i32`, `i64`, `u32`, `u64` để tối ưu.
2. **Pointer:** Sử dụng `ptr<T>` thay vì Reference để có quyền kiểm soát bộ nhớ như C.
3. **Address-of:** Sử dụng `addressof(variable)` để lấy địa chỉ (TypeScript-inspired style), không dùng `&` (C-style).
4. **Decorator:** Sử dụng `@decorator` để điều hướng Compiler (giống như FFI).

---

## 📈 Tình trạng hiện tại

Hiện tại TSN đã có thể thực thi các thuật toán logic cơ bản, vòng lặp và truy cập bộ nhớ qua pointer. Trình biên dịch C++ đang được hoàn thiện để hỗ trợ đủ tính năng cho việc viết lại chính nó bằng TSN.

## 🎯 Tầm nhìn dài hạn: NPM Ecosystem

Một trong những mục tiêu tham vọng của TSN là cho phép chạy các thư viện TypeScript hiện có với ít thay đổi nhất có thể:

### Chiến lược tương thích

1. **API Compatibility**: Các module `std:*` được thiết kế theo API của Node.js
2. **Import Rewriting**: Tự động chuyển đổi `import ... from 'node:fs'` → `import ... from 'std:fs'`
3. **High Compatibility**: Giữ 90% cú pháp TypeScript để tương thích cao
4. **Gradual Migration**: Cho phép migrate từng phần code từ Node.js sang TSN

### Ví dụ

```typescript
// Code TypeScript gốc (Node.js)
import { readFileSync } from 'node:fs';
const data = readFileSync('config.json', 'utf-8');

// Chạy trên TSN (tự động hoặc thủ công đổi import)
import { readFileSync } from 'std:fs';
const data = readFileSync('config.json', 'utf-8');
```

Với thiết kế này, nhiều thư viện TypeScript có thể chạy trên TSN với performance native!
