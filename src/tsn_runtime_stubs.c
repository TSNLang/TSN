// TSN Runtime Stubs
// Provides all string/array primitives needed by self-hosted compiler IR.
// Uses __asm__ to bind C functions to TSN mangled names.

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct { int refcount; int length; char bytes[]; } TsnString;
typedef struct { int refcount; int vtable_pad; void** data; int len; int cap; } Array;

// ── Helper: make a TsnString from a C string ───────────────────────────────
static TsnString* make_str(const char* src, int len) {
    TsnString* r = malloc(sizeof(TsnString) + len + 1);
    r->refcount = 1; r->length = len;
    if (src) memcpy(r->bytes, src, len);
    r->bytes[len] = 0;
    return r;
}

// ── String primitives ──────────────────────────────────────────────────────
int          tsn_byteLength (TsnString* s)               __asm__("_T.byteLength$P.ptr");
int          tsn_length     (TsnString* s)               __asm__("_T.length$P.ptr");
void*        tsn_concat     (TsnString* a, TsnString* b) __asm__("_T.concat$P.ptr.ptr");
void*        tsn_str_concat (TsnString* a, TsnString* b) __asm__("_T.string_concat$P.ptr.ptr");
int          tsn_equals     (TsnString* a, TsnString* b) __asm__("_T.equals$P.ptr.ptr");
int          tsn_str_equals (TsnString* a, TsnString* b) __asm__("_T.string_equals$P.ptr.ptr");
void*        tsn_substr     (TsnString* s, int st, int l) __asm__("_T.substr$P.ptr.i32.i32");
int          tsn_charCodeAt (TsnString* s, int i)        __asm__("_T.charCodeAt$P.ptr.i32");
int          tsn_indexOf    (TsnString* h, TsnString* n) __asm__("_T.indexOf$P.ptr.ptr");

// ── Runtime I/O  (real implementations) ───────────────────────────────────
void*        tsn_log        (TsnString* s)               __asm__("_T.log$P.ptr");
void*        tsn_readText   (TsnString* path)            __asm__("_T.readText$P.ptr");
void*        tsn_writeText  (TsnString* p, TsnString* c) __asm__("_T.writeText$P.ptr.ptr");
void*        tsn_alloc_impl (long long size)             __asm__("_T.alloc$P.i64");
void         tsn_write_i32_m(void* addr, int val)        __asm__("_T.tsn_write_i32$P");

// ── Implementations ────────────────────────────────────────────────────────
int tsn_byteLength(TsnString* s)  { return s ? s->length : 0; }
int tsn_length    (TsnString* s)  { return s ? s->length : 0; }

void* tsn_concat(TsnString* a, TsnString* b) {
    int la = a ? a->length : 0, lb = b ? b->length : 0;
    TsnString* r = make_str(NULL, la + lb);
    if (a) memcpy(r->bytes,      a->bytes, la);
    if (b) memcpy(r->bytes + la, b->bytes, lb);
    r->bytes[la + lb] = 0;
    return r;
}

void* tsn_str_concat(TsnString* a, TsnString* b) { return tsn_concat(a, b); }

int tsn_equals(TsnString* a, TsnString* b) {
    if (a == b) return 1;
    if (!a || !b || a->length != b->length) return 0;
    return memcmp(a->bytes, b->bytes, a->length) == 0;
}
int tsn_str_equals(TsnString* a, TsnString* b) { return tsn_equals(a, b); }

void* tsn_substr(TsnString* s, int st, int len) {
    if (!s || st < 0 || st >= s->length) return make_str("", 0);
    if (st + len > s->length) len = s->length - st;
    return make_str(s->bytes + st, len);
}

int tsn_charCodeAt(TsnString* s, int i) {
    return (s && i >= 0 && i < s->length) ? (unsigned char)s->bytes[i] : 0;
}

int tsn_indexOf(TsnString* h, TsnString* n) {
    if (!h || !n || n->length == 0) return -1;
    char* p = strstr(h->bytes, n->bytes);
    return p ? (int)(p - h->bytes) : -1;
}

void* tsn_log(TsnString* s) {
    if (s) { fwrite(s->bytes, 1, s->length, stdout); putchar('\n'); fflush(stdout); }
    return NULL;
}

