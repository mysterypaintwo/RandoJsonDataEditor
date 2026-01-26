// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // File system helpers
    selectWorkingDirectory: () => ipcRenderer.invoke('select-working-directory'),
    loadJson: (filePath) => ipcRenderer.invoke('load-json', filePath),
    saveJson: (filePath, data) => ipcRenderer.invoke('save-json', filePath, data),
    readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
    getStratPresetsPath: () => ipcRenderer.invoke('get-strat-presets-path'),
    loadStratPresets: () => ipcRenderer.invoke('load-strat-presets'),
        
    // Schema validation helper
    validateJsonSchema: (data, schemaPath) => ipcRenderer.invoke('validate-json-schema', data, schemaPath),
    
    // Door editor API
    openDoorEditor: (doorData, enemyList, itemList, eventList, weaponList, techMap, helperMap) => {
        ipcRenderer.send('open-door-editor', doorData, enemyList, itemList, eventList, weaponList, techMap, helperMap);
    },
    onUpdateDoorNode: (callback) => {
        ipcRenderer.on('update-door-node', (event, payload) => callback(payload));
    },
    
    // Room Properties editor API
    openRoomPropertiesEditor: (roomData, enemyList, itemList, eventList, weaponList, techMap, helperMap, stratPresets) => {
        ipcRenderer.send('open-room-properties-editor', roomData, enemyList, itemList, eventList, weaponList, techMap, helperMap, stratPresets);
    },
    onUpdateRoomProperties: (callback) => {
        ipcRenderer.on('update-room-properties', (event, payload) => callback(payload));
    }
});