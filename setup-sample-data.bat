@echo off
echo Setting up sample data for educator dashboard...
echo.

echo Creating sample data...
node create-sample-data.js

echo.
echo Testing data availability...
node test-educator-data.js

echo.
echo Sample data setup complete!
pause