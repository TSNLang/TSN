// tsn_runtime.c - Runtime support for TSN programs
// Implements std:string, std:memory

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// ============================================================================
// std:string
// ============================================================================

// UTF-8 aware length (number of code points)
int string_length(const char* str) {
    if (!str) return 0;
    int length = 0;
    while (*str) {
        if ((*str & 0xc0) != 0x80) length++;
        str++;
    }
    return length;
}

// Byte length
int string_byteLength(const char* str) {
    if (!str) return 0;
    return (int)strlen(str);
}

// Get UTF-8 code point at character index
int string_charCodeAt(const char* str, int index) {
    if (!str) return 0;
    int pos = 0;
    int charIdx = 0;
    while (str[pos]) {
        if ((str[pos] & 0xc0) != 0x80) {
            if (charIdx == index) {
                // Return the code point (simplified for now)
                unsigned char c = (unsigned char)str[pos];
                if (c < 0x80) return c;
                if ((c & 0xe0) == 0xc0) return ((c & 0x1f) << 6) | (str[pos+1] & 0x3f);
                if ((c & 0xf0) == 0xe0) return ((c & 0x0f) << 12) | ((str[pos+1] & 0x3f) << 6) | (str[pos+2] & 0x3f);
                if ((c & 0xf8) == 0xf0) return ((c & 0x07) << 18) | ((str[pos+1] & 0x3f) << 12) | ((str[pos+2] & 0x3f) << 6) | (str[pos+3] & 0x3f);
            }
            charIdx++;
        }
        pos++;
    }
    return 0;
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

int string_equals(const char* a, const char* b) {
    if (a == NULL || b == NULL) return a == b;
    return strcmp(a, b) == 0;
}

char* string_substr(const char* str, int start, int len) {
    char* result = (char*)malloc(len + 1);
    if (!result) return NULL;
    memcpy(result, str + start, len);
    result[len] = '\0';
    return result;
}

int string_includes(const char* str, const char* search) {
    if (!str || !search) return 0;
    return strstr(str, search) != NULL;
}

int string_indexOf(const char* str, const char* search) {
    if (!str || !search) return -1;
    char* pos = strstr(str, search);
    if (!pos) return -1;
    
    // Convert byte offset to character index
    int byteOffset = (int)(pos - str);
    int charIdx = 0;
    for (int i = 0; i < byteOffset; i++) {
        if ((str[i] & 0xc0) != 0x80) charIdx++;
    }
    return charIdx;
}

int string_startsWith(const char* str, const char* search) {
    if (!str || !search) return 0;
    int len = (int)strlen(search);
    return strncmp(str, search, len) == 0;
}

int string_endsWith(const char* str, const char* search) {
    if (!str || !search) return 0;
    int lenStr = (int)strlen(str);
    int lenSearch = (int)strlen(search);
    if (lenSearch > lenStr) return 0;
    return strncmp(str + lenStr - lenSearch, search, lenSearch) == 0;
}

// ============================================================================
// std:memory
// ============================================================================

void tsn_incRef(void* p) {
    if (!p) return;
    int* refCount = (int*)p;
    (*refCount)++;
}

void tsn_decRef(void* p) {
    if (!p) return;
    int* refCount = (int*)p;
    if (*refCount <= 0) return; 
    (*refCount)--;
    if (*refCount <= 0) {
        free(p);
    }
}

void* class_alloc(int size) {
    void* p = malloc(size);
    if (p) {
        int* refCount = (int*)p;
        *refCount = 1; 
    }
    return p;
}

void* tsn_malloc(int size) {
    return malloc(size);
}

void memory_free(void* ptr) {
    free(ptr);
}

void memory_copy(void* dst, const void* src, int size) {
    memcpy(dst, src, size);
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

void print_f32(float n) {
    printf("%f\n", n);
}

void print_f64(double n) {
    printf("%lf\n", n);
}

// ============================================================================
// OS Arguments Support
// ============================================================================
extern int __tsn_argc;
extern char** __tsn_argv;

int os_get_argc() {
    return __tsn_argc;
}

char** os_get_argv() {
    return __tsn_argv;
}

void tsn_exit(int code) { exit(code); }
