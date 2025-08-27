/* =============================================================================
   Super Metroid: X-Fusion Room Properties Editor - Main Controller
   
   Coordinates the various editor types and handles data flow between the main
   process and editor components. Manages initialization, save/load operations,
   and container management.
   ============================================================================= */
   const {
	ipcRenderer
} = require('electron');
window.addEventListener('DOMContentLoaded', () => {
	console.log('DOMContentLoaded fired - about to initialize with delay');
	setTimeout(() => {
		console.log('Starting Room Properties Editor initialization after delay...');
		const editor = new RoomPropertiesEditor();
		editor.initialize();
	}, 0);
});
console.log('DOMContentLoaded listener set up');
class RoomPropertiesEditor {
	constructor() {
		this.currentRoomData = null;
		this.validRoomNodes = [];
		this.containers = {};
		this.editorInstances = {
			obstacles: new Map(),
			enemies: new Map(),
			strats: new Map(),
			notables: new Map()
		};
		// Editor configurations
		this.editorConfigs = {
			obstacles: {
				type: 'obstacles',
				className: 'obstacle',
				emoji: '🪨',
				defaultName: 'Obstacle',
				idStyle: 'letter',
				idPrefix: '',
				editorClass: ObstacleEditor
			},
			enemies: {
				type: 'enemies',
				className: 'enemy',
				emoji: '👾',
				defaultName: 'Enemy Group',
				idStyle: 'numeric',
				idPrefix: 'e',
				editorClass: EnemyEditor
			},
			strats: {
				type: 'strats',
				className: 'strat',
				emoji: '📘',
				defaultName: 'Strat',
				idStyle: 'numeric',
				idPrefix: '',
				editorClass: StratEditor
			},
			notables: {
				type: 'notables',
				className: 'notable',
				emoji: '⭐',
				defaultName: 'Notable',
				idStyle: 'numeric',
				idPrefix: '',
				editorClass: NotableEditor
			}
		};
	}
	initialize() {
		console.log('Initializing Room Properties Editor');
		this.cacheContainerReferences();
		this.setupIPCListeners();
		this.setupEventHandlers();
	}
	cacheContainerReferences() {
		this.containers = {
			obstacles: document.getElementById('obstaclesContainer'),
			enemies: document.getElementById('enemiesContainer'),
			strats: document.getElementById('stratsContainer'),
			notables: document.getElementById('notablesContainer')
		};
	}
	setupIPCListeners() {
		console.log('Setting up IPC listeners');
		ipcRenderer.on('init-room-properties-data', (event, data) => {
			this.handleRoomDataReceived(data);
		});
		// Tell main process we're ready to receive data
		console.log('Sending room-properties-editor-ready signal');
		ipcRenderer.send('room-properties-editor-ready');
	}
	setupEventHandlers() {
		// Save/close buttons
		document.getElementById('saveBtn').addEventListener('click', () => this.handleSave());
		document.getElementById('closeBtn').addEventListener('click', () => window.close());
		// Keyboard shortcuts
		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape') {
				window.close();
			}
		});
		// Add buttons for each editor type
		Object.keys(this.editorConfigs).forEach(type => {
			const addBtnId = `add${type.charAt(0).toUpperCase() + type.slice(1)}Btn`;
			//const addBtnId = `add${type.charAt(0).toUpperCase() + type.slice(1, -1)}Btn`;
			const addBtn = document.getElementById(addBtnId);
			if (addBtn) {
				addBtn.addEventListener('click', () => this.addNewEditor(type));
			}
		});
	}
	handleRoomDataReceived(data) {
		console.log('Room Properties Editor received data:', data);
		this.currentRoomData = data || {};
		// Prepare node list for dropdowns
		this.validRoomNodes = (this.currentRoomData.nodes || []).map(node => ({
			id: node.id,
			name: node.name || `Node ${node.id}`
		}));
		this.updateHeaderInfo();
		this.populateEditors();
	}
	updateHeaderInfo() {
		console.log('Updating header info with:', this.currentRoomData);
		const elements = {
			sector: this.currentRoomData.area || 'Unknown Sector',
			region: this.currentRoomData.subarea || 'Unknown Region',
			roomName: this.currentRoomData.name || 'Unknown Room'
		};
		Object.entries(elements).forEach(([id, value]) => {
			const element = document.getElementById(id);
			if (element) element.textContent = value;
		});
	}
	populateEditors() {
		// Clear existing content and instances
		Object.values(this.containers).forEach(container => {
			if (container) container.innerHTML = '';
		});
		Object.values(this.editorInstances).forEach(map => map.clear());
		// Populate each editor type
		Object.keys(this.editorConfigs).forEach(type => {
			const dataArray = this.currentRoomData[type] || [];
			dataArray.forEach(itemData => {
				this.createEditor(type, itemData);
			});
		});
		// Broadcast initial obstacle state for cross-editor dependencies
		ObstacleEditor.broadcastObstaclesChanged();
		NotableEditor.broadcastNotablesChanged();
	}
	createEditor(type, initialData = {}) {
		const config = this.editorConfigs[type];
		const container = this.containers[type];
		if (!container || !config) return null;
		let editor;
		if (type === 'enemies' || type === 'strats') {
			editor = new config.editorClass(initialData, this.validRoomNodes);
		} else {
			editor = new config.editorClass(initialData);
		}
		// Set up removal callback
		editor.onRemove = () => {
			this.editorInstances[type].delete(editor._uid);
			this.renumberContainer(type);
		};
		// Attach to container with drag support
		editor.attachToContainer(container, () => this.renumberContainer(type));
		// Store reference
		this.editorInstances[type].set(editor._uid, editor);
		// Initial numbering
		this.renumberContainer(type);
		return editor;
	}
	addNewEditor(type) {
		return this.createEditor(type);
	}
	renumberContainer(type) {
		const container = this.containers[type];
		const config = this.editorConfigs[type];
		if (!container || !config) return;
		Array.from(container.children).forEach((card, index) => {
			const newId = generateID(index, config);
			if (card.setAssignedId) {
				card.setAssignedId(newId);
			}
		});
		// Broadcast changes for dependent editors
		if (type === 'obstacles') {
			ObstacleEditor.broadcastObstaclesChanged();
		} else if (type === 'notables') {
			NotableEditor.broadcastNotablesChanged();
		}
	}
	handleSave() {
		const data = this.currentRoomData || {};
		// Collect data from all containers with auto-assigned IDs
		const collectedData = {};
		Object.keys(this.editorConfigs).forEach(type => {
			collectedData[type] = collectAndAssignIDs(
				this.containers[type],
				type,
				this.editorConfigs[type]
			);
		});
		const payload = {
			// Preserve room identification
			id: data.id,
			area: data.area,
			subarea: data.subarea,
			name: data.name,
			...collectedData
		};
		console.log('Saving Room Properties data:', payload);
		ipcRenderer.send('save-room-properties-data', payload);
		window.close();
	}
}