/* =============================================================================
   Super Metroid: X-Fusion Room Properties Editor - Main Controller
   
   Coordinates the various editor types and handles data flow between the main
   process and editor components. Manages initialization, save/load operations,
   and container management. Updated to use new modular condition system.
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
		this.enemyList = {};
		this.itemList = [];
		this.eventList = [];
		this.weaponList = [];
		this.techMap = {};
		this.helperMap = {};
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
		ipcRenderer.on('init-room-properties-data', (event, data, enemyList, itemList, eventList, weaponList, techMap, helperMap) => {
			this.handleRoomDataReceived(data, enemyList, itemList, eventList, weaponList, techMap, helperMap);
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
			const addBtn = document.getElementById(addBtnId);
			if (addBtn) {
				addBtn.addEventListener('click', () => this.addNewEditor(type));
			}
		});
	}

	handleRoomDataReceived(data, enemyList, itemList, eventList, weaponList, techMap, helperMap) {
		console.log('Room Properties Editor received data:', data, enemyList, itemList, eventList, weaponList, techMap, helperMap);
		this.currentRoomData = data || {};
		this.enemyList = enemyList || {};
		this.itemList = itemList || [];
		this.eventList = eventList || [];
		this.weaponList = weaponList || [];
		this.techMap = techMap || {};
		this.helperMap = helperMap || {};

		// Prepare node list for dropdowns
		this.validRoomNodes = (this.currentRoomData.nodes || []).map(node => ({
			id: node.id,
			name: node.name || `Node ${node.id}`,
			nodeType: node.nodeType,
			nodeSubType: node.nodeSubType
		}));

		// Update global data sources for the new modular condition system
		window.EditorGlobals.updateAll(
			this.itemList,
			this.eventList,
			this.weaponList,
			this.convertToMap(this.techMap),
			this.convertToMap(this.helperMap),
			this.enemyList, // Convert to array for compatibility
			this.validRoomNodes
		);

		this.updateHeaderInfo();
		this.populateEditors();
	}

	/**
	 * Convert legacy flat objects to Map structures expected by new system
	 */
	convertToMap(obj) {
		const map = new Map();
		if (!obj || typeof obj !== 'object') return map;

		// If it's already a Map, return as-is
		if (obj instanceof Map) return obj;

		// Convert object structure to Map
		Object.entries(obj).forEach(([key, value]) => {
			map.set(key, value);
		});

		return map;
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

		switch (type) {
			case 'enemies':
				editor = new config.editorClass(
					initialData,
					this.validRoomNodes,
					this.enemyList,
					this.itemList,
					this.eventList,
					this.weaponList,
					this.techMap,
					this.helperMap
				);
				break;
			case 'strats':
				editor = new config.editorClass(
					initialData,
					this.validRoomNodes,
					this.enemyList,
					this.itemList,
					this.eventList,
					this.weaponList,
					this.techMap,
					this.helperMap
				);
				break;
			default:
				editor = new config.editorClass(initialData);
				break;
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
		return this.createEditor(type, {});
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
			const rawData = collectAndAssignIDs(
				this.containers[type],
				type,
				this.editorConfigs[type]
			);
			
			// Clean and validate each item's data structure
			collectedData[type] = rawData
				.map(item => {
					if (item && typeof item === 'object') {
						// Validate conditions within each item
						const validatedItem = { ...item };
						
						// Validate condition fields if they exist
						if (item.requires) {
							const cleanedRequires = this.validateConditionOutput(item.requires);
							if (cleanedRequires) validatedItem.requires = cleanedRequires;
						}
						if (item.spawn) {
							const cleanedSpawn = this.validateConditionOutput(item.spawn);
							if (cleanedSpawn) validatedItem.spawn = cleanedSpawn;
						}
						if (item.stopSpawn) {
							const cleanedStopSpawn = this.validateConditionOutput(item.stopSpawn);
							if (cleanedStopSpawn) validatedItem.stopSpawn = cleanedStopSpawn;
						}
						if (item.entranceCondition) {
							const cleanedEntrance = this.validateConditionOutput(item.entranceCondition);
							if (cleanedEntrance) validatedItem.entranceCondition = cleanedEntrance;
						}
						if (item.exitCondition) {
							const cleanedExit = this.validateConditionOutput(item.exitCondition);
							if (cleanedExit) validatedItem.exitCondition = cleanedExit;
						}
						
						return cleanObject(validatedItem);
					}
					return item;
				})
				.filter(item => item !== null && Object.keys(item).length > 0);
		});

		const payload = {
			// Preserve room identification and structure
			$schema: data.$schema,
			id: data.id,
			name: data.name,
			area: data.area,
			subarea: data.subarea,
			roomEnvironments: data.roomEnvironments,
			mapTileMask: data.mapTileMask,
			nodes: data.nodes,
			links: data.links,
			
			// Add collected editor data - only include non-empty sections
			...Object.fromEntries(
				Object.entries(collectedData).filter(([key, value]) => 
					Array.isArray(value) && value.length > 0
				)
			)
		};

		// Add optional room-level properties only if they exist
		if (data.subsubarea) payload.subsubarea = data.subsubarea;
		if (data.roomImageFile) payload.roomImageFile = data.roomImageFile;
		if (data.roomAddress) payload.roomAddress = data.roomAddress;
		if (data.nextStratId) payload.nextStratId = data.nextStratId;
		if (data.nextNotableId) payload.nextNotableId = data.nextNotableId;
		if (data.note) payload.note = data.note;
		if (data.devNote) payload.devNote = data.devNote;

		console.log('Saving Room Properties data:', JSON.stringify(payload, null, 2));
		ipcRenderer.send('save-room-properties-data', payload);
		window.close();
	}

	// Helper function to validate condition outputs match schema
	validateConditionOutput(condition) {
		if (!condition || typeof condition !== 'object') return condition;

		// Handle string conditions (tech names, item names, etc.)
		if (typeof condition === 'string') return condition;

		const cleaned = cleanObject(condition);
		return Object.keys(cleaned).length > 0 ? cleaned : null;
	}
}