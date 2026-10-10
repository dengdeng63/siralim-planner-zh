@echo off
chcp 65001 >nul
cd /d %~dp0
echo 启动 Siralim Planner 中文版（含中/英一键切换）...
echo 首次编译约需 1 分钟，浏览器将自动打开 http://localhost:3000
set BROWSER=none
start "" http://localhost:3000
npm start
