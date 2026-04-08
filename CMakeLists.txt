cmake_minimum_required(VERSION 3.20)

project(tsn LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if (MSVC)
    set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
endif ()

find_program(LLVM_CONFIG llvm-config REQUIRED)

execute_process(
    COMMAND ${LLVM_CONFIG} --cxxflags
    OUTPUT_VARIABLE LLVM_CXXFLAGS
    OUTPUT_STRIP_TRAILING_WHITESPACE
)
execute_process(
    COMMAND ${LLVM_CONFIG} --includedir
    OUTPUT_VARIABLE LLVM_INCLUDEDIR
    OUTPUT_STRIP_TRAILING_WHITESPACE
)
execute_process(
    COMMAND ${LLVM_CONFIG} --ldflags
    OUTPUT_VARIABLE LLVM_LDFLAGS
    OUTPUT_STRIP_TRAILING_WHITESPACE
)
execute_process(
    COMMAND ${LLVM_CONFIG} --libs all
    OUTPUT_VARIABLE LLVM_LIBS
    OUTPUT_STRIP_TRAILING_WHITESPACE
)

separate_arguments(LLVM_CXXFLAGS NATIVE_COMMAND "${LLVM_CXXFLAGS}")
separate_arguments(LLVM_LDFLAGS NATIVE_COMMAND "${LLVM_LDFLAGS}")
separate_arguments(LLVM_LIBS NATIVE_COMMAND "${LLVM_LIBS}")

if (MSVC)
    list(FILTER LLVM_CXXFLAGS EXCLUDE REGEX "^/EH.*")
    list(FILTER LLVM_CXXFLAGS EXCLUDE REGEX "^/GR-")
endif ()

add_executable(tsnc
    src/main.cpp
)

target_compile_options(tsnc PRIVATE ${LLVM_CXXFLAGS})
if (MSVC)
    target_compile_options(tsnc PRIVATE /EHsc /GR)
    target_compile_options(tsnc PRIVATE /wd4267)
endif ()
target_include_directories(tsnc SYSTEM PRIVATE ${LLVM_INCLUDEDIR})
target_link_options(tsnc PRIVATE ${LLVM_LDFLAGS})
target_link_libraries(tsnc PRIVATE ${LLVM_LIBS})
if (MSVC)
    target_link_libraries(tsnc PRIVATE ntdll.lib)
endif ()
