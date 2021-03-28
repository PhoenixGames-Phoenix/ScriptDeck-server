const { app, BrowserWindow } = require('electron');
const path = require('path');

if (require('electron-squirrel-startup')) {
  app.quit();
}



const createWindow = () => {
  const mainWindow = new BrowserWindow({
    icon: __dirname + '/assets/Logo.ico',
    width: 1920,
    height: 1080,
  });
  mainWindow.loadFile(path.join(__dirname, '/web/index.html'));
  mainWindow.removeMenu();
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

require('./server/index');