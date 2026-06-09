// Stub runtime functions for Level 6/7 procedural compiler
// These are minimal implementations to allow linking

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Memory allocation (correct mangled name)
void* _T_alloc__P_i64(long long size) {
    return malloc(size);
}

// Alternative mangled names - LLVM uses $ but linker might translate
void* _T_alloc_P_i64(long long size) {
    return malloc(size);
}

// Exact name with $ character (may need pragma)
#pragma comment(linker, "/alternatename:_T.alloc$P.i64=_T_alloc_P_i64")
#pragma comment(linker, "/alternatename:_T.concat$P.ptr.ptr=_T_concat_P_ptr_ptr")

// Array methods (assuming Array structure: vtable, data, len, cap)
typedef struct {
    void* vtable;
    void** data;
    int len;
    int cap;
} Array;

void* Array_get(Array* arr, int index) {
    if (index >= 0 && index < arr->len) {
        return arr->data[index];
    }
    return NULL;
}

void Array_push(Array* arr, void* item) {
    if (arr->len >= arr->cap) {
        arr->cap = arr->cap == 0 ? 8 : arr->cap * 2;
        arr->data = realloc(arr->data, arr->cap * sizeof(void*));
    }
    arr->data[arr->len++] = item;
}

// String functions (TSN strings: refcount(i32) + length(i32) + bytes)
typedef struct {
    int refcount;
    int length;
    char bytes[];
} TsnString;

void* _T_concat_P_ptr_ptr(TsnString* a, TsnString* b) {
    if (!a || !b) return a ? a : b;
    int newLen = a->length + b->length;
    TsnString* result = malloc(sizeof(TsnString) + newLen + 1);
    result->refcount = 0;
    result->length = newLen;
    memcpy(result->bytes, a->bytes, a->length);
    memcpy(result->bytes + a->length, b->bytes, b->length);
    result->bytes[newLen] = 0;
    return result;
}

int _T_byteLength_P_ptr(TsnString* s) {
    return s ? s->length : 0;
}

int _T_length_P_ptr(TsnString* s) {
    return s ? s->length : 0;
}

void* _T_substr_P_ptr_i32_i32(TsnString* s, int start, int len) {
    if (!s || start < 0 || start >= s->length) return NULL;
    if (start + len > s->length) len = s->length - start;
    TsnString* result = malloc(sizeof(TsnString) + len + 1);
    result->refcount = 0;
    result->length = len;
    memcpy(result->bytes, s->bytes + start, len);
    result->bytes[len] = 0;
    return result;
}

int _T_charCodeAt_P_ptr_i32(TsnString* s, int index) {
    if (!s || index < 0 || index >= s->length) return 0;
    return (unsigned char)s->bytes[index];
}

int _T_indexOf_P_ptr_ptr(TsnString* haystack, TsnString* needle) {
    if (!haystack || !needle) return -1;
    char* pos = strstr(haystack->bytes, needle->bytes);
    return pos ? (int)(pos - haystack->bytes) : -1;
}

// String methods
void* string_slice(TsnString* s, int start, int end) {
    if (!s || start < 0) return NULL;
    if (end < 0 || end > s->length) end = s->length;
    int len = end - start;
    if (len <= 0) return NULL;
    return _T_substr_P_ptr_i32_i32(s, start, len);
}

int string_charCodeAt(TsnString* s, int index) {
    return _T_charCodeAt_P_ptr_i32(s, index);
}

// Standalone string functions (for flat calls)
void* slice(TsnString* s, int start, int end) {
    return string_slice(s, start, end);
}

int charCodeAt(TsnString* s, int index) {
    return string_charCodeAt(s, index);
}

void* unknown(void) {
    // Return empty string for unknown token kinds
    TsnString* result = malloc(sizeof(TsnString) + 8);
    result->refcount = 0;
    result->length = 7;
    memcpy(result->bytes, "UNKNOWN", 7);
    result->bytes[7] = 0;
    return result;
}

// IO functions
void* readText(void* path) {
    // Stub - return empty string
    TsnString* result = malloc(sizeof(TsnString) + 1);
    result->refcount = 0;
    result->length = 0;
    result->bytes[0] = 0;
    return result;
}

void* value(void* obj) {
    // Stub - return the object itself
    return obj;
}

// Constructor support
void super(void) {
    // Stub - do nothing
}

// Method declarations for external linkage
void* get(void* arr, int index) { return Array_get((Array*)arr, index); }
void push(void* arr, void* item) { Array_push((Array*)arr, item); }
void* parseDeclaration(void* parser) { return NULL; }
int matchKind(void* parser, int kind) { return 0; }
void* parseImportDecl(void* parser) { return NULL; }
void* parseFunctionDecl(void* parser) { return NULL; }
void* parseClassDecl(void* parser) { return NULL; }
void advance(void* parser) {}
int peekKind(void* parser) { return 0; }
void* advanceLexeme(void* parser) { return NULL; }
void skipUntil(void* parser, int kind) {}
void* parseTypeText(void* parser) { return NULL; }
void pushParam(void* params, void* param) {}
void* parseBlockStmt(void* parser) { return NULL; }
void* parseClassMember(void* parser) { return NULL; }
void pushMember(void* members, void* member) {}
void* parseStatement(void* parser) { return NULL; }
