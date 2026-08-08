@echo off
setlocal
cd /d "%~dp0"

title Corpo Nu Flow V2 - Pagamentos Somente Leitura

echo.
echo ============================================================
echo  CORPO NU FLOW V2 - FIREBASE REAL
echo  PAGAMENTOS - SOMENTE LEITURA
echo ============================================================
echo.
echo Filtros e relatorios estao liberados.
echo Quitacao e qualquer escrita permanecem bloqueadas.
echo Nao precisa de Node.js nem Python.
echo.

where powershell.exe >nul 2>nul
if %errorlevel%==0 goto POWERSHELL

where pwsh.exe >nul 2>nul
if %errorlevel%==0 goto PWSH

echo Nao encontrei o PowerShell do Windows neste computador.
echo.
pause
exit /b 1

:POWERSHELL
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0SERVIDOR-FIREBASE-V2-PAGAMENTOS-LEITURA.ps1"
goto FIM

:PWSH
pwsh.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0SERVIDOR-FIREBASE-V2-PAGAMENTOS-LEITURA.ps1"
goto FIM

:FIM
echo.
echo Validacao de Pagamentos encerrada.
pause
