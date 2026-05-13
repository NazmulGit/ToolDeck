@echo off
REM ToolDeck launcher — starts the server + UI and opens the dashboard.
REM First run also creates a Start ToolDeck.lnk with the custom icon.
setlocal
cd /d "%~dp0"

REM First run: create a real .lnk with the icon so Explorer shows it nicely.
if not exist "Start ToolDeck.lnk" (
  if exist "assets\tooldeck.ico" (
    powershell -NoProfile -Command "$w = New-Object -ComObject WScript.Shell; $l = $w.CreateShortcut('%~dp0Start ToolDeck.lnk'); $l.TargetPath = '%~dp0Start ToolDeck.cmd'; $l.WorkingDirectory = '%~dp0'; $l.IconLocation = '%~dp0assets\tooldeck.ico,0'; $l.WindowStyle = 7; $l.Description = 'Launch ToolDeck'; $l.Save()" >NUL 2>NUL
  )
)

REM Quick sanity: Node + pnpm must be on PATH.
where node >NUL 2>NUL
if errorlevel 1 (
  echo Node.js is not on PATH. Install from https://nodejs.org and try again.
  pause
  exit /b 1
)
where pnpm >NUL 2>NUL
if errorlevel 1 (
  echo pnpm is not on PATH. Run: npm install -g pnpm
  pause
  exit /b 1
)

REM First-run: install deps if node_modules is missing.
if not exist "node_modules" (
  echo First run — installing dependencies...
  pnpm install
  if errorlevel 1 (
    echo pnpm install failed.
    pause
    exit /b 1
  )
)

REM Start the dev server in a minimised window and open the browser.
echo Starting ToolDeck...
start "ToolDeck server" /min cmd /c "pnpm start"
timeout /t 4 /nobreak >NUL
start "" "http://127.0.0.1:4316"

endlocal
