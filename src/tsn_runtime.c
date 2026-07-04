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

// ============================================================
// TSN String structure: { i32 refcount, i32 length, bytes... }
// ============================================================
typedef struct {
    int32_t refcount;
    int32_t length;
    char bytes[0];  // flexible array
} TsnStr;

// Forward declarations
void* readText_impl(const char* path);
void* writeText_impl(const char* path, TsnStr* content);

// Create a TSN string from a C string literal
TsnStr* tsn_str_from_cstr(const char* s) {
    int32_t len = (int32_t)strlen(s);
    TsnStr* str = (TsnStr*)malloc(8 + len + 1);
    str->refcount = 1;
    str->length = len;
    memcpy(str->bytes, s, len + 1);
    return str;
}

// _T_log_P_ptr(str) - print TSN string to stdout
void _T_log_P_ptr(TsnStr* s) {
    if (!s) { printf("null\n"); fflush(stdout); return; }
    printf("%.*s\n", s->length, s->bytes);
    fflush(stdout);
}

void tsn_incref(void* p) { class_incref(p); }
void tsn_decref(void* p) { class_decref(p, NULL); }

// Array_length_impl - return length field of array
int32_t Array_length_impl(void* arr) {
    if (!arr) return 0;
    typedef struct { int32_t refcount; int32_t pad; void* vtable; void* data; int32_t length; } ArrHdr;
    return ((ArrHdr*)arr)->length;
}

// String concat
void* _T_string_concat_P_ptr_ptr(TsnStr* a, TsnStr* b) {
    if (!a && !b) return tsn_str_from_cstr("");
    if (!a) return b;
    if (!b) return a;
    int32_t newlen = a->length + b->length;
    TsnStr* result = (TsnStr*)malloc(8 + newlen + 1);
    result->refcount = 1;
    result->length = newlen;
    memcpy(result->bytes, a->bytes, a->length);
    memcpy(result->bytes + a->length, b->bytes, b->length);
    result->bytes[newlen] = '\0';
    return result;
}

// String equals
int32_t _T_string_equals_P_ptr_ptr(TsnStr* a, TsnStr* b) {
    if (a == b) return 1;
    if (!a || !b) return 0;
    if (a->length != b->length) return 0;
    return memcmp(a->bytes, b->bytes, a->length) == 0 ? 1 : 0;
}

// _T_readText_P_ptr - read file, return TsnStr*
void* _T_readText_P_ptr(TsnStr* pathStr) {
    if (!pathStr) return NULL;
    char path[4096];
    int32_t len = pathStr->length < 4095 ? pathStr->length : 4095;
    memcpy(path, pathStr->bytes, len);
    path[len] = '\0';
    return readText_impl(path);
}

// _T_writeText_P_ptr_ptr - write TsnStr to file
void _T_writeText_P_ptr_ptr(TsnStr* pathStr, TsnStr* content) {
    if (!pathStr || !content) return;
    char path[4096];
    int32_t len = pathStr->length < 4095 ? pathStr->length : 4095;
    memcpy(path, pathStr->bytes, len);
    path[len] = '\0';
    writeText_impl(path, content);
}

// charCodeAt - get character code at index (string method)
int32_t charCodeAt(TsnStr* s, int32_t idx) {
    if (!s || idx < 0 || idx >= s->length) return -1;
    return (unsigned char)s->bytes[idx];
}

// slice - get substring (simplified: slice(start, end))
void* slice(TsnStr* s, int32_t start, int32_t end_idx) {
    if (!s) return tsn_str_from_cstr("");
    if (start < 0) start = 0;
    if (end_idx > s->length) end_idx = s->length;
    if (start >= end_idx) return tsn_str_from_cstr("");
    int32_t newlen = end_idx - start;
    TsnStr* result = (TsnStr*)malloc(8 + newlen + 1);
    result->refcount = 1;
    result->length = newlen;
    memcpy(result->bytes, s->bytes + start, newlen);
    result->bytes[newlen] = '\0';
    return result;
}

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

// Debug logging functions
void debug_log_i32(int32_t val) {
    printf("DEBUG_I32: %d\n", val);
    fflush(stdout);
}

void debug_log_i64(int64_t val) {
    printf("DEBUG_I64: %lld\n", val);
    fflush(stdout);
}

void debug_log_ptr(void* ptr) {
    printf("DEBUG_PTR: %p\n", ptr);
    fflush(stdout);
}

// Array_Token structure (generic array of pointers)
typedef struct {
    int32_t refcount;
    void* vtable;
    void* data;
    int32_t length;
    int32_t capacity;
} Array_Token_Struct;

