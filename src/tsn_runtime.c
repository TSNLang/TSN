// tsn_runtime.c - Runtime support for TSN programs
// Minimal version - most logic is now in TSN stdlib

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#ifdef _WIN32
#include <windows.h>
#endif

// ============================================================================
// Builtins required by compiler or special operations
// ============================================================================

void* class_alloc(int32_t size) {
    void* p = calloc(1, size);
    if (p) {
        *((int32_t*)p) = 1; // Initial refCount = 1
        printf("DEBUG: class_alloc(%d) -> %p (refcount=1)\n", size, p);
        fflush(stdout);
    }
    return p;
}

void class_incref(void* p) {
    if (p) {
        int32_t* rc = (int32_t*)p;
        if (*rc == -1) return;
        (*rc)++;
        // printf("DEBUG: class_incref(%p) -> refcount=%d\n", p, *rc);
        // fflush(stdout);
    }
}

void class_decref(void* p, void (*disposer)(void*)) {
    if (p) {
        int32_t* rc_ptr = (int32_t*)p;
        if (*rc_ptr == -1) return;
        int32_t rc = --(*rc_ptr);
        // printf("DEBUG: class_decref(%p) -> refcount=%d\n", p, rc);
        // fflush(stdout);
        if (rc <= 0) {
            // printf("DEBUG: class_freeing(%p)\n", p);
            // fflush(stdout);
            if (disposer) disposer(p);
            free(p);
        }
    }
}

void tsn_decRef(void* p) {
    class_decref(p, NULL);
}

void tsn_exit(int32_t code) {
    exit(code);
}

// ============================================================================
// Print functions (builtins)
// ============================================================================

void print_i32(int32_t n) { printf("%d\n", n); }
void print_f32(float f) { printf("%f\n", f); }
void print_f64(double d) { printf("%lf\n", d); }

// Removed log bridge to avoid conflict with console.tsn

// Memory bridge for old mangled names
void* tsn_offset_alias(void* p, int64_t bytes) __asm__("_T.offset$P.ptr_void.i64");
void* tsn_offset_alias(void* p, int64_t bytes) {
    return (char*)p + bytes;
}

// Memory bridge - removed to avoid conflict with memory.tsn
/*
void tsn_free_alias(void* p) __asm__("_T.free$P.void");
void tsn_free_alias(void* p) {
    free(p);
}
...
*/

#ifdef _WIN32
int32_t __tsn_argc;
char** __tsn_argv;

int32_t os_get_argc() {
    return __tsn_argc;
}

char** os_get_argv() {
    return __tsn_argv;
}

void* tsn_CreateFileA_bridge(const char* name_with_header, int32_t access, int32_t share, void* sec, int32_t disp, int32_t flags, void* temp) __asm__("tsn_CreateFileA");
void* tsn_CreateFileA_bridge(const char* name_with_header, int32_t access, int32_t share, void* sec, int32_t disp, int32_t flags, void* temp) {
    const char* name = name_with_header ? name_with_header + 8 : NULL;
    if (name) {
        printf("DEBUG: CreateFileA called for '%s' (len %zu)\n", name, strlen(name));
    } else {
        printf("DEBUG: CreateFileA called with NULL name\n");
    }
    fflush(stdout);
    return CreateFileA(name, (DWORD)access, (DWORD)share, (LPSECURITY_ATTRIBUTES)sec, (DWORD)disp, (DWORD)flags, (HANDLE)temp);
}

void* tsn_GetProcessHeap_bridge() __asm__("tsn_GetProcessHeap");
void* tsn_GetProcessHeap_bridge() {
    return GetProcessHeap();
}

void* tsn_HeapAlloc_bridge(void* heap, int32_t flags, int64_t size) __asm__("tsn_HeapAlloc");
void* tsn_HeapAlloc_bridge(void* heap, int32_t flags, int64_t size) {
    void* p = HeapAlloc((HANDLE)heap, (DWORD)flags, (SIZE_T)size);
    printf("DEBUG: HeapAlloc(%p, %d, %lld) -> %p\n", heap, flags, size, p);
    fflush(stdout);
    return p;
}

