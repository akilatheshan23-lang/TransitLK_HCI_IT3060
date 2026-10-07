@echo off
setlocal
cd /d "%~dp0"
set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%PATH%"
echo Starting TransitLK Backend on port 4000...
node --env-file=.env src/server.js %*
