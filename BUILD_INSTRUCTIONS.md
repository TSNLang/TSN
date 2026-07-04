# TSN Compiler Build Instructions

## Prerequisites

1. **Deno** (TypeScript runtime) - Required for building the compiler
   - Install from: https://deno.land/
   - Verify: `deno --version`

2. **Clang/LLVM** - Required for linking and compilation
   - Windows: Download from https://llvm.org/ or via Chocolatey: `choco install llvm`
   - Linux: `sudo apt install clang` or `sudo yum install clang`
   - Verify: `clang --version`

## Quick Build

Run the automated build script:

```powershell
.\build-compiler.ps1
```

This will:
1. Compile all TSN compiler modules using TypeScript/Deno
2. Link everything with Clang  
3. Produce the TSN compiler: `self-hosting/tsnc.exe`

## Manual Build (Step by Step)

If you prefer to build manually or the script fails:

### Step 1: Compile TSN Modules with TypeScript

```powershell
deno run --allow-all src/src/main.ts self-hosting/ast.tsn -o self-hosting/ast_ts.ll
deno run --allow-all src/src/main.ts self-hosting/lexer.tsn -o self-hosting/lexer_ts.ll
deno run --allow-all src/src/main.ts self-hosting/ast-parser.tsn -o self-hosting/ast-parser_ts.ll
deno run --allow-all src/src/main.ts self-hosting/mir-flat.tsn -o self-hosting/mir-flat_ts.ll
deno run --allow-all src/src/main.ts self-hosting/mir-builder-flat.tsn -o self-hosting/mir-builder-flat_ts.ll
deno run --allow-all src/src/main.ts self-hosting/mir-codegen-flat.tsn -o self-hosting/mir-codegen-flat_ts.ll
deno run --allow-all src/src/main.ts self-hosting/main.tsn -o self-hosting/main_ts.ll
```

### Step 2: Link with Clang

```powershell
clang -o self-hosting/tsnc.exe `
    self-hosting/ast_ts.ll `
    self-hosting/lexer_ts.ll `
    self-hosting/ast-parser_ts.ll `
    self-hosting/mir-flat_ts.ll `
    self-hosting/mir-builder-flat_ts.ll `
    self-hosting/mir-codegen-flat_ts.ll `
    self-hosting/main_ts.ll `
    src/std/string.ll `
    src/std/array.ll `
    src/std/console.ll `
    src/std/memory.ll `
    src/std/array_token.ll `
    src/tsn_runtime_stubs_linking.ll `
    src/tsn_runtime.c `
    -Wno-override-module
```

## Using the Compiler

### Compile a TSN Program

```powershell
# Step 1: Compile TSN to LLVM IR
.\self-hosting\tsnc.exe your-program.tsn

# Step 2: Link with runtime and stdlib
clang output.ll `
    src/std/string.ll `
    src/std/array.ll `
    src/std/console.ll `
    src/std/memory.ll `
    src/std/array_token.ll `
    src/tsn_runtime_stubs_linking.ll `
    src/tsn_runtime.c `
    -o your-program.exe

# Step 3: Run
.\your-program.exe
```

### Example: Hello World

Create `hello.tsn`:

```typescript
import { log } from "std:console";

function main(): void {
    log("Hello, TSN!");
}
```

Compile and run:

```powershell
.\self-hosting\tsnc.exe hello.tsn
clang output.ll src/std/*.ll src/tsn_runtime*.ll src/tsn_runtime.c -o hello.exe
.\hello.exe
```

## Troubleshooting

### Deno Not Found

```
ERROR: Deno is not installed!
```

**Solution**: Install Deno from https://deno.land/

### Clang Not Found

```
ERROR: Clang is not installed!
```

**Solution**: Install LLVM/Clang from https://llvm.org/

### Compilation Errors

If you get errors during compilation:

1. Ensure all files are up to date: `git pull`
2. Clean build artifacts: `rm self-hosting/*.ll`
3. Rebuild: `.\build-compiler.ps1`

## Bootstrap Process

TSN uses a **bootstrap compiler** approach:

1. **Bootstrap Compiler** (TypeScript/Deno) compiles TSN source → LLVM IR
2. **TSN Compiler** (LLVM IR) is linked with Clang → Native executable
3. **Result**: Self-hosted TSN compiler that can compile TSN programs

For more details on the bootstrap process and known limitations, see [BOOTSTRAP.md](BOOTSTRAP.md).

## Next Steps

- Read [BOOTSTRAP.md](BOOTSTRAP.md) for technical details
- Check [examples/](examples/) for sample TSN programs
- See [docs/](docs/) for language documentation
- Read [CHANGELOG.md](CHANGELOG.md) for version history
