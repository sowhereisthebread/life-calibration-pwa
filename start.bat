@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
if not defined PORT set "PORT=8000"
set "LAN_IP="
for /f "tokens=2 delims=:" %%I in ('ipconfig ^| findstr /c:"IPv4"') do if not defined LAN_IP set "LAN_IP=%%I"
for /f "tokens=*" %%I in ("%LAN_IP%") do set "LAN_IP=%%I"

echo 人生主控表本機伺服器
echo 電腦開啟：http://localhost:%PORT%
if defined LAN_IP (
  echo 手機開啟：http://%LAN_IP%:%PORT%
) else (
  echo 找不到區網 IP，請確認 Wi-Fi 已連線。
)
echo 請保持這個視窗開啟，按 Ctrl+C 可停止。
echo.

where python >nul 2>nul
if not errorlevel 1 (
  python --version >nul 2>nul
  if not errorlevel 1 (
    python -m http.server %PORT% --bind 0.0.0.0
    goto :end
  )
)

where py >nul 2>nul
if not errorlevel 1 (
  py -3 --version >nul 2>nul
  if not errorlevel 1 (
    py -3 -m http.server %PORT% --bind 0.0.0.0
    goto :end
  )
)

set "PYTHON_EXE="
for /d %%D in ("%LocalAppData%\Programs\Python\Python*") do if exist "%%~fD\python.exe" set "PYTHON_EXE=%%~fD\python.exe"
if defined PYTHON_EXE (
  "%PYTHON_EXE%" -m http.server %PORT% --bind 0.0.0.0
  goto :end
)

echo 無法啟動：找不到可用的 Python。
pause

:end
endlocal
