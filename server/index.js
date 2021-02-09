const ws = require('ws');
const express = require('express');
const fs = require('fs');
const open = require('open');

function broadcast(sockets, data) {
    sockets.forEach((socket) => {
        socket.send(data);
    })
}

if (!fs.existsSync('./data/')) {
    fs.mkdirSync('./data/');
    fs.writeFileSync('./data/grid.json', '{ "type": "grid", "buttons": [] }');
}
if (!fs.existsSync('./scripts/')) {
    fs.mkdirSync('./scripts/');
}

let scriptsDir = fs.readdirSync('./scripts/').filter((file) => file.endsWith('.js'));
let scriptsList = {type: "", list: []};
scriptsList.type = "scriptList";
let scripts = new Map();

function loadScripts() {
    scriptsDir = fs.readdirSync('./scripts/').filter((file) => file.endsWith('.js'));
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

const ControlApp = express();

ControlApp.use(express.static('./web/'));

ControlApp.get('/scripts/:script', function (req, res) {
    const src = fs.readFileSync('./scripts/' + req.params.script + '.js').toString();
    res.send(src);
})

ControlApp.get('/', function(req, res) {
    const index = fs.readFileSync('./web/index.html').toString();
    res.send(index);
});
ControlApp.get('/src', function(req, res) {
    const src = fs.readFileSync('./web/src.html').toString();
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
            const grid = fs.readFileSync('./data/grid.json');
            console.log("[INFO] Grid Request from " + req.connection.remoteAddress);
            socket.send(grid.toString());
        } else if (data.startsWith("scriptReq")) {
            socket.send(JSON.stringify(scriptsList));
            console.log("[INFO] Script List Request from " + req.connection.remoteAddress);
        } else if (data.startsWith("gridPost")) {
            const PostData = data.substring(9);
            console.log("[INFO] Script Post Reqeust from " + req.connection.remoteAddress);
            console.log("[INFO] Data: " + PostData);
            fs.truncateSync("./data/grid.json", 0);
            fs.writeFileSync("./data/grid.json", PostData);
            const newgrid = fs.readFileSync('./data/grid.json');
            broadcast(sockets, "gridUpdate " + newgrid);
        } else if (data.startsWith("reloadReq")) {
            scriptsDir = fs.readdirSync('./scripts/').filter((file) => file.endsWith('.js'));
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
        console.log(data);
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

console.log("[INFO] Opening browser window...");
open("http://localhost:4654")
