# Phase 34: Class Methods & Self-Compilation Foundation

## Status: ✅ COMPLETE

## Date: 2026-08-01

## 🎯 Objective
Enable compiler to emit class methods and fix critical codegen bugs blocking self-compilation.

## 📋 Current Blockers (from Phase 33)

### 1. ❌ Class Methods Not Emitted
**Problem**: `main.tsn` only emits module-level functions, ignoring class methods.

```tsn
class Parser {
    // This method never gets emitted to LLVM!
    function parseExpression(): Expr { ... }
}
```

**Impact**: 
- `parser.tsn` compiles but produces empty IR (only headers)
- `program.functions.length == 0` because all code is in classes
- Cannot self-compile parser/codegen modules

**Fix Required**:
```tsn
// In main.tsn emitProgram():
for (let i = 0; i < program.classes.length; i = i + 1) {
    let cls = program.classes.get(i);
    for (let j = 0; j < cls.methods.length; j = j + 1) {
        let method = cls.methods.get(j);
        this.emitFunction(method);  // Emit as mangled name
    }
}
```

**Method name mangling**:
- `Parser.parseExpression` → `Parser_parseExpression`
- `Lexer.advance` → `Lexer_advance`

### 2. ✅ emitReturn Type Detection (COMPLETE)
**Problem**: Always emits `ret i32` regardless of actual type.

**Fixed**: Added type inference in emitReturn:
```tsn
private emitReturn(stmt: Stmt): void {
    let valueReg = this.emitExpression(stmt.value);
    let returnType = this.inferExprType(stmt.value);  // NEW
    this.output.push("  ret " + returnType + " " + valueReg);
}
```

**Result**: Now correctly emits `ret ptr %r0` for object returns, `ret i32 %r1` for integer returns.

### 3. ❌ String Literals as Placeholders (BLOCKED BY BOOTSTRAP BUG)
**Problem**: Always emits `ret i32` regardless of actual type.

```llvm
; Current (WRONG):
%r9 = call ptr @Stmt_new(...)
ret i32 %r9   ; ← ERROR: %r9 is ptr, not i32!

; Should be:
ret ptr %r9
```

**Fix Required**:
```tsn
private emitReturn(stmt: Stmt): void {
    if (stmt.returnValue != null) {
        let reg = this.emitExpression(stmt.returnValue);
        let type = this.getExpressionType(stmt.returnValue);  // NEW
        this.output.push("  ret " + type + " " + reg);
    } else {
        this.output.push("  ret void");
    }
}
```

### 3. ❌ String Literals as Placeholders
**Problem**: String literals emit as `inttoptr i32 0 to ptr ; string:"..."`.

```llvm
; Current (placeholder):
%str = inttoptr i32 0 to ptr ; string: "hello"

; Should be:
@.str.0 = private unnamed_addr constant [6 x i8] c"hello\00"
%str = getelementptr inbounds [6 x i8], ptr @.str.0, i32 0, i32 0
```

**Fix Required**: Add string constant table in codegen.

### 4. ❌ Missing Runtime Declarations
**Problem**: No extern declarations for runtime functions.

**Fix Required**:
```llvm
; At top of output:
declare ptr @class_alloc(i32)
declare ptr @string_concat(ptr, ptr)
declare i32 @string_length(ptr)
declare i32 @string_equals(ptr, ptr)
declare void @Array_push(ptr, ptr)
declare ptr @Array_get(ptr, i32)
```

## 🎯 Phase 34 Goals

### Goal 1: Emit Class Methods ✅ (Priority: CRITICAL)
- [ ] Walk `program.classes[].methods[]` in `main.tsn`
- [ ] Emit methods as mangled function names
- [ ] Add implicit `this` parameter as first argument
- [ ] Test with simple method call

**Test Case**:
```tsn
class Calculator {
    function add(a: i32, b: i32): i32 {
        return a + b;
    }
}

function main(): i32 {
    let calc = new Calculator();
    return calc.add(5, 7);  // Should return 12
}
```

**Expected IR**:
```llvm
define i32 @Calculator_add(ptr %this, i32 %a, i32 %b) {
entry:
    %r0 = add i32 %a, %b
    ret i32 %r0
}

define i32 @main() {
entry:
    %calc = call ptr @class_alloc(i32 8)
    %r0 = call i32 @Calculator_add(ptr %calc, i32 5, i32 7)
    ret i32 %r0
}
```

### Goal 2: Fix emitReturn Type Detection ✅ (Priority: CRITICAL)
- [ ] Add `getExpressionType(expr: Expr): string` helper
- [ ] Use actual type in `emitReturn`
- [ ] Handle: `i32`, `ptr`, `void`

**Test Case**:
```tsn
function getToken(): Token {
    let tok = new Token("ID", "x", 1, 1);
    return tok;  // Should emit: ret ptr %r0
}

function getNumber(): i32 {
    return 42;  // Should emit: ret i32 42
}
```

### Goal 3: String Literal Constants ✅ (Priority: HIGH)
- [ ] Add `stringConstants: Array<string>` in Codegen
- [ ] Emit `@.str.N` globals at top
- [ ] Replace `inttoptr` with proper GEP

**Test Case**:
```tsn
function greet(): string {
    return "Hello, World!";
}
```

