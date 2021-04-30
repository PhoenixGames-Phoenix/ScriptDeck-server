const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
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


// This is some really fucked up shit that somehow works.
// I want to never touch it again and these few lines are my biggest enemy.
// And no: I do not understand why or how this works but it does.
// ++++++++++++++++
// + DO NOT TOUCH +
// ++++++++++++++++
function start(paths) {
  if (!fs.existsSync(app.getPath("userData") + '/scripts/')) fs.mkdirSync(app.getPath("userData") + '/scripts/');
  if (!fs.existsSync(app.getPath("userData") + '/plugins/')) fs.mkdirSync(app.getPath("userData") + '/plugins/');
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

