# TSN Changelog

## [Unreleased] - 2026-04-08

### Added
- **Floating-point support**: Thêm kiểu `f32` và `f64`
  - `number` trong TypeScript được ánh xạ sang `f64` (IEEE 754 double precision)
  - Hỗ trợ literal: `3.14`, `1.5f`, `2.0e10`
  - Floating-point operations: `fadd`, `fsub`, `fmul`, `fdiv`
  - Comparison operations: `fcmp` (OEQ, ONE, OLT, OGT, OLE, OGE)
  - Type promotion: tự động convert integer sang float khi cần

- **Struct/Interface support** (Partial):
  - Parsing `interface` và `class` definitions
  - LLVM struct type generation
  - Struct fields với các kiểu primitive
  - TODO: Member access, struct initialization, nested structs

### Examples
- `examples/float_test.tsn` - Demo floating-point functions
- `examples/number_test.tsn` - Demo `number` type mapping
- `examples/math_demo.tsn` - Demo math operations với f64
- `examples/struct_test.tsn` - Demo interface definition

### Technical Details
- Lexer: Hỗ trợ decimal point, exponent notation (e/E), suffixes (f/F, u/U)
- Parser: Thêm `KwInterface`, `KwClass` tokens
- Codegen: Type promotion cho mixed integer/float operations
- LLVM: Sử dụng `double` (f64) và `float` (f32) types

### Progress
- MVP Core: 90% complete
- Type System: 30% complete
- Self-hosting: Đang chuẩn bị các tính năng cần thiết

### Next Steps
1. Implement member access (`.` operator)
2. Struct initialization syntax
3. Dynamic arrays/vectors
4. String operations
5. Begin self-hosting compiler in TSN
