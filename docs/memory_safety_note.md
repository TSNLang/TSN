# Thông báo quan trọng về Quản lý Bộ nhớ (Memory Management)

TSN ở phiên bản hiện tại (giai đoạn self-hosting) đang tạm thời sử dụng cơ chế **Reference Counting (RC)** để quản lý vòng đời đối tượng. 

Mặc dù mục tiêu dài hạn của TSN là mô hình Ownership/Borrow Checker nghiêm ngặt như Rust để đạt được hiệu năng tối ưu và an toàn tuyệt đối mà không cần runtime overhead, nhưng do độ phức tạp của việc triển khai trình kiểm tra (Borrow Checker) ổn định, chúng tôi ưu tiên sử dụng RC (incref/decref) để đảm bảo tính đúng đắn của chương trình trong giai đoạn tự biên dịch này.

Cơ chế này tương tự như cách Rust thời kỳ đầu từng cân nhắc sử dụng GC trước khi chuyển hẳn sang hệ thống Ownership hoàn chỉnh.