void* tsn_readText(TsnString* path) {
    if (!path) return make_str("", 0);
    FILE* f = fopen(path->bytes, "rb");
    if (!f) return make_str("", 0);
    fseek(f, 0, SEEK_END); long sz = ftell(f); fseek(f, 0, SEEK_SET);
    TsnString* r = make_str(NULL, (int)sz);
    fread(r->bytes, 1, sz, f); fclose(f);
    r->bytes[sz] = 0;
    return r;
}

void* tsn_writeText(TsnString* path, TsnString* content) {
    if (!path || !content) return NULL;
    FILE* f = fopen(path->bytes, "wb");
    if (!f) return NULL;
    fwrite(content->bytes, 1, content->length, f);
    fclose(f);
    return NULL;
}

void* tsn_alloc_impl(long long size) { return calloc(1, (size_t)size); }

void tsn_write_i32_m(void* addr, int val) { *((int*)addr) = val; }

// ── Flat-name aliases (for v1/v2 IR that calls without mangling) ──────────
void* log_flat          (TsnString* s)               __asm__("log");
void* readText_flat     (TsnString* p)               __asm__("readText");
void* writeText_flat    (TsnString* p, TsnString* c) __asm__("writeText");
void* value_flat        ()                           __asm__("value");
void* tokenize_flat     ()                           __asm__("tokenize");
void* parseDecl_flat    ()                           __asm__("parseDeclaration");
void* build_flat        (void* a)                    __asm__("build");
void* generate_flat     ()                           __asm__("generate");
void* Array_get_flat    (Array* a, int i)            __asm__("Array.get");
void  Array_push_flat   (Array* a, void* item)       __asm__("Array.push");

void* log_flat      (TsnString* s)               { return tsn_log(s); }
void* readText_flat (TsnString* p)               { return tsn_readText(p); }
void* writeText_flat(TsnString* p, TsnString* c) { return tsn_writeText(p, c); }
void* value_flat    ()                           { return NULL; }
void* tokenize_flat ()                           { return NULL; }
void* parseDecl_flat()                           { return NULL; }
void* build_flat    (void* a)                    { return NULL; }
void* generate_flat ()                           { return NULL; }

void* Array_get_flat(Array* arr, int index) {
    if (!arr || index < 0 || index >= arr->len) return NULL;
    return arr->data[index];
}
void Array_push_flat(Array* arr, void* item) {
    if (!arr) return;
    if (arr->len >= arr->cap) {
        arr->cap = arr->cap == 0 ? 8 : arr->cap * 2;
        arr->data = realloc(arr->data, arr->cap * sizeof(void*));
    }
    arr->data[arr->len++] = item;
}

// ── Flat method mappings for string/Array called in v2 ───────────────────
void* string_slice_flat(TsnString* s, int start, int end) __asm__("string.slice");
void* string_slice_flat(TsnString* s, int start, int end) {
    if (end < start) return make_str("", 0);
    return tsn_substr(s, start, end - start);
}

int string_charCodeAt_flat(TsnString* s, int index) __asm__("string.charCodeAt");
int string_charCodeAt_flat(TsnString* s, int index) {
    return tsn_charCodeAt(s, index);
}

int Array_indexOf_flat(Array* arr, void* item) __asm__("Array.indexOf");
int Array_indexOf_flat(Array* arr, void* item) {
    if (!arr) return -1;
    for (int i = 0; i < arr->len; i++) {
        if (arr->data[i] == item) return i;
    }
    return -1;
}

// Mapping for cstringToString
void* cstringToString_mangled(void* cstr) __asm__("_T.cstringToString$P");
void* cstringToString_mangled(void* cstr) {
    if (!cstr) {
        TsnString* r = malloc(sizeof(TsnString) + 1);
        r->refcount = 1; r->length = 0; r->bytes[0] = 0;
        return r;
    }
    int len = (int)strlen((char*)cstr);
    TsnString* r = malloc(sizeof(TsnString) + len + 1);
    r->refcount = 1; r->length = len;
    memcpy(r->bytes, cstr, len);
    r->bytes[len] = 0;
    return r;
}

void* cstringToString_flat(void* cstr) __asm__("cstringToString");
void* cstringToString_flat(void* cstr) {
    return cstringToString_mangled(cstr);
}
