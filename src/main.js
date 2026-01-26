// main.js
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { loadStratPresets } = require('./core/stratPresetLoader.js');

let mainWindow;

// Enable remote debugging
app.commandLine.appendSwitch('remote-debugging-port', '9223');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    
    mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));
}

app.whenReady().then(createWindow);

// IPC Handlers
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
        return null;
    }
});

ipcMain.handle('save-json', async (event, filePath, data) => {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
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

ipcMain.handle('load-strat-presets', async () => {
    const presetsPath = app.isPackaged
        ? path.join(process.resourcesPath, 'strat-presets')
        : path.join(__dirname, '..', 'strat-presets');

    console.log('Loading strat presets from:', presetsPath);
    return loadStratPresets(presetsPath);
});

ipcMain.handle('get-strat-presets-path', () => {
    return app.isPackaged
        ? path.join(process.resourcesPath, 'strat-presets')
        : path.join(__dirname, '..', 'strat-presets');
});

// Schema validation
let Ajv;
let ajv;

async function initAjv() {
    if (!ajv) {
        try {
            Ajv = require('ajv');
            ajv = new Ajv({ allErrors: true });
        } catch (err) {
            console.warn('AJV not available, falling back to basic validation');
            return null;
        }
    }
    return ajv;
}

ipcMain.handle('validate-json-schema', async (event, data, schemaPath) => {
    try {
        if (!fs.existsSync(schemaPath)) {
            return {
                valid: false,
                errors: [`Schema file not found: ${schemaPath}`]
            };
        }
        
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
        const validator = await initAjv();
        
        if (validator) {
            const validate = validator.compile(schema);
            const valid = validate(data);
            return {
                valid,
                errors: valid ? [] : validate.errors.map(err =>
                    `${err.instancePath || 'root'}: ${err.message}`
                )
            };
        } else {
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

function basicValidateSchema(data, schema) {
    const errors = [];
    
    if (schema.required && Array.isArray(schema.required)) {
        for (const prop of schema.required) {
            if (!(prop in data)) {
                errors.push(`Missing required property: ${prop}`);
            }
        }
    }
    
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

function validateProperty(value, schema, propName) {
    const errors = [];
    
    if (schema.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== schema.type && !(value === null && schema.type === 'object')) {
            errors.push(`Property ${propName} should be ${schema.type}, got ${actualType}`);
        }
    }
    
    if (schema.type === 'object' && value && typeof value === 'object') {
        const nestedResult = basicValidateSchema(value, schema);
        errors.push(...nestedResult.errors.map(err => `${propName}.${err}`));
    }
    
    if (schema.type === 'array' && Array.isArray(value)) {
        if (schema.items) {
            value.forEach((item, index) => {
                const itemResult = validateProperty(item, schema.items, `${propName}[${index}]`);
                errors.push(...itemResult.errors);
            });
        }
    }
    
    return { errors };
}

// Room Properties Editor IPCs
ipcMain.on('open-room-properties-editor', (event, roomPropertiesData, enemyList, itemList, eventList, weaponList, techMap, helperMap, stratPresets) => {
    console.log('Opening Room Properties Editor');
    
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

    roomPropertiesWin.loadFile(path.join(__dirname, 'editor/roomProperties/roomPropertiesEditor.html'));

    roomPropertiesWin.roomPropertiesData = roomPropertiesData;
    roomPropertiesWin.enemyList = enemyList;
    roomPropertiesWin.itemList = itemList;
    roomPropertiesWin.eventList = eventList;
    roomPropertiesWin.weaponList = weaponList;
    roomPropertiesWin.techMap = techMap;
    roomPropertiesWin.helperMap = helperMap;
    roomPropertiesWin.stratPresets = stratPresets;

    roomPropertiesWin.webContents.once('did-finish-load', () => {
        console.log('Room Properties window finished loading');
    });
});

ipcMain.on('room-properties-editor-ready', (event) => {
    console.log('Received room-properties-editor-ready signal');
    const win = BrowserWindow.fromWebContents(event.sender);
    
    if (win && win.roomPropertiesData && win.enemyList) {
        event.sender.send('init-room-properties-data', 
            win.roomPropertiesData, 
            win.enemyList, 
            win.itemList, 
            win.eventList, 
            win.weaponList, 
            win.techMap, 
            win.helperMap,
            win.stratPresets
        );
        
        delete win.roomPropertiesData;
        delete win.enemyList;
        delete win.itemList;
        delete win.eventList;
        delete win.weaponList;
        delete win.techMap;
        delete win.helperMap;
        delete win.stratPresets;
    }
});

// Door Editor IPCs
ipcMain.on('open-door-editor', (event, payload, doorData, enemyList, itemList, eventList, weaponList, techMap, helperMap) => {
    console.log('Opening door editor with data:', payload, doorData, enemyList, itemList, eventList, weaponList, techMap, helperMap);
    
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
	
    doorWin.loadFile(path.join(__dirname, 'editor/doors/doorEditor.html'));
    
    doorWin.webContents.once('did-finish-load', () => {
        console.log('Sending door editor data:', payload);
        doorWin.webContents.send('init-door-data', payload, doorData, enemyList, itemList, eventList, weaponList, techMap, helperMap);
    });
});

ipcMain.on('save-room-properties-data', (event, payload) => {
    console.log('Received room properties editor save request:', payload);
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('update-room-properties', payload);
    }
});

ipcMain.on('save-door-data', (event, payload) => {
    console.log('Received door data save request:', payload);
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('update-door-node', payload);
    }
});