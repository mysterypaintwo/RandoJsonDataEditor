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
			notables: new Map(),
			nodes: new Map(),
			roomEnvironments: new Map()
		};

		// Room-level editors (non-list)
		this.mapTileMaskEditor = null;

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
			},
			nodes: {
				type: 'nodes',
				className: 'node',
				emoji: '🔀',
				defaultName: 'Node',
				idStyle: 'numeric',
				idPrefix: '',
				editorClass: JunctionNodeEditor
			},
			roomEnvironments: {
				type: 'roomEnvironments',
				className: 'room-environment',
				emoji: '🌡️',
				defaultName: 'Environment',
				idStyle: 'none',
				idPrefix: '',
				editorClass: RoomEnvironmentEditor
			}
		};
	}

	initialize() {
		console.log('Initializing Room Properties Editor');
		this.cacheContainerReferences();
		this.setupIPCListeners();
		this.setupEventHandlers();
		this.setupUnsavedChangesWarning();
		
		// Track if data has been saved
		this.hasUnsavedChanges = false;
	}

	setupUnsavedChangesWarning() {
		// Prevent accidental close without saving
		window.addEventListener('beforeunload', (e) => {
			if (this.hasUnsavedChanges) {
				e.preventDefault();
				e.returnValue = ''; // Chrome requires returnValue to be set
				return 'You have unsaved changes. Are you sure you want to leave?';
			}
		});

		// Mark as having changes when user interacts with form
		const markChanged = () => {
			this.hasUnsavedChanges = true;
		};

		// Listen for changes in the form
		const form = document.getElementById('form');
		if (form) {
			form.addEventListener('input', markChanged, true);
			form.addEventListener('change', markChanged, true);
		}

		// Also listen for changes in metadata fields
		const roomNote = document.getElementById('roomNote');
		const roomDevNote = document.getElementById('roomDevNote');
		if (roomNote) roomNote.addEventListener('input', markChanged);
		if (roomDevNote) roomDevNote.addEventListener('input', markChanged);
	}

	cacheContainerReferences() {
		this.containers = {
			obstacles: document.getElementById('obstaclesContainer'),
			enemies: document.getElementById('enemiesContainer'),
			strats: document.getElementById('stratsContainer'),
			notables: document.getElementById('notablesContainer'),
			nodes: document.getElementById('nodesContainer'),
			roomEnvironments: document.getElementById('roomEnvironmentsContainer')
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
		document.getElementById('closeBtn').addEventListener('click', () => {
			if (this.hasUnsavedChanges) {
				const confirmed = confirm('You have unsaved changes. Are you sure you want to close without saving?');
				if (confirmed) {
					this.hasUnsavedChanges = false; // Clear flag to allow close
					window.close();
				}
			} else {
				window.close();
			}
		});

		// Keyboard shortcuts
		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape') {
				if (this.hasUnsavedChanges) {
					const confirmed = confirm('You have unsaved changes. Are you sure you want to close without saving?');
					if (confirmed) {
						this.hasUnsavedChanges = false; // Clear flag to allow close
						window.close();
					}
				} else {
					window.close();
				}
			}
		});

		// Add buttons for each editor type
		Object.keys(this.editorConfigs).forEach(type => {
			// Skip roomEnvironments - it has a custom add button
			if (type === 'roomEnvironments') return;
			
			const addBtnId = `add${type.charAt(0).toUpperCase() + type.slice(1)}Btn`;
			const addBtn = document.getElementById(addBtnId);
			if (addBtn) {
				addBtn.addEventListener('click', () => this.addNewEditor(type));
			}
		});

		// Room Environments add button
		const addRoomEnvBtn = document.getElementById('addRoomEnvironmentBtn');
		if (addRoomEnvBtn) {
			addRoomEnvBtn.addEventListener('click', () => this.addNewEditor('roomEnvironments'));
		}
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
		this.updateMetadataDisplay();
		this.populateEditors();
		
		// Reset unsaved changes flag after initial load
		this.hasUnsavedChanges = false;
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

	updateMetadataDisplay() {
		// Update read-only metadata fields
		const roomAddressEl = document.getElementById('roomAddress');
		const roomImageFileEl = document.getElementById('roomImageFile');
		const nextStratIdEl = document.getElementById('nextStratId');
		const nextNotableIdEl = document.getElementById('nextNotableId');

		if (roomAddressEl) {
			roomAddressEl.textContent = this.currentRoomData.roomAddress || '-';
		}
		if (roomImageFileEl) {
			roomImageFileEl.textContent = this.currentRoomData.roomImageFile || '-';
		}
		if (nextStratIdEl) {
			nextStratIdEl.textContent = this.currentRoomData.nextStratId || '-';
		}
		if (nextNotableIdEl) {
			nextNotableIdEl.textContent = this.currentRoomData.nextNotableId || '-';
		}

		// Update editable note fields
		const roomNoteEl = document.getElementById('roomNote');
		const roomDevNoteEl = document.getElementById('roomDevNote');

		if (roomNoteEl) {
			const note = this.currentRoomData.note;
			roomNoteEl.value = Array.isArray(note) ? note.join('\n') : (note || '');
		}
		if (roomDevNoteEl) {
			const devNote = this.currentRoomData.devNote;
			roomDevNoteEl.value = Array.isArray(devNote) ? devNote.join('\n') : (devNote || '');
		}
	}

	populateEditors() {
		// Clear existing content and instances
		Object.values(this.containers).forEach(container => {
			if (container) container.innerHTML = '';
		});
		Object.values(this.editorInstances).forEach(map => map.clear());

		// Populate each editor type
		Object.keys(this.editorConfigs).forEach(type => {
			let dataArray = this.currentRoomData[type] || [];

			// Special handling for nodes - only show junction nodes
			if (type === 'nodes') {
				dataArray = dataArray.filter(node => node.nodeType === 'junction');
			}

			dataArray.forEach(itemData => {
				this.createEditor(type, itemData);
			});
		});

		// Setup mapTileMask editor
		this.setupMapTileMaskEditor();

		// Broadcast initial state
		ObstacleEditor.broadcastObstaclesChanged();
		NotableEditor.broadcastNotablesChanged();
	}

	setupMapTileMaskEditor() {
		const container = document.getElementById('mapTileMaskContainer');
		if (!container) return;

		// Clear existing editor
		container.innerHTML = '';
		if (this.mapTileMaskEditor) {
			this.mapTileMaskEditor.remove();
		}

		// Create new editor
		this.mapTileMaskEditor = new TileMapEditor({
			initialData: this.currentRoomData.mapTileMask || [],
			onChange: (newMask) => {
				// Updates are automatically captured on save
			}
		});

		this.mapTileMaskEditor.attachTo(container);
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
			case 'nodes':
				editor = new config.editorClass(initialData);
				break;
			case 'roomEnvironments':
				editor = new config.editorClass(initialData);
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

		// Attach to container with drag support (except roomEnvironments)
		if (type === 'roomEnvironments') {
			// No drag support for room environments
			container.appendChild(editor.root);
		} else {
			editor.attachToContainer(container, () => this.renumberContainer(type));
		}

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

		// Skip numbering for roomEnvironments
		if (type === 'roomEnvironments') return;

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
		try {
			const data = this.currentRoomData || {};

			// Collect room-level notes
			const roomNoteEl = document.getElementById('roomNote');
			const roomDevNoteEl = document.getElementById('roomDevNote');
			
			const roomNote = roomNoteEl ? roomNoteEl.value.trim() : '';
			const roomDevNote = roomDevNoteEl ? roomDevNoteEl.value.trim() : '';

			// Collect data from all containers with auto-assigned IDs
			const collectedData = {};
			Object.keys(this.editorConfigs).forEach(type => {
				if (type === 'nodes') {
					// Get updated junction nodes from editor
					const updatedJunctionNodes = Array.from(this.containers[type].children)
						.map(element => element.getValue ? element.getValue() : null)
						.filter(Boolean);

					// Preserve all non-junction nodes and merge with updated junction nodes
					const nonJunctionNodes = (data.nodes || []).filter(node => node.nodeType !== 'junction');
					collectedData[type] = [...nonJunctionNodes, ...updatedJunctionNodes];
				} else if (type === 'roomEnvironments') {
					// Get room environments without ID assignment
					collectedData[type] = Array.from(this.containers[type].children)
						.map(element => element.getValue ? element.getValue() : null)
						.filter(Boolean);
				} else {
					const rawData = collectAndAssignIDs(
						this.containers[type],
						type,
						this.editorConfigs[type]
					);

					collectedData[type] = rawData
						.map(item => {
							if (item && typeof item === 'object') {
								const validatedItem = {
									...item
								};

								// Validate and clean condition fields
								if (item.requires !== undefined) {
									// requires must be an array, never null
									const cleanedRequires = this.validateConditionOutput(item.requires, 'requires');
									validatedItem.requires = Array.isArray(cleanedRequires) ? cleanedRequires : [];
								}
								if (item.spawn) {
									const cleanedSpawn = this.validateConditionOutput(item.spawn, 'spawn');
									if (cleanedSpawn) validatedItem.spawn = cleanedSpawn;
								}
								if (item.stopSpawn) {
									const cleanedStopSpawn = this.validateConditionOutput(item.stopSpawn, 'stopSpawn');
									if (cleanedStopSpawn) validatedItem.stopSpawn = cleanedStopSpawn;
								}
								if (item.entranceCondition) {
									const cleanedEntrance = this.validateConditionOutput(item.entranceCondition, 'entranceCondition');
									if (cleanedEntrance) validatedItem.entranceCondition = cleanedEntrance;
								}
								if (item.exitCondition) {
									const cleanedExit = this.validateConditionOutput(item.exitCondition, 'exitCondition');
									if (cleanedExit) validatedItem.exitCondition = cleanedExit;
								}

								return cleanObject(validatedItem);
							}
							return item;
						})
						.filter(item => item !== null && Object.keys(item).length > 0);
				}
			});

			// Get mapTileMask value
			const mapTileMask = this.mapTileMaskEditor ? this.mapTileMaskEditor.getValue() : data.mapTileMask;

			const payload = {
				$schema: data.$schema,
				id: data.id,
				name: data.name,
				area: data.area,
				subarea: data.subarea,
				roomEnvironments: collectedData.roomEnvironments || data.roomEnvironments,
				mapTileMask: mapTileMask || data.mapTileMask,
				nodes: collectedData.nodes || data.nodes,
				links: data.links, // Preserve links as-is

				...Object.fromEntries(
					Object.entries(collectedData)
					.filter(([key, value]) => 
						key !== 'nodes' && 
						key !== 'roomEnvironments' && 
						Array.isArray(value) && 
						value.length > 0
					)
				)
			};

			// Add optional fields
			if (data.subsubarea) payload.subsubarea = data.subsubarea;
			if (data.roomImageFile) payload.roomImageFile = data.roomImageFile;
			if (data.roomAddress) payload.roomAddress = data.roomAddress;
			if (data.nextStratId) payload.nextStratId = data.nextStratId;
			if (data.nextNotableId) payload.nextNotableId = data.nextNotableId;
			if (roomNote) payload.note = roomNote;
			if (roomDevNote) payload.devNote = roomDevNote;

			// Validate JSON by attempting to stringify
			try {
				const jsonString = JSON.stringify(payload, null, 2);
				console.log('Saving Room Properties data:', jsonString);
				
				// Clear unsaved changes flag before sending
				this.hasUnsavedChanges = false;
				
				ipcRenderer.send('save-room-properties-data', payload);
				window.close();
			} catch (jsonError) {
				alert(`Invalid JSON data detected. Cannot save.\n\nError: ${jsonError.message}\n\nPlease review your data and try again.`);
				console.error('JSON serialization error:', jsonError);
				console.error('Problematic payload:', payload);
			}
		} catch (error) {
			alert(`Error preparing data for save:\n\n${error.message}\n\nPlease check the console for details.`);
			console.error('Save preparation error:', error);
		}
	}

	// Helper function to validate condition outputs match schema
	validateConditionOutput(condition, path = 'root') {
		console.debug('[validateConditionOutput] input:', path, condition);

		if (condition == null) {
			console.debug('[validateConditionOutput] null -> null:', path);
			return null;
		}

		// Arrays: preserve shape
		if (Array.isArray(condition)) {
			const cleaned = condition
				.map((c, i) => this.validateConditionOutput(c, `${path}[${i}]`))
				.filter(c => c !== null);

			console.debug('[validateConditionOutput] array result:', path, cleaned);
			return cleaned.length ? cleaned : null;
		}

		// Primitives (strings, numbers, booleans) are valid
		if (typeof condition !== 'object') {
			console.debug('[validateConditionOutput] primitive:', path, condition);
			return condition;
		}

		// Logical operators
		if ('and' in condition) {
			const v = this.validateConditionOutput(condition.and, `${path}.and`);
			console.debug('[validateConditionOutput] and:', path, v);
			return v ? {
				and: v
			} : null;
		}

		if ('or' in condition) {
			const v = this.validateConditionOutput(condition.or, `${path}.or`);
			console.debug('[validateConditionOutput] or:', path, v);
			return v ? {
				or: v
			} : null;
		}

		if ('not' in condition) {
			const v = this.validateConditionOutput(condition.not, `${path}.not`);
			console.debug('[validateConditionOutput] not:', path, v);
			return v ? {
				not: v
			} : null;
		}

		// Plain requirement object (ammo, tech, shinespark, etc.)
		const cleaned = cleanObject(condition);
		console.debug('[validateConditionOutput] leaf:', path, cleaned);

		return Object.keys(cleaned).length ? cleaned : null;
	}
}