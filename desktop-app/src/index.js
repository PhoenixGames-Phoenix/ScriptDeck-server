const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const pacote = require('pacote');
const npmi = require('npmi');

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

module.exports.globalPath = app.getPath('userData');



function start(paths) {
  let promises = [];
  paths.forEach((path) => {
    let dir = fs.readdirSync(path);
    dir.forEach((folder) => {
      const promise = new Promise((resolve) => {
        if (fs.existsSync(`${path}/${folder}/package.json`)) {
          let opts = {
            path: path + "/" + folder + "/"
          }
          npmi(opts, () => {
            resolve()
          })
        } else {
          resolve();
        }
      })
      promises.push(promise);
    })
  })
  Promise.all(promises).then(() => {
    const server = require('./server/index');
    server.start();
  })
}
const paths = [`${this.globalPath}/scripts/`, `${this.globalPath}/plugins/`];
start(paths);

