@echo off
chcp 65001 > nul
title TO2RENT - Платформа Аренды Недвижимости
echo ========================================================
echo   Запуск сайта аренды недвижимости TO2RENT
echo   Бэкенд: C# ASP.NET Core 9.0 (.NET 9) + Entity Framework Core
echo   Фронтенд: HTML5, CSS3, JavaScript (REST API)
echo ========================================================
echo.
echo Открытие сайта в браузере: http://localhost:5000
echo Документация API (Scalar): http://localhost:5000/scalar/v1
echo Панель управления:         http://localhost:5000/Html-Pages/admin.html
echo.
start http://localhost:5000
cd /d "%~dp0Backend"
dotnet run
pause
