/**
 * State Manager - Centralized application state with geometry support
 */
import {
	normalizeGeometry,
	getNodeBounds
} from './geometryUtils.js';

class State {
	constructor() {
        this.appPath = null;
		this.workingDir = null;
		this.currentRoomData = null;
		this.currentRoomPath = null;
		this.currentRoomImage = null;
		this.nodes = [];

		this.enemies = [];
		this.itemsData = null;
		this.weaponData = [];
		this.techMap = new Map();
		this.helperMap = new Map();
		this.stratPresets = [];

		this.currentArea = null;
		this.currentSubarea = null;

		this.allRoomsMetadata = [];
		this.connectionCache = new Map();
		this.interConnections = null;
		this.intraConnections = new Map();

		// UI state - now supports multiple selection
		this.selectedNodes = [];
		this.mode = "select";
		this.scale = 1.0;
		this.hideBaseStrats = false;

		// Drawing state
		this.isDrawing = false;
		this.currentRect = null;
		this.startX = 0;
		this.startY = 0;
		this.triangleDrawMode = false;
		this.trianglePoints = [];

		// Moving/resizing state
		this.movingNodes = [];
		this.moveOffsets = new Map();

		this.areaStartRooms = {
			"L-X": "L-X/General/Revival Room",
			"MDK": "MDK/West Main Deck/Central Nexus _ Nexus Storage _ Concourse",
			"SRX": "SRX/Upper SRX/SRX Entrance Lobby",
			"TRO": "TRO/General/TRO Entrance Lobby",
			"PYR": "PYR/Upper PYR/PYR-TRO Elevator _ PYR Entrance Lobby",
			"AQA": "AQA/Upper East AQA/AQA-ARC Elevator",
			"ARC": "ARC/Upper ARC/ARC-PYR Access",
			"NOC": "NOC/Upper NOC/NOC Entrance Lobby North",
			"DMX": "DMX/Opening Segment/DMX Entrance"
		};
	}
    
    async initStratPresetsPath() {
        this.stratPresetsPath = await window.api.getStratPresetsPath();
    }

	async loadAllRoomsMetadata() {
		if (!this.workingDir) return;
		this.allRoomsMetadata = [];
		const areas = ['L-X', 'MDK', 'SRX', 'TRO', 'PYR', 'AQA', 'ARC', 'NOC', 'DMX'];

		for (const area of areas) {
			const areaPath = `${this.workingDir}/region/${area}`;
			try {
				const subareas = await window.api.readDirectory(areaPath);
				for (const subarea of subareas) {
					const subareaPath = `${areaPath}/${subarea}`;
					let roomFiles;
					try {
						roomFiles = await window.api.readDirectory(subareaPath);
					} catch {
						continue;
					}
					for (const roomFile of roomFiles) {
						if (!roomFile.endsWith('.json')) continue;
						const roomPath = `${subareaPath}/${roomFile}`;
						try {
							const room = await window.api.loadJson(roomPath);
							if (!room || !room.nodes) continue;
							const doors = room.nodes
								.filter(n => n.nodeType === 'door')
								.map(door => ({
									address: door.nodeAddress,
									orientation: door.doorOrientation,
									name: door.name
								}));
							this.allRoomsMetadata.push({
								name: room.name,
								area: area,
								subarea: subarea,
								address: room.roomAddress,
								doors: doors
							});
						} catch (err) {
							console.warn(`Failed to load room file ${roomPath}:`, err);
						}
					}
				}
			} catch (err) {
				console.warn(`Failed to read area directory ${areaPath}:`, err);
			}
		}
		console.log(`Loaded metadata for ${this.allRoomsMetadata.length} rooms`);
	}

	getAllRooms() {
		return this.allRoomsMetadata.map(room => ({
			name: room.name,
			area: room.area,
			subarea: room.subarea
		})).sort((a, b) => a.name.localeCompare(b.name));
	}

	async setWorkingDir(dir) {
		this.workingDir = dir;
		this.connectionCache.clear();
		this.interConnections = null;
		this.intraConnections.clear();
		await this.loadAllRoomsMetadata();
		await this.initEnemyDatabase();
		await this.initItemAndEventsDatabase();
		await this.initWeaponDatabase();
		await this.initTech();
		await this.initHelpers();
        await this.initStratPresetsPath();
        await this.initStratPresets(this.stratPresetsPath);
	}

	ensureGeometry(entity) {
		if (!entity.geometry || entity.geometry.length === 0) {
			entity.geometry = [{
				shape: 'rect',
				x: 0,
				y: 0,
				w: 16,
				h: 16
			}];
		}
		return entity;
	}

	loadRoomData(roomPath, roomData) {
		this.currentRoomPath = roomPath;
		this.currentRoomData = roomData;
		this.currentArea = roomData.area;
		this.currentSubarea = roomData.subarea;
		this.nodes = roomData.nodes || [];

		// Ensure geometry for objects
		if (roomData.objects) {
			roomData.objects = roomData.objects.map(obj => this.ensureGeometry(obj));
		}

		// Ensure geometry for enemies
		if (roomData.enemies) {
			roomData.enemies = roomData.enemies.map(enemy => this.ensureGeometry(enemy));
		}

		this.selectedNodes = [];
	}

