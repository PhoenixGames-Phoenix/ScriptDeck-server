// ######################################################
// 
// CHANGE THE obs-websocket DEFAULT PORT TO 8000!!!!
// PORT 4444 IS ALREADY USED!
//
// #######################################################

const obswsjs = require('obs-websocket-js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./plugins/obs-websocket.json'));
const { SetButtonStateById, sendMessage, getGrid } = require('../index');
const obs = new obswsjs();
let last_scene_name = "";

module.exports = {
    name: 'obs-websocket',
    // Initial Execution function.
    // Executed on runtime
    async execute() {
       obs.connect({address: config.host + ':' + config.port}, (err) => {
           console.log("[WARN] Connection to OBS Studio failed! Are your settings correct?");
           console.log("[WARN] Error: " + err.name);
       });

       obs.on('ConnectionClosed', async (data) => {
           await sendMessage('Connection to OBS Lost');
       })
       obs.on('SwitchScenes', async (data) => {
           const grid = await JSON.parse(await getGrid());
           grid.buttons.forEach(async (element) => {
               if (element.args.split(',').includes(data['scene-name'].toString())) {
                   await SetButtonStateById(true,element.pos);
               } else if (element.args.split(',').includes(last_scene_name)) {
                   await SetButtonStateById(false,element.pos);
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