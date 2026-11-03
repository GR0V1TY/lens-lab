@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 未找到 Node.js。请安装 Node.js 18 或更高版本，或直接打开 dist\index.html 体验模拟。
  pause
  exit /b 1
)
if not exist "dist\index.html" (
  echo 文件不完整。请先将整个 ZIP 解压到文件夹，再启动。
  pause
  exit /b 1
)
echo 正在启动镜头实验室，请保留此窗口。
node server.mjs --open
if errorlevel 1 pause
