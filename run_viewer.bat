@echo off
echo Starting ROBOWARS 3D Viewer on http://localhost:8080 ...
start http://localhost:8080
python -m http.server 8080
pause
