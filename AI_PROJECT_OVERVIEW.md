# TSN Project Overview for AI/LLM Assistants

> **Audience**: AI assistants, LLMs, and automated tools working with this codebase
> 
> **Last Updated**: April 10, 2026
> 
> **Project Status**: Self-hosting in progress (~60% complete)

---

## 🎯 Project Mission

**TSN (TypeScript Native)** is a statically-typed programming language that compiles to native executables via LLVM. The PRIMARY GOAL is **self-hosting** - writing the TSN compiler entirely in TSN itself.

### Why Self-Hosting Matters

1. **Survival** - Avoids the fate of abandoned TypeScript-to-native projects
2. **Community** - Contributors can work in TSN, not C++
3. **Dogfooding** - We use what we build
4. **Maturity** - Proves the language is production-ready

---

## 🏗️ Project Structure

```
TSN/
├── tsn/                    # 🔥 TSN COMPILER (Self-hosting - PRIMARY)
│   ├── lexer.tsn          # ✅ Full lexer (Week 1 complete)
│   ├── expr_parser.tsn    # ✅ Expression parser (Week 2 in progress)
│   ├── stmt_parser.tsn    # ⏳ Statement parser (next)
│   ├── func_parser.tsn    # ⏳ Function parser (next)
│   ├── codegen.tsn        # ⏳ LLVM IR generator (next)
│   ├── compiler.tsn       # ⏳ Main compiler (integration)
│   └── mini_compiler_*.tsn # 🧪 Incremental prototypes
│
├── src/                    # ⚙️ C++ BOOTSTRAP COMPILER (Temporary)
│   └── main.cpp           # C++ compiler - ONLY for bootstrapping
│                          # Will be REPLACED by tsn/compiler.tsn
│
├── std/                    # 📚 Standard Library (TSN)
│   ├── console.tsn        # Console I/O
│   └── fs.tsn             # File system operations
│
├── examples/               # 📝 Example programs
│   ├── hello.tsn          # Hello world
│   ├── array_test.tsn     # Array operations
│   └── *.tsn              # Various feature tests
│
├── build/                  # 🔨 Build artifacts
│   └── Release/
│       └── tsnc.exe       # C++ bootstrap compiler binary
│
└── docs/
    ├── SELF_HOSTING_PLAN.md    # 3-week self-hosting roadmap
    ├── NEXT_STEPS.md           # Current development plan
    └── AI_PROJECT_OVERVIEW.md  # This file
```

---

## 🔑 Key Concepts for AI Assistants

### 1. Two Compilers, One Goal

```
┌─────────────────────────────────────────────────────────────┐
│  C++ Compiler (src/main.cpp)                                │
│  Role: BOOTSTRAP ONLY - Temporary scaffolding              │
│  Status: Feature-complete but will be DEPRECATED           │
│  Usage: Compile TSN code until self-hosting is achieved    │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    Compiles TSN code
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  TSN Compiler (tsn/compiler.tsn)                            │
│  Role: PRIMARY COMPILER - The future                        │
│  Status: In development (~60% complete)                     │
│  Goal: Replace C++ compiler entirely                        │
└─────────────────────────────────────────────────────────────┘
```

### 2. Self-Hosting Timeline

**Current: Week 3 of 3**

```
Week 1: ✅ Lexer
  - Full tokenization
  - Keyword recognition
  - String/number parsing

Week 2: ✅ Parser (COMPLETE!)
  - ✅ Expression parser
  - ✅ Statement parser
  - ✅ Function parser
  - ✅ Integration (mini_compiler_v5)

Week 3: 🚧 Bootstrap (In Progress)
  - 🚧 File I/O (next)
  - ⏳ Self-compilation test
  - ⏳ C++ compiler retirement 🎉
```

### 3. Development Philosophy

**IMPORTANT RULES FOR AI ASSISTANTS:**

