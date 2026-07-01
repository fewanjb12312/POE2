@echo off
setlocal
cd /d "%~dp0"

set "PATH=%~dp0tools\node-v24.18.0-win-x64;%PATH%"
set "LOCALAPPDATA=%~dp0.localappdata"
set "APPDATA=%~dp0.appdata"
set "ELECTRON_CACHE=%~dp0.electron-cache"
set "npm_config_cache=%~dp0.npm-cache"

if not exist "tools\node-v24.18.0-win-x64\node.exe" (
  echo Portable Node.js was not found.
  echo Expected: tools\node-v24.18.0-win-x64\node.exe
  pause
  exit /b 1
)

if not exist "node_modules\electron\dist\electron.exe" (
  echo Installing dependencies...
  echo.
  call npm install --cache "%~dp0.npm-cache"
  if errorlevel 1 (
    echo.
    echo Failed to install dependencies.
    pause
    exit /b 1
  )
)

call npm start