	setRoomImage(image) {
		this.currentRoomImage = image;
	}

	setMode(mode) {
		this.mode = mode;
		// Clear selection when switching modes
		if (mode !== 'select') {
			this.selectedNodes = [];
		}
	}

	setScale(scale) {
		this.scale = Math.max(0.1, Math.min(5.0, scale));
	}

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

	updateCurrentRect(rect) {
		this.currentRect = rect;
	}

	finishDrawing() {
		this.isDrawing = false;
		this.currentRect = null;
	}

	/**
	 * Get the minimum available junction node ID
	 */
	getMinJunctionNodeId() {
		const nonJunctionIds = this.nodes
			.filter(n => n.nodeType !== 'junction')
			.map(n => n.id);

		if (nonJunctionIds.length === 0) return 1;

		return Math.max(...nonJunctionIds) + 1;
	}

	/**
	 * Add a new junction node (rectangle)
	 */
	addNode(rect) {
		const minJunctionId = this.getMinJunctionNodeId();
		const usedIds = new Set(this.nodes.map(n => n.id));

		let newId = minJunctionId;
		while (usedIds.has(newId)) {
			newId++;
		}

		const geometry = [{
			shape: 'rect',
			x: Math.max(0, rect.x),
			y: Math.max(0, rect.y),
			w: Math.max(8, Math.abs(rect.w)),
			h: Math.max(8, Math.abs(rect.h))
		}];

		normalizeGeometry(geometry);

		const newNode = {
			id: newId,
			name: `Junction Node ${newId}`,
			nodeType: 'junction',
			nodeSubType: 'visible',
			geometry: geometry,
			color: '#0000FF'
		};

		this.nodes.push(newNode);
		this.currentRoomData.nodes = [...this.nodes];
	}

	/**
	 * Add a new junction node (triangle)
	 */
	addTriangleNode(points) {
		const minJunctionId = this.getMinJunctionNodeId();
		const usedIds = new Set(this.nodes.map(n => n.id));

		let newId = minJunctionId;
		while (usedIds.has(newId)) {
			newId++;
		}

		// Snap points to grid
		const snappedPoints = points.map(p => ({
			x: Math.round(p.x / 8) * 8,
			y: Math.round(p.y / 8) * 8
		}));

		const geometry = [{
			shape: 'tri',
			points: snappedPoints
		}];

		normalizeGeometry(geometry);

		const newNode = {
			id: newId,
			name: `Junction Triangle ${newId}`,
			nodeType: 'junction',
			nodeSubType: 'visible',
			geometry: geometry,
			color: '#0000FF'
		};

		this.nodes.push(newNode);
		this.currentRoomData.nodes = [...this.nodes];
	}

	/**
	 * Remove nodes by IDs
	 */
	removeNodes(nodeIds) {
		const idsToRemove = new Set(nodeIds);
		this.nodes = this.nodes.filter(n => !idsToRemove.has(n.id));
		this.selectedNodes = this.selectedNodes.filter(n => !idsToRemove.has(n.id));
		this.currentRoomData.nodes = [...this.nodes];
	}

	/**
	 * Select/deselect nodes
	 */
	toggleNodeSelection(node, multiSelect = false) {
		if (!multiSelect) {
			this.selectedNodes = [node];
		} else {
			const index = this.selectedNodes.findIndex(n => n.id === node.id);
			if (index >= 0) {
				this.selectedNodes.splice(index, 1);
			} else {
				this.selectedNodes.push(node);
			}
		}
	}

	clearSelection() {
		this.selectedNodes = [];
	}

	startMovingNodes(nodes, mouseX, mouseY) {
		this.movingNodes = [...nodes];
		this.moveOffsets.clear();

		for (const node of nodes) {
			const bounds = getNodeBounds(node);
			this.moveOffsets.set(node.id, {
				x: mouseX - bounds.x,
				y: mouseY - bounds.y
			});
		}
	}

	stopMoving() {
		this.movingNodes = [];
		this.moveOffsets.clear();
	}

	updateRoomNodes(newNodes) {
		this.nodes = newNodes;
		this.currentRoomData.nodes = newNodes;
	}

	// Database initialization methods
	async initEnemyDatabase() {
		try {
			const enemyPath = `${this.workingDir}/enemies/main.json`;
			const data = await window.api.loadJson(enemyPath);
			this.enemies = data?.enemies || [];
		} catch (err) {
			console.error("Failed to initialize enemy database:", err);
			this.enemies = [];
		}
	}

	async initWeaponDatabase() {
		try {
			const weaponDataPath = `${this.workingDir}/weapons/main.json`;
			const data = await window.api.loadJson(weaponDataPath);
			this.weaponData = data?.weapons || [];
		} catch (err) {
			console.error("Failed to initialize weapons database:", err);
			this.weaponData = [];
		}
	}

	async initItemAndEventsDatabase() {
		try {
			const itemsPath = `${this.workingDir}/items.json`;
			const data = await window.api.loadJson(itemsPath);
			this.itemsData = data ? JSON.parse(JSON.stringify(data)) : null;
		} catch (err) {
			console.error("Failed to initialize items database:", err);
			this.itemsData = null;
		}
	}

