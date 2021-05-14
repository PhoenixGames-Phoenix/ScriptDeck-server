var globalGrid = {"type": "grid", "current": 0, "folders": [{"name": "Loading...", "buttons": []}]};
var folderMap = new Map();
const cfgws = new WebSocket('ws://localhost:4655');

cfgws.onopen = (event) => {
    fetch("http://localhost:4654/data").then((response) => {
        response.text().then((json) => {
            globalGrid = JSON.parse(json);
            // Why can't I just forEach over every Element? Why does it have to be a HTMLCollection and not just an array?
            let elements = document.getElementsByClassName('ScriptButton');
            for (let i = 0; i < elements.length; i++) {
                let element = elements[i];
                element.innerHTML = "";
                element.removeAttribute("onClick");
                element.removeAttribute("data-script");
            }
            globalGrid.folders[globalGrid.current].buttons.forEach(element => {
                const button = document.getElementsByClassName('ScriptButton')[element.pos];
                if (element.name == "") element.name = "No Name"
                const name = element.name.split(" ");
                button.innerHTML = `<i class="material-icons">${element.icon}</i>\n ${name[0] + " " + (name[1] || "")}`;
                button.setAttribute("onClick", `scriptbutton("${element.script}", "${element.args}")`);
                button.setAttribute("data-script", element.script);
            })
            reloadFolderList();
        });
    })
    fetch("http://localhost:4654/scripts").then((response) => {
        response.text().then((json) => {
            let obj = JSON.parse(json);
            for (let i = 0; i < obj.length; i++) {
                const element = obj[i];
                var item = document.createElement("p");
                item.setAttribute("class", "sciptListItem");
                item.innerHTML = '<i class="material-icons md-24" style="padding-left: 10px; padding-right: 10px;">extension</i>' + element + ' (<a class="link" href="src.html?script=' + element + '">Source</a>)';
                document.getElementsByClassName('SelectScriptList')[0].appendChild(item);
            }
        })
    })
}
cfgws.onmessage = (event) => {
    if (IsJsonString(event.data)) {
        const object = JSON.parse(event.data);
        switch (object.type) {
            case "gridUpdate":
                fetch("http://localhost:4654/grid/" + object.folder).then((response) => {
                    response.text().then((json) => {
                        globalGrid.folders[object.folder] = JSON.parse(json);
                        let elements = document.getElementsByClassName('ScriptButton');
                        for (let i = 0; i < elements.length; i++) {
                            let element = elements[i];
                            element.innerHTML = "";
                            element.removeAttribute("onClick");
                            element.removeAttribute("data-script");
                        }
                        globalGrid.folders[object.folder].buttons.forEach(element => {
                            const button = document.getElementsByClassName('ScriptButton')[element.pos];
                            if (element.name == "") element.name = "No Name"
                            const name = element.name.split(" ");
                            button.innerHTML = `<i class="material-icons">${element.icon}</i>\n ${name[0] + " " + (name[1] || "")}`;
                            button.setAttribute("onClick", `scriptbutton("${element.script}", "${element.args}")`);
                            button.setAttribute("data-script", element.script);
                        })
                    })
                })
                break;
            case "folderChange":
                globalGrid.current = object.folder;
                let elements = document.getElementsByClassName('ScriptButton');
                for (let i = 0; i < elements.length; i++) {
                    let element = elements[i];
                    element.innerHTML = "";
                    element.removeAttribute("onClick");
                    element.removeAttribute("data-script");
                }
                globalGrid.folders[object.folder].buttons.forEach(element => {
                    const button = document.getElementsByClassName('ScriptButton')[element.pos];
                    if (element.name == "") element.name = "No Name"
                    const name = element.name.split(" ");
                    button.innerHTML = `<i class="material-icons">${element.icon}</i>\n ${name[0] + " " + (name[1] || "")}`;
                    button.setAttribute("onClick", `scriptbutton("${element.script}", "${element.args}")`);
                    button.setAttribute("data-script", element.script);
                })
                break;
            case "folderUpdate":
                fetch("http://localhost:4654/data").then((response) => {
                    response.text().then((json) => {
                        globalGrid = JSON.parse(json);
                        let elements = document.getElementsByClassName('ScriptButton');
                        for (let i = 0; i < elements.length; i++) {
                            let element = elements[i];
                            element.innerHTML = "";
                            element.removeAttribute("onClick");
                            element.removeAttribute("data-script");
                        }
                        globalGrid.folders[globalGrid.current].buttons.forEach(element => {
                            const button = document.getElementsByClassName('ScriptButton')[element.pos];
                            if (element.name == "") element.name = "No Name"
                            const name = element.name.split(" ");
                            button.innerHTML = `<i class="material-icons">${element.icon}</i>\n ${name[0] + " " + (name[1] || "")}`;
                            button.setAttribute("onClick", `scriptbutton("${element.script}", "${element.args}")`);
                            button.setAttribute("data-script", element.script);
                        })
                    });
                })
                reloadFolderList();
                break;
            case "setButtonState":
                const buttons = document.querySelectorAll(`[data-script="${object.script}"]`);
                if (object.state) {
                    buttons.forEach(button => {
                        button.classList.add("active")
                        button.disabled = true;
                    });   
                } else {
                    buttons.forEach(button => {
                        if (button.classList.contains("active")) {
                            button.classList.remove("active");
                            button.disabled = false;
                        }
                    });
                }
                break;
            case "setButtonStateID":
                const idMap = new Map();
                const IDbuttons = document.getElementsByClassName("ScriptButton");
                for (i = 0; i < IDbuttons.length; i++) {
                    idMap.set(IDbuttons[i].parentNode.id, IDbuttons[i]);
                }
                let button = idMap.get(object.id);
                if (object.state) {
                    button.classList.add("active");
                    button.disabled = true;
                } else {
                    if (button.classList.contains("active")) {
                        button.classList.remove("active");
                        button.disabled = false;
                    }
                }
                break;
            case "message":
                window.alert(object.message);
                break;
            default:
                window.alert('Client received unknwon data type!');
                break;
        }
    }
}

