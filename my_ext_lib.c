#include <stdio.h>

void my_external_print(int value) {
    printf("FFI Call successful! Received value: %d\n", value);
}

int add_numbers(int a, int b) {
    return a + b;
}
