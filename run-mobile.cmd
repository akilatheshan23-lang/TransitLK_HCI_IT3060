@echo off
setlocal
set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%PATH%"
call "%~dp0scripts\run.cmd" mobile %*
