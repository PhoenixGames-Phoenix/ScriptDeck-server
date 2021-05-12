const ws = require('ws');
const express = require('express');
const fs = require('fs');
const open = require('open');
const globalPath = require('../index.js').globalPath;

module.exports.start = function() {
    if (!fs.existsSync(globalPath + '/data/')) {
        fs.mkdirSync(globalPath + '/data/');
        fs.writeFileSync(globalPath + '/data/grid.json', '{ "type": "grid", "current": 0, "folders": [{ "name": "Main Folder", "buttons": []}] }');
    }
    
    let grid = JSON.parse(fs.readFileSync(globalPath + '/data/grid.json'));
    
    function broadcast(sockets, data) {
        sockets.forEach((socket) => {
            socket.send(data);
        })
    }
    
    // ScriptDeck API for Scripts and Plugins
    const API = {
        /**
         * Sends raw websocket data to connected clients.
         * @param {object} - Data
         */
        async rawWebsocket(data) {
            broadcast(sockets, data);
        },
        //  true = disables button and displays it as active
        //  false = enables button and displays it as inactive
        /** 
         * Sets the state of a button using the name of the script
         * @param {bool} - Active/unactive
         * @param {String} - Script name
         */
        async setButtonState(active, script) {
            const data = {
                type: "setButtonState",
                script: script,
                state: active,
            }
            broadcast(sockets, JSON.stringify(data));
        },
        /**
         * Sets the state of a button using the ID of the button
         * @param {bool} - Active/unactive
         * @param {String} - ID as string
         */
        async SetButtonStateById(active, ID) {
            const data = {
                type: "setButtonStateID",
                id: ID,
                state: active
            }
            broadcast(sockets, JSON.stringify(data));
        },
        /**
         * Returns all button grids
         * @returns {object} - Grid
         */
        async getAllGrids() {
            return grid;   
        },
        /**
         * Returns the current button grid
         * @returns {object} - Current Grid
         */
        async getGrid() {
            return grid.folders[grid.current];
        },
        /**
         * Sends an alert to all connected clients
         * @param {String} - Message
         */
        async sendMessage(message) {
            const data = {
                type: "message",
                message: message
            }
            broadcast(sockets, JSON.stringify(data));
        }
    }
    module.exports.API = API;
    
    let pluginsDir = fs.readdirSync(globalPath + '/plugins/');
    let plugins = new Map();
    
    function loadPlugins() {
        pluginsDir = fs.readdirSync(globalPath + '/plugins/');
        plugins = new Map();
        let i = 0;
        for (const folder of pluginsDir) {
            const pluginPath = `${globalPath}/plugins/${folder}`
            const plugin = require(`${pluginPath}/${folder}.js`);
            plugin.execute(API);
            plugins.set(plugin.name, plugin);
            i++;
        }
        console.log(`[INFO] Loaded ${i} Plugins!`);
    }
    loadPlugins();
    
    let scriptsDir = fs.readdirSync(globalPath + '/scripts/');
    let scriptsList = {type: "scriptList", list: []};
    let scripts = new Map();
    
    function loadScripts() {
        scriptsDir = fs.readdirSync(globalPath + '/scripts/');
        scriptsList = {type: "scriptList", list: []};
        scripts = new Map();
        let i = 0;
        for (const folder of scriptsDir) {
            const script = require(`${globalPath}/scripts/${folder}/${folder}.js`);
            scripts.set(script.name, script);
            scriptsList.list[i] = script.name;
            i++;
        }
        console.log("[INFO] Scripts loaded! Loaded " + i + " Script(s)");
    }
    loadScripts();
    
    const ControlApp = express();
    
    ControlApp.use(express.static('./web/'));
    ControlApp.use(express.json());
    
    ControlApp.get('/scripts/:script', function (req, res) {
        const src = fs.readFileSync(globalPath + '/scripts/' + req.params.script + '/' + req.params.script + '.js').toString();
        res.send(src);
    })

    ControlApp.get('/scripts', function (req, res) {
        const scriptList = fs.readdirSync(globalPath + '/scripts/');
        res.send(JSON.stringify(scriptList));
    })

    ControlApp.get('/data', function (req, res) {
        grid = JSON.parse(fs.readFileSync(globalPath + '/data/grid.json').toString());
        res.send(JSON.stringify(grid));
    })

    ControlApp.get('/grid/:index', function (req, res) {
        grid = JSON.parse(fs.readFileSync(globalPath + '/data/grid.json').toString());
        let data = grid.folders[req.params.index];
        res.send(JSON.stringify(data));
    })
    
    ControlApp.get('/folders', function (req, res) {
        grid = JSON.parse(fs.readFileSync(globalPath + '/data/grid.json').toString());
        let folderArray = [];
        for (let i = 0; i < grid.folders.length; i++) {
            folderArray[i] = grid.folders[i].name;
        }
        res.send(JSON.stringify(folderArray));
    })

    ControlApp.get('/folders/current', function (req, res) {
        grid = JSON.parse(fs.readFileSync(globalPath + '/data/grid.json').toString());
        let data = {
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
        console.log('[ERROR] Something went wrong trying to listen on Port 4654. Is this port already used?');
        process.exit(1);
    }
    console.log('[INFO] Config Web server listening on Port 4654');
    console.log('[WARN] Do not Expose Port 4654 or 4655. This would allow anyone to access and execute your scripts!');
    
    const cfgws = new ws.Server({
        port: 4655
    });
    
    let sockets = [];
    cfgws.on('connection', (socket, req) => {
        sockets.push(socket);
        socket.on("close", () => {
            sockets = sockets.filter(s => s !== socket);
        })
        socket.on("message", (data) => {
            if (data.startsWith("gridPost")) {
                const PostData = JSON.parse(data.substring(9));
                console.log("[INFO] Script Post Request from " + req.connection.remoteAddress);
                // console.log("[INFO] Data: " + PostData);
                let changedFolder = grid.folders[PostData.folder]
                changedFolder.buttons = PostData.buttons
                changedFolder.name = PostData.name
                grid.folders[PostData.folder] = changedFolder;
                fs.truncateSync(globalPath + "/data/grid.json");
                fs.writeFileSync(globalPath + "/data/grid.json", JSON.stringify())
                broadcast(sockets, `{ "type": "gridUpdate", "folder": ${PostData.folder} }`);
            } else if (data.startsWith("reloadReq")) {
                scriptsDir = fs.readdirSync(globalPath + '/scripts/').filter((file) => file.endsWith('.js'));
                for (const file of scriptsDir) {
                    delete require.cache[require.resolve(globalPath + "/scripts/" + file)];
                }
                loadScripts();
                socket.send("reloadFinished");
            } else if (data.startsWith("openFolder")) {
                const folder = data.substring(11);
                // Switch statement instead of direct user Input because we don't want users just being able to execute files, even if this only runs locally
                switch (folder) {
                    case "scripts":
                        open(globalPath + "/scripts/");
                        break;
                    case "plugins":
                        open(globalPath + "/plugins/");
                        break;
                }
            } else if (data.startsWith("runScript")) {
                // console.log(data);
                let json = data.substring(10);
                // console.log(json);
                json = JSON.parse(json);
                if (!scripts.has(json.script)) return;
                const script = scripts.get(json.script);
                try {
                    console.log('[INFO] Script "' + json.script + '" executed');
                    if (json.args) {
                        script.execute(API, json.args);
                    } else {
                        script.execute(API);
                    }
                } catch (error) {
                    console.error(error);
                }

            } else if (JSON.parse(data).type == "folderChange") {
                let json = JSON.parse(data);
                grid.current = json.folder;
                fs.truncateSync(globalPath + '/data/grid.json');
                fs.writeFileSync(globalPath + '/data/grid.json', JSON.stringify(grid));
                let resData = {
                    type: "folderChange",
                    folder: grid.current
                }
                broadcast(sockets, JSON.stringify(resData));
            } else if (JSON.parse(data).type == "folderUpdate") {
                let json = JSON.parse(data);
                if (json.folder) {
                    grid.folders.push(json.folder);
                    fs.truncateSync(globalPath + '/data/grid.json');
                    fs.writeFileSync(globalPath + '/data/grid.json', JSON.stringify(grid));
                    broadcast(sockets, '{"type": "folderUpdate"}');
                }
            } else {
                socket.send("This is the Websocket Server for ScriptDeck. If you want to interact with this websocket, use the Web Interface on Port 4654");
            }
        });
    })
}