// Generic Array structure (same layout as Array_Token)
typedef Array_Token_Struct Array_Generic;

// Forward declarations for vtable methods
void Array_push_impl(Array_Generic* arr, void* item);
void* Array_pop_impl(Array_Generic* arr);
void* Array_get_impl(Array_Generic* arr, int32_t index);
void Array_set_impl(Array_Generic* arr, int32_t index, void* item);
void Array_dispose_impl(Array_Generic* arr);

// Array vtable - must match LLVM IR layout: [push, pop, get, set, dispose, filter, find, grow]
static void* Array_VTable_Data[8] = {
    (void*)Array_push_impl,
    (void*)Array_pop_impl,
    (void*)Array_get_impl,
    (void*)Array_set_impl,
    (void*)Array_dispose_impl,
    NULL,  // filter
    NULL,  // find
    NULL   // grow
};

// Create new Array_Token
void* Array_Token_new() {
    Array_Token_Struct* arr = (Array_Token_Struct*)calloc(1, sizeof(Array_Token_Struct));
    if (!arr) return NULL;
    
    arr->refcount = 1;
    arr->vtable = (void*)Array_VTable_Data;
    arr->length = 0;
    arr->capacity = 16;
    arr->data = calloc(16, sizeof(void*));
    
    return arr;
}

// Create new generic Array (same as Array_Token)
void* Array_new() {
    return Array_Token_new();
}

// Generic Array push
void Array_push_impl(Array_Generic* arr, void* item) {
    if (!arr) return;
    
    if (arr->length >= arr->capacity) {
        int32_t newCapacity = arr->capacity * 2;
        void** newData = (void**)calloc(newCapacity, sizeof(void*));
        if (arr->data) {
            memcpy(newData, arr->data, arr->length * sizeof(void*));
            free(arr->data);
        }
        arr->data = newData;
        arr->capacity = newCapacity;
    }
    
    ((void**)arr->data)[arr->length] = item;
    arr->length++;
}

// Generic Array get
void* Array_get_impl(Array_Generic* arr, int32_t index) {
    if (!arr) {
        printf("Array_get_impl: NULL array!\n");
        fflush(stdout);
        return NULL;
    }
    if (index < 0 || index >= arr->length) {
        printf("Array_get_impl: index %d out of bounds (length=%d)\n", index, arr->length);
        fflush(stdout);
        return NULL;
    }
    void* result = ((void**)arr->data)[index];
    return result;
}

// Generic Array pop
void* Array_pop_impl(Array_Generic* arr) {
    if (!arr || arr->length == 0) return NULL;
    arr->length--;
    return ((void**)arr->data)[arr->length];
}

// Generic Array set
void Array_set_impl(Array_Generic* arr, int32_t index, void* item) {
    if (!arr || index < 0 || index >= arr->length) return;
    ((void**)arr->data)[index] = item;
}

// Generic Array dispose
void Array_dispose_impl(Array_Generic* arr) {
    if (!arr) return;
    if (arr->data) {
        free(arr->data);
        arr->data = NULL;
    }
}

// Push item to Array_Token
void Array_Token_push_impl(Array_Token_Struct* arr, void* item) {
    if (!arr) return;
    
    if (arr->length >= arr->capacity) {
        int32_t newCapacity = arr->capacity * 2;
        void** newData = (void**)calloc(newCapacity, sizeof(void*));
        if (arr->data) {
            memcpy(newData, arr->data, arr->length * sizeof(void*));
            free(arr->data);
        }
        arr->data = newData;
        arr->capacity = newCapacity;
    }
    
    ((void**)arr->data)[arr->length] = item;
    arr->length++;
}

// TSN String structure: { i32 refcount, i32 length, [n x i8] bytes }
// Note: TsnStr is already defined above - this is an alias
#define TsnString TsnStr

// Debug helper to log string info
void debug_string(const char* label, TsnStr* str) {
    if (!str) {
        printf("DEBUG %s: NULL\n", label);
        return;
    }
    printf("DEBUG %s: ptr=%p, refcount=%d, length=%d\n", label, str, str->refcount, str->length);
    fflush(stdout);
}

// Result structure: { i32 tag, ptr value } where tag: 0=Ok, 1=Err
typedef struct {
    int32_t tag;
    void* value;
} TsnResult;