	async initTech() {
		if (!this.workingDir) return;
		try {
			const techPath = `${this.workingDir}/tech.json`;
			const data = await window.api.loadJson(techPath);
			if (!data?.techCategories) return;

			this.techMap.clear();
			const processTechs = (techs, isExtension = false) => {
				return techs.map(t => ({
					id: t.id,
					name: t.name,
					note: t.note,
					devNote: t.devNote,
					extensionTech: isExtension,
					extensionTechs: t.extensionTechs ? processTechs(t.extensionTechs, true) : []
				}));
			};

			for (const cat of data.techCategories) {
				this.techMap.set(cat.name, {
					items: processTechs(cat.techs)
				});
			}
		} catch (err) {
			console.error("Failed to initialize tech data:", err);
		}
	}

	async initHelpers() {
		if (!this.workingDir) return;
		try {
			const helperPath = `${this.workingDir}/helpers.json`;
			const data = await window.api.loadJson(helperPath);
			if (!data?.helperCategories) return;

			for (const cat of data.helperCategories) {
				this.helperMap.set(cat.name, {
					items: (cat.helpers || []).map(h => ({
						name: h.name,
						note: h.note || null,
						devNote: h.devNote || null
					}))
				});
			}
		} catch (err) {
			console.error("Failed to initialize helpers data:", err);
		}
	}
    
    async initStratPresets(dir) {
        this.stratPresets = await window.api.loadStratPresets(dir);
    }
    
	getEnemyList() {
		return this.enemies
			.filter(e => e.name && e.name.trim())
			.map(e => ({
				id: e.id,
				name: e.name
			}))
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	getItemList() {
		if (!this.itemsData) return [];
		const combined = [
			...(this.itemsData.implicitItems || []),
			...(this.itemsData.upgradeItems || []).map(i => i.name),
			...(this.itemsData.expansionItems || []).map(i => i.name)
		];
		return combined
			.filter(name => name !== "ETank" && name !== "ReserveX")
			.sort((a, b) => a.localeCompare(b));
	}

	getEventList() {
		return this.itemsData?.gameFlags || [];
	}

	getWeaponList() {
		return this.weaponData
			.filter(w => w.name && w.name.trim())
			.map(w => ({
				id: w.id,
				name: w.name
			}))
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	getTechMap() {
		return this.techMap;
	}

	getHelperMap() {
		return this.helperMap;
	}

    getStratPresets() {
        return this.stratPresets;
    }

	// Connection management methods (keeping existing implementation)
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
			// Silent fail - will try other connection sources
		}
		return null;
	}

	async loadInterConnections() {
		if (this.interConnections) return this.interConnections;
		try {
			const interPath = `${this.workingDir}/connection/inter.json`;
			const data = await window.api.loadJson(interPath);
			this.interConnections = data;
			return data;
		} catch (err) {
			return null;
		}
	}

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
			// Silent fail
		}
		return null;
	}

	async getDoorConnections() {
		const connections = {};
		if (!this.currentRoomData?.nodes) return connections;

		for (const node of this.currentRoomData.nodes) {
			if (node.nodeType === 'door') {
				const conn = await this.findDoorConnection(node);
				if (conn) {
					connections[node.name] = {
						targetRoom: conn.targetNode.roomName,
						targetArea: conn.targetNode.area,
						targetSubarea: conn.targetNode.subarea,
						targetSubroom: conn.targetSubroom,
						connectionType: conn.connectionType,
						direction: conn.direction,
						position: conn.targetNode.position,
						nodes: conn.nodes
					};
				}
			}
		}
		return connections;
	}

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
				const matchNode = conn.nodes.find(n =>
					n.roomid === this.currentRoomData.id &&
					n.nodeid === doorNode.id
				);

				if (matchNode) {
					let sourceNode = null;
					let targetNode = null;

					if (conn.direction === 'Forward') {
						if (conn.nodes[0].roomid === this.currentRoomData.id &&
							conn.nodes[0].nodeid === doorNode.id) {
							sourceNode = conn.nodes[0];
							targetNode = conn.nodes[1];
						} else {
							continue;
						}
					} else {
						sourceNode = matchNode;
						targetNode = conn.nodes.find(n => n !== matchNode);
					}

					if (!targetNode) continue;

					return {
						...conn,
						sourceNode,
						targetNode,
						targetRoom: targetNode.roomName,
						targetSubroom: this.getTargetSubroom(targetNode),
						targetArea: targetNode.area,
						targetSubarea: targetNode.subarea,
						direction: conn.direction,
						nodes: conn.nodes
					};
				}
			}
		}
		return null;
	}

	getTargetSubroom(targetNode) {
		if (!targetNode?.roomName || !targetNode?.nodeName) return null;
		if (targetNode.roomName === "PYR-TRO Elevator / PYR Entrance Lobby") {
			return null;
		}
		const segments = targetNode.roomName.split(' / ');
		return segments.find(segment => targetNode.nodeName.startsWith(segment)) || null;
	}
}

const state = new State();
export default state;