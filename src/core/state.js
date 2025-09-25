/**
 * State Manager - Centralized application state management
 * Handles current room data, nodes, UI state, and connections
 */
class State {
	constructor() {
		// Working directory
		this.workingDir = null;
		// Current room data (new format)
		this.currentRoomData = null;
		this.currentRoomPath = null;
		this.currentRoomImage = null;
		this.nodes = [];
		// Enemy database
		this.enemies = [];
		// Items database
		this.itemsData = null;
		// Weapons database
		this.weaponData = [];
		// Tech and helpers data
		this.techMap = new Map(); // key: tech/extensionTech name -> { id, notes, categories }
		this.helperMap = new Map(); // key: helper name -> { notes, categories }
		// Current area/subarea for connection lookups
		this.currentArea = null;
		this.currentSubarea = null;
		// Connection data cache
		this.connectionCache = new Map(); // area/subarea -> connection data
		this.interConnections = null; // inter-area connections
		this.intraConnections = new Map(); // area -> intra connections
		// UI state
		this.selectedNode = null;
		this.mode = "select";
		this.scale = 1.0;
		// Drawing state
		this.isDrawing = false;
		this.currentRect = null;
		this.startX = 0;
		this.startY = 0;
		// Moving/resizing state
		this.movingNode = null;
		this.offsetX = 0;
		this.offsetY = 0;
		// Area start rooms mapping
		this.areaStartRooms = {
			"L-X": "L-X/General/Revival Room",
			"MDK": "MDK/West Main Deck/Central Nexus _ Concourse",
			"SRX": "SRX/Upper SRX/SRX Entrance Lobby",
			"TRO": "TRO/General/TRO Entrance Lobby",
			"PYR": "PYR/Upper PYR/PYR-TRO Elevator _ PYR Entrance Lobby",
			"AQA": "AQA/Upper East AQA/AQA-ARC Elevator",
			"ARC": "ARC/Upper ARC/ARC-PYR Access",
			"NOC": "NOC/Upper NOC/NOC Entrance Lobby North",
			"DMX": "DMX/Opening Segment/DMX Entrance"
		};
	}
	/**
	 * Set the working directory
	 * @param {string} dir - Path to working directory
	 */
	async setWorkingDir(dir) {
		this.workingDir = dir;
		// Clear connection cache when directory changes
		this.connectionCache.clear();
		this.interConnections = null;
		this.intraConnections.clear();
		// Initialize the Enemy database
		await this.initEnemyDatabase();
		// Initialize the Items and Events database
		await this.initItemAndEventsDatabase();
		// Initialize the Weapons database
		await this.initWeaponDatabase();
		// Initialize the Tech and Helpers database
		await state.initTech();
		await state.initHelpers();
	}
	/**
	 * Load room data in new format
	 * @param {string} roomPath - Path to room JSON file
	 * @param {Object} roomData - Room data object
	 */
	loadRoomData(roomPath, roomData) {
		this.currentRoomPath = roomPath;
		this.currentRoomData = roomData;
		// Extract area/subarea from room data
		this.currentArea = roomData.area;
		this.currentSubarea = roomData.subarea;
		this.nodes = roomData.nodes;
	}
	/**
	 * Load connection data for current area/subarea
	 * @param {string} area - Area name
	 * @param {string} subarea - Subarea name
	 */
	async loadConnections(area, subarea) {
		const key = `${area}/${subarea}`;
		if (this.connectionCache.has(key)) {
			return this.connectionCache.get(key);
		}
		try {
			const connectionPath = `${this.workingDir}/connection/${area}/${subarea}.json`;
			const data = await window.api.loadJson(connectionPath);
			if (data) {
				this.connectionCache.set(key, data);
				return data;
			}
		} catch (err) {
			//console.error(`Failed to load connections for ${key}:`, err);  // Allow this to fail; it'll find the intra/inter connections next anyway
		}
		return null;
	}
	/**
	 * Load inter-area connections
	 */
	async loadInterConnections() {
		if (this.interConnections) {
			return this.interConnections;
		}
		try {
			const interPath = `${this.workingDir}/connection/inter.json`;
			const data = await window.api.loadJson(interPath);
			this.interConnections = data;
			return data;
		} catch (err) {
			//console.error('Failed to load inter-area connections:', err);
			return null;
		}
	}
	/**
	 * Load intra-area connections for a specific area
	 * @param {string} area - Area name
	 */
	async loadIntraConnections(area) {
		if (this.intraConnections.has(area)) {
			return this.intraConnections.get(area);
		}
		try {
			const intraPath = `${this.workingDir}/connection/${area}/intra.json`;
			const data = await window.api.loadJson(intraPath);
			if (data) {
				this.intraConnections.set(area, data);
				return data;
			}
		} catch (err) {
			//console.error(`Failed to load intra-area connections for ${area}:`, err);
		}
		return null;
	}
	/**
	 * Find the connection for a door node by checking all connection JSONs
	 * @param {Object} doorNode - Node from current room
	 * @returns {Object|null} Connection info with targetNode
	 */
	async findDoorConnection(doorNode) {
		if (!doorNode || doorNode.nodeType !== 'door') return null;
		const allConnections = [
			await this.loadConnections(this.currentArea, this.currentSubarea),
			await this.loadIntraConnections(this.currentArea),
			await this.loadInterConnections()
		];
		for (const connData of allConnections) {
			if (!connData?.connections) continue;
			for (const conn of connData.connections) {
				const matchNode = conn.nodes.find(n => n.roomName === this.currentRoomData.name && n.nodeid === doorNode.id);
				if (matchNode) {
					const targetNode = conn.nodes.find(n => n !== matchNode);
					if (targetNode) {
						return {
							...conn,
							sourceNode: matchNode,
							targetNode
						};
					}
				}
			}
		}
		return null;
	}
	/**
	 * Search connection data for a specific node
	 * @param {Object} connectionData - Connection data to search
	 * @param {Object} doorNode - Door node to find
	 * @returns {Object|null} Connection if found
	 */
	searchConnectionsForNode(connectionData, doorNode) {
		if (!connectionData?.connections) return null;
		for (const conn of connectionData.connections) {
			for (const node of conn.nodes || []) {
				if (node.area === this.currentArea &&
					node.subarea === this.currentSubarea &&
					node.nodeid === doorNode.id) {
					// Find the other node in this connection
					const otherNode = conn.nodes.find(n => n !== node);
					if (otherNode) {
						return {
							...conn,
							targetNode: otherNode,
							sourceNode: node
						};
					}
				}
			}
		}
		return null;
	}
	/**
	 * Get all door connections for the current room
	 * @returns {Object} Door connections keyed by node name
	 */
	async getDoorConnections() {
		const connections = {};
		if (!this.currentRoomData?.nodes) return connections;
		for (const node of this.currentRoomData.nodes) {
			if (node.nodeType === 'door') {
				const conn = await this.findDoorConnection(node);
				if (conn) {
					// Use the node's name directly as the key (e.g., "East-Upper Door")
					connections[node.name] = {
						targetRoom: conn.targetNode.roomName,
						targetArea: conn.targetNode.area,
						targetSubarea: conn.targetNode.subarea,
						connectionType: conn.connectionType,
						direction: conn.targetNode.position
					};
				}
			}
		}
		return connections;
	}
	/**
	 * Set room image
	 * @param {HTMLImageElement} image - Room image
	 */
	setRoomImage(image) {
		this.currentRoomImage = image;
	}
	/**
	 * Set current mode
	 * @param {string} mode - Tool mode
	 */
	setMode(mode) {
		this.mode = mode;
	}
	/**
	 * Set zoom scale
	 * @param {number} scale - Zoom scale
	 */
	setScale(scale) {
		this.scale = Math.max(0.1, Math.min(5.0, scale));
	}
	/**
	 * Start drawing operation
	 * @param {number} x - Starting X coordinate
	 * @param {number} y - Starting Y coordinate  
	 */
	startDrawing(x, y) {
		this.isDrawing = true;
		this.startX = x;
		this.startY = y;
		this.currentRect = {
			x,
			y,
			w: 0,
			h: 0
		};
	}
	/**
	 * Update current rectangle being drawn
	 * @param {Object} rect - Rectangle data
	 */
	updateCurrentRect(rect) {
		this.currentRect = rect;
	}
	/**
	 * Finish drawing operation
	 */
	finishDrawing() {
		this.isDrawing = false;
		this.currentRect = null;
	}
	/**
	 * Add a new node
	 * @param {Object} rect - Node rectangle
	 */
	addNode(rect) {
		const newNode = {
			id: Date.now(), // Simple ID generation
			name: `Node ${this.nodes.length + 1}`,
			nodeType: 'item', // Default type
			nodeSubType: 'visible',
			x: rect.x,
			y: rect.y,
			w: rect.w,
			h: rect.h
		};
		this.nodes.push(newNode);
		this.currentRoomData.nodes = [...this.nodes];
	}
	/**
	 * Remove a node
	 * @param {number} nodeId - Node ID to remove
	 */
	removeNode(nodeId) {
		this.nodes = this.nodes.filter(n => n.id !== nodeId);
		if (this.selectedNode && this.selectedNode.id === nodeId) {
			this.selectedNode = null;
		}
		this.currentRoomData.nodes = [...this.nodes];
	}
	/**
	 * Start moving/resizing operation
	 * @param {Object} node - Node to move
	 * @param {number} offsetX - X offset
	 * @param {number} offsetY - Y offset
	 */
	startMoving(node, offsetX, offsetY) {
		this.movingNode = node;
		this.offsetX = offsetX;
		this.offsetY = offsetY;
	}
	/**
	 * Stop moving operation
	 */
	stopMoving() {
		this.movingNode = null;
	}
	/**
	 * Update node position
	 * @param {Object} node - Node to update
	 * @param {number} x - New X position
	 * @param {number} y - New Y position
	 */
	updateNodePosition(node, x, y) {
		node.x = x;
		node.y = y;
	}
	/**
	 * Update node dimensions
	 * @param {Object} node - Node to update
	 * @param {number} width - New width
	 * @param {number} height - New height
	 */
	updateNodeDimensions(node, width, height) {
		node.w = width;
		node.h = height;
	}
	/**
	 * Initialize the enemy database
	 */
	async initEnemyDatabase() {
		try {
			const enemyPath = `${this.workingDir}/enemies/main.json`;
			const data = await window.api.loadJson(enemyPath);
			if (data?.enemies) {
				this.enemies = data.enemies;
			} else {
				console.warn("Enemy database missing or malformed:", data);
				this.enemies = [];
			}
		} catch (err) {
			console.error("Failed to initialize enemy database:", err);
			this.enemies = [];
		}
	}
	/**
	 * Initialize the weapon database
	 */
	async initWeaponDatabase() {
		try {
			const weaponDataPath = `${this.workingDir}/weapons/main.json`;
			const data = await window.api.loadJson(weaponDataPath);
			if (data?.weapons) {
				this.weaponData = data.weapons;
			} else {
				console.warn("Weapons database missing or malformed:", data);
				this.weaponData = [];
			}
		} catch (err) {
			console.error("Failed to initialize weapons database:", err);
			this.weaponData = [];
		}
	}
	/**
	 * Get list of enemy names
	 * @returns {string[]} Array of enemy names
	 */
	getEnemyList() {
		if (!this.enemies) return [];
		return this.enemies
			.filter(e => e.name && e.name.trim() !== "")
			.map(e => ({
				id: e.id,
				name: e.name
			}))
			.sort((a, b) => a.name.localeCompare(b.name));
	}
	/**
	 * Initialize the items database by reading items.json
	 */
	async initItemAndEventsDatabase() {
		if (!this.workingDir) {
			console.warn("Working directory not set, cannot load items.json");
			this.itemsData = null;
			return;
		}
		try {
			const itemsPath = `${this.workingDir}/items.json`;
			const data = await window.api.loadJson(itemsPath);
			// Deep clone to avoid mutations
			this.itemsData = data ? JSON.parse(JSON.stringify(data)) : null;
		} catch (err) {
			console.error("Failed to initialize items database:", err);
			this.itemsData = null;
		}
	}
	/**
	 * Get all item names, excluding ETank and ReserveX, sorted alphabetically
	 * @returns {string[]}
	 */
	getItemList() {
		if (!this.itemsData) return [];
		const itemArrays = [
			this.itemsData.implicitItems || [],
			(this.itemsData.upgradeItems || []).map(i => i.name),
			(this.itemsData.expansionItems || []).map(i => i.name)
		];
		const combined = itemArrays.flat();
		return combined
			.filter(name => name !== "ETank" && name !== "ReserveX")
			.sort((a, b) => a.localeCompare(b));
	}
	/**
	 * Get all game flags/events, sorted alphabetically
	 * @returns {string[]}
	 */
	getEventList() {
		if (!this.itemsData) return [];
		return (this.itemsData.gameFlags || []).slice().sort((a, b) => a.localeCompare(b));
	}
	/**
	 * Get all weapon names, sorted alphabetically
	 * @returns {string[]}
	 */
	getWeaponList() {
		if (!this.weaponData) return [];
		return this.weaponData
			.filter(w => w.name && w.name.trim() !== "")
			.map(w => ({
				id: w.id,
				name: w.name
			}))
			.sort((a, b) => a.name.localeCompare(b.name));
	}
	/**
	 * Initialize Tech data from <working_dir>/tech.json
	 */
	async initTech() {
		if (!this.workingDir) {
			console.warn("Working directory not set, cannot load tech.json");
			return;
		}
		try {
			const techPath = `${this.workingDir}/tech.json`;
			const data = await window.api.loadJson(techPath);
			if (!data?.techCategories) {
				console.warn("No techCategories found in tech.json");
				return;
			}
			this.techMap.clear();
			// Helper function to recursively process techs and their extensions
			const processTechs = (techs, isExtension = false) => {
				return techs.map(t => {
					const techObj = {
						id: t.id,
						name: t.name,
						note: t.note,
						devNote: t.devNote,
						extensionTech: isExtension,
						extensionTechs: t.extensionTechs ? processTechs(t.extensionTechs, true) : []
					};
					return techObj;
				});
			};
			// Populate the Map: key = category name, value = { items: [...] }
			for (const cat of data.techCategories) {
				this.techMap.set(cat.name, {
					items: processTechs(cat.techs)
				});
			}
		} catch (err) {
			console.error("Failed to initialize tech data:", err);
		}
	}
	/**
	 * Load and initialize helpers data from helpers.json
	 */
	async initHelpers() {
		if (!this.workingDir) {
			console.warn("Working directory not set, cannot load helpers.json");
			return;
		}
		try {
			const helperPath = `${this.workingDir}/helpers.json`;
			const data = await window.api.loadJson(helperPath);
			if (!data?.helperCategories) return;
			for (const cat of data.helperCategories) {
				const categoryObj = {
					items: []
				};
				for (const helper of cat.helpers || []) {
					categoryObj.items.push({
						name: helper.name,
						note: helper.note || null,
						devNote: helper.devNote || null
					});
				}
				this.helperMap.set(cat.name, categoryObj);
			}
		} catch (err) {
			console.error("Failed to initialize helpers data:", err);
		}
	}
	/**
	 * Get all available Tech
	 * @returns {string[]}
	 */
	getTechMap() {
		if (!this.techMap) return {};
		return this.techMap;
	}
	/**
	 * Get all available Helpers
	 * @returns {string[]}
	 */
	getHelperMap() {
		if (!this.helperMap) return {};
		return this.helperMap;
	}
}
// Create and export singleton instance
const state = new State();
export default state;