// readText_impl - Read entire file into TSN string
void* readText_impl(const char* path) {
    TsnResult* result = (TsnResult*)malloc(sizeof(TsnResult));
    if (!result) {
        result = (TsnResult*)malloc(sizeof(TsnResult));
        result->tag = 1;  // Error
        result->value = NULL;
        return result;
    }

#ifdef _WIN32
    // Open file
    HANDLE hFile = CreateFileA(
        path,
        GENERIC_READ,
        FILE_SHARE_READ,
        NULL,
        OPEN_EXISTING,
        FILE_ATTRIBUTE_NORMAL,
        NULL
    );

    if (hFile == INVALID_HANDLE_VALUE) {
        result->tag = 1;  // Error
        result->value = NULL;
        return result;
    }

    // Get file size
    DWORD fileSize = GetFileSize(hFile, NULL);
    if (fileSize == INVALID_FILE_SIZE) {
        CloseHandle(hFile);
        result->tag = 1;  // Error
        result->value = NULL;
        return result;
    }

    // Allocate TSN string: 8 bytes header + fileSize + 1 (null terminator)
    size_t allocSize = 8 + fileSize + 1;
    TsnString* str = (TsnString*)malloc(allocSize);
    if (!str) {
        CloseHandle(hFile);
        result->tag = 1;  // Error
        result->value = NULL;
        return result;
    }

    // Initialize string header
    str->refcount = 0;
    str->length = (int32_t)fileSize;

    // Read file content
    DWORD bytesRead = 0;
    if (!ReadFile(hFile, str->bytes, fileSize, &bytesRead, NULL) || bytesRead != fileSize) {
        CloseHandle(hFile);
        free(str);
        result->tag = 1;  // Error
        result->value = NULL;
        return result;
    }

    // Null terminate
    str->bytes[fileSize] = '\0';

    CloseHandle(hFile);

    // Return Ok result
    result->tag = 0;  // Ok
    result->value = str;
    return result;
#else
    // Unix implementation
    FILE* f = fopen(path, "rb");
    if (!f) {
        result->tag = 1;  // Error
        result->value = NULL;
        return result;
    }

    fseek(f, 0, SEEK_END);
    long fileSize = ftell(f);
    fseek(f, 0, SEEK_SET);

    size_t allocSize = 8 + fileSize + 1;
    TsnString* str = (TsnString*)malloc(allocSize);
    if (!str) {
        fclose(f);
        result->tag = 1;  // Error
        result->value = NULL;
        return result;
    }

    str->refcount = 0;
    str->length = (int32_t)fileSize;

    size_t bytesRead = fread(str->bytes, 1, fileSize, f);
    if (bytesRead != (size_t)fileSize) {
        fclose(f);
        free(str);
        result->tag = 1;  // Error
        result->value = NULL;
        return result;
    }

    str->bytes[fileSize] = '\0';
    fclose(f);

    result->tag = 0;  // Ok
    result->value = str;
    return result;
#endif
}

// writeText_impl - Write TSN string to file
void* writeText_impl(const char* path, TsnStr* content) {
    TsnResult* result = (TsnResult*)malloc(sizeof(TsnResult));
    if (!result) {
        result = (TsnResult*)malloc(sizeof(TsnResult));
        result->tag = 1;  // Error
        result->value = NULL;
        return result;
    }

    if (!content) {
        result->tag = 1;  // Error
        result->value = NULL;
        return result;
    }

#ifdef _WIN32
    // Open/create file
    HANDLE hFile = CreateFileA(
        path,
        GENERIC_WRITE,
        0,
        NULL,
        CREATE_ALWAYS,
        FILE_ATTRIBUTE_NORMAL,
        NULL
    );

    if (hFile == INVALID_HANDLE_VALUE) {
        result->tag = 1;  // Error
        result->value = NULL;
        return result;
    }

    // Write content
    DWORD bytesWritten = 0;
    if (!WriteFile(hFile, content->bytes, (DWORD)content->length, &bytesWritten, NULL) || 
        bytesWritten != (DWORD)content->length) {
        CloseHandle(hFile);
        result->tag = 1;  // Error
        result->value = NULL;
        return result;
    }

    CloseHandle(hFile);

    // Return Ok result
    result->tag = 0;  // Ok
    result->value = NULL;
    return result;
#else
    // Unix implementation
    FILE* f = fopen(path, "wb");
    if (!f) {
        result->tag = 1;  // Error
        result->value = NULL;
        return result;
    }

    size_t bytesWritten = fwrite(content->bytes, 1, content->length, f);
    fclose(f);

    if (bytesWritten != (size_t)content->length) {
        result->tag = 1;  // Error
        result->value = NULL;
        return result;
    }

    result->tag = 0;  // Ok
    result->value = NULL;
    return result;
#endif
}
