import { API } from '../server/index_new';

export interface Button {
    pos: string,
    name: string,
    icon: string,
    script: string,
    args: string
}
export interface Folder {
    name: string,
    buttons: Array<Button>
}
export interface Grid {
    type: string,
    current: number,
    folders: Array<Folder>
}

export interface CallBase {
    type: string
}

export class setButtonStateCall implements CallBase {
    constructor(script: string, state: Boolean) {
        this.script = script,
        this.state = state;
    };
    type = "setButtonState";
    script: string;
    state: Boolean;
}
export class setButtonStateIDCall implements CallBase {
    constructor(id: number, state: Boolean) {
        this.id = id;
        this.state = state;
    };
    type = "setButtonStateID";
    id: number;
    state: Boolean;
}
export class FolderChangeCall implements CallBase {
    constructor(folder: number) {
        this.folder = folder;
    }
    type = "folderChange";
    folder: number;
}
export class FolderUpdateCall implements CallBase {
    type = "folderUpdate";
    folder?: Folder
}
export class GridUpdatecall implements CallBase {
    constructor(folder: number) {
        this.folder = folder;
    }
    type = "gridUpdate";
    folder: number
}
export class MessageCall implements CallBase {
    constructor(message: string) {
        this.message = message;
    }
    type = "message";
    message: string;
}

export class runScriptCall implements CallBase {
    constructor(script: string, args?: string) {
        this.script = script;
        this.args = args;
    }
    type = "runScript";
    script: string;
    args?: string;
}
export class gridPostCall implements CallBase {
    constructor(folder: number, name: string, buttons: Array<Button>) {
        this.folder = folder,
        this.name = name,
        this.buttons = buttons
    }
    type = "gridPost";
    folder: number;
    name: string;
    buttons: Array<Button>;
}
export class openFolderCall implements CallBase {
    constructor(folder: string) {
        this.folder = folder
    }
    type = "openFolder";
    folder: string;
}

interface currentFolder {
    id: number,
    name: string
}
export class currentFolderRes implements CallBase {
    constructor(id: number, name: string) {
        let data: currentFolder = {
            id, name
        }
        this.current = data;
    }
    type = "currentFolder";
    current: currentFolder
}

export interface IScript {
    name: string,
    execute(API: API, args?: string): Promise<void>
}
export interface ScriptList {
    type: string,
    list: string[]
}
