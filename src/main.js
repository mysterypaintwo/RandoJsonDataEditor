//main.js
const {
	app,
	BrowserWindow,
	dialog,
	ipcMain
} = require('electron');
const path = require('path');
const fs = require('fs');
let mainWindow; // <--- define global
// enable remote debugging before the app's ready
app.commandLine.appendSwitch('remote-debugging-port', '9223');

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1400,
		height: 900,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js')
		}
	});
	mainWindow.loadFile('ui/index.html');
}
app.whenReady().then(createWindow);
ipcMain.handle('select-working-directory', async () => {
	const result = await dialog.showOpenDialog({
		properties: ['openDirectory']
	});
	if (result.canceled) return null;
	return result.filePaths[0];
});
ipcMain.handle('load-json', async (event, filePath) => {
	try {
		const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
		console.log(`Loaded JSON: ${filePath}`);
		return data;
	} catch (err) {
		//console.error(`Error loading JSON ${filePath}:`, err);
		return null;
	}
});
ipcMain.handle('save-json', async (event, filePath, data) => {
	try {
		// Create directory if it doesn't exist
		const dir = path.dirname(filePath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, {
				recursive: true
			});
		}
		fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
		console.log(`Saved JSON: ${filePath}`);
		return true;
	} catch (err) {
		console.error(`Error saving JSON ${filePath}:`, err);
		return false;
	}
});
ipcMain.handle('read-directory', async (event, dirPath) => {
	try {
		const items = fs.readdirSync(dirPath);
		// Filter out hidden files and return only directories and .json files
		return items.filter(item => {
			if (item.startsWith('.')) return false;
			const fullPath = path.join(dirPath, item);
			const stats = fs.statSync(fullPath);
			return stats.isDirectory() || item.endsWith('.json');
		});
	} catch (err) {
		console.error(`Error reading directory ${dirPath}:`, err);
		return [];
	}
});
// Schema validation helper using AJV
let Ajv;
let ajv;
// Initialize AJV when needed
async function initAjv() {
	if (!ajv) {
		try {
			Ajv = require('ajv');
			ajv = new Ajv({
				allErrors: true
			});
		} catch (err) {
			console.warn('AJV not available, falling back to basic validation');
			return null;
		}
	}
	return ajv;
}
ipcMain.handle('validate-json-schema', async (event, data, schemaPath) => {
	try {
		// Load the schema file
		if (!fs.existsSync(schemaPath)) {
			return {
				valid: false,
				errors: [`Schema file not found: ${schemaPath}`]
			};
		}
		const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
		const validator = await initAjv();
		if (validator) {
			// Use AJV for proper validation
			const validate = validator.compile(schema);
			const valid = validate(data);
			return {
				valid,
				errors: valid ? [] : validate.errors.map(err =>
					`${err.instancePath || 'root'}: ${err.message}`
				)
			};
		} else {
			// Fall back to basic validation
			const result = basicValidateSchema(data, schema);
			return {
				valid: result.valid,
				errors: result.errors
			};
		}
	} catch (err) {
		console.error(`Schema validation error for ${schemaPath}:`, err);
		return {
			valid: false,
			errors: [`Schema validation failed: ${err.message}`]
		};
	}
});
/**
 * Basic JSON schema validation (fallback when AJV not available)
 * @param {Object} data - Data to validate
 * @param {Object} schema - JSON schema
 * @returns {Object} Validation result with valid flag and errors array
 */
function basicValidateSchema(data, schema) {
	const errors = [];
	// Check required properties
	if (schema.required && Array.isArray(schema.required)) {
		for (const prop of schema.required) {
			if (!(prop in data)) {
				errors.push(`Missing required property: ${prop}`);
			}
		}
	}
	// Check properties types and nested requirements
	if (schema.properties) {
		for (const [prop, propSchema] of Object.entries(schema.properties)) {
			if (prop in data) {
				const propResult = validateProperty(data[prop], propSchema, prop);
				errors.push(...propResult.errors);
			}
		}
	}
	return {
		valid: errors.length === 0,
		errors
	};
}
/**
 * Validate a single property against its schema
 * @param {*} value - Property value
 * @param {Object} schema - Property schema
 * @param {string} propName - Property name for error messages
 * @returns {Object} Validation result
 */
