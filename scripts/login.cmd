@echo off
setlocal
set "NODE_BIN=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%NODE_BIN%" (
  "%NODE_BIN%" "%~dp0..\node_modules\expo\bin\cli" login %*
) else (
  npx expo login %*
)
