# TSN Self-Hosting Plan

**Goal**: Write TSN compiler entirely in TSN, then bootstrap it.

**Timeline**: 2-3 weeks

**Status**: Week 1 - Lexer Complete ✅

---

## Week 1: Lexer + Parser (IN PROGRESS)

### ✅ Completed
- [x] String operations (length, char_at, equals, concat)
- [x] Full lexer with all tokens
- [x] Keyword recognition
- [x] Comment skipping
- [x] String literal parsing
- [x] All operators (==, !=, <=, >=, &&, ||, etc.)

### 🚧 In Progress
- [ ] Parser - Expression parsing
- [ ] Parser - Statement parsing  
- [ ] Parser - Function definitions
- [ ] Parser - Struct definitions

### Parser Requirements
```typescript
// Need to parse:
function add(a: i32, b: i32): i32 {
    return a + b;
}

interface Point {
    x: i32;
    y: i32;
}

let p: Point = { x: 10, y: 20 };
```

---

## Week 2: LLVM IR Generator

### Code Generation Tasks
- [ ] Function definitions → `define i32 @add(...)`
- [ ] Variable declarations → `%var = alloca i32`
- [ ] Expressions → arithmetic, comparisons
- [ ] Control flow → if/else, while, for
- [ ] Struct types → `%Point = type { i32, i32 }`
- [ ] Function calls → `call i32 @add(...)`

### IR String Building
```typescript
// Example: Generate function definition
let ir = "define i32 @";
ir = string_concat(ir, functionName);
ir = string_concat(ir, "(");
// ... build parameter list
ir = string_concat(ir, ") {");
```

---

## Week 3: Bootstrap + Testing

### Bootstrap Process
1. **Compile TSN compiler with C++ compiler**
   ```bash
   tsnc_cpp tsn/compiler.tsn -o tsnc_v1.exe
   ```

2. **Use TSN compiler to compile itself**
   ```bash
   tsnc_v1.exe tsn/compiler.tsn -o tsnc_v2.exe
   ```

3. **Verify both produce identical output**
   ```bash
   tsnc_v1.exe test.tsn -o test1.exe
   tsnc_v2.exe test.tsn -o test2.exe
   # Compare outputs
   ```

### Testing Strategy
- Test each component individually
- Start with simple programs (hello world)
- Gradually add complexity
- Compare output with C++ compiler

---

## Current Capabilities

### ✅ C++ Compiler Has
- Full lexer & parser
- Complete LLVM IR generation
- All language features:
  - Functions, structs, arrays
  - For/while loops, if/else
  - Object literals
  - String operations
  - FFI support

### ✅ TSN Compiler Has (So Far)
- Full lexer (just completed!)
- String operations for IR generation
- Arrays for storing tokens/AST

### ❌ TSN Compiler Needs
- Parser (expressions, statements, types)
- AST builder
- LLVM IR generator
- File I/O for reading source and writing output

---

## Key Insights

### Why This Will Work
1. **String operations** - Can build LLVM IR as strings ✅
2. **Arrays** - Can store tokens and AST nodes ✅
3. **Lexer** - Can tokenize TSN source ✅
4. **No complex features needed** - Just parse and generate text

### Simplifications for MVP
- Generate LLVM IR as text (not binary)
- Use simple string concatenation
- Fixed-size arrays (1000 tokens, 500 AST nodes)
- No optimization passes
- Minimal error handling

### Critical Path
```
Source Code (TSN)
    ↓
Lexer (TSN) ✅
    ↓
Parser (TSN) ← NEXT
    ↓
IR Generator (TSN)
    ↓
LLVM IR Text
    ↓
C++ Compiler (llc + lld-link)
    ↓
Executable
```

---

## Next Steps (This Week)

1. **Write expression parser** (2 days)
   - Binary expressions (+, -, *, /, ==, !=, etc.)
   - Primary expressions (numbers, identifiers, calls)
   - Precedence handling

2. **Write statement parser** (2 days)
   - Let/const declarations
   - Assignments
   - Return statements
   - If/else, while, for

3. **Write function parser** (1 day)
   - Function signatures
   - Parameter lists
   - Return types
   - Function bodies

4. **Test parser** (1 day)
   - Parse simple functions
   - Parse complex expressions
   - Verify AST structure

---

## Success Criteria

### Milestone 1: Self-Hosting Achieved
- TSN compiler written in TSN compiles itself
- Output is identical to C++ compiler output
- Can compile all example programs

### Milestone 2: Feature Parity
- TSN compiler supports all features of C++ compiler
- Performance is acceptable (< 10x slower)
- Code is maintainable

### Milestone 3: Independence
- No longer need C++ compiler for development
- Can add new features in TSN
- Community can contribute in TSN

---

## Risk Mitigation

### Potential Issues
1. **Performance** - TSN compiler might be slow
   - Mitigation: Optimize after bootstrap
   
2. **Bugs** - Hard to debug compiler written in itself
   - Mitigation: Keep C++ compiler for comparison
   
3. **Complexity** - Parser/codegen might be too complex
   - Mitigation: Start simple, add features incrementally

### Fallback Plan
If self-hosting proves too difficult:
- Keep C++ compiler as primary
- Use TSN for tools and libraries
- Revisit self-hosting later

---

## Motivation

**Why self-hosting matters:**
- Proves the language is mature
- Dogfooding - we use what we build
- Community can contribute without learning C++
- Avoids the fate of abandoned projects
- Shows TSN is production-ready

**The graveyard of TypeScript-to-native compilers:**
- TypeScriptCompiler (7+ years dormant)
- tsll (inactive)
- StaticScript (inactive)
- llts (inactive)
- ts-llvm (inactive)

**TSN will be different because:**
- Self-hosting = active development
- Self-hosting = community can contribute
- Self-hosting = project survives

---

**Let's make history! 🚀**

*Made with ❤️ in Ho Chi Minh City, Vietnam*
