import ws from 'ws';
import express from 'express';
import fs from 'fs';
import Open from 'open';
import { Grid, setButtonStateCall, CallBase, runScriptCall, ScriptList, IScript, gridPostCall, Folder, GridUpdatecall, openFolderCall, FolderChangeCall, FolderUpdateCall, currentFolderRes, setButtonStateIDCall, MessageCall} from '../lib/Interfaces';
const globalPath: string = require('../index').globalPath;

let sockets: Array<ws> = [];
let grid: Grid;

export class API {
    constructor() {

    }
    rawWebsocket = async (data: string): Promise<void> => {
        broadcast(sockets, data);
    }
    setButtonState = async (active: Boolean, script: string): Promise<void> => {
        const data: setButtonStateCall = {
            type: "setButtonState",
            script,
            state: active
        }
        broadcast(sockets, JSON.stringify(data));
    }
    setButtonStateById = async (active: Boolean, id: number): Promise<void> => {
        const data: setButtonStateIDCall = {
            type: "setButtonStateID",
            id,
            state: active
        }
        broadcast(sockets, JSON.stringify(data));
    }
    switchFolder = async (index: number) => {
        if (grid.folders[index]) {
            const data: FolderChangeCall = {
                type: "folderChange",
                folder: index
            }
            broadcast(sockets, JSON.stringify(data));
        } else {
            console.warn("[WARN] A Plugin or Script tried to switch to a Folder that doesn't exist");
        }
    }
    getFolders = async (): Promise<Array<string>> => {
        let returnArray = new Array<string>();
        for (let i = 0; i < grid.folders.length; i++) {
            returnArray[i] = grid.folders[i].name
        }
        return returnArray;
    }
    getCurrentFolder = async (): Promise<number> => {
        return grid.current;
    }
    getAllGrid = async (): Promise<Grid> => {
        return grid;
    }
    getGrid = async (index: number): Promise<Folder> => {
        return grid.folders[index];
    }
    sendMessage = async (message: string): Promise<void> => {
        const data: MessageCall = {
            type: "message",
            message: message
        }
        broadcast(sockets, JSON.stringify(data));
    }
}

function broadcast(sockets: Array<ws>, data: string) {
    sockets.forEach((socket: ws) => {
        socket.send(data);
    })
}

