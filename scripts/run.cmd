@echo off
setlocal
where node >nul 2>nul
if %errorlevel% equ 0 (
  node "%~dp0dev.cjs" %*
) else (
  "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "%~dp0dev.cjs" %*
)
