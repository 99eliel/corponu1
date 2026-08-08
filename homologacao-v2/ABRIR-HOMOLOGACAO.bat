@echo off
setlocal
cd /d "%~dp0.."

title Corpo Nu Flow - Homologacao V2

echo.
echo ============================================================
echo  CORPO NU FLOW - HOMOLOGACAO V2
echo  AMBIENTE LOCAL - NAO E PRODUCAO
echo ============================================================
echo.

where node >nul 2>nul
if %errorlevel%==0 goto NODE

where py >nul 2>nul
if %errorlevel%==0 goto PYTHON_PY

where python >nul 2>nul
if %errorlevel%==0 goto PYTHON

echo Nao encontrei Node.js nem Python neste computador.
echo.
echo Instale o Node.js ou Python e execute este arquivo novamente.
echo Nenhum dado foi alterado.
echo.
pause
exit /b 1

:NODE
start "" "http://127.0.0.1:8765/homologacao-v2/"
node "homologacao-v2\servidor-local.mjs"
goto FIM

:PYTHON_PY
start "" "http://127.0.0.1:8765/homologacao-v2/"
py -m http.server 8765 --bind 127.0.0.1
goto FIM

:PYTHON
start "" "http://127.0.0.1:8765/homologacao-v2/"
python -m http.server 8765 --bind 127.0.0.1
goto FIM

:FIM
echo.
echo Homologacao encerrada.
pause
