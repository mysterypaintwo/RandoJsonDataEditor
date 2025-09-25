/**
 * Room Manager - Handles room loading, saving, and navigation with new JSON format
 * Manages file operations, room data processing, and connection resolution
 */
import {
	parseRoomPath,
	formatDirection
} from './utils.js';
export class RoomManager {
	constructor(state, renderer, uiManager, config) {
		this.state = state;
		this.renderer = renderer;
		this.uiManager = uiManager;
		this.config = config;
	}
	/**
	 * Load a room by area, subarea, and room name
	 * @param {string} area - The area name
	 * @param {string} subarea - The subarea name  
	 * @param {string} roomName - The room name
	 */
	async loadRoom(area, subarea, roomName) {
		if (!this.state.workingDir) {
			this.uiManager.showAlert('Set working directory first!');
			return;
		}
		// Construct JSON file path (replace / with _ for filename)
		const fileName = roomName.replace(/\//g, '_');
		const jsonPath = `${this.state.workingDir}/region/${area}/${subarea}/${fileName}.json`;
		console.log(`Loading room: ${jsonPath}`);
		// Load JSON data
		const data = await window.api.loadJson(jsonPath);
		if (!data) {
			this.uiManager.showAlert(`Failed to load room data: ${jsonPath}`);
			return;
		}
		// Validate schema if enabled and present
		if (this.config.enableValidation) {
			const isValid = await this.validateSchema(data, jsonPath);
			if (!isValid) {
				this.uiManager.showAlert(`Schema validation failed for: ${jsonPath}`);
				// Continue loading despite validation failure
			}
		}
		// Update state with loaded data
		this.state.loadRoomData(jsonPath, data);
		// Update UI
		this.uiManager.updateJsonDisplay(this.state.currentRoomData);
		await this.uiManager.updateDoorButtons(this.state.currentRoomData);
		// Load the room image
		if (data.roomImageFile) {
			await this.loadRoomImage(`${this.state.workingDir}/img/${data.roomImageFile}`);
		}
		return data;
	}
	/**
	 * Validate JSON schema if schema is specified
	 * @param {Object} data - JSON data to validate
	 * @param {string} filePath - File path for error reporting
	 * @returns {boolean} True if valid or no schema specified
	 */
	async validateSchema(data, filePath) {
		if (!data.$schema) {
			return true; // No schema specified, assume valid
		}
		try {
			// Resolve schema path with game-specific prefix
			const schemaPath = this.resolveSchemaPath(data.$schema, filePath);
			const schema = await window.api.loadJson(schemaPath);
			if (!schema) {
				console.warn(`Could not load schema: ${schemaPath}`);
				return false;
			}
			// Use the validation API from main process
			const result = await window.api.validateJsonSchema(data, schemaPath);
			if (!result.valid) {
				console.error('Schema validation errors:', result.errors);
				return false;
			}
			return true;
		} catch (err) {
			console.error('Schema validation error:', err);
			return false;
		}
	}
	/**
	 * Resolve schema path relative to JSON file with game-specific handling
	 * @param {string} schemaRef - Schema reference from JSON
	 * @param {string} jsonPath - Path to JSON file
	 * @returns {string} Resolved schema path
	 */
	resolveSchemaPath(schemaRef, jsonPath) {
		const workingDir = this.state.workingDir;
		const schemaPrefix = this.config.gameType === 'XFusion' ? 'mxf' : 'm3';
		// Construct the schema filename from the prefix
		const schemaFileName = `${schemaPrefix}-room.schema.json`;
		// Resolve full path
		return `${workingDir}/schema/${schemaFileName}`;
	}
	/**
	 * Load and display a room image
	 * @param {string} imagePath - Path to the room image file
	 */
	async loadRoomImage(imagePath) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => {
				this.state.setRoomImage(img);
				// Update canvas size and reset view
				this.renderer.updateCanvasSize(img, this.state.scale);
				this.renderer.resetScrollPosition();
				// Redraw with new image
				this.renderer.redraw(
					this.state.currentRoomImage,
					this.state.nodes,
					this.state.selectedNode,
					this.state.currentRect,
					this.state.scale
				);
				resolve(img);
			};
			img.onerror = () => {
				console.error("Failed to load image:", imagePath);
				this.uiManager.showAlert(`Failed to load room image: ${imagePath}`);
				reject(new Error(`Failed to load image: ${imagePath}`));
			};
			img.src = imagePath;
		});
	}
	/**
	 * Save the current room data to file (new format)
	 */
	async saveCurrentRoom() {
		if (!this.state.currentRoomPath || !this.state.currentRoomData) {
			this.uiManager.showAlert('No room data to save!');
			return false;
		}
		try {
			// Get the current JSON text and parse it
			const jsonText = this.uiManager.getJsonText();
			const jsonData = JSON.parse(jsonText);
			// Validate schema before saving if enabled
			if (this.config.enableValidation) {
				const isValid = await this.validateSchema(jsonData, this.state.currentRoomPath);
				if (!isValid) {
					const proceed = confirm('Schema validation failed. Save anyway?');
					if (!proceed) return false;
				}
			}
			// Save to file
			const success = await window.api.saveJson(this.state.currentRoomPath, jsonData);
			if (success) {
				this.state.currentRoomData = jsonData;
				this.uiManager.showAlert('Saved successfully!');
				return true;
			} else {
				this.uiManager.showAlert('Save failed!');
				return false;
			}
		} catch (e) {
			this.uiManager.showAlert('JSON parse error: ' + e.message);
			return false;
		}
	}
	/**
	 * Navigate to a room by loading area starting room
	 * @param {string} areaCode - The area code to navigate to
	 */
	async navigateToArea(areaCode) {
		if (!this.state.workingDir) {
			this.uiManager.showAlert('Set working directory first!');
			return;
		}
		const roomPath = this.state.areaStartRooms[areaCode];
		if (!roomPath) {
			this.uiManager.showAlert(`Unknown area: ${areaCode}`);
			return;
		}
		const parts = roomPath.split('/');
		if (parts.length !== 3) {
			this.uiManager.showAlert(`Invalid room path format: ${roomPath}`);
			return;
		}
		const [area, subarea, roomName] = parts;
		return this.loadRoom(area, subarea, roomName);
	}
	/**
	 * Find a room file by searching all areas and subareas
	 * @param {string} roomName - The room name to search for
	 * @returns {Object|null} {area, subarea, roomName} if found, null otherwise
	 */
	async findRoomByName(roomName) {
		if (!this.state.workingDir) return null;
		// Search through region folder structure
		try {
			const regionPath = `${this.state.workingDir}/region`;
			const areas = await window.api.readDirectory(regionPath);
			for (const area of areas) {
				try {
					const areaPath = `${regionPath}/${area}`;
					const subareas = await window.api.readDirectory(areaPath);
					for (const subarea of subareas) {
						try {
							const subareaPath = `${areaPath}/${subarea}`;
							const files = await window.api.readDirectory(subareaPath);
							// Look for matching room file
							const fileName = roomName.replace(/\//g, '_') + '.json';
							if (files.includes(fileName)) {
								return {
									area,
									subarea,
									roomName
								};
							}
						} catch (subareaErr) {
							console.error(`Error reading subarea ${subarea}:`, subareaErr);
						}
					}
				} catch (areaErr) {
					console.error(`Error reading area ${area}:`, areaErr);
				}
			}
		} catch (regionErr) {
			console.error('Error reading region directory:', regionErr);
		}
		return null;
	}
	/**
	 * Navigate to a room by its name (searches all areas)
	 * @param {string} roomName - The room name to navigate to
	 */
	async navigateToRoom(roomName) {
		const found = await this.findRoomByName(roomName);
		if (!found) {
			this.uiManager.showAlert(`Room not found: ${roomName}`);
			return null;
		}
		return this.loadRoom(found.area, found.subarea, found.roomName);
	}
	/**
	 * Handle door connection navigation
	 * @param {Object} connection - Door connection object with target information
	 */
	async navigateThroughDoor(connection) {
		if (!connection || !connection.targetRoom) return;
		// If we have area/subarea info, use it directly
		if (connection.targetArea && connection.targetSubarea) {
			return this.loadRoom(connection.targetArea, connection.targetSubarea, connection.targetRoom);
		}
		// Otherwise, search for the room
		return this.navigateToRoom(connection.targetRoom);
	}
	/**
	 * Open the door editor for a specific door node
	 * @param {string} direction - Door direction
	 * @param {Object|null} connection - Existing connection data, if any  
	 * @param {Object} roomData - Current room data
	 */
	openDoorEditor(direction, connection, roomData) {
		// Find the corresponding door node in the current room data
		const doorNode = this.findDoorNodeByDirection(direction);
		// Convert to format expected by door editor
		const editorData = {
			dir: direction,
			sector: this.state.currentArea,
			region: this.state.currentSubarea,
			roomName: roomData.name || 'Unknown Room',
			connection: connection,
			doorNode: doorNode
		};
		console.log('Opening door editor with data:', editorData);
		window.api.openDoorEditor(editorData);
	}
	/**
	 * Find door node that corresponds to a given direction
	 * @param {string} direction - Door direction
	 * @returns {Object|null} Door node if found
	 */
	findDoorNodeByDirection(direction) {
		if (!this.state.currentRoomData?.nodes) {
			return null;
		}
		const expectedName = formatDirection(direction);
		// Find the first node that is a door and whose name includes the expected direction name
		const doorNode = this.state.currentRoomData.nodes.find(node =>
			node.nodeType === 'door' && node.name.includes(expectedName)
		) || null;
		return doorNode;
	}
	/**
	 * Update door connection data
	 * @param {string} direction - Door direction
	 * @param {Object} connectionData - New connection data
	 */
	async updateDoorConnection(direction, connectionData) {
		this.uiManager.updateJsonDisplay(this.state.currentRoomData);
		await this.uiManager.updateDoorButtons(this.state.currentRoomData);
	}
	/**
	 * Handle Door Updates
	 */
	async handleDoorUpdate(payload) {}
	/**
	 * Handle Room Properties Editor Updates
	 */
	async handleRoomPropertiesUpdate(payload) {
		//console.log(`Payload update: ${payload}`);
		this.state.currentRoomData = payload;
		this.uiManager.updateJsonDisplay(this.state.currentRoomData);
	}
}