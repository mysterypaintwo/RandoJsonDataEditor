/**
 * UI Manager - Handles all user interface updates and interactions
 * Manages tooltips, JSON display, door buttons, and tool states
 */

import {
	updateToolButtonStates,
	showTooltip,
	hideTooltip,
	highlightNodeInJSON,
	formatOriginalDoorName,
	connectionContainsDirection
} from './utils.js';

export class UIManager {
	constructor(state) {
		this.tooltipDiv = document.getElementById("tooltip");
		this.jsonTextArea = document.getElementById("jsonTextArea");
		this.currentDirSpan = document.getElementById('currentDir');
		this.state = state;
	}

	/**
	 * Update the JSON textarea with formatted data
	 * @param {Object} jsonData - The JSON data to display
	 */
	updateJsonDisplay(jsonData) {
		if (jsonData) {
			this.jsonTextArea.value = JSON.stringify(jsonData, null, 2);
		}
	}

	/**
	 * Highlight a specific node in the JSON textarea
	 * @param {Object} node - The node to highlight
	 * @param {Object} jsonData - The complete JSON data
	 */
	highlightNodeInJSON(node, jsonData) {
		highlightNodeInJSON(this.jsonTextArea, node, jsonData);
	}

	/**
	 * Update the tooltip display
	 * @param {Object|null} hoverNode - Node being hovered, if any
	 * @param {number} clientX - Mouse client X position
	 * @param {number} clientY - Mouse client Y position
	 */
	updateTooltip(hoverNode, clientX, clientY) {
		if (hoverNode) {
			showTooltip(this.tooltipDiv, hoverNode.name, clientX, clientY);
		} else {
			hideTooltip(this.tooltipDiv);
		}
	}

	/**
	 * Update the active tool button styling
	 * @param {string} toolId - ID of the active tool button
	 */
	updateActiveTool(toolId) {
		updateToolButtonStates(toolId);
	}

	/**
	 * Update the working directory display
	 * @param {string} dirPath - Path to the working directory
	 */
	updateWorkingDirectory(dirPath) {
		this.currentDirSpan.textContent = `Working Directory: ${dirPath}`;
	}

	/**
	 * Update door buttons based on room data
	 * @param {Object} roomData - The room JSON data
	 */
	async updateDoorButtons(roomData) {
		if (!roomData) {
			document.querySelectorAll('.door-btn').forEach(btn => {
				btn.classList.remove('active');
				btn._doorConnection = null;
			});
			return;
		}

		// Pre-fetch all door connections for the room
		const doorConnections = await this.state.getDoorConnections();

		document.querySelectorAll('.door-btn').forEach(btn => {
			const dir = btn.dataset.dir;
			const expectedName = formatOriginalDoorName(dir, false);

			// Try to get connection directly by node name
			let connection = doorConnections[expectedName] || null;

			// If no connection, fallback: see if any roomData.connection matches direction
			if (!connection && roomData.connections) {
				const match = roomData.connections.find(conn => connectionContainsDirection(conn.connectionType || '', dir));
				if (match) {
					connection = {
						targetRoom: match.targetNode?.roomName,
						targetArea: match.targetNode?.area,
						targetSubarea: match.targetNode?.subarea,
						connectionType: match.connectionType,
						direction: match.targetNode?.position
					};
				}
			}

			// Update active state
			btn.classList.toggle('active', !!connection);

			// Store the connection (not node)
			btn._doorConnection = connection;

			console.log(`Door ${dir}: active=${!!connection}, connection:`, connection);
		});
	}

	/**
	 * Show an alert message
	 * @param {string} message - The message to display
	 */
	showAlert(message) {
		alert(message);
	}

	/**
	 * Get the current JSON text from the textarea
	 * @returns {string} The JSON text
	 */
	getJsonText() {
		return this.jsonTextArea.value;
	}

	/**
	 * Set up JSON textarea event listeners
	 * @param {Function} onJsonChange - Callback when JSON content changes
	 */
	setupJsonEditor(onJsonChange) {
		this.jsonTextArea.addEventListener("input", () => {
			try {
				const parsed = JSON.parse(this.jsonTextArea.value);
				onJsonChange(parsed);
			} catch (err) {
				// Invalid JSON - ignore until valid
			}
		});
	}
}