cfgws.close = (event) => {
    window.alert("Connection lost! Restart the server and reload this page!");
}

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

async function scriptbutton(script, args) {
    const data = {
        "type": "runScript",
        "script": script,
        "args": args,
    }
    console.log("[DEBUG] " + JSON.stringify(data));
    await cfgws.send(JSON.stringify(data));
    cfgws.onerror = async (error) => {
        await window.alert(error);
    }
}
function reloadFolderList() {
    fetch("http://localhost:4654/folders").then((response) => {
        response.text().then((json) => {
            folders = JSON.parse(json);
            let ddl = document.getElementById('FolderSelect');
            ddl.innerHTML = "";
            ddl.innerHTML += `<option value=${globalGrid.current} class="FolderSelectOption">${folders[globalGrid.current]}</option>`;
            let i = 0;
            for (i = 0; i < folders.length; i++) {
                folderMap.set(i, folders[i]);
                if (i !== globalGrid.current) {
                    ddl.innerHTML += `<option value=${i} class="FolderSelectOption">${folders[i]}</option>`
                }
            }
        })
    })
}
async function IconInput(val) {
    if (val != "") {
        document.getElementById("PreviewScriptButtonImage").innerHTML = val;
    } else {
        document.getElementById("PreviewScriptButtonImage").innerHTML = "description";
    }
}
async function NameInput(val) {
    if (val != "") {
        const name = val.split(" ");
        document.getElementsByClassName("PreviewScriptButton")[0].innerHTML = `<i class="material-icons" id="PreviewScriptButtonImage">${document.getElementById("PreviewScriptButtonImage").innerHTML || "description"}</i>\n${name[0] + " " + (name[1] || "")}`;
    } else {
        document.getElementsByClassName("PreviewScriptButton")[0].innerHTML = `<i class="material-icons" id="PreviewScriptButtonImage">${document.getElementById("PreviewScriptButtonImage").innerHTML || "description"}</i>\nNo Name`;
    }
}
function allowDrop(event) {
    event.preventDefault();
}
function buttonDrag(event) {

}
function buttonDrop(event, id) {
    event.preventDefault();
    event.target.innerHTML = document.getElementsByClassName("PreviewScriptButton")[0].innerHTML;
    let additionalData = {
        "pos": id,
        "name": document.getElementsByClassName("NameInput")[0].value || "",
        "icon": document.getElementsByClassName("IconInput")[0].value || "",
        "script": document.getElementsByClassName("ScriptInput")[0].value || "",
        "args": document.getElementsByClassName("ArgumentInput")[0].value || "",
    }
    // ###################################
    // Temporary Solution, will be changed
    // EDIT: Not As Temporary as I thought it would be
    let push = true;
    let i = 0;
    globalGrid.folders[globalGrid.current].buttons.forEach((button) => {
        if (button.pos == additionalData.pos) {
            globalGrid.folders[globalGrid.current].buttons[i] = additionalData;
            push = false;
        }
        i++;
    });
    if (push) {
        globalGrid.folders[globalGrid.current].buttons.push(additionalData);
    }
    // ###################################


    let postData = {
        type: "gridPost",
        folder: globalGrid.current,
        name: globalGrid.folders[globalGrid.current].name,
        buttons: globalGrid.folders[globalGrid.current].buttons
    }
    cfgws.send(JSON.stringify(postData));
    document.getElementsByClassName("NameInput")[0].value = "";
    document.getElementsByClassName("IconInput")[0].value = "";
    document.getElementsByClassName("ScriptInput")[0].value = "";
    document.getElementsByClassName("ArgumentInput")[0].value = "";
    NameInput("");
    IconInput("");
}
// Disabled due to new openFolder changes
/* function reloadScripts() {
    cfgws.send("reloadReq");
    const scriptTextList = document.getElementsByClassName("SelectScriptList")[0].children;
    for (let j = 0; j < scriptTextList.length; j++) {
        scriptTextList[j].remove();
    }
    cfgws.send('scriptReq');
} */
function openFolder(folder) {
    let data = {
        type: "openFolder",
        folder: folder
    }
    cfgws.send(JSON.stringify(data));
} 
function RAINBOW() {
    let buttons = document.getElementsByClassName("ScriptButton");
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.toggle("rainbowtext");
    }
    document.getElementsByClassName("PreviewScriptButton")[0].classList.toggle("rainbowtext");
    document.getElementsByClassName("Header")[0].classList.toggle("rainbowtext");
}
function FolderSwitchSubmit(target) {
    const formData = new FormData(target);
    const index = formData.getAll("FolderSelect")[0];
    let data = {
        type: "folderChange",
        folder: Number(index)
    }
    cfgws.send(JSON.stringify(data));
}
function OpenFolderForm() {
    let form = document.getElementById('form-container');
    form.hidden = !form.hidden;
}
function SubmitFolderForm(event) {
    event.preventDefault();
    event.target.hidden = !event.target.hidden;
    const formData = new FormData(event.target);
    const name = formData.getAll("containername")[0];
    let newFolder = {
        name: name,
        buttons: []
    }
    globalGrid.folders.push(newFolder);
    let postData = {
        type: "folderUpdate",
        folder: newFolder
    }
    cfgws.send(JSON.stringify(postData));
    postData = {
        type: "folderChange",
        folder: globalGrid.folders.length - 1 // Race condition where it uses the wrong number. VERY rare, maybe not even possible
    }
    cfgws.send(JSON.stringify(postData));
}