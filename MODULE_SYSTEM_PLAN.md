# Module System Plan for TSN

**Date**: 2026-04-14  
**Version**: v0.10.0-indev  
**Status**: 🔄 In Progress

## Goal

Create a module system that allows:
1. Compiling TSN modules separately (Lexer.tsn, Parser.tsn, Codegen.tsn)
2. Linking them together into a complete compiler
3. Using the TSN compiler to compile itself (self-hosting)

## Approach: File Concatenation

Since TSN doesn't have a native module system yet, we use **file concatenation**:

1. **Define shared globals** in FullCompiler.tsn
2. **Concatenate module functions** (without duplicate definitions)
3. **Compile as single file**
4. **Link with LLVM**

## Implementation

### Tool: `concat-modules.ts`

**Purpose**: Concatenate multiple TSN files into one, removing duplicates

**Features**:
- ✅ Removes duplicate interface definitions
- ✅ Removes duplicate const definitions
- ✅ Removes duplicate global variables
- ✅ Keeps all function definitions
- ✅ Preserves comments
- ✅ Adds module markers

**Usage**:
```bash
deno run --allow-read --allow-write compiler-ts/concat-modules.ts \
  output.tsn module1.tsn module2.tsn module3.tsn
```

**Example**:
```bash
deno run --allow-read --allow-write compiler-ts/concat-modules.ts \
  src/FullCompiler_v1.tsn src/Types.tsn src/Lexer.tsn src/Parser.tsn src/Codegen.tsn
```

### Structure: `FullCompiler.tsn`

**Purpose**: Main compiler file with shared global state

**Contents**:
1. **Global arrays** (shared between modules):
   ```tsn
   let source: i32[100000];      // Input source code
   let tokens: Token[10000];     // Lexer output
   let nodes: ASTNode[5000];     // Parser output
   let output: i32[500000];      // Codegen output
   ```

2. **Type definitions** (from Types.tsn):
   - Token types (TK_*)
   - AST node types (AST_*)
   - Structures (Token, ASTNode)

3. **Compiler pipeline**:
   ```tsn
   function compile(): i32 {
       lex();      // Lexer
       parse();    // Parser
       generate(); // Codegen
       return 0;
   }
   ```

4. **Main entry point**:
   ```tsn
   function main(): i32 {
       // Initialize
       // Run compilation
       return compile();
   }
   ```

## Compilation Strategy

### Option 1: Single File (Current)

**Process**:
1. Concatenate all modules → `FullCompiler_Complete.tsn`
2. Compile → `FullCompiler_Complete.ll`
3. Link → `tsnc.exe`

**Pros**:
- ✅ Simple
- ✅ No linking issues
- ✅ Fast compilation

**Cons**:
- ❌ Large file (~3000 lines)
- ❌ Slow to edit
- ❌ Hard to debug

### Option 2: Separate Compilation (Future)

**Process**:
1. Compile each module separately:
   ```bash
   tsnc Lexer.tsn -o Lexer.ll
   tsnc Parser.tsn -o Parser.ll
   tsnc Codegen.tsn -o Codegen.ll
   tsnc Main.tsn -o Main.ll
   ```

2. Compile to object files:
   ```bash
   clang -c Lexer.ll -o Lexer.o
   clang -c Parser.ll -o Parser.o
   clang -c Codegen.ll -o Codegen.o
   clang -c Main.ll -o Main.o
   ```

3. Link together:
   ```bash
   clang Lexer.o Parser.o Codegen.o Main.o -o tsnc.exe
   ```

**Pros**:
- ✅ Modular
- ✅ Fast incremental compilation
- ✅ Easy to debug

**Cons**:
- ❌ Requires proper module system
- ❌ Need to handle global state
- ❌ More complex

## Current Status

### ✅ Completed

1. **concat-modules.ts** tool
   - Removes duplicates
   - Preserves functions
   - Adds markers

2. **FullCompiler.tsn** skeleton
   - Global arrays defined
   - Type definitions
   - Pipeline structure
   - Compiles successfully

### 🔄 In Progress

1. **Concatenate all modules**
   - Types.tsn ✅
   - Lexer.tsn (needs adaptation)
   - Parser.tsn (needs adaptation)
   - Codegen.tsn (needs adaptation)

2. **Fix global variable issues**
   - Lexer has its own globals
   - Parser has its own globals
   - Codegen has its own globals
   - Need to use shared globals from FullCompiler

### ⏳ TODO

1. **Adapt modules to use shared globals**
   - Remove local global declarations
   - Use globals from FullCompiler
   - Update function signatures if needed

