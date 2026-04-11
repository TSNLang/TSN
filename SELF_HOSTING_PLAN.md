# Self-Hosting Completion Plan

**Goal:** Expand Parser and Codegen to compile the full TSN compiler

**Current Status:** 50% - Binary expressions complete! Functions, returns, and all arithmetic/comparison operators working

## Phase 1: Expression Support (Priority: HIGH)

### 1.1 Binary Expressions ✅ COMPLETE
- [x] Addition: `a + b`
- [x] Subtraction: `a - b`
- [x] Multiplication: `a * b`
- [x] Division: `a / b`
- [x] Comparison: `==`, `!=`, `<`, `>`
- [ ] Comparison: `<=`, `>=` (not yet implemented)
- [ ] Logical: `&&`, `||` (not yet implemented)

**Parser Changes:** ✅ DONE
- Implemented `parse_expr()` with binary operator support
- Handles left-to-right evaluation (precedence TODO)

**Codegen Changes:** ✅ DONE
- Generates LLVM `add`, `sub`, `mul`, `sdiv` instructions
- Generates LLVM `icmp eq/ne/slt/sgt` for comparisons
- Temporary variable generation working

### 1.2 Unary Expressions
- [ ] Negation: `-x`
- [ ] Logical NOT: `!x`

### 1.3 Array Access
- [ ] Index expression: `arr[i]`
- [ ] Member access: `obj.field`

**Test:** Compile expressions like `let x = (a + b) * c;`

## Phase 2: Statement Support (Priority: HIGH)

### 2.1 Variable Declarations
- [ ] `let x: i32;` (declaration only)
- [ ] `let x: i32 = 42;` (with initialization)
- [ ] `let x = 42;` (type inference - later)

**Parser Changes:**
- Implement `parse_var_decl()`
- Parse type annotations

**Codegen Changes:**
- Generate LLVM `alloca` for local variables
- Generate `store` for initialization

### 2.2 Assignment Statements
- [ ] Simple assignment: `x = 42;`
- [ ] Array assignment: `arr[i] = value;`
- [ ] Member assignment: `obj.field = value;`

**Codegen Changes:**
- Generate LLVM `store` instructions
- Handle `getelementptr` for arrays/structs

### 2.3 Control Flow
- [ ] If statement: `if (condition) { ... }`
- [ ] If-else: `if (condition) { ... } else { ... }`
- [ ] While loop: `while (condition) { ... }`

**Codegen Changes:**
- Generate LLVM basic blocks
- Generate `br` (branch) instructions
- Handle phi nodes if needed

**Test:** Compile `if (x > 0) { return 1; } else { return 0; }`

## Phase 3: Function Support (Priority: MEDIUM)

### 3.1 Function Calls
- [ ] Simple calls: `foo()`
- [ ] With arguments: `foo(a, b, c)`
- [ ] Return value usage: `let x = foo();`

**Parser Changes:**
- Implement `parse_call_expr()`
- Parse argument lists

**Codegen Changes:**
- Generate LLVM `call` instructions
- Handle argument passing

### 3.2 Function Parameters
- [ ] Parse parameter lists
- [ ] Generate function signatures with parameters
- [ ] Handle parameter types

**Test:** Compile `function add(a: i32, b: i32): i32 { return a + b; }`

## Phase 4: Advanced Features (Priority: LOW)

### 4.1 Arrays
- [ ] Array declarations: `let arr: i32[100];`
- [ ] Array initialization: `arr[0] = 42;`

### 4.2 Structs/Interfaces
- [ ] Parse interface definitions
- [ ] Generate LLVM struct types
- [ ] Member access codegen

### 4.3 Pointers
- [ ] `addressof()` operator
- [ ] Pointer dereferencing
- [ ] Pointer arithmetic

## Phase 5: Full Compiler Self-Compilation

### 5.1 Compile Each Module
- [ ] Compile `Lexer.tsn` with TSN compiler
- [ ] Compile `Parser.tsn` with TSN compiler
- [ ] Compile `Codegen.tsn` with TSN compiler
- [ ] Compile `FFI.tsn` with TSN compiler
- [ ] Compile `Compiler.tsn` with TSN compiler

### 5.2 Bootstrap Test
1. Compile TSN compiler with C++ compiler → `tsnc_v1.exe`
2. Compile TSN compiler with `tsnc_v1.exe` → `tsnc_v2.exe`
3. Compile TSN compiler with `tsnc_v2.exe` → `tsnc_v3.exe`
4. Verify: `tsnc_v2.exe` and `tsnc_v3.exe` are identical (bit-for-bit)

### 5.3 Performance Testing
- [ ] Measure compilation speed
- [ ] Compare output quality with C++ compiler
- [ ] Optimize hot paths

## Implementation Strategy

### Week 1: Expressions
- Day 1-2: Binary expressions (arithmetic)
- Day 3-4: Binary expressions (comparison, logical)
- Day 5: Array/member access
- Day 6-7: Testing and bug fixes

### Week 2: Statements
- Day 1-2: Variable declarations
- Day 3-4: Assignments
- Day 5-7: Control flow (if/while)

### Week 3: Functions
- Day 1-3: Function calls
- Day 4-5: Function parameters
- Day 6-7: Testing full programs

### Week 4: Self-Compilation
- Day 1-3: Compile each module
- Day 4-5: Bootstrap test
- Day 6-7: Documentation and cleanup

## Success Criteria

✅ **Minimum Viable Self-Hosting:**
- Can compile a function with parameters
- Can compile if/else statements
- Can compile while loops
- Can compile variable declarations and assignments
- Can compile function calls

✅ **Full Self-Hosting:**
- Can compile all 5 compiler modules
- Bootstrap test passes (3-way compilation identical)
- All existing examples still work

✅ **Production Ready:**
- Compilation speed < 2x C++ compiler
- Generated code quality comparable
- Comprehensive test suite passes

## Current Blockers

1. **Parser incomplete** - Only parses return statements
2. **Codegen incomplete** - Only generates simple returns
3. **No expression evaluation** - Can't handle `a + b`
4. **No control flow** - Can't handle if/while

## Next Immediate Steps

1. ✅ Create this plan
2. ⏭️ Implement binary expression parsing
3. ⏭️ Implement binary expression codegen
4. ⏭️ Test with simple arithmetic programs
5. ⏭️ Implement variable declarations
6. ⏭️ Continue with remaining features...

---

**Note:** This is an aggressive but achievable plan. Each phase builds on the previous one, allowing for incremental testing and validation.
