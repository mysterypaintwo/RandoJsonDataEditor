/**
 * UI Manager - Handles all user interface updates and interactions
 * Manages tooltips, JSON display, door buttons, and tool states
 */
import {
	updateToolButtonStates,
	showTooltip,
	hideTooltip,
	highlightNodeInJSON,
	normalizeUiDirForKeys,
	formatDirection,
	connectionContainsDirection
} from '../core/utils.js';
export class UIManager {
	constructor(state) {
		this.tooltipDiv = document.getElementById("tooltip");
		this.jsonTextArea = document.getElementById("jsonTextArea");
		this.currentDirSpan = document.getElementById('currentDir');
		this.state = state;
	}
	/**
	 * Display a modal prompt allowing the user to rename an item
	 * Returns the entered string, or null if the prompt is cancelled
	 * @param {string} title - Title text displayed in the prompt
	 * @param {string} defaultValue - Initial value shown in the input field
	 * @returns {Promise<string|null>} User-entered value or null if cancelled
	 */
	/**
	 * Display a modal prompt allowing the user to rename an item
	 * Returns the entered string, or null if the prompt is cancelled
	 * @param {string} title - Title text displayed in the prompt
	 * @param {string} defaultValue - Initial value shown in the input field
	 * @returns {Promise<string|null>} User-entered value or null if cancelled
	 */
	promptRename(title, defaultValue) {
		// Prevent multiple modals
		if (document.querySelector('.modal-overlay')) {
			return Promise.resolve(null);
		}

		return new Promise(resolve => {
			const overlay = document.createElement('div');
			overlay.className = 'modal-overlay';
			overlay.style.cssText = `
				position: fixed;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				background: rgba(0,0,0,0.5);
				display: flex;
				align-items: center;
				justify-content: center;
				z-index: 10000;
			`;

			const modal = document.createElement('div');
			modal.className = 'modal';
			modal.style.cssText = `
				background: white;
				padding: 20px;
				border-radius: 8px;
				min-width: 300px;
				box-shadow: 0 4px 6px rgba(0,0,0,0.1);
			`;

			const titleEl = document.createElement('div');
			titleEl.textContent = title;
			titleEl.style.cssText = `
				margin-bottom: 12px;
				font-weight: bold;
				font-size: 16px;
			`;

			const input = document.createElement('input');
			input.type = 'text';
			input.value = defaultValue;
			input.style.cssText = `
				width: 100%;
				padding: 8px;
				margin-bottom: 12px;
				border: 1px solid #ccc;
				border-radius: 4px;
				font-size: 14px;
				box-sizing: border-box;
			`;

			const buttonContainer = document.createElement('div');
			buttonContainer.style.cssText = `
				display: flex;
				gap: 8px;
				justify-content: flex-end;
			`;

			const ok = document.createElement('button');
			ok.textContent = 'OK';
			ok.style.cssText = `
				padding: 8px 16px;
				background: #4CAF50;
				color: white;
				border: none;
				border-radius: 4px;
				cursor: pointer;
			`;

			const cancel = document.createElement('button');
			cancel.textContent = 'Cancel';
			cancel.style.cssText = `
				padding: 8px 16px;
				background: #666;
				color: white;
				border: none;
				border-radius: 4px;
				cursor: pointer;
			`;

			let resolved = false;

			function cleanup(value) {
				if (resolved) return;
				resolved = true;
				if (document.body.contains(overlay)) {
					document.body.removeChild(overlay);
				}
				resolve(value);
			}

			ok.onclick = () => cleanup(input.value);
			cancel.onclick = () => cleanup(null);

			// Keyboard handlers
			input.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					cleanup(input.value);
				} else if (e.key === 'Escape') {
					e.preventDefault();
					cleanup(null);
				}
			});

			// Close on overlay click
			overlay.addEventListener('click', (e) => {
				if (e.target === overlay) {
					cleanup(null);
				}
			});

			buttonContainer.appendChild(cancel);
			buttonContainer.appendChild(ok);
			modal.appendChild(titleEl);
			modal.appendChild(input);
			modal.appendChild(buttonContainer);
			overlay.appendChild(modal);
			document.body.appendChild(overlay);

			// Focus and select text after a brief delay
			setTimeout(() => {
				input.focus();
				input.select();
			}, 0);
		});
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
			const text = hoverNode.name.replace(/\n/g, '<br>');
			showTooltip(this.tooltipDiv, text, clientX, clientY);
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

		// Retrieve all door connections for the current room
		const doorConnections = await this.state.getDoorConnections();

		document.querySelectorAll('.door-btn').forEach(btn => {
			// UI-facing direction identifier from the button
			const dir = btn.dataset.dir;

			// Normalize and format the direction to match door connection key naming
			const formattedDir = formatDirection(normalizeUiDirForKeys(dir));
			const formatted = formattedDir.toLowerCase();

			// Attempt to locate a matching door connection key using increasingly
			// permissive matching rules to avoid false positives (e.g. "East" vs "North-East")

			// 1) Exact leading match (e.g. "East Door", "East Morph Ball Hole")
			let matchingKey = Object.keys(doorConnections).find(key =>
				key.toLowerCase().startsWith(formatted + ' ')
			);

			// 2) Hyphenated directional match (e.g. "North-East Door")
			if (!matchingKey) {
				matchingKey = Object.keys(doorConnections).find(key =>
					key.toLowerCase().startsWith(formatted + '-')
				);
			}

			// 3) Final fallback: legacy substring match
			if (!matchingKey) {
				matchingKey = Object.keys(doorConnections).find(key =>
					key.toLowerCase().includes(formatted)
				);
			}

			// Determine whether the matched connection represents a Morph Ball hole
			const isMorphBall =
				matchingKey?.toLowerCase().includes('morph ball hole') || false;

			// Construct the expected connection key name based on direction and type
			const expectedName =
				formattedDir + (isMorphBall ? ' Morph Ball Hole' : ' Door');

			// Attempt to resolve the connection directly from the pre-fetched map
			let connection = doorConnections[expectedName] || null;

			// Fallback: derive connection data from room metadata if no direct match exists
			if (!connection && roomData.connections) {
				const match = roomData.connections.find(conn =>
					connectionContainsDirection(conn.connectionType || '', dir)
				);

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

			// Update button visual state based on whether a valid connection exists
			btn.classList.toggle('active', !!connection);

			// Cache the resolved door connection on the button for later use
			btn._doorConnection = connection;

			// console.log(`Door ${dir}: active=${!!connection}`, connection);
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