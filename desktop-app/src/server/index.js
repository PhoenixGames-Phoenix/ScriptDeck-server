const ws = require('ws');
const express = require('express');
const fs = require('fs');
const open = require('open');
const globalPath = require('../index.js').globalPath;

module.exports.start = function() {
    if (!fs.existsSync(globalPath + '/data/')) {
        fs.mkdirSync(globalPath + '/data/');
        fs.writeFileSync(globalPath + '/data/grid.json', '{ "type": "grid", "buttons": [] }');
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
         * Returns the current button grid
         * @returns {object} - Grid
         */
        async getGrid() {
            return grid;   
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
    
    ControlApp.get('/scripts/:script', function (req, res) {
        const src = fs.readFileSync(globalPath + '/scripts/' + req.params.script + '.js').toString();
        res.send(src);
    })
    
    ControlApp.get('/', function(req, res) {
        const index = fs.readFileSync(globalPath + '/web/index.html').toString();
        res.send(index);
    });
    ControlApp.get('/src', function(req, res) {
        const src = fs.readFileSync(globalPath + '/web/src.html').toString();
        res.send(src);
    })
    ControlApp.get('/favicon.ico', function(req, res) {
        const ico = fs.readFileSync(globalPath + '/web/favicon.ico');
        res.send(ico);
    })
    
    try {
        ControlApp.listen(4654);
    } catch (error) {
        console.log('[ERROR] Something went wrong trying to listen on Port 4654. Is this port already used?');
        process.exit(1);
    }
    console.log('[INFO] Config Web server listening on Port 4654');
    console.log('[WARN] Do not Expose Port 4654, 4655 or 4444. This would allow anyone to access and execute your scripts!');
    
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
            if (data.startsWith("gridReq")) {
                grid = JSON.parse(fs.readFileSync(globalPath + '/data/grid.json'));
                console.log("[INFO] Grid Request from " + req.connection.remoteAddress);
                socket.send(JSON.stringify(grid));
            } else if (data.startsWith("scriptReq")) {
                socket.send(JSON.stringify(scriptsList));
                console.log("[INFO] Script List Request from " + req.connection.remoteAddress);
            } else if (data.startsWith("gridPost")) {
                const PostData = data.substring(9);
                console.log("[INFO] Script Post Request from " + req.connection.remoteAddress);
                // console.log("[INFO] Data: " + PostData);
                fs.truncateSync(globalPath + "/data/grid.json", 0);
                fs.writeFileSync(globalPath + "/data/grid.json", PostData);
                grid = JSON.parse(fs.readFileSync(globalPath + '/data/grid.json'));
                const updateData = {
                    type: "gridUpdate",
                    grid: grid
                }
                console.log(JSON.stringify(updateData));
                broadcast(sockets, JSON.stringify(updateData));
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
            } else {
                socket.send("This is the Config Websocket Server for ScriptDeck. If you want to interact with this websocket, use the Web Interface on Port 4654");
            }
        });
    })
    
    const scriptws = new ws.Server({
        port: 4444
    });
    
    scriptws.on('connection', (socket, req) => {
        console.log('[INFO] ScriptWS connection from ' + req.connection.remoteAddress);
        socket.on('message', (data) => {
            // console.log(data);
            data = JSON.parse(data.toString());
            if (!scripts.has(data.script)) return socket.emit('error', new Error('404: Unknwon Script!'));
            const script = scripts.get(data.script);
            try {
                console.log('[INFO] Script "' + data.script + '" executed from ' + req.connection.remoteAddress);
                if (data.args) {
                    script.execute(API, data.args);
                } else {
                    script.execute(API);
                }
                
            } catch (error) {
                console.error(error);
                socket.emit('error', new Error('404: Unknwon Script!'));
            }
        })
        socket.on('error', () => {
        })
        socket.on('close', (code, reason) => {
            console.log('[INFO] ' + req.connection.remoteAddress + ' closed connection with code ' + code + ' because of "' + reason + '"')
        })
    })
}