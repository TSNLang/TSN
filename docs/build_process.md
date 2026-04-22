# TSN Build Process

TSN uses a simple 2-step build process to compile `.tsn` source files into native executables.

## Build Steps

### Step 1: Compile TSN to LLVM IR

```bash
deno run --allow-read --allow-write --allow-run --allow-env src/src/main.ts <input.tsn> -o <output.ll>
```

This step:
- Parses the TSN source code
- Performs type checking and semantic analysis
- Generates LLVM IR (Intermediate Representation) in `.ll` format

**Example:**
```bash
deno run --allow-read --allow-write --allow-run --allow-env src/src/main.ts examples/nested-generic-smoke.tsn -o examples/nested-generic-smoke.ll
```

### Step 2: Compile LLVM IR to Native Executable

```bash
clang <output.ll> src/tsn_runtime.c -o <executable>
```

This step:
- Compiles the LLVM IR to native machine code
- Links with the TSN runtime (`tsn_runtime.c`)
- Produces a standalone executable

**Example:**
```bash
clang examples/nested-generic-smoke.ll src/tsn_runtime.c -o examples/nested-generic-smoke.exe
```

## Complete Example

```bash
# Compile TSN to LLVM IR
deno run --allow-read --allow-write --allow-run --allow-env src/src/main.ts examples/generic-method-advanced.tsn -o examples/generic-method-advanced.ll

# Compile LLVM IR to executable
clang examples/generic-method-advanced.ll src/tsn_runtime.c -o examples/generic-method-advanced.exe

# Run the executable
./examples/generic-method-advanced.exe
```

## Output Files

- `.ll` - LLVM IR text format (human-readable intermediate representation)
- `.exe` (Windows) / no extension (Linux/macOS) - Native executable

## Requirements

- **Deno**: For running the TSN compiler
- **Clang**: For compiling LLVM IR to native code
- **LLVM**: Clang includes LLVM toolchain

## Notes

- The `.ll` extension is important - it tells Clang that the input is LLVM IR
- The TSN runtime (`src/tsn_runtime.c`) provides essential functions like memory management and reference counting
- On Windows, executables typically have `.exe` extension
- On Linux/macOS, executables typically have no extension
