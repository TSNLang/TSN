# TSN MVP

## Build (Windows, CMake + llvm-config)

Prereqs:
- `llvm-config` must be in `PATH`.
- A working MSVC toolchain.

Commands:

```powershell
cmake -S . -B build
cmake --build build --config Release
```

The compiler binary will be at:

- `build\Release\tsnc.exe`

## Run (emit LLVM IR)

```powershell
build\Release\tsnc.exe examples\hello.tsn --emit=ll -o build\hello.ll
```

This produces `build\hello.ll`.

## Emit object (.obj)

```powershell
build\Release\tsnc.exe examples\hello.tsn --emit=obj -o build\hello.obj
```

## Emit executable (.exe, CRT-free)

```powershell
build\Release\tsnc.exe examples\hello.tsn --emit=exe -o build\hello.exe
build\hello.exe
```

## MVP language subset

- Accepts top-level `import ...;` lines (ignored by the compiler)
- Accepts `function main() { ... }`
- Inside `main`, supports:
  - `console.log("...");`
  - FFI function calls with numeric literals, string literals, and null
  - `let` statements (basic, without proper variable storage yet)
  - `return` statements
  - Expression statements

## FFI (Foreign Function Interface)

FFI declarations with `@ffi.lib` decorator:

```ts
@ffi.lib("kernel32")
declare function CreateFileA(
    lpFileName: ptr<u8>,
    dwDesiredAccess: u32,
    dwShareMode: u32,
    lpSecurityAttributes: ptr<void>,
    dwCreationDisposition: u32,
    dwFlagsAndAttributes: u32,
    hTemplateFile: ptr<void>
): ptr<void>;
```

Supported types: `ptr<T>`, `i8`, `u8`, `i32`, `u32`, `i64`, `u64`, `f32`, `f64`, `number`, `bool`, `void`.

Note: `number` in TypeScript is mapped to `f64` (IEEE 754 double precision floating-point).

## std:fs module

`std/fs.tsn` provides FFI declarations for kernel32 file operations:
- `CreateFileA`, `ReadFile`, `WriteFile`, `CloseHandle`, `GetFileSizeEx`

Example usage (see `examples/fs_write_simple.tsn`):

```ts
import * as fs from "std:fs";

function main() {
    let handle = CreateFileA("output.txt", 1073741824, 0, null, 2, 128, null);
    CloseHandle(handle);
}
```

## Notes

- The generated IR declares `tsn_console_log(ptr, i32)` as an external symbol.
- Executables are CRT-free - they use WinAPI directly via generated `tsn_console_log` and `tsn_start`.
- No C/C++ runtime for TSN programs is provided; this repo contains the C++ compiler MVP.
- Auto-links libraries specified by `@ffi.lib` decorators when emitting executables.
