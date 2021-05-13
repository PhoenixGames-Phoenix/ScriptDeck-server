const obswsjs = require('obs-websocket-js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync(__dirname + '/obs-websocket.json'));
const obs = new obswsjs();
let last_scene_name = "";

module.exports = {
    name: 'obs-websocket',
    // Initial Execution function.
    // Executed on runtime
    async execute(API) {

        //
        // The Error Callback does NOT work. Trycatch also doesn't
        // This does not seem to be an issue with the code, but rather an issue with ws or obs-websocket-js
        //
        obs.connect({address: config.host + ':' + config.port}, (err) => {
            console.log("[WARN] Connection to OBS Studio failed! Are your settings correct?");
            console.log("[WARN] Error: " + err.name);
        });

        obs.on('ConnectionClosed', async (data) => {
           await API.sendMessage('Connection to OBS Lost');
        })
        obs.on('SwitchScenes', async (data) => {
           const grid = await JSON.parse(await API.getGrid(await API.getCurrentFolder()));
           grid.buttons.forEach(async (element) => {
               if (element.args.split(',').includes(data['scene-name'].toString())) {
                   await API.SetButtonStateById(true,element.pos);
               } else if (element.args.split(',').includes(last_scene_name)) {
                   await API.SetButtonStateById(false,element.pos);
               }
           })
           last_scene_name = data['scene-name'];
        //    console.log(last_scene_name);
        });
        obs.on("ConnectionOpened", async function (data) {
           obs.sendCallback("GetCurrentScene", async (err, scene) => {
               last_scene_name = scene.name;
            //    console.log(last_scene_name);
           })
        });
    },
    // Additional functions for integrating own APIs
    async switchScene(scene) {
        obs.sendCallback("SetCurrentScene",{ "scene-name": scene }, async (err, data) => {
            if (err) {
                console.error(err);
            }
        })
    },
    async sendCallback(request, args) {
        obs.sendCallback(request,args,async(err, data) => {
            return data || err;
        })
    }
}