1. **Focus on TSN code** (`tsn/` directory) - This is the future
2. **C++ compiler is read-only** - Only modify for critical bugs
3. **Incremental development** - Small, testable steps
4. **Test-driven** - Every component has tests
5. **Self-hosting first** - Feature parity comes later

---

## 🛠️ How It Works

### Compilation Pipeline

```
Source Code (.tsn)
    ↓
┌─────────────────────┐
│ Lexer (tsn/lexer.tsn) │ ✅ Tokenize source
└─────────────────────┘
    ↓ Tokens
┌─────────────────────┐
│ Parser (tsn/*.tsn)   │ 🚧 Build AST
└─────────────────────┘
    ↓ AST
┌─────────────────────┐
│ Codegen (tsn/*.tsn)  │ ⏳ Generate LLVM IR
└─────────────────────┘
    ↓ LLVM IR (.ll)
┌─────────────────────┐
│ LLVM (llc)          │ ⚙️ Compile to object
└─────────────────────┘
    ↓ Object (.obj)
┌─────────────────────┐
│ Linker (lld-link)   │ ⚙️ Link to executable
└─────────────────────┘
    ↓
Executable (.exe)
```

### Current State

**What works:**
- ✅ Lexer: Full tokenization in TSN
- ✅ Expression parser: Numbers, identifiers, binary ops
- ✅ String operations: length, char_at, concat
- ✅ Arrays: Fixed-size arrays for tokens/AST
- ✅ FFI: Can call Windows API functions

**What's in progress:**
- 🚧 Statement parser: let, return, if, while
- 🚧 Function parser: function definitions
- 🚧 Integration: Combining all components

**What's next:**
- ⏳ LLVM IR generation in TSN
- ⏳ File I/O for reading source and writing IR
- ⏳ Self-compilation test

---

## 📋 Working with This Project

### For AI Assistants: Quick Start

1. **Read current status:**
   ```bash
   cat NEXT_STEPS.md          # Current development plan
   cat SELF_HOSTING_PLAN.md   # Overall roadmap
   ```

2. **Understand the priority:**
   - PRIMARY: Work on `tsn/` directory (self-hosting compiler)
   - SECONDARY: Fix bugs in examples or docs
   - AVOID: Modifying `src/main.cpp` unless critical

3. **Test your changes:**
   ```bash
   # Compile TSN code with C++ bootstrap compiler
   ./build/Release/tsnc.exe tsn/your_file.tsn --emit=exe -o output.exe
   
   # Run the executable
   ./output.exe
   ```

4. **Follow the pattern:**
   - Look at `tsn/expr_parser.tsn` as a reference
   - Use similar structure for new components
   - Test with hardcoded data first
   - Integrate incrementally

### Common Tasks

#### Task 1: Add a new parser component
```tsn
// File: tsn/new_component.tsn
import * as console from "std:console";

// Define AST node types
const AST_NEW_TYPE: i32 = 10;

interface ASTNode {
    kind: i32;
    value1: i32;
    value2: i32;
    value3: i32;
}

// Implement parsing function
function parse_new_thing(tokens: ptr<i32>, ...): i32 {
    // Implementation
    return 0;
}

// Test function
function main(): void {
    console.log("Testing new component...");
    // Test cases
}
```

#### Task 2: Test a component
```bash
# Compile
./build/Release/tsnc.exe tsn/component.tsn --emit=exe -o test.exe

# Run
./test.exe

# Expected output: Test messages showing success
```

#### Task 3: Integrate components
```tsn
// File: tsn/mini_compiler_vX.tsn
// Combine lexer + parser + codegen

function compile(source: ptr<i8>): void {
    // 1. Lex
    let tokens = lex(source);
    
    // 2. Parse
    let ast = parse(tokens);
    
    // 3. Generate IR
    let ir = codegen(ast);
    
    // 4. Output
    console.log(ir);
}
```

---

## 🎓 Language Features (for reference)

