@echo off
setlocal
cd /d "%~dp0"

title Corpo Nu Flow - Homologacao V2

echo.
echo ============================================================
echo  CORPO NU FLOW - HOMOLOGACAO V2
echo  AMBIENTE LOCAL - NAO E PRODUCAO
echo ============================================================
echo.
echo Iniciando servidor local portatil...
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
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0SERVIDOR-HOMOLOGACAO.ps1"
goto FIM

:PWSH
pwsh.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0SERVIDOR-HOMOLOGACAO.ps1"
goto FIM

:FIM
echo.
echo Homologacao encerrada.
pause
