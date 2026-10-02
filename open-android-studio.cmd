@echo off
set "PROJECT_DIR=%~dp0android"
set "STUDIO_EXE=%ProgramFiles%\Android\Android Studio\bin\studio64.exe"

if not exist "%STUDIO_EXE%" (
  echo Android Studio was not found at:
  echo %STUDIO_EXE%
  exit /b 1
)

start "" "%STUDIO_EXE%" "%PROJECT_DIR%"