### Type System
```tsn
// Primitive types
let x: i32 = 42;           // 32-bit integer
let y: i64 = 100;          // 64-bit integer
let z: f64 = 3.14;         // 64-bit float
let b: bool = true;        // Boolean
let s: ptr<i8> = "hello";  // String (pointer to i8)

// Arrays
let arr: i32[10];          // Fixed-size array
arr[0] = 42;

// Structs
interface Point {
    x: i32;
    y: i32;
}

let p: Point = { x: 10, y: 20 };
```

### Control Flow
```tsn
// If/else
if (x > 0) {
    console.log("positive");
} else {
    console.log("negative");
}

// While loop
while (x < 10) {
    x = x + 1;
}

// For loop
for (let i = 0; i < 10; i = i + 1) {
    console.log("iteration");
}
```

### Functions
```tsn
// Function definition
function add(a: i32, b: i32): i32 {
    return a + b;
}

// Void function (like Zig, Rust, Go)
function main(): void {
    console.log("hello");
}
```

### FFI (Foreign Function Interface)
```tsn
// Declare external function
@ffi.lib("kernel32")
declare function GetStdHandle(nStdHandle: i32): ptr<void>;

// Use it
function main(): void {
    let handle = GetStdHandle(-11);
}
```

---

## 🚨 Important Notes for AI Assistants

### DO:
✅ Focus on `tsn/` directory - this is the primary compiler
✅ Write incremental, testable code
✅ Follow existing patterns (see `tsn/expr_parser.tsn`)
✅ Test each component independently
✅ Use `console.log()` for debugging
✅ Commit frequently with clear messages

### DON'T:
❌ Modify `src/main.cpp` unless absolutely necessary
❌ Add complex features before self-hosting is complete
❌ Skip testing - every component must have tests
❌ Create large, monolithic files - keep components small
❌ Assume C++ compiler will be maintained - it won't be

### When in Doubt:
1. Check `NEXT_STEPS.md` for current priorities
2. Look at existing TSN code for patterns
3. Test with simple cases first
4. Ask for clarification if goals are unclear

---

## 📊 Progress Tracking

### Self-Hosting Checklist

**Week 1: Lexer** ✅
- [x] Token kinds definition
- [x] Character classification (digit, alpha, whitespace)
- [x] Keyword recognition
- [x] String literal parsing
- [x] Number parsing
- [x] Operator tokenization
- [x] Comment skipping

**Week 2: Parser** ✅ 100%
- [x] Expression parser (primary, binary)
- [x] Statement parser (let, return, if, while)
- [x] Function parser (signatures, bodies)
- [x] Type parser (i32, ptr<T>, arrays)
- [x] Integration test (mini_compiler_v5)

**Week 3: Codegen + Bootstrap** 🚧 20%
- [x] LLVM IR generation (basic - from v2)
- [ ] File I/O (read source, write IR)
- [ ] Expanded codegen (all statements)
- [ ] Self-compilation test
- [ ] Bootstrap verification

### Success Criteria

**Milestone 1: Self-Hosting Achieved** 🎯
```bash
# Compile TSN compiler with C++ compiler
./build/Release/tsnc.exe tsn/compiler.tsn -o tsnc_v1.exe

# Compile TSN compiler with itself
./tsnc_v1.exe tsn/compiler.tsn -o tsnc_v2.exe

# Verify outputs are identical
diff tsnc_v1.exe tsnc_v2.exe
# Should be identical or functionally equivalent
```

**Milestone 2: C++ Compiler Retirement** 🎉
- TSN compiler is primary
- C++ compiler moved to `archive/` or `legacy/`
- All development happens in TSN
- Community can contribute without C++ knowledge

---

## 🔗 Related Documents

- `SELF_HOSTING_PLAN.md` - Detailed 3-week roadmap
- `NEXT_STEPS.md` - Current development priorities
- `README.md` - User-facing documentation
- `ROADMAP.md` - Long-term project vision
- `CHANGELOG.md` - Version history

---

## 💬 Communication Guidelines

### Commit Messages
```
feat: Add statement parser for let declarations
fix: Correct token position tracking in lexer
test: Add test cases for binary expressions
docs: Update self-hosting progress to 65%
```

