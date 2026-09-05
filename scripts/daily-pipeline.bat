@echo off
REM Daily Feature Pipeline — Windows Task Scheduler wrapper
REM This batch file is called by Windows Task Scheduler daily.
REM It launches Git Bash to run the autonomous Claude pipeline.

SET PROJECT_ROOT=C:\Users\digvi\Personal\social-platform
SET BASH_EXE=C:\Program Files\Git\bin\bash.exe
SET LOG_DIR=%PROJECT_ROOT%\logs
SET LOG_FILE=%LOG_DIR%\pipeline-scheduler-%DATE:~10,4%-%DATE:~4,2%-%DATE:~7,2%.log

REM Create log directory if missing
IF NOT EXIST "%LOG_DIR%" mkdir "%LOG_DIR%"

echo [%DATE% %TIME%] Task Scheduler triggered daily pipeline >> "%LOG_FILE%"

REM Run the bash script via Git Bash
"%BASH_EXE%" -l -c "cd '/c/Users/digvi/Personal/social-platform' && bash scripts/daily-pipeline.sh" >> "%LOG_FILE%" 2>&1

SET EXIT_CODE=%ERRORLEVEL%
echo [%DATE% %TIME%] Pipeline exited with code %EXIT_CODE% >> "%LOG_FILE%"

exit /b %EXIT_CODE%
