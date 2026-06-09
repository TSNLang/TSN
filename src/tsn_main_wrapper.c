// Wrapper to initialize TSN runtime before calling TSN main()
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

// Forward declarations
extern void tsn_init_args(int argc, char** argv);
extern int32_t tsn_main(int argc, char** argv);

#ifdef _WIN32
#include <windows.h>

// Convert wchar_t* to char* (UTF-16 to UTF-8)
static char* wchar_to_char(const wchar_t* wstr) {
    if (!wstr) return NULL;
    
    int size = WideCharToMultiByte(CP_UTF8, 0, wstr, -1, NULL, 0, NULL, NULL);
    if (size <= 0) return NULL;
    
    char* str = (char*)malloc(size);
    if (!str) return NULL;
    
    WideCharToMultiByte(CP_UTF8, 0, wstr, -1, str, size, NULL, NULL);
    return str;
}

// Windows entry point
int wmain(int argc, wchar_t** wargv) {
    printf("=== DEBUG: wmain started, argc=%d ===\n", argc);
    fflush(stdout);
    
    // Convert wchar_t** to char**
    char** argv = (char**)malloc(argc * sizeof(char*));
    if (!argv) return 1;
    
    for (int i = 0; i < argc; i++) {
        argv[i] = wchar_to_char(wargv[i]);
        if (!argv[i]) {
            // Cleanup on error
            for (int j = 0; j < i; j++) free(argv[j]);
            free(argv);
            return 1;
        }
        printf("DEBUG: argv[%d] = %s\n", i, argv[i]);
        fflush(stdout);
    }
    
    printf("DEBUG: Calling tsn_init_args\n");
    fflush(stdout);
    tsn_init_args(argc, argv);
    
    printf("DEBUG: Calling tsn_main with argc=%d\n", argc);
    fflush(stdout);
    int32_t result = tsn_main(argc, argv);
    
    printf("DEBUG: tsn_main returned %d\n", result);
    fflush(stdout);
    
    // Cleanup
    for (int i = 0; i < argc; i++) free(argv[i]);
    free(argv);
    
    return result;
}

#else

// Unix entry point
int main(int argc, char** argv) {
    tsn_init_args(argc, argv);
    return tsn_main();
}

#endif
