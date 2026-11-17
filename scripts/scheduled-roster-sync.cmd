@echo off
rem Sync automatico dos elencos (chamado pelo Agendador de Tarefas do Windows).
rem Roda `npm run rosters:sync` na raiz do projeto e anexa a saida em logs\roster-sync.log
rem (pasta `logs` e gitignorada). Registro da tarefa: ver GUIA_PRODUCAO.md secao 1.
chcp 65001 >nul
cd /d "%~dp0.."
if not exist logs mkdir logs
echo ===== %date% %time% ===== >> logs\roster-sync.log
call npm run rosters:sync >> logs\roster-sync.log 2>&1
echo exit code: %errorlevel% >> logs\roster-sync.log
echo. >> logs\roster-sync.log
