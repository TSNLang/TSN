#include <windows.h>
#include <stdio.h>

int main() {
    HANDLE handle = CreateFileA(
        "test_fs_output.txt",
        GENERIC_READ,
        FILE_SHARE_READ,
        NULL,
        OPEN_EXISTING,
        FILE_ATTRIBUTE_NORMAL,
        NULL
    );
    
    if (handle == INVALID_HANDLE_VALUE) {
        printf("CreateFile failed: %lu\n", GetLastError());
        return 1;
    }
    
    DWORD size = GetFileSize(handle, NULL);
    if (size == INVALID_FILE_SIZE) {
        printf("GetFileSize failed: %lu\n", GetLastError());
        CloseHandle(handle);
        return 1;
    }
    
    printf("File size: %lu\n", size);
    
    void* buffer = HeapAlloc(GetProcessHeap(), HEAP_ZERO_MEMORY, size + 1);
    if (!buffer) {
        printf("HeapAlloc failed: %lu\n", GetLastError());
        CloseHandle(handle);
        return 1;
    }
    
    DWORD bytesRead = 0;
    BOOL ok = ReadFile(handle, buffer, size, &bytesRead, NULL);
    CloseHandle(handle);
    
    if (!ok) {
        printf("ReadFile failed: %lu\n", GetLastError());
        HeapFree(GetProcessHeap(), 0, buffer);
        return 1;
    }
    
    printf("Read %lu bytes\n", bytesRead);
    printf("Content: %s\n", (char*)buffer);
    
    HeapFree(GetProcessHeap(), 0, buffer);
    return 0;
}
