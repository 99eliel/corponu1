@echo off
setlocal
cd /d "%~dp0"

title Corpo Nu Flow V2 - Firebase Real Somente Leitura

echo.
echo ============================================================
echo  CORPO NU FLOW V2 - FIREBASE REAL
echo  SOMENTE LEITURA - NENHUMA GRAVACAO LIBERADA
echo ============================================================
echo.
echo Iniciando servidor local seguro...
echo Nao precisa de Node.js nem Python.
echo.

where powershell.exe >nul 2>nul
if %errorlevel%==0 goto POWERSHELL

where pwsh.exe >nul 2>nul
if %errorlevel%==0 goto PWSH

echo Nao encontrei o PowerShell do Windows neste computador.
echo Este launcher foi feito para Windows 10/11 e normalmente o PowerShell ja vem instalado.
echo.
pause
exit /b 1

:POWERSHELL
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0SERVIDOR-FIREBASE-V2-LEITURA.ps1"
goto FIM

:PWSH
pwsh.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0SERVIDOR-FIREBASE-V2-LEITURA.ps1"
goto FIM

:FIM
echo.
echo Validacao Firebase V2 encerrada.
pause
