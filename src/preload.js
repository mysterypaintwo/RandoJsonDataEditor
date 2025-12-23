//preload.js
const {
	contextBridge,
	ipcRenderer
} = require('electron');
contextBridge.exposeInMainWorld('api', {
	// File system helpers
	selectWorkingDirectory: () => ipcRenderer.invoke('select-working-directory'),
	loadJson: (filePath) => ipcRenderer.invoke('load-json', filePath),
	saveJson: (filePath, data) => ipcRenderer.invoke('save-json', filePath, data),
	readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
	// Schema validation helper
	validateJsonSchema: (data, schemaPath) => ipcRenderer.invoke('validate-json-schema', data, schemaPath),
	// JSON update messaging
	send: (channel, data) => {
		let validChannels = ["update-json-data"];
		if (validChannels.includes(channel)) {
			ipcRenderer.send(channel, data);
		}
	},
	receive: (channel, func) => {
		let validChannels = ["json-data-updated"];
		if (validChannels.includes(channel)) {
			ipcRenderer.on(channel, (event, ...args) => func(...args));
		}
	},
	// --- Door editor API ---
	openDoorEditor: (doorData) => ipcRenderer.send('open-door-editor', doorData),
	onUpdateDoorNode: (callback) => ipcRenderer.on('update-door-node', (event, payload) => callback(payload)),
	
	// --- Room Properties editor API ---
	openRoomPropertiesEditor: (roomData, enemyList, itemList, eventList, weaponList, techMap, helperMap) => ipcRenderer.send('open-room-properties-editor', roomData, enemyList, itemList, eventList, weaponList, techMap, helperMap),
	onUpdateRoomProperties: (callback) => ipcRenderer.on('update-room-properties', (event, payload) => callback(payload))
});