### Code Comments
```tsn
// Good: Explains WHY
// Use fixed-size array to avoid dynamic allocation during bootstrap

// Bad: Explains WHAT (code already shows this)
// Create an array of 100 integers
```

### Progress Updates
```
Self-hosting progress: ~65%
- ✅ Lexer complete
- ✅ Expression parser complete
- 🚧 Statement parser in progress
- ⏳ Function parser next
```

---

## 🎯 Current Focus (Week 3, Day 1)

**IMMEDIATE PRIORITY: File I/O for Compiler**

File: `tsn/mini_compiler_v6.tsn`

Add file I/O to mini_compiler_v5:
```tsn
// Read source from file
let source = readFileSync("input.tsn");

// Compile
let ir = compile(source);

// Write IR to file
writeFileSync("output.ll", ir);
```

**Estimated time:** 1-2 days
**Blockers:** FFI complexity (use simplified approach)
**Dependencies:** mini_compiler_v5 (complete)

---

## 🏆 Success Metrics

### Technical Metrics
- Lines of TSN code: ~3500 (target: 4000-5000)
- Test coverage: All components have test functions
- Compilation time: < 5 seconds for self-compilation
- Binary size: < 1MB for compiler executable

### Project Health
- Self-hosting: ~80% complete (target: 100% by Week 3 end)
- C++ dependency: Decreasing (goal: 0%)
- Community readiness: Improving (goal: TSN-only contributions)
- Documentation: Excellent (comprehensive AI guides)

---

## 🤝 Contributing (for AI Assistants)

When working on this project:

1. **Understand the goal** - Self-hosting is priority #1
2. **Read the context** - Check NEXT_STEPS.md before starting
3. **Follow patterns** - Look at existing TSN code
4. **Test thoroughly** - Every component must work
5. **Document clearly** - Explain non-obvious decisions
6. **Commit often** - Small, focused commits
7. **Stay focused** - Don't add features, finish self-hosting first

---

## 📞 Quick Reference

### Build Commands
```bash
# Compile TSN file to executable
./build/Release/tsnc.exe input.tsn --emit=exe -o output.exe

# Compile to LLVM IR only
./build/Release/tsnc.exe input.tsn --emit=ll -o output.ll

# Compile to object file
./build/Release/tsnc.exe input.tsn --emit=obj -o output.obj
```

### Test Commands
```bash
# Run executable
./output.exe

# Check if file exists
Test-Path output.exe

# View LLVM IR
cat output.ll
```

### Git Commands
```bash
# Check status
git status

# Commit changes
git add -A
git commit -m "feat: Your message here"

# Push to remote
git push origin main
```

---

## 🎓 Learning Resources

### For Understanding TSN
1. Read `examples/hello.tsn` - Simplest program
2. Read `tsn/lexer.tsn` - Complete lexer implementation
3. Read `tsn/expr_parser.tsn` - Parser example
4. Read `SELF_HOSTING_PLAN.md` - Overall strategy

### For Understanding Compilers
1. Lexer: Tokenization (text → tokens)
2. Parser: Syntax analysis (tokens → AST)
3. Codegen: IR generation (AST → LLVM IR)
4. Backend: Native code (LLVM IR → executable)

### For Understanding Self-Hosting
1. Bootstrap compiler (C++) compiles TSN compiler (TSN)
2. TSN compiler compiles itself
3. Verify outputs match
4. Retire bootstrap compiler
5. Future development in TSN only

---

**Remember: The goal is self-hosting. Everything else is secondary.**

**Current status: Week 2, Day 2 - Parser phase**

**Next milestone: Statement parser complete (2-3 days)**

**Final goal: Self-hosting achieved (1-2 weeks)**

🚀 Let's make TSN self-hosting! 🚀

---

*Document maintained for AI assistants working with TSN*
*Last updated: April 10, 2026*
*Project location: Ho Chi Minh City, Vietnam* 🇻🇳