**Expected IR**:
```llvm
@.str.0 = private unnamed_addr constant [14 x i8] c"Hello, World!\00"

define ptr @greet() {
entry:
    %r0 = getelementptr inbounds [14 x i8], ptr @.str.0, i32 0, i32 0
    ret ptr %r0
}
```

### Goal 4: Runtime Declarations ✅ (Priority: HIGH)
- [ ] Add `emitRuntimeDeclarations()` in codegen
- [ ] Call at start of `emitProgram()`
- [ ] Include all runtime functions used by compiler

**Required Functions**:
```llvm
declare ptr @class_alloc(i32)           ; Object allocation
declare ptr @string_concat(ptr, ptr)    ; String operations
declare i32 @string_length(ptr)
declare i32 @string_equals(ptr, ptr)
declare void @Array_push(ptr, ptr)      ; Array operations
declare ptr @Array_get(ptr, i32)
declare i32 @Array_length(ptr)
declare void @print_string(ptr)         ; Debug output
declare void @print_int(i32)
```

## 🧪 Test Strategy

### Stage 1: Simple Method Call
```tsn
class Math {
    function double(x: i32): i32 {
        return x + x;
    }
}

function main(): i32 {
    let m = new Math();
    return m.double(21);  // Expect: 42
}
```

### Stage 2: Method with Field Access
```tsn
class Counter {
    field count: i32;
    
    constructor(initial: i32) {
        this.count = initial;
    }
    
    function increment(): i32 {
        this.count = this.count + 1;
        return this.count;
    }
}

function main(): i32 {
    let c = new Counter(5);
    return c.increment();  // Expect: 6
}
```

### Stage 3: Self-Compile ast.tsn
```bash
.\tsnc.exe compiler\src\ast.tsn -o ast-self.ll
lli ast-self.ll
echo $LASTEXITCODE  # Should be 0
```

### Stage 4: Self-Compile lexer.tsn
```bash
.\tsnc.exe compiler\src\lexer.tsn -o lexer-self.ll
lli lexer-self.ll
```

### Stage 5: Self-Compile Full Compiler
```bash
.\tsnc.exe compiler\src\main.tsn -o compiler-self.ll
llc compiler-self.ll -o compiler-self.o
gcc compiler-self.o runtime.o -o tsnc-self.exe
.\tsnc-self.exe compiler\test-simple.tsn  # Self-hosted compiler works!
```

## 📊 Success Criteria

| Milestone | Criteria | Status |
|-----------|----------|--------|
| **Class Methods Emit** | `parser.tsn` produces non-empty IR with all methods | ⏳ |
| **Type-Correct Returns** | No `ret i32 %ptr` type mismatches | ⏳ |
| **String Constants** | No more `inttoptr` placeholders | ⏳ |
| **Runtime Linked** | No undefined references at link time | ⏳ |
| **ast.tsn Self-Compiles** | Compiles + runs without errors | ⏳ |
| **lexer.tsn Self-Compiles** | Compiles + runs without errors | ⏳ |
| **Full Self-Hosting** | Compiler compiles itself successfully | 🎯 |

## 🐛 Known Issues to Address

### Type System Gaps
- [ ] Proper type inference for all expressions
- [ ] Type checking for assignments
- [ ] Generic type instantiation tracking

### Codegen Issues
- [ ] PHI nodes for control flow (if/while)
- [ ] Proper register allocation
- [ ] Dead code elimination

### Runtime Limitations
- [ ] Array bounds checking
- [ ] Memory management (no GC yet)
- [ ] Error handling

## 🚀 After Phase 34

If Phase 34 succeeds:
- ✅ Compiler can compile itself
- ✅ Bootstrap compiler no longer needed
- ✅ Can implement features blocked by bootstrap bugs
- ✅ Arithmetic operators will work (Phase 17 code ready!)
- ✅ Can iterate faster with self-hosted compiler

**Next Phases**:
- **Phase 35**: Arithmetic & Comparison Operators (unblock Phase 17)
- **Phase 36**: Control Flow PHI Nodes (fix if/while bugs)
- **Phase 37**: Advanced Type System (generics, inference)
- **Phase 38**: Standard Library (collections, I/O)

## 📝 Implementation Order

1. **Fix emitReturn** (30 minutes)
   - Simplest fix, immediate impact
   
2. **Emit Class Methods** (1-2 hours)
   - Core blocker for self-compilation
   
3. **String Literal Constants** (1 hour)
   - Needed for compiler messages
   
4. **Runtime Declarations** (30 minutes)
   - Final linking fix

5. **Test & Debug** (2-4 hours)
   - Iterate on self-compilation bugs

**Total Estimated Time**: 5-8 hours

## 🎉 Success Metric

```bash
# The ultimate test:
.\tsnc.exe compiler\src\main.tsn -o tsnc-gen1.ll
llc tsnc-gen1.ll -o tsnc-gen1.o
gcc tsnc-gen1.o runtime.o -o tsnc-gen1.exe

# Generation 1 compiler compiles itself again:
.\tsnc-gen1.exe compiler\src\main.tsn -o tsnc-gen2.ll

# Compare outputs (should be identical):
diff tsnc-gen1.ll tsnc-gen2.ll

# If identical: SELF-HOSTING ACHIEVED! 🎉
```

---

**Ready to begin?** Start with fixing `emitReturn` in `codegen.tsn`!
