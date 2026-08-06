#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

typedef struct { int32_t refcount; int32_t length; char bytes[0]; } TsnStr;

TsnStr* make_str(const char* s) {
    int32_t len = strlen(s);
    TsnStr* str = malloc(8 + len + 1);
    str->refcount = 1;
    str->length = len;
    memcpy(str->bytes, s, len + 1);
    return str;
}

int32_t charCodeAt(TsnStr* s, int32_t idx) {
    if (!s || idx < 0 || idx >= s->length) return -1;
    return (unsigned char)s->bytes[idx];
}

int32_t tsn_string_length(TsnStr* s) {
    if (!s) return 0;
    return s->length;
}

int main() {
    TsnStr* s = make_str("// test\nfunction");
    printf("length=%d\n", tsn_string_length(s));
    printf("char[0]=%d (expect 47 '/')\n", charCodeAt(s, 0));
    printf("char[1]=%d (expect 47 '/')\n", charCodeAt(s, 1));
    printf("char[8]=%d (expect 102 'f')\n", charCodeAt(s, 8));
    return 0;
}
