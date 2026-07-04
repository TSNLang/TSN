# Python Bootstrap Compiler Status

## ✅ Hoàn thành

### 1. Lexer (100%)
- ✅ Tokenize keywords, identifiers, numbers, strings
- ✅ Handle comments
- ✅ Track line/column numbers
- ✅ All operators

**Test**: ✅ 612 tokens from ast.tsn

### 2. Parser (95%)
- ✅ Import declarations
- ✅ Class declarations
- ✅ Function declarations
- ✅ Statements: return, var decl, if, while, block
- ✅ Expressions: binary, call, member, new, literals
- ⚠️ Generic types in fields (Array<T>) - needs work

**Test**: ✅ Simple functions parse correctly

### 3. AST (100%)
- ✅ Complete AST node definitions
- ✅ Dataclasses for clean structure

## ❌ Cần làm tiếp

### 1. Generic Type Parsing
```python
# Hiện tại: fails on Array<Expr>
# Cần: parse angle brackets và type parameters
```

**Fix**: Add `parse_type()` method để handle:
- Simple types: `i32`, `string`
- Generic types: `Array<T>`, `Array<Expr>`

### 2. Codegen (0%)
Cần implement LLVM IR generation:

```python
class Codegen:
    def generate(self, program: Program) -> str:
        # Generate LLVM IR từ AST
        pass
```

**Features needed**:
- Class definitions → struct types
- Functions → LLVM functions
- Statements → LLVM instructions
- Expressions → LLVM values

## 🎯 Next Steps (Priority Order)

### Step 1: Fix Generic Type Parsing ⚠️ CRITICAL
```python
def parse_type(self) -> str:
    # Handle: i32, string, Array<Expr>, etc.
    name = self.consume('IDENTIFIER').value
    
    if self.match('LT'):
        # Generic type
        type_param = self.parse_type()  # Recursive
        self.consume('GT')
        return f"{name}<{type_param}>"
    
    return name
```

**Time**: 30 minutes

### Step 2: Implement Codegen - Minimal ⭐ NEXT
Generate **just enough** LLVM IR to compile:
- ✅ Forward declarations
- ✅ Class structs
- ✅ Functions
- ✅ Basic expressions

**Time**: 2-3 hours

### Step 3: Test with compiler v2 files
```bash
python bootstrap/compiler.py compiler/src/ast.tsn -o compiler/build/ast.ll
python bootstrap/compiler.py compiler/src/lexer.tsn -o compiler/build/lexer.ll
python bootstrap/compiler.py compiler/src/parser.tsn -o compiler/build/parser.ll
```

### Step 4: Link and test
```bash
clang -o compiler/tsnc.exe \
    compiler/build/*.ll \
    src/std/*.ll \
    src/tsn_runtime.c
```

### Step 5: Self-compile!
```bash
# Use compiler v2 to compile itself!
./compiler/tsnc.exe compiler/src/ast.tsn
```

## 📊 Progress

```
Lexer:    ████████████████████ 100%
Parser:   ███████████████████░  95%
Codegen:  ░░░░░░░░░░░░░░░░░░░░   0%
Overall:  █████████░░░░░░░░░░░  45%
```

## 💡 Estimated Time to Working Compiler

- Fix generic parsing: 30 min
- Basic codegen: 3 hours
- Testing & fixes: 2 hours
- **Total: ~6 hours work**

## 🔥 Quick Win Option

Thay vì implement full codegen, có thể:

1. **Simplify AST files** - Remove generics from fields temporarily
2. **Generate simpler IR** - Hardcode common patterns
3. **Get working faster** - Polish later

**Trade-off**: Less elegant, but works!

---

**Recommendation**: Fix generic parsing ngay → implement basic codegen → test → iterate