void print_ptr(void* p) {
    printf("%p\n", p);
    fflush(stdout);
}

int32_t tsn_GetLastError_bridge() __asm__("tsn_GetLastError");
int32_t tsn_GetLastError_bridge() {
    return (int32_t)GetLastError();
}

int32_t tsn_GetFileSize_bridge(void* handle, int32_t* high) __asm__("tsn_GetFileSize");
int32_t tsn_GetFileSize_bridge(void* handle, int32_t* high) {
    DWORD type = GetFileType((HANDLE)handle);
    printf("DEBUG: GetFileSize called with handle %p, GetFileType=%lu\n", handle, type);
    fflush(stdout);
    return (int32_t)GetFileSize((HANDLE)handle, (LPDWORD)high);
}

int32_t tsn_ReadFile_bridge(void* handle, void* buffer, int32_t size, int32_t* read, void* over) __asm__("tsn_ReadFile");
int32_t tsn_ReadFile_bridge(void* handle, void* buffer, int32_t size, int32_t* read, void* over) {
    DWORD type = GetFileType((HANDLE)handle);
    printf("DEBUG: ReadFile called with handle %p, GetFileType=%lu, size=%d\n", handle, type, size);
    
    DWORD dummyRead = 0;
    BOOL dummyOk = ReadFile((HANDLE)handle, NULL, 0, &dummyRead, NULL);
    if (!dummyOk) {
        printf("DEBUG: dummy 0-byte ReadFile FAILED. Error=%lu\n", GetLastError());
    } else {
        printf("DEBUG: dummy 0-byte ReadFile OK\n");
    }

    fflush(stdout);
    return (int32_t)ReadFile((HANDLE)handle, buffer, (DWORD)size, (LPDWORD)read, (LPOVERLAPPED)over);
}

int32_t tsn_WriteFile_bridge(void* handle, void* buffer, int32_t size, int32_t* written, void* over) __asm__("tsn_WriteFile");
int32_t tsn_WriteFile_bridge(void* handle, void* buffer, int32_t size, int32_t* written, void* over) {
    return (int32_t)WriteFile((HANDLE)handle, buffer, (DWORD)size, (LPDWORD)written, (LPOVERLAPPED)over);
}

int32_t tsn_HeapFree_bridge(void* heap, int32_t flags, void* ptr) __asm__("tsn_HeapFree");
int32_t tsn_HeapFree_bridge(void* heap, int32_t flags, void* ptr) {
    return (int32_t)HeapFree((HANDLE)heap, (DWORD)flags, ptr);
}

void* tsn_HeapReAlloc_bridge(void* heap, int32_t flags, void* ptr, int64_t size) __asm__("tsn_HeapReAlloc");
void* tsn_HeapReAlloc_bridge(void* heap, int32_t flags, void* ptr, int64_t size) {
    return HeapReAlloc((HANDLE)heap, (DWORD)flags, ptr, (SIZE_T)size);
}

int32_t tsn_CloseHandle_bridge(void* handle) __asm__("tsn_CloseHandle");
int32_t tsn_CloseHandle_bridge(void* handle) {
    return (int32_t)CloseHandle((HANDLE)handle);
}
#endif

void* tsn_malloc(int32_t size) {
    void* p = calloc(1, size);
    printf("DEBUG: tsn_malloc(%d) -> %p\n", size, p);
    fflush(stdout);
    return p;
}

void memory_free(void* p) {
    printf("DEBUG: memory_free(%p)\n", p);
    fflush(stdout);
    free(p);
}

// ============================================================================
// String core (if not implemented in TSN)
// ============================================================================

// If TSN std:string is used, we might not need these in C.
// But for bootstrap, we keep some basic ones if they are used by name.
