const ws = require('ws');
const express = require('express');
const fs = require('fs');
const open = require('open');
const prism = require('prismjs');

if (!fs.existsSync('./data/')) {
    fs.mkdirSync('./data/');
    fs.writeFileSync('./data/grid.json', '{ "type": "grid", "buttons": [] }');
}
if (!fs.existsSync('./scripts/')) {
    fs.mkdirSync('./scripts/');
}

const scriptsDir = fs.readdirSync('./scripts/').filter((file) => file.endsWith('.js'));
const scriptsList = {type: "", list: []};
scriptsList.type = "scriptList";
const scripts = new Map();

let i = 0;
for (const file of scriptsDir) {
    const script = require(`./scripts/${file}`);
    scripts.set(script.name, script);
    scriptsList.list[i] = script.name;
    i++;
}
console.log("[INFO] Scripts loaded! Loaded " + i + " Script(s)");

const ControlApp = express();

ControlApp.use(express.static('./web/'));

ControlApp.get('/scripts/:script', function (req, res, next) {
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

cfgws.on('connection', (socket, req) => {
    socket.on("message", (data) => {
        switch (data) {
            case "gridReq":
                const grid = fs.readFileSync('./data/grid.json');
                console.log("[INFO] Grid Request from " + req.connection.remoteAddress);
                socket.send(grid.toString());
                break;
            case "scriptReq":
                socket.send(JSON.stringify(scriptsList));
                console.log("[INFO] Script List Request from " + req.connection.remoteAddress);
                break;
            default:
                socket.send("This is the Config Websocket Server for ScriptDeck. If you want to interact with this websocket, use the Web Interface on Port 4654");
                break;
        }
    });
})

const scriptws = new ws.Server({
    port: 4444
});

scriptws.on('connection', (socket, req) => {
    console.log('[INFO] ScriptWS connection from ' + req.connection.remoteAddress);
    socket.on('message', (data) => {
        if (!scripts.has(data)) return socket.emit('error', new Error('404: Unknwon Script!'));
        const script = scripts.get(data);
        try {
            console.log('[INFO] Script "' + data + '" executed from ' + req.connection.remoteAddress);
            script.execute();
        } catch (error) {
            console.error(error);
            socket.emit('error', new Error('404: Unknwon Script!'));
        }
    })
    socket.on('error', (ws, error) => {
    })
    socket.on('close', (code, reason) => {
        console.log('[INFO] ' + req.connection.remoteAddress + ' closed connection with code ' + code + ' because of "' + reason + '"')
    })
})

console.log("[INFO] Opening browser window...");
open("http://localhost:4654")
