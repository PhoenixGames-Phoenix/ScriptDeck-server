const ws = require('ws');
const express = require('express');
const fs = require('fs');
let grid = JSON.parse(fs.readFileSync(__dirname + '/data/grid.json'));

function broadcast(sockets, data) {
    sockets.forEach((socket) => {
        socket.send(data);
    })
}

// ScriptDeck API for Scripts and Plugins
module.exports = {
    // Sends raw websocket data to every connected client
    async rawWebsocket(data) {
        broadcast(sockets, data);
    },
    // Sets the state of every button that uses the specified script.
    // active:
    //  true = disables button and displays it as active
    //  false = enables button and displays it as inactive
    async setButtonState(active, script) {
        const data = {
            type: "setButtonState",
            script: script,
            state: active,
        }
        broadcast(sockets, JSON.stringify(data));
    },
    async SetButtonStateById(active, ID) {
        const data = {
            type: "setButtonStateID",
            id: ID,
            state: active
        }
        broadcast(sockets, JSON.stringify(data));
    },
    // Gets Grid of Buttons as Object
    async getGrid() {
        return grid;   
    },
    // Sends an alert to all connected clients.
    async sendMessage(message) {
        const data = {
            type: "message",
            message: message
        }
        broadcast(sockets, JSON.stringify(data));
    }
}

if (!fs.existsSync(__dirname + '/data/')) {
    fs.mkdirSync(__dirname + '/data/');
    fs.writeFileSync(__dirname + '/data/grid.json', '{ "type": "grid", "buttons": [] }');
}
if (!fs.existsSync(__dirname + '/scripts/')) {
    fs.mkdirSync(__dirname + '/scripts/');
}
if (!fs.existsSync(__dirname + '/plugins/')) {
    fs.mkdirSync(__dirname + '/plugins/');
}

let scriptsDir = fs.readdirSync(__dirname + '/scripts/').filter((file) => file.endsWith('.js'));
let scriptsList = {type: "", list: []};
scriptsList.type = "scriptList";
let scripts = new Map();

function loadScripts() {
    scriptsDir = fs.readdirSync(__dirname + '/scripts/').filter((file) => file.endsWith('.js'));
    scriptsList = {type: "", list: []};
    scriptsList.type = "scriptList";
    scripts = new Map();
    let i = 0;
    for (const file of scriptsDir) {
        const script = require(`./scripts/${file}`);
        scripts.set(script.name, script);
        scriptsList.list[i] = script.name;
        i++;
    }
    console.log("[INFO] Scripts loaded! Loaded " + i + " Script(s)");
}
loadScripts();

let pluginsDir = fs.readdirSync(__dirname + '/plugins/').filter((file) => file.endsWith('.js'));
let plugins = new Map();

function loadPlugins() {
    pluginsDir = fs.readdirSync(__dirname + '/plugins/').filter((file) => file.endsWith('.js'));
    plugins = new Map();
    let i = 0;
    for (const file of pluginsDir) {
        const plugin = require(`./plugins/${file}`);
        plugin.execute();
        plugins.set(plugin.name, plugin);
        i++;
    }
}
loadPlugins();

const ControlApp = express();

ControlApp.use(express.static('./web/'));

ControlApp.get('/scripts/:script', function (req, res) {
    const src = fs.readFileSync(__dirname + '/scripts/' + req.params.script + '.js').toString();
    res.send(src);
})

ControlApp.get('/', function(req, res) {
    const index = fs.readFileSync(__dirname + '/web/index.html').toString();
    res.send(index);
});
ControlApp.get('/src', function(req, res) {
    const src = fs.readFileSync(__dirname + '/web/src.html').toString();
    res.send(src);
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
            grid = JSON.parse(fs.readFileSync(__dirname + '/data/grid.json'));
            console.log("[INFO] Grid Request from " + req.connection.remoteAddress);
            socket.send(JSON.stringify(grid));
        } else if (data.startsWith("scriptReq")) {
            socket.send(JSON.stringify(scriptsList));
            console.log("[INFO] Script List Request from " + req.connection.remoteAddress);
        } else if (data.startsWith("gridPost")) {
            const PostData = data.substring(9);
            console.log("[INFO] Script Post Request from " + req.connection.remoteAddress);
            // console.log("[INFO] Data: " + PostData);
            fs.truncateSync(__dirname + "/data/grid.json", 0);
            fs.writeFileSync(__dirname + "/data/grid.json", PostData);
            grid = JSON.parse(fs.readFileSync(__dirname + '/data/grid.json'));
            const updateData = {
                type: "gridUpdate",
                grid: grid
            }
            console.log(JSON.stringify(updateData));
            broadcast(sockets, JSON.stringify(updateData));
        } else if (data.startsWith("reloadReq")) {
            scriptsDir = fs.readdirSync(__dirname + '/scripts/').filter((file) => file.endsWith('.js'));
            for (const file of scriptsDir) {
                delete require.cache[require.resolve("./scripts/" + file)];
            }
            loadScripts();
            socket.send("reloadFinished");
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
                script.execute(data.args);
            } else {
                script.execute();
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