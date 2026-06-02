#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

void* class_alloc(int32_t size) {
    void* p = calloc(1, size);
    if (p) {
        *((int32_t*)p) = 1;
    }
    return p;
}

void class_incref(void* p) {
    if (!p) return;
    int32_t* rc = (int32_t*)p;
    if (*rc == -1) return;
    (*rc)++;
}

void class_decref(void* p, void (*disposer)(void*)) {
    if (!p) return;
    int32_t* rc = (int32_t*)p;
    if (*rc == -1) return;
    (*rc)--;
    if (*rc <= 0) {
        if (disposer) disposer(p);
        free(p);
    }
}

void tsn_decRef(void* p) {
    class_decref(p, NULL);
}

void tsn_exit(int32_t code) {
    exit(code);
}

// Simple memory allocator for TSN - just wraps malloc
void* tsn_alloc(int64_t size) {
    return malloc((size_t)size);
}

// Helper functions for string conversion
int32_t tsn_strlen(const char* s) {
    return (int32_t)strlen(s);
}

void tsn_write_i32(void* addr, int32_t val) {
    *((int32_t*)addr) = val;
}

void tsn_memcpy(void* dest, const void* src, int32_t n) {
    memcpy(dest, src, (size_t)n);
}

void print_i32(int32_t n) { printf("%d\n", n); }
void print_ptr(void* p) { printf("%p\n", p); }
void print_f32(float f) { printf("%f\n", f); }
void print_f64(double d) { printf("%lf\n", d); }

// Windows wrappers
#ifdef _WIN32
#include <windows.h>
void* tsn_CreateFileA(const char* lpFileName, uint32_t dwDesiredAccess, uint32_t dwShareMode, void* lpSecurityAttributes, uint32_t dwCreationDisposition, uint32_t dwFlagsAndAttributes, void* hTemplateFile) {
    return CreateFileA(lpFileName, dwDesiredAccess, dwShareMode, (LPSECURITY_ATTRIBUTES)lpSecurityAttributes, dwCreationDisposition, dwFlagsAndAttributes, hTemplateFile);
}
int32_t tsn_ReadFile(void* hFile, void* lpBuffer, uint32_t nNumberOfBytesToRead, uint32_t* lpNumberOfBytesRead, void* lpOverlapped) {
    return ReadFile(hFile, lpBuffer, nNumberOfBytesToRead, (LPDWORD)lpNumberOfBytesRead, (LPOVERLAPPED)lpOverlapped);
}
int32_t tsn_WriteFile(void* hFile, const void* lpBuffer, uint32_t nNumberOfBytesToWrite, uint32_t* lpNumberOfBytesWritten, void* lpOverlapped) {
    return WriteFile(hFile, lpBuffer, nNumberOfBytesToWrite, (LPDWORD)lpNumberOfBytesWritten, (LPOVERLAPPED)lpOverlapped);
}
int32_t tsn_CloseHandle(void* hObject) {
    return CloseHandle(hObject);
}
uint32_t tsn_GetFileSize(void* hFile, uint32_t* lpFileSizeHigh) {
    return GetFileSize(hFile, (LPDWORD)lpFileSizeHigh);
}
void* tsn_GetProcessHeap() {
    return GetProcessHeap();
}
void* tsn_HeapAlloc(void* hHeap, uint32_t dwFlags, size_t dwBytes) {
    return HeapAlloc(hHeap, dwFlags, dwBytes);
}
int32_t tsn_HeapFree(void* hHeap, uint32_t dwFlags, void* lpMem) {
    return HeapFree(hHeap, dwFlags, lpMem);
}
void* tsn_HeapReAlloc(void* hHeap, uint32_t dwFlags, void* lpMem, size_t dwBytes) {
    return HeapReAlloc(hHeap, dwFlags, lpMem, dwBytes);
}
uint32_t tsn_GetLastError() {
    return GetLastError();
}
#endif

int32_t __tsn_argc = 0;
char** __tsn_argv = NULL;

void tsn_init_args(int argc, char** argv) {
    __tsn_argc = argc;
    __tsn_argv = argv;
}

int32_t tsn_get_argc() { return __tsn_argc; }
void* tsn_get_argv_ptr() { return (void*)__tsn_argv; }
char* tsn_get_argv(int32_t index) {
    if (index < 0 || index >= __tsn_argc) return NULL;
    return __tsn_argv[index];
}

// Stdlib constants - exported for multi-module linking
// Undefine Windows macros so we can define them as globals for LLVM IR
#ifdef HEAP_ZERO_MEMORY
#undef HEAP_ZERO_MEMORY
#endif
int32_t HEAP_ZERO_MEMORY = 8;
int32_t FS_IO_ERROR = -1;
int32_t FS_NOT_FOUND = -2;
int32_t FS_OK = 0;
