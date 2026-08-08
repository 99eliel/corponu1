@echo off
setlocal
cd /d "%~dp0"

title Corpo Nu Flow V2 - Escrita Controlada Ordens e Manejo

echo.
echo ============================================================
echo  CORPO NU FLOW V2 - FIREBASE REAL
echo  ESCRITA CONTROLADA - SOMENTE ORDENS E MANEJO
echo ============================================================
echo.
echo Cada gravacao exige digitar GRAVAR.
echo Financeiro, Faccoes e Chegada permanecem bloqueados.
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
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0SERVIDOR-FIREBASE-V2-ESCRITA-CONTROLADA.ps1"
goto FIM

:PWSH
pwsh.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0SERVIDOR-FIREBASE-V2-ESCRITA-CONTROLADA.ps1"
goto FIM

:FIM
echo.
echo Validacao controlada encerrada.
pause