function validateProperty(value, schema, propName) {
	const errors = [];
	// Type checking
	if (schema.type) {
		const actualType = Array.isArray(value) ? 'array' : typeof value;
		if (actualType !== schema.type && !(value === null && schema.type === 'object')) {
			errors.push(`Property ${propName} should be ${schema.type}, got ${actualType}`);
		}
	}
	// Nested object validation
	if (schema.type === 'object' && value && typeof value === 'object') {
		const nestedResult = basicValidateSchema(value, schema);
		errors.push(...nestedResult.errors.map(err => `${propName}.${err}`));
	}
	// Array validation
	if (schema.type === 'array' && Array.isArray(value)) {
		if (schema.items) {
			value.forEach((item, index) => {
				const itemResult = validateProperty(item, schema.items, `${propName}[${index}]`);
				errors.push(...itemResult.errors);
			});
		}
	}
	return {
		errors
	};
}
/* Room Properties Editor IPCs */
// Handle request to open Room Properties Editor
ipcMain.on('open-room-properties-editor', (event, roomPropertiesData, enemyList, itemList, eventList, weaponList, techMap, helperMap) => {
	console.log('Opening Room Properties Editor with data:', event, roomPropertiesData, enemyList, itemList, eventList, weaponList, techMap, helperMap);
	const roomPropertiesWin = new BrowserWindow({
		width: 700,
		height: 800,
		modal: true,
		parent: mainWindow,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false
		}
	});
	// Force DevTools to open
	//roomPropertiesWin.webContents.openDevTools();
	// Load Room Properties Editor files from editor subdirectory
	roomPropertiesWin.loadFile(path.join(__dirname, 'editor/roomProperties/roomPropertiesEditor.html'));
	// Store the data temporarily
	roomPropertiesWin.roomPropertiesData = roomPropertiesData;
	roomPropertiesWin.enemyList = enemyList;
	roomPropertiesWin.itemList = itemList;
	roomPropertiesWin.eventList = eventList;
	roomPropertiesWin.weaponList = weaponList;
	roomPropertiesWin.techMap = techMap;
	roomPropertiesWin.helperMap = helperMap;
	
	//console.log('Room Properties window finished loading - debug point');
	roomPropertiesWin.webContents.once('did-finish-load', () => {
		console.log('Room Properties window finished loading');
	});
});
// Handle the renderer saying it's ready
ipcMain.on('room-properties-editor-ready', (event) => {
	console.log('Received room-properties-editor-ready signal');
	const win = BrowserWindow.fromWebContents(event.sender);
	if (win && win.roomPropertiesData && win.enemyList) {
		console.log('Sending Room Properties Editor data:', win.roomPropertiesData, win.enemyList, win.itemList, win.eventList, win.weaponList, win.techMap, win.helperMap);
		event.sender.send('init-room-properties-data', win.roomPropertiesData, win.enemyList, win.itemList, win.eventList, win.weaponList, win.techMap, win.helperMap);
		// Clean up the temporary data
		delete win.roomPropertiesData;
		delete win.enemyList;
		delete win.itemList;
		delete win.eventList;
		delete win.weaponList;
		delete win.techMap;
		delete win.helperMap;
	} else {
		console.log('No window or no data found:', {
			hasWindow: !!win,
			hasData: !!(win && win.roomPropertiesData && win.enemyList && win.itemList && win.eventList && win.weaponList && win.techMap && win.helperMap)
		});
	}
});
/* Door Editor IPCs */
// Handle request to open door editor
ipcMain.on('open-door-editor', (event, payload) => {
	console.log('Opening door editor with data:', payload);
	const doorWin = new BrowserWindow({
		width: 700,
		height: 800,
		modal: true,
		parent: mainWindow,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false
		}
	});
	// Load door editor files from editor subdirectory
	doorWin.loadFile(path.join(__dirname, 'editor/doors/doorEditor.html'));
	// Send data once the window is ready
	doorWin.webContents.once('did-finish-load', () => {
		console.log('Sending door editor data:', payload);
		doorWin.webContents.send('init-door-data', payload);
	});
});
// Handle requests to save room properties editor changes
ipcMain.on('save-room-properties-data', (event, payload) => {
	console.log('Received room properties editor save request:', payload);
	if (mainWindow && mainWindow.webContents) {
		mainWindow.webContents.send('update-room-properties', payload);
	}
});
// Handle requests to save door editor changes
ipcMain.on('save-door-data', (event, payload) => {
	console.log('Received door data save request:', payload);
	if (mainWindow && mainWindow.webContents) {
		mainWindow.webContents.send('update-door-node', payload);
	}
});
