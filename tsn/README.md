# TSN Self-Hosting Compiler

> **This is the PRIMARY compiler** - Written in TSN, compiling TSN

## 🎯 Goal

Replace the C++ bootstrap compiler (`src/main.cpp`) with a compiler written entirely in TSN.

## 📊 Status: ~60% Complete

```
✅ Week 1: Lexer (Complete)
🚧 Week 2: Parser (60% - In Progress)
⏳ Week 3: Codegen + Bootstrap
```

## 📁 Files

### Core Components (Priority Order)

1. **lexer.tsn** ✅
   - Full tokenization
   - Keyword recognition
   - String/number parsing
   - Status: COMPLETE

2. **expr_parser.tsn** ✅
   - Primary expressions (numbers, identifiers)
   - Binary operators (+, -, *, /)
   - Status: COMPLETE

3. **stmt_parser.tsn** 🚧
   - Variable declarations (let, const)
   - Assignments
   - Return statements
   - Control flow (if, while, for)
   - Status: NEXT (2-3 days)

4. **func_parser.tsn** ⏳
   - Function signatures
   - Parameter lists
   - Return types
   - Function bodies
   - Status: AFTER stmt_parser

5. **codegen.tsn** ⏳
   - LLVM IR generation
   - Function definitions
   - Variable declarations
   - Expressions
   - Control flow
   - Status: Week 3

6. **compiler.tsn** ⏳
   - Main integration
   - File I/O
   - Error handling
   - Status: Week 3

### Prototypes (Learning/Testing)

- **mini_compiler_v2.tsn** - Lexer + simple parser + codegen (working)
- **mini_compiler_v3.tsn** - Added file I/O (FFI issues)
- **lexer_simple.tsn** - Simplified lexer for learning
- **simple_parser.tsn** - Basic parser experiments
- **minimal_parser.tsn** - Minimal parser prototype

## 🚀 Quick Start

### Compile a component
```bash
# From project root
./build/Release/tsnc.exe tsn/expr_parser.tsn --emit=exe -o test.exe
./test.exe
```

### Test the current compiler
```bash
# Compile mini_compiler_v2
./build/Release/tsnc.exe tsn/mini_compiler_v2.tsn --emit=exe -o compiler.exe

# Run it
./compiler.exe
```

## 📝 Development Guidelines

### Adding a New Component

1. **Create file**: `tsn/new_component.tsn`
2. **Import console**: `import * as console from "std:console";`
3. **Define constants**: Token kinds, AST node types
4. **Implement logic**: Parsing/generation functions
5. **Add tests**: `main()` function with test cases
6. **Compile & test**: Use C++ bootstrap compiler
7. **Integrate**: Add to main compiler when ready

### Code Style

```tsn
// Use descriptive names
function parse_statement(tokens: ptr<i32>, pos: ptr<i32>): i32 {
    // Implementation
}

// Test in main()
function main(): void {
    console.log("=== Component Test ===");
    // Test cases
    console.log("All tests PASSED!");
}
```

### Testing Pattern

```tsn
// Setup test data
let tokens: i32[10];
tokens[0] = TK_NUMBER;

// Call function
let result = parse_something(tokens, ...);

// Verify result
console.log("Test: OK");
```

## 🎓 Architecture

```
Source Code (.tsn)
    ↓
[lexer.tsn] → Tokens
    ↓
[expr_parser.tsn] → Expression AST
[stmt_parser.tsn] → Statement AST  
[func_parser.tsn] → Function AST
    ↓
[codegen.tsn] → LLVM IR
    ↓
[compiler.tsn] → File I/O + Integration
    ↓
LLVM IR (.ll) → Native Executable
```

## 📋 Current Focus

**Week 2, Day 2: Statement Parser**

File: `stmt_parser.tsn`

Parse:
- `let x: i32 = 42;` - Variable declaration
- `x = 100;` - Assignment
- `return x;` - Return statement
- `if (x > 0) { ... }` - If statement
- `while (x < 10) { ... }` - While loop

**Estimated time**: 2-3 days

## 🏆 Success Criteria

### Self-Hosting Achieved
```bash
# Step 1: C++ compiler compiles TSN compiler
./build/Release/tsnc.exe tsn/compiler.tsn -o tsnc_v1.exe

# Step 2: TSN compiler compiles itself
./tsnc_v1.exe tsn/compiler.tsn -o tsnc_v2.exe

# Step 3: Verify outputs match
# tsnc_v1 and tsnc_v2 should produce identical results
```

### C++ Compiler Retirement
- Move `src/main.cpp` to `archive/`
- All development in TSN
- Community contributes in TSN, not C++

## 📚 Resources

- **AI_PROJECT_OVERVIEW.md** - Comprehensive guide for AI assistants
- **SELF_HOSTING_PLAN.md** - 3-week roadmap
- **NEXT_STEPS.md** - Current development plan
- **../examples/** - Example TSN programs

## 🤝 Contributing

1. Read `AI_PROJECT_OVERVIEW.md` first
2. Focus on current priority (check NEXT_STEPS.md)
3. Follow existing patterns (see expr_parser.tsn)
4. Test thoroughly
5. Commit with clear messages

## ⚠️ Important Notes

- **This is the PRIMARY compiler** - Not the C++ one
- **C++ compiler is temporary** - Only for bootstrapping
- **Self-hosting is priority #1** - Everything else is secondary
- **Test each component** - Don't skip testing
- **Keep it simple** - Complexity comes after self-hosting

---

**Current Status**: Week 2, Day 2 - Parser phase

**Next Milestone**: Statement parser complete (2-3 days)

**Final Goal**: Self-hosting achieved (1-2 weeks)

🚀 **Let's make TSN self-hosting!** 🚀