2. **Implement compiler pipeline**
   - Connect lexer → parser → codegen
   - Handle errors
   - Return results

3. **Add FFI for file I/O**
   - Read source file
   - Write output file
   - Command-line arguments

4. **Test compilation**
   - Simple programs
   - Complex programs
   - Self-compilation

## Module Adaptation Guide

### Lexer.tsn

**Current globals** (to remove):
```tsn
let source: i32[100000];
let sourceLen: i32;
let tokens: Token[10000];
let tokenCount: i32;
let pos: i32;
let line: i32;
let column: i32;
```

**Use instead** (from FullCompiler):
```tsn
// Already defined in FullCompiler.tsn
// source, tokens, tokenCount
```

**Additional state** (keep as function parameters or local):
```tsn
// Pass as parameters or use local variables
let pos: i32 = 0;
let line: i32 = 1;
let column: i32 = 1;
```

### Parser.tsn

**Current globals** (to remove):
```tsn
let tokens: Token[10000];
let tokenCount: i32;
let nodes: ASTNode[5000];
let nodeCount: i32;
let currentPos: i32;
```

**Use instead** (from FullCompiler):
```tsn
// Already defined in FullCompiler.tsn
// tokens, tokenCount, nodes, nodeCount
```

**Additional state** (keep as function parameters or local):
```tsn
let currentPos: i32 = 0;
```

### Codegen.tsn

**Current globals** (to remove):
```tsn
let nodes: ASTNode[5000];
let nodeCount: i32;
let source: i32[100000];
let sourceSize: i32;
let output: i32[500000];
let outputSize: i32;
```

**Use instead** (from FullCompiler):
```tsn
// Already defined in FullCompiler.tsn
// nodes, nodeCount, source, sourceSize, output, outputSize
```

**Additional state** (keep as local):
```tsn
// Counters, registries, etc.
let tempCounter: i32 = 0;
let labelCounter: i32 = 0;
// ...
```

## Timeline

### Phase 1: Module Concatenation (1-2 hours)
- ✅ Create concat-modules.ts tool
- ✅ Create FullCompiler.tsn skeleton
- 🔄 Adapt Lexer.tsn
- 🔄 Adapt Parser.tsn
- 🔄 Adapt Codegen.tsn
- 🔄 Concatenate all modules

### Phase 2: Integration (1-2 hours)
- Implement compiler pipeline
- Connect modules
- Handle errors
- Test with simple programs

### Phase 3: FFI and I/O (1-2 hours)
- Add file reading
- Add file writing
- Command-line arguments
- Test with real files

### Phase 4: Self-Hosting (2-4 hours)
- Compile FullCompiler.tsn with TypeScript compiler
- Test the TSN compiler
- Compile FullCompiler.tsn with TSN compiler
- Bootstrap verification

**Total Estimated Time**: 5-10 hours

## Benefits

### Modular Development
- ✅ Each module can be developed independently
- ✅ Easy to test individual components
- ✅ Clear separation of concerns

### Incremental Compilation
- ✅ Only recompile changed modules
- ✅ Faster development cycle
- ✅ Better debugging

### Self-Hosting
- ✅ TSN compiler written in TSN
- ✅ Bootstrap capability
- ✅ Proof of language completeness

## Challenges

### Global State Management
- **Problem**: Each module has its own globals
- **Solution**: Use shared globals from FullCompiler
- **Impact**: Need to adapt all modules

### Function Naming
- **Problem**: Potential name conflicts
- **Solution**: Use prefixes (lex_*, parse_*, gen_*)
- **Impact**: Need to rename functions

### Type Sharing
- **Problem**: Duplicate type definitions
- **Solution**: Define once in FullCompiler
- **Impact**: Remove duplicates from modules

## Next Steps

1. **Adapt Lexer.tsn**
   - Remove global declarations
   - Use shared globals
   - Test compilation

2. **Adapt Parser.tsn**
   - Remove global declarations
   - Use shared globals
   - Test compilation

3. **Adapt Codegen.tsn**
   - Remove global declarations
   - Use shared globals
   - Test compilation

4. **Concatenate and test**
   - Create FullCompiler_Complete.tsn
   - Compile with TypeScript compiler
   - Test with simple programs

5. **Add FFI and I/O**
   - File operations
   - Command-line handling
   - Error reporting

6. **Self-hosting test**
   - Compile with TSN compiler
   - Verify output
   - Bootstrap

---

**Status**: 🔄 Module system in progress

**Next Action**: Adapt modules to use shared globals

🎯 **Goal**: Self-hosting TSN compiler by end of session!
