@echo off
if "%1"=="" (
    echo Usage: compile.bat ^<file.tsn^>
    exit /b 1
)

set INPUT=%1
set OUTPUT=%INPUT:.tsn=.ll%
set EXE=%INPUT:.tsn=.exe%

echo Compiling %INPUT%...
deno run --allow-read --allow-write src/main.ts %INPUT% -o %OUTPUT%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Creating executable...
    clang %OUTPUT% -o %EXE% 2>nul
    
    if %ERRORLEVEL% EQU 0 (
        echo Success! Running...
        echo.
        %EXE%
        echo.
        echo Exit code: %ERRORLEVEL%
    )
)
