// Wrapper for TSN compilers that generate main(argc, argv)
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

// Forward declarations
extern void tsn_init_args(int argc, char** argv);
extern int32_t main(int argc, char** argv);  // TSN main with args

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
    // Convert wchar_t** to char**
    char** argv = (char**)malloc(argc * sizeof(char*));
    if (!argv) return 1;
    
    for (int i = 0; i < argc; i++) {
        argv[i] = wchar_to_char(wargv[i]);
        if (!argv[i]) {
            for (int j = 0; j < i; j++) free(argv[j]);
            free(argv);
            return 1;
        }
    }
    
    tsn_init_args(argc, argv);
    int32_t result = main(argc, argv);
    
    // Cleanup
    for (int i = 0; i < argc; i++) free(argv[i]);
    free(argv);
    
    return result;
}

#else

// Unix entry point
int main_entry(int argc, char** argv) {
    tsn_init_args(argc, argv);
    return main(argc, argv);
}

#endif
