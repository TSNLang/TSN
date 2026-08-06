# Python Bootstrap Compiler

Minimal TSN compiler viết bằng Python để bootstrap compiler v2.

## Mục tiêu

**CHỈ compile đủ để build compiler v2** - không cần full features!

### Features Needed
- ✅ Lexer: tokenize TSN code
- ✅ Parser: parse functions, classes, statements
- ✅ Codegen: generate LLVM IR (basic)
- ❌ NO type checking
- ❌ NO optimization
- ❌ NO error recovery

### Target Files
```
compiler/src/ast.tsn        → compiler/build/ast.ll
compiler/src/lexer.tsn      → compiler/build/lexer.ll  
compiler/src/parser.tsn     → compiler/build/parser.ll
compiler/src/main.tsn       → compiler/build/main.ll
```

## Usage

```bash
python bootstrap/compiler.py compiler/src/ast.tsn -o compiler/build/ast.ll
```

## Architecture

```
compiler.py
├── Lexer        # Tokenizer
├── Parser       # AST builder
├── TypeInfo     # Simple type tracking
└── Codegen      # LLVM IR generator
```

## Implementation Notes

### Keep It SIMPLE
- No fancy algorithms
- Direct translation
- Minimal abstractions

### Shortcuts OK
- Hardcode common patterns
- Skip edge cases
- Manual type annotations where needed

### Goal: Working, Not Perfect
- Code quality: Good enough ✓
- Full features: NO ✗
- Compiles v2: YES ✓
