const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require("fs");

var mainWindow = null;

function createWindow() {
	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 1024,
		height: 600,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			nodeIntegration: true,
			enableRemoteModule: true,
			contextIsolation: false
		},
		autoHideMenuBar: true,
		icon: path.join(__dirname, "icon.png")
	})

	require('@electron/remote/main').initialize();
	require('@electron/remote/main').enable(mainWindow.webContents);

	mainWindow.loadFile('index.html');

	//mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
	createWindow();
	app.on('activate', function () {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	})
});

app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') app.quit()
});