# Kế hoạch hoàn thiện Level 4 Bootstrap cho TSN Compiler

Tệp tin này ghi lại các thiếu sót hiện tại của trình biên dịch self-hosting TSN (Level 3) và các bước kỹ thuật cần thực hiện để hoàn thành **Level 4**: Dùng chính trình biên dịch TSN tự biên dịch chính nó.

---

## 1. Các thiếu sót hiện tại (Gaps Analysis)

Hiện tại, `tsn_level3.exe` chỉ có thể biên dịch thành công các chương trình có cấu trúc đơn giản (như tính giai thừa, các hàm và biến nguyên thủy). Khi biên dịch các module phức tạp của chính nó (như `lexer.tsn`, `mir-builder.tsn`), nó tạo ra các file IR rất nhỏ (12KB thay vì 500KB) do các lỗi và thiếu sót nghiêm trọng sau:

### A. MIRBuilder
1. **`buildMethod` chỉ là stub rỗng:**
   - Trong `self-hosting/mir-builder.tsn`, phương thức `buildMethod()` chỉ tạo ra một hàm rỗng và `return 0` ngay lập tức. Điều này khiến toàn bộ body của tất cả class methods trong compiler bị bỏ qua khi sinh mã.
2. **Truy cập thuộc tính (`MemberExpr` - Field Access) trả về `0`:**
   - Khi gặp biểu thức `obj.field` hoặc `this.field`, MIRBuilder đang hardcode trả về hằng số `0` vì chưa quản lý được cấu trúc bộ nhớ (struct layout) của Class.
3. **Gọi phương thức (`MemberExpr` - Method Call) thiếu tham số `this`:**
   - Khi gọi `obj.method(args)`, trình biên dịch Level 3 gọi nó như một hàm thường, không truyền con trỏ đối tượng (`this`) vào làm tham số đầu tiên, và không sinh tên hàm mangled đúng chuẩn ABI.
4. **Không hỗ trợ gán giá trị cho thuộc tính (`obj.field = value`):**
   - Phép gán `=` chỉ đang hỗ trợ gán vào biến cục bộ (Identifier). Gán vào thuộc tính đối tượng chưa được sinh mã GEP + Store.
5. **Chưa xử lý từ khóa `this` (`ThisExpr`):**
   - Chưa ánh xạ từ khóa `this` về tham số ẩn `%this` (register %r0 hoặc tương ứng) của phương thức/constructor.

### B. MIRCodegen
1. **Thiếu định nghĩa kiểu dữ liệu Class (`%ClassName = type { ... }`):**
   - Trình sinh mã LLVM IR tự xây dựng chưa khai báo định nghĩa struct cho các class ở đầu file IR.
2. **Thiếu VTable:**
   - Chưa định nghĩa bảng phương thức ảo (`@_VTable.ClassName`) cho các class để hỗ trợ dynamic dispatch.
3. **Thiếu Name Mangling chuẩn:**
   - Các phương thức class cần được mangled dưới dạng `_T.ClassName.method$P.argTypes` để liên kết (link) chính xác với Runtime và các module khác.

---

## 2. Kế hoạch hiện thực hóa Level 4 (Action Plan)

Để hoàn thiện Level 4, chúng ta cần bổ sung các tính năng này vào self-hosting compiler theo các giai đoạn sau:

### Giai đoạn 1: Quản lý Class Metadata & Struct Layout ✅ HOÀN THÀNH
- **Class Registry:** Đã thêm các class ClassFieldInfo, ClassMethodInfo và ClassInfo để lưu thông tin chi tiết về các class, fields, methods (tên, kiểu dữ liệu, index).
- **Tính toán Offset:** Đã xây dựng hàm computeFieldOffsets() để tính toán offset của từng thuộc tính trong struct, sử dụng cho lệnh GEP.
- **Khai báo Struct trong Codegen:** (Sẽ được thực hiện trong giai đoạn MIRCodegen)

### Giai đoạn 2: Hoàn thiện Method & Constructor Compilation ✅ HOÀN THÀNH
- **Sửa `buildMethod`:** 
  - Đọc và phân tích toàn bộ danh sách tham số của phương thức.
  - Chèn tham số ẩn `this: ptr` vào đầu danh sách tham số.
  - Biên dịch toàn bộ các câu lệnh bên trong thân phương thức (`body`).
- **Sửa `NewExpr` (Constructor):** (Sẽ thực hiện trong giai đoạn này)
  - Cấp phát bộ nhớ cho class qua `class_alloc`.
  - Khởi tạo con trỏ VTable.
  - Gọi hàm constructor với tham số `this` và các tham số khác.

### Giai đoạn 3: Hiện thực hóa Member Access (`MemberExpr`)
- **Đọc Field (Get):**
  - Dùng `GetElementPtr` (GEP) để lấy địa chỉ của field dựa trên index của field đó trong class layout.
  - Sinh lệnh `Load` từ địa chỉ đó.
- **Ghi Field (Set):**
  - Khi gặp `BinaryExpr` với toán tử `=` mà vế trái là `MemberExpr`, sinh mã GEP cho thuộc tính đó.
  - Sinh lệnh `Store` giá trị mới vào địa chỉ vừa tìm được.
- **Gọi Method:**
  - Nhận diện kiểu Class của đối tượng gọi phương thức.
  - Sinh lệnh load vtable ptr từ đối tượng -> load function ptr từ vtable slot tương ứng.
  - Gọi function pointer đó và truyền đối tượng làm đối số đầu tiên (`this`).

### Giai đoạn 4: Bootstrap & Verification
1. Biên dịch lại toàn bộ self-hosting compiler với Deno (Level 1) để tạo ra `tsn_level3.exe` mới có đầy đủ các tính năng trên.
2. Chạy `tsn_level3.exe` để biên dịch chính các file trong `self-hosting/` tạo ra các file `-l4.ll`.
3. Link các file `-l4.ll` bằng `clang` tạo ra `tsn_level4.exe`.
4. Dùng `tsn_level4.exe` chạy thử nghiệm các test suites để đảm bảo nó hoạt động hoàn toàn chính xác mà không cần Deno nữa.
