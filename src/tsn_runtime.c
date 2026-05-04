// tsn_runtime.c - Runtime support for TSN programs
// Minimal version - most logic is now in TSN stdlib

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

// ============================================================================
// Builtins required by compiler or special operations
// ============================================================================

void* class_alloc(int32_t size) {
    void* p = calloc(1, size);
    if (p) {
        *((int32_t*)p) = 1; // Initial refCount = 1
    }
    return p;
}

void class_incref(void* p) {
    if (p) {
        (*((int32_t*)p))++;
    }
}

void class_decref(void* p, void (*disposer)(void*)) {
    if (p) {
        if (--(*((int32_t*)p)) <= 0) {
            if (disposer) disposer(p);
            free(p);
        }
    }
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

// Debugging bridge for console.log
void tsn_console_log(const char* s) __asm__("_T.console.log$P.ptr");
void tsn_console_log(const char* s) {
    if (s) printf("%s\n", s);
    else printf("null\n");
}

// ============================================================================
// String core (if not implemented in TSN)
// ============================================================================

// If TSN std:string is used, we might not need these in C.
// But for bootstrap, we keep some basic ones if they are used by name.
