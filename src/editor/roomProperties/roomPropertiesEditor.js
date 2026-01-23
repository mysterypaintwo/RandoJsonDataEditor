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

		// Track unsaved changes
		this.hasUnsavedChanges = false;
		this.isClosing = false;

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
				editorClass: StratEditor,
				useVirtualScroll: true // Enable virtual scrolling for strats
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
		this.setupWindowCloseHandler();
	}

	setupWindowCloseHandler() {
		// Handle window close event (X button)
		window.addEventListener('beforeunload', (e) => {
			if (this.hasUnsavedChanges && !this.isClosing) {
				e.preventDefault();
				e.returnValue = 'You have unsaved changes. Are you sure you want to close without saving?';
				return e.returnValue;
			}
		});
	}

	setupUnsavedChangesWarning() {
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
		document.getElementById('closeBtn').addEventListener('click', () => this.handleClose(false));

		// Keyboard shortcuts
		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape') {
				this.handleClose(false);
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

	handleClose(force = false) {
		if (this.hasUnsavedChanges && !force) {
			const confirmed = confirm('You have unsaved changes. Are you sure you want to close without saving?');
			if (!confirmed) {
				return; // User cancelled, don't close
			}
		}

		this.isClosing = true;
		this.hasUnsavedChanges = false; // Clear flag to allow close
		window.close();
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

		// Prepare node list for dropdowns - ALL nodes share same ID space
		// Sort nodes: items first (by ID), then doors (by ID), then junctions (by ID)
		const allNodes = this.currentRoomData.nodes || [];
		const itemNodes = allNodes.filter(n => n.nodeType === 'item').sort((a, b) => a.id - b.id);
		const doorNodes = allNodes.filter(n => n.nodeType === 'door').sort((a, b) => a.id - b.id);
		const utilityNodes = allNodes.filter(n => n.nodeType === 'utility').sort((a, b) => a.id - b.id);
		const junctionNodes = allNodes.filter(n => n.nodeType === 'junction').sort((a, b) => a.id - b.id);
		const sortedNodes = [...doorNodes, ...itemNodes, ...utilityNodes, ...junctionNodes];

		this.validRoomNodes = sortedNodes.map(node => ({
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
			this.enemyList,
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

			// Use virtual scrolling for strats if enabled
			if (this.editorConfigs[type].useVirtualScroll && dataArray.length > 50) {
				this.setupVirtualScrollContainer(type, dataArray);
			} else {
				dataArray.forEach(itemData => {
					this.createEditor(type, itemData);
				});
			}
		});

		// Setup mapTileMask editor
		this.setupMapTileMaskEditor();

		// Broadcast initial state
		ObstacleEditor.broadcastObstaclesChanged();
		NotableEditor.broadcastNotablesChanged();
	}

	setupVirtualScrollContainer(type, dataArray) {
		const container = this.containers[type];
		if (!container) return;

		// Create virtual scroll wrapper
		const wrapper = document.createElement('div');
		wrapper.className = 'virtual-scroll-wrapper';
		wrapper.style.position = 'relative';
		wrapper.style.overflow = 'auto';
		wrapper.style.maxHeight = '600px';

		const content = document.createElement('div');
		content.className = 'virtual-scroll-content';

		// Estimate item height (collapsed card height ~60px)
		const itemHeight = 60;
		const totalHeight = dataArray.length * itemHeight;
		content.style.height = `${totalHeight}px`;

		const visibleContainer = document.createElement('div');
		visibleContainer.style.position = 'absolute';
		visibleContainer.style.top = '0';
		visibleContainer.style.left = '0';
		visibleContainer.style.right = '0';

		content.appendChild(visibleContainer);
		wrapper.appendChild(content);
		container.appendChild(wrapper);

		let currentStartIndex = 0;
		let currentEndIndex = 0;

		const renderVisibleItems = () => {
			const scrollTop = wrapper.scrollTop;
			const viewportHeight = wrapper.clientHeight;

			const startIndex = Math.floor(scrollTop / itemHeight);
			const endIndex = Math.ceil((scrollTop + viewportHeight) / itemHeight);

			const buffer = 5; // Render extra items above/below viewport
			const renderStart = Math.max(0, startIndex - buffer);
			const renderEnd = Math.min(dataArray.length, endIndex + buffer);

			if (renderStart === currentStartIndex && renderEnd === currentEndIndex) {
				return; // No change needed
			}

			currentStartIndex = renderStart;
			currentEndIndex = renderEnd;

			// Clear and render visible items
			visibleContainer.innerHTML = '';
			visibleContainer.style.transform = `translateY(${renderStart * itemHeight}px)`;

			for (let i = renderStart; i < renderEnd; i++) {
				const editor = this.createEditor(type, dataArray[i], true);
				if (editor) {
					// Start collapsed for performance
					editor.collapse();
				}
			}
		};

		// Debounced scroll handler
		let scrollTimeout;
		wrapper.addEventListener('scroll', () => {
			clearTimeout(scrollTimeout);
			scrollTimeout = setTimeout(renderVisibleItems, 16); // ~60fps
		});

		// Initial render
		renderVisibleItems();
	}

	setupMapTileMaskEditor() {
		const container = document.getElementById('mapTileMaskContainer');
		if (!container) return;

		// Clear existing editor
		container.innerHTML = '';
		if (this.mapTileMaskEditor) {
			this.mapTileMaskEditor.remove();
		}

		// Pass initialData directly, not wrapped in getValue()
		const initialMask = this.currentRoomData.mapTileMask || [];

		// Create new editor with paint color support
		this.mapTileMaskEditor = new TileMapEditor({
			initialData: initialMask, // FIXED: was calling getValue() on non-existent object
			onChange: (newMask) => {
				// Mark as changed when tilemap is modified
				this.hasUnsavedChanges = true;
			},
			colors: {
				0: '#bdc3c7', // Not in room - gray
				1: '#3498db', // In room - blue
				2: '#2ecc71' // Part of node - green
			}
		});

		this.mapTileMaskEditor.attachTo(container);
	}

	createEditor(type, initialData = {}, skipAttach = false) {
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

		// Attach to container
		if (!skipAttach) {
			if (type === 'roomEnvironments') {
				container.appendChild(editor.root);
			} else {
				editor.attachToContainer(container, () => this.renumberContainer(type));
			}
		} else {
			container.appendChild(editor.root);
		}

		// Store reference
		this.editorInstances[type].set(editor._uid, editor);

		// Initial numbering
		this.renumberContainer(type);

		// Start collapsed by default for performance
		if (editor.collapse && type !== 'roomEnvironments') {
			editor.collapse();
		}

		return editor;
	}

	addNewEditor(type) {
		const editor = this.createEditor(type, {});

		// Expand newly created editors so user can edit them
		if (editor && editor.expand) {
			editor.expand();
		}

		return editor;
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

					// Preserve all non-junction nodes in their original order
					const allNodes = data.nodes || [];
					const itemNodes = allNodes.filter(n => n.nodeType === 'item');
					const doorNodes = allNodes.filter(n => n.nodeType === 'door');
					const utilityNodes = allNodes.filter(n => n.nodeType === 'utility');

					// Merge: Doors first, then items, then updated junctions, then utility nodes (maintain order)
					collectedData[type] = [...doorNodes, ...itemNodes, ...utilityNodes, ...updatedJunctionNodes];
				} else if (type === 'roomEnvironments') {
					// Get room environments without ID assignment
					collectedData[type] = Array.from(this.containers[type].children)
						.map(element => element.getValue ? element.getValue() : null)
						.filter(Boolean);
				} else if (type === 'strats') {
					// Special handling for strats - sort by link
					const rawData = collectAndAssignIDs(
						this.containers[type],
						type,
						this.editorConfigs[type]
					);

					const stratsData = rawData
						.map(item => {
							if (item && typeof item === 'object') {
								const validatedItem = {
									...item
								};

								// Validate requires field - REQUIRED for strats, must always be present
								delete validatedItem.id;
								delete validatedItem.comesThroughToilet;
								delete validatedItem.bypassesDoorShell;
								delete validatedItem.wallJumpAvoid;
								delete validatedItem.flashSuitChecked;

								// Requires is MANDATORY for strats - always ensure it exists
								if (item.requires !== undefined) {
									let cleanedRequires = this.validateConditionOutput(item.requires, 'requires');

									// Ensure requires is always an array at the top level
									if (cleanedRequires !== null) {
										if (!Array.isArray(cleanedRequires)) {
											cleanedRequires = [cleanedRequires];
										}
										validatedItem.requires = cleanedRequires;
									} else {
										// If validation returns null, use empty array
										validatedItem.requires = [];
									}
								} else {
									// If requires field is missing, add empty array
									validatedItem.requires = [];
								}

								// Validate other condition fields
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

								const cleaned = cleanObject(validatedItem);

								// Strats MUST always have requires
								if (!Array.isArray(cleaned.requires)) {
									cleaned.requires = [];
								}

								return cleaned;
							}
							return item;
						})
						.filter(item => item !== null && Object.keys(item).length > 0);

					// Sort strats by link [from, to]
					stratsData.sort((a, b) => {
						// Strats without links go to the end
						if (!a.link || !Array.isArray(a.link)) return 1;
						if (!b.link || !Array.isArray(b.link)) return -1;

						// Compare first element (from node)
						if (a.link[0] !== b.link[0]) {
							return a.link[0] - b.link[0];
						}

						// If first elements are equal, compare second element (to node)
						return a.link[1] - b.link[1];
					});

					collectedData[type] = stratsData;
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

								// Validate requires field - REQUIRED for strats, must always be present
								if (type === 'strats') {
									delete validatedItem.id;
									delete validatedItem.comesThroughToilet;
									delete validatedItem.bypassesDoorShell;
									delete validatedItem.wallJumpAvoid;
									delete validatedItem.flashSuitChecked;

									// Requires is MANDATORY for strats - always ensure it exists
									if (item.requires !== undefined) {
										let cleanedRequires = this.validateConditionOutput(item.requires, 'requires');

										// Ensure requires is always an array at the top level
										if (cleanedRequires !== null) {
											if (!Array.isArray(cleanedRequires)) {
												cleanedRequires = [cleanedRequires];
											}
											validatedItem.requires = cleanedRequires;
										} else {
											// If validation returns null, use empty array
											validatedItem.requires = [];
										}
									} else {
										// If requires field is missing, add empty array
										validatedItem.requires = [];
									}
								} else if (item.requires !== undefined) {
									// For non-strats, only add if it exists
									let cleanedRequires = this.validateConditionOutput(item.requires, 'requires');

									if (cleanedRequires !== null) {
										if (!Array.isArray(cleanedRequires)) {
											cleanedRequires = [cleanedRequires];
										}
										validatedItem.requires = cleanedRequires;
									}
								}

								// Validate other condition fields
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

								const cleaned = cleanObject(validatedItem);

								// Strats MUST always have requires
								if (type === 'strats' && !Array.isArray(cleaned.requires)) {
									cleaned.requires = [];
								}

								return cleaned;
							}
							return item;
						})
						.filter(item => item !== null && Object.keys(item).length > 0);
				}
			});

			// Get mapTileMask value - ensure proper 2D array format
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
				// NOTE: 'links' field removed as per schema update

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

			// Validate JSON with custom formatting
			try {
				const jsonString = this.formatJSON(payload);
				console.log('Saving Room Properties data:', jsonString);

				// Clear unsaved changes flag and set closing flag
				this.hasUnsavedChanges = false;
				this.isClosing = true;

				ipcRenderer.send('save-room-properties-data', payload);

				// Small delay to ensure save completes before closing
				setTimeout(() => {
					window.close();
				}, 100);
			} catch (jsonError) {
				alert(`Invalid JSON data detected. Cannot save.\n\nError: ${jsonError.message}\n\nPlease review your data and try again.`);
				console.error('JSON serialization error:', jsonError);
				console.error('Problematic payload:', payload);

				// Re-enable interaction on error
				this.isClosing = false;
			}
		} catch (error) {
			alert(`Error preparing data for save:\n\n${error.message}\n\nPlease check the console for details.`);
			console.error('Save preparation error:', error);

			// Re-enable interaction on error
			this.isClosing = false;
		}
	}

	/**
	 * Custom JSON formatter for compact array display
	 */
	formatJSON(obj, indent = 2) {
		const space = ' '.repeat(indent);

		const stringify = (value, currentIndent = 0) => {
			const currentSpace = ' '.repeat(currentIndent);
			const nextSpace = ' '.repeat(currentIndent + indent);

			if (value === null) return 'null';
			if (value === undefined) return undefined;
			if (typeof value === 'boolean') return value.toString();
			if (typeof value === 'number') return value.toString();
			if (typeof value === 'string') return JSON.stringify(value);

			if (Array.isArray(value)) {
				if (value.length === 0) return '[]';

				// Check if this is a simple array (all primitives)
				const allPrimitives = value.every(item =>
					item === null ||
					typeof item === 'string' ||
					typeof item === 'number' ||
					typeof item === 'boolean'
				);

				// Check if this is a 2D number array (like mapTileMask)
				const is2DNumberArray = value.every(item =>
					Array.isArray(item) && item.every(subItem => typeof subItem === 'number')
				);

				if (allPrimitives && value.length <= 10) {
					// Compact format for simple short arrays
					return '[' + value.map(v => stringify(v, 0)).join(', ') + ']';
				} else if (is2DNumberArray) {
					// Special compact format for 2D arrays - NO SPACES after commas
					return '[\n' + nextSpace + value.map(row =>
						'[' + row.join(',') + ']'
					).join(',\n' + nextSpace) + '\n' + currentSpace + ']';
				} else if (value.length === 1 && typeof value[0] === 'object' && value[0] !== null) {
					// Check if single object has nested and/or with multiple items
					const obj = value[0];
					const hasComplexLogic = (obj.and && obj.and.length > 1) || (obj.or && obj.or.length > 1);

					if (hasComplexLogic) {
						// Multi-line for complex logic
						return '[\n' + nextSpace + stringify(value[0], currentIndent + indent) + '\n' + currentSpace + ']';
					} else {
						// Try compact format
						const inner = stringify(value[0], 0);
						if (inner.length < 80) {
							return '[' + inner + ']';
						}
					}
				}

				// Default: multi-line format
				return '[\n' + nextSpace +
					value.map(v => stringify(v, currentIndent + indent)).join(',\n' + nextSpace) +
					'\n' + currentSpace + ']';
			}

			if (typeof value === 'object') {
				const keys = Object.keys(value);
				if (keys.length === 0) return '{}';

				// Check if this is a small object that can be inlined
				const entries = keys.map(k => {
					const v = stringify(value[k], currentIndent + indent);
					return v !== undefined ? `${JSON.stringify(k)}: ${v}` : null;
				}).filter(e => e !== null);

				const singleLine = '{' + entries.join(', ') + '}';

				// Inline if small and no nested objects
				if (singleLine.length < 80 && !entries.some(e => e.includes('{'))) {
					return singleLine;
				}

				// Multi-line format
				return '{\n' + nextSpace +
					entries.join(',\n' + nextSpace) +
					'\n' + currentSpace + '}';
			}

			return JSON.stringify(value);
		};

		return stringify(obj, 0);
	}

	validateConditionOutput(condition, path = 'root') {
		console.debug('[validateConditionOutput] input:', path, condition);

		if (condition == null) {
			console.debug('[validateConditionOutput] null -> null:', path);
			return null;
		}

		// Arrays: preserve shape and filter out nulls
		if (Array.isArray(condition)) {
			const cleaned = condition
				.map((c, i) => this.validateConditionOutput(c, `${path}[${i}]`))
				.filter(c => c !== null);

			console.debug('[validateConditionOutput] array result:', path, cleaned);
			return cleaned.length ? cleaned : null;
		}

		// Plain strings are valid conditions (items, techs, helpers, events, notables)
		if (typeof condition === 'string') {
			console.debug('[validateConditionOutput] string:', path, condition);
			return condition;
		}

		// Non-object primitives (numbers, booleans)
		if (typeof condition !== 'object') {
			console.debug('[validateConditionOutput] primitive:', path, condition);
			return condition;
		}

		// Logical operators - recursively validate and preserve structure
		if ('and' in condition) {
			const v = this.validateConditionOutput(condition.and, `${path}.and`);
			console.debug('[validateConditionOutput] and:', path, v);
			// Return null if 'and' array is empty after validation
			return v && (Array.isArray(v) ? v.length > 0 : true) ? {
				and: v
			} : null;
		}

		if ('or' in condition) {
			const v = this.validateConditionOutput(condition.or, `${path}.or`);
			console.debug('[validateConditionOutput] or:', path, v);
			// Return null if 'or' array is empty after validation
			return v && (Array.isArray(v) ? v.length > 0 : true) ? {
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

		// Plain requirement object - clean and validate
		const cleaned = cleanObject(condition);
		console.debug('[validateConditionOutput] leaf:', path, cleaned);

		return Object.keys(cleaned).length ? cleaned : null;
	}
}