module.exports.start = function(): void {
    const api = new API();
    module.exports.api = api;
    if (!fs.existsSync(globalPath + '/data/')) {
        fs.mkdirSync(globalPath + '/data/');
        fs.writeFileSync(globalPath + '/data/grid.json', '{ "type": "grid", "current": 0, "folders": [{ "name": "Main Folder", "buttons": []}] }');
    }

    grid = JSON.parse(fs.readFileSync(globalPath + '/data/grid.json').toString());

    function isJSONString(string: string): Boolean {
        try {
            JSON.parse(string);
        } catch (e) {
            return false;
        }
        return true;
    }
    let pluginsDir: string[], plugins: Map<string, any>;

    function loadPlugins() {
        pluginsDir = fs.readdirSync(globalPath + '/plugins/');
        plugins = new Map<string, any>();
        let i = 0;
        for (const folder of pluginsDir) {
            const pluginPath: string = `${globalPath}/plugins/${folder}`;
            const plugin = require(`${pluginPath}/${folder}.js`);
            plugin.execute(api);
            plugins.set(plugin.name, plugin);
            i++;
        }
        console.log(`[INFO] Loaded ${i} Plugins!`);
    }
    loadPlugins();

    let scriptsDir: string[], scriptsList: ScriptList, scripts: Map<string, IScript>;

    function loadScripts() {
        scriptsDir = fs.readdirSync(globalPath + '/scripts/');
        scriptsList = {type: "scriptList", list: []};
        scripts = new Map<string, IScript>();
        let i = 0;
        for (const folder of scriptsDir) {
            const script: IScript = require(`${globalPath}/scripts/${folder}/${folder}.js`);
            scripts.set(script.name, script);
            scriptsList.list[i] = script.name;
            i++;
        }
        console.log("[INFO] Scripts loaded! Loaded " + i + " Scripts");
    }
    loadScripts();

    const ControlApp = express();

    ControlApp.use(express.static('./web/'));
    ControlApp.use(express.json());

    ControlApp.get('/scripts/:script', function(req, res) {
        const src: string = fs.readFileSync(globalPath + '/scripts/' + req.params.script).toString();
        res.send(src);
    })
    ControlApp.get('/scripts', function(req, res) {
        res.send(JSON.stringify(scriptsList));
    })
    ControlApp.get('/data', function(req, res) {
        res.send(JSON.stringify(grid));
    })
    ControlApp.get('/grid/:index', function (req, res) {
        res.send(JSON.stringify(grid.folders[Number(req.params.index)]));
    })
    ControlApp.get('/folders', function (req, res) {
        let folderArray: string[] = [];
        for (let i = 0; i < grid.folders.length; i++) {
            folderArray[i] = grid.folders[i].name;
        }
        res.send(JSON.stringify(folderArray));
    })
    ControlApp.get('/folders/current', function(req, res) {
        let data: currentFolderRes = {
            type: "currentFolder",
            current: {
                id: grid.current,
                name: grid.folders[grid.current].name
            }
        }
        res.send(JSON.stringify(data));
    })

    try {
        ControlApp.listen(4654);
    } catch (error) {
        console.error('[ERROR] Something went wrong while trying to listen on Port 4654. Make sure the Port is not already used');
        process.exit(1);
    }
    console.log('[INFO] Config Web server listening on Port 4654');
    console.log('[INFO] Do not Expose Port 4654 or 4655. This would allow anyone to access and execute your scripts!');

    const cfgws = new ws.Server({
        port: 4655
    });

    let sockets: Array<ws> = [];
    cfgws.on('connection', (socket, req) => {
        sockets.push(socket);
        socket.on('close', () => {
            sockets = sockets.filter(s => s !== socket);
        })
        socket.on('message', (data) => {
            if (isJSONString(data.toString())) {
                let json: CallBase = JSON.parse(data.toString());
                switch (json.type) {
                    case "runScript":
                        let scriptCall = json as runScriptCall;
                        const script: IScript | undefined = scripts.get(scriptCall.script);
                        try {
                            console.log("[INFO] Script '" + scriptCall.script + "' executed");
                            if (scriptCall.args) {
                                script?.execute(this.api, scriptCall.args);
                            } else {
                                script?.execute(this.api);
                            }
                        } catch (error) {
                            console.error(error);
                        }
                        break;
                    case "gridPost":
                        let gridCall = json as gridPostCall;
                        let changedFolder: Folder = grid.folders[gridCall.folder];
                        changedFolder.buttons = gridCall.buttons;
                        changedFolder.name = gridCall.name;
                        grid.folders[gridCall.folder] = changedFolder;
                        fs.truncateSync(globalPath + '/data/grid.json');
                        fs.writeFileSync(globalPath + '/data/grid.json', JSON.stringify(grid));
                        let gridResponse: GridUpdatecall = {
                            type: "gridUpdate",
                            folder: gridCall.folder,
                        }
                        broadcast(sockets, JSON.stringify(gridResponse));
                        break;
                    case "openFolder":
                        let ofolderCall = json as openFolderCall;
                        switch (ofolderCall.folder) {
                            case "scripts":
                                Open(globalPath + '/scripts/');
                                break;
                            case "plugins":
                                Open(globalPath + '/plugins/');
                                break;
                        }
                        break;
                    case "folderChange":
                        let fChangeCall = json as FolderChangeCall;
                        grid.current = fChangeCall.folder;
                        fs.truncateSync(globalPath + '/data/grid.json');
                        fs.writeFileSync(globalPath + '/data/grid.json', JSON.stringify(grid));
                        let fChangeData: FolderChangeCall = {
                            type: "folderChange",
                            folder: fChangeCall.folder
                        }
                        broadcast(sockets, JSON.stringify(fChangeData));
                        break;
                    case "folderUpdate":
                        let fUpdateCall = json as FolderUpdateCall;
                        if (fUpdateCall.folder) {
                            grid.folders.push(fUpdateCall.folder);
                            fs.truncateSync(globalPath + '/data/grid.json');
                            fs.writeFileSync(globalPath + '/data/grid.json', JSON.stringify(grid));
                            let fUpdateData: FolderUpdateCall = {
                                type: "folderUpdate"
                            };
                            broadcast(sockets, JSON.stringify(fUpdateData));
                        }
                        break;
                }
            } else {
                socket.send("Invalid Request");
            }
        })
    })
}