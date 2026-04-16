// tsn_runtime.c - Runtime support for TSN programs
// Implements std:console, std:process, std:string, std:memory, std:fs

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// ============================================================================
// std:console
// ============================================================================

void console_log(const char* msg) {
    printf("%s\n", msg);
}

void console_error(const char* msg) {
    fprintf(stderr, "Error: %s\n", msg);
}

void console_warn(const char* msg) {
    fprintf(stderr, "Warning: %s\n", msg);
}

// ============================================================================
// std:process
// ============================================================================

void process_exit(int code) {
    exit(code);
}

// ============================================================================
// std:string
// ============================================================================

int string_length(const char* str) {
    return (int)strlen(str);
}

int string_charAt(const char* str, int index) {
    return (int)(unsigned char)str[index];
}

char* string_concat(const char* a, const char* b) {
    int la = (int)strlen(a);
    int lb = (int)strlen(b);
    char* result = (char*)malloc(la + lb + 1);
    if (!result) return NULL;
    memcpy(result, a, la);
    memcpy(result + la, b, lb);
    result[la + lb] = '\0';
    return result;
}

int string_compare(const char* a, const char* b) {
    return strcmp(a, b);
}

char* string_substr(const char* str, int start, int len) {
    char* result = (char*)malloc(len + 1);
    if (!result) return NULL;
    memcpy(result, str + start, len);
    result[len] = '\0';
    return result;
}

// ============================================================================
// std:memory (ARC Support)
// ============================================================================

void tsn_incRef(void* p) {
    if (!p) return;
    int* refCount = (int*)p;
    (*refCount)++;
}

void tsn_decRef(void* p) {
    if (!p) return;
    int* refCount = (int*)p;
    (*refCount)--;
    printf("DEBUG: RC decreased to %d at %p\n", *refCount, p);
    if (*refCount <= 0) {
        printf("DEBUG: Freeing object at %p\n", p);
        free(p);
    }
}

void* memory_alloc(int size) {
    void* p = malloc(size);
    if (p) {
        int* refCount = (int*)p;
        *refCount = 1; // Khởi tạo RC = 1
    }
    return p;
}

void memory_free(void* ptr) {
    free(ptr);
}

void memory_copy(void* dst, const void* src, int size) {
    memcpy(dst, src, size);
}

// ============================================================================
// std:fs
// ============================================================================

char* fs_readFile(const char* path) {
    FILE* f = fopen(path, "rb");
    if (!f) return NULL;
    
    fseek(f, 0, SEEK_END);
    long size = ftell(f);
    fseek(f, 0, SEEK_SET);
    
    char* buf = (char*)malloc(size + 1);
    if (!buf) { fclose(f); return NULL; }
    
    fread(buf, 1, size, f);
    buf[size] = '\0';
    fclose(f);
    return buf;
}

int fs_writeFile(const char* path, const char* data, int len) {
    FILE* f = fopen(path, "wb");
    if (!f) return 0;
    
    int written = (int)fwrite(data, 1, len, f);
    fclose(f);
    return written;
}

int fs_exists(const char* path) {
    FILE* f = fopen(path, "r");
    if (f) { fclose(f); return 1; }
    return 0;
}

// ============================================================================
// Built-in string functions (also callable from TSN)
// ============================================================================

// string_char_at(str, index) - get char code at index
int string_char_at(const char* str, int index) {
    return (int)(unsigned char)str[index];
}

void print_i32(int n) {
    printf("%d\n", n);
}
