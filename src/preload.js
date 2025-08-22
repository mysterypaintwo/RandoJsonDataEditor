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
	onUpdateDoorData: (callback) => ipcRenderer.on('update-door-data', (event, payload) => callback(payload))
});