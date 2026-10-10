#!/bin/bash
# 构建 siralim-planner-zh 前端生产包
cd /d/siralim/siralim-planner-zh || exit 1
exec "C:/Users/11953/.workbuddy/binaries/node/versions/22.22.2-2/node.exe" ./node_modules/react-scripts/bin/react-scripts.js build
