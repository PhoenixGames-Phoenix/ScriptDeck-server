import {app, BrowserWindow} from 'electron';
import { register } from "electron-localshortcut";
import { existsSync, readdirSync, mkdirSync } from "fs";
import { join } from "path";
const npmi = require('npmi');

function createWindow(): void {
    const mainWindow = new BrowserWindow({
        icon: __dirname + '/assets/icon.png',
        width: 1920,
        height: 1080
    });
    mainWindow.loadFile(join(__dirname, '/web/index.html'));
    mainWindow.removeMenu();

    register(mainWindow, 'F12', () => {
        mainWindow.webContents.toggleDevTools();
    })
    register(mainWindow, 'F5', () => {
        mainWindow.reload();
    })
}

app.on('window-all-closed', () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
})

export const globalPath = app.getPath('userData');

function start(paths: Array<string>): void {
    if (!existsSync(app.getPath("userData") + '/scripts/')) mkdirSync(app.getPath("userData") + '/scripts/');
    if (!existsSync(app.getPath("userData") + '/plugins/')) mkdirSync(app.getPath("userData") + '/plugins/');
    let promises: Array<Promise<void>> = [];
    paths.forEach((path) => {
        let dir = readdirSync(path);
        dir.forEach((folder) => {
            const promise = new Promise<void>((resolve) => {
                if (existsSync(`${path}/${folder}/package.json`)) {
                    npmi({path: path + "/" + folder + "/"}, () => {
                        resolve();
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
        createWindow();
    })
}
const paths = [`${app.getPath('userData')}/scripts/`, `${app.getPath('userData')}/plugins/`];
app.on("ready", () => {
  start(paths);
})