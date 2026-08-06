# TSN Compiler v2

This is the next-generation TSN compiler, bootstrapped from the Python compiler in `bootstrap/`.

## Project Structure

```
compiler/
├── src/              # TSN source files for the compiler
│   ├── ast.tsn       # AST node definitions
│   ├── lexer.tsn     # Tokenizer
│   ├── parser.tsn    # Parser (TSN → AST)
│   ├── codegen.tsn   # Code generator (AST → LLVM IR)
│   └── main.tsn      # Main entry point
├── runtime/          # C runtime library
│   └── tsn_runtime.c # Memory management, string ops, array ops, etc.
└── tsnc.exe          # Compiled executable

bootstrap/
├── compiler.py       # Python bootstrap compiler (TSN → LLVM IR)
├── build-v2.ps1      # Build script
└── *.ll              # Generated LLVM IR files
```

## Build Instructions

1. **Generate LLVM IR from TSN source:**
   ```powershell
   python bootstrap\compiler.py compiler\src\ast.tsn -o bootstrap\ast.ll
   python bootstrap\compiler.py compiler\src\lexer.tsn -o bootstrap\lexer.ll
   python bootstrap\compiler.py compiler\src\parser.tsn -o bootstrap\parser.ll
   python bootstrap\compiler.py compiler\src\codegen.tsn -o bootstrap\codegen.ll
   python bootstrap\compiler.py compiler\src\main.tsn -o bootstrap\main.ll
   ```

2. **Build the compiler executable:**
   ```powershell
   .\bootstrap\build-v2.ps1
   ```

   This will:
   - Verify LLVM IR files
   - Compile the C runtime (`runtime/tsn_runtime.c`)
   - Link everything into `compiler/tsnc.exe`

## Current Status (Phase 9)

**✅ Working Features:**
- ✓ Lexer - Tokenizes TSN source code
- ✓ Parser - Parses tokens into AST
- ✓ Codegen - Generates LLVM IR from AST
- ✓ Function declarations
- ✓ Function parameters
- ✓ Binary expressions (`+`, `-`, `*`, `/`)
- ✓ Number literals
- ✓ Return statements
- ✓ Identifier references (parameters)

**Test Example:**
```typescript
function add(a: i32, b: i32): i32 {
    return a + b;
}
```

Successfully compiles to working LLVM IR!

**🔧 Known Limitations:**
- No polymorphism/inheritance support yet (workaround implemented for Phase 9)
- Complex nested expressions not fully supported
- Local variables (`let x = value;`) not implemented
- No control flow (if/while/for)
- No classes/methods yet

## Testing

```powershell
# Run the compiler
.\compiler\tsnc.exe compiler\src\test-simple.tsn -o output.ll

# Compile and run the output
clang output.ll compiler\runtime\tsn_runtime.c -o test.exe
.\test.exe
```

## Next Steps (Phase 10+)

1. Fix polymorphism (proper vtables or type tags)
2. Support local variables
3. Add control flow (if/while/for)
4. Implement classes and methods
5. Full self-hosting (compiler compiles itself)

## Dependencies

- Python 3.8+ (for bootstrap compiler)
- LLVM/Clang (for compiling LLVM IR)
- Windows (PowerShell scripts)

## License

See LICENSE file in the root directory.
