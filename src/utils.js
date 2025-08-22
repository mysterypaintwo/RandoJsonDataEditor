/**
 * Utility functions for the room editor
 * Updated for new JSON format and file structure
 */

/**
 * Checks if a connection type string contains the given directional keyword
 * (case-insensitive).
 */
export function connectionContainsDirection(connectionType, direction) {
	return connectionType.toLowerCase().includes(direction.toLowerCase());
}

/**
 * Formats a door name preserving the original direction terminology
 * @param {string} originalDirection - direction string (like "northwest")
 * @param {boolean} isMorphBall - true if morph ball door
 * @returns {string} formatted door name (like "North-West Door")
 */
export function formatDirection(originalDirection) {
	const map = {
		up: "North",
		down: "South",
		right: "East",
		left: "West",
		north: "North",
		south: "South",
		east: "East",
		west: "West",
		northwest: "North-West",
		westnorth: "West-North",
		northeast: "North-East",
		eastnorth: "East-North",
		southwest: "South-West",
		westsouth: "West-South",
		southeast: "South-East",
		eastsouth: "East-South",
		westupper: "West-Upper",
		eastupper: "East-Upper",
	};

	const directionName = map[originalDirection.toLowerCase()] ||
		(originalDirection.charAt(0).toUpperCase() + originalDirection.slice(1));

	return directionName;
}

/**
 * Parse room path in new format: area/subarea/roomName
 * @param {string} roomPath - Room path string
 * @returns {Object} Parsed path components
 */
export function parseRoomPath(roomPath) {
	const parts = roomPath.split('/');
	if (parts.length !== 3) {
		throw new Error(`Invalid room path format: ${roomPath}. Expected: area/subarea/roomName`);
	}

	return {
		area: parts[0],
		subarea: parts[1],
		roomName: parts[2]
	};
}

/**
 * Convert room name to filename (replace / with _)
 * @param {string} roomName - Room name with potential / characters
 * @returns {string} Safe filename
 */
export function roomNameToFileName(roomName) {
	return roomName.replace(/\//g, '_');
}

/**
 * Convert filename back to room name (replace _ with /)
 * @param {string} fileName - Filename without .json extension
 * @returns {string} Room name with / characters restored
 */
export function fileNameToRoomName(fileName) {
	return fileName.replace(/_/g, '/');
}

/**
 * Get mouse position relative to canvas, accounting for scroll and scale
 * @param {MouseEvent} e - Mouse event
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {HTMLElement} container - Scrollable container
 * @param {number} scale - Current zoom scale
 * @returns {Object} {x, y} coordinates
 */
export function getMousePos(e, canvas, container, scale) {
    const rect = canvas.getBoundingClientRect();

    // Mouse position relative to the canvas element (CSS pixels)
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;

    // Convert to image-pixel coordinates
    const x = cssX / scale;
    const y = cssY / scale;

    return { x, y };
}

/**
 * Check if point is in resize corner of a node
 * @param {Object} node - Node with x, y, w, h properties
 * @param {number} x - Mouse X coordinate
 * @param {number} y - Mouse Y coordinate
 * @returns {boolean} True if in resize corner
 */
export function isInResizeCorner(node, x, y) {
	const cornerSize = 10;
	return (
		x >= node.x + node.w - cornerSize &&
		x <= node.x + node.w &&
		y >= node.y + node.h - cornerSize &&
		y <= node.y + node.h
	);
}

/**
 * Find node at given position
 * @param {Array} nodes - Array of nodes
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {Object|null} Node at position or null
 */
export function findNodeAtPosition(nodes, x, y) {
	// Search in reverse order to find topmost node
	for (let i = nodes.length - 1; i >= 0; i--) {
		const node = nodes[i];
		if (
			x >= node.x &&
			x <= node.x + node.w &&
			y >= node.y &&
			y <= node.y + node.h
		) {
			return node;
		}
	}
	return null;
}

/**
 * Get appropriate cursor style based on mode and hover state
 * @param {string} mode - Current tool mode
 * @param {Object|null} hoverNode - Node being hovered
 * @param {boolean} isResizeCorner - Whether hovering over resize corner
 * @param {boolean} isMoving - Whether currently moving a node
 * @returns {string} CSS cursor style
 */
export function getCursorStyle(mode, hoverNode, isResizeCorner, isMoving) {
	if (isMoving) return 'grabbing';

	switch (mode) {
		case 'draw':
			return 'crosshair';
		case 'select':
			return hoverNode ? 'pointer' : 'default';
		case 'move':
			return hoverNode ? 'grab' : 'default';
		case 'resize':
			return isResizeCorner ? 'nw-resize' : 'default';
		default:
			return 'default';
	}
}

/**
 * Snap coordinate to 8px grid
 * @param {number} coord - Coordinate to snap
 * @returns {number} Snapped coordinate
 */
export function snapToGrid(coord) {
	return Math.round(coord / 8) * 8;
}

/**
 * Clamp value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

/**
 * Normalize and snap rectangle to grid
 * @param {Object} rect - Rectangle with x, y, w, h
 * @returns {Object} Normalized rectangle
 */
export function snapRectToGrid(rect) {
	const x1 = Math.min(rect.x, rect.x + rect.w);
	const y1 = Math.min(rect.y, rect.y + rect.h);
	const x2 = Math.max(rect.x, rect.x + rect.w);
	const y2 = Math.max(rect.y, rect.y + rect.h);

	return {
		x: snapToGrid(x1),
		y: snapToGrid(y1),
		w: snapToGrid(x2 - x1),
		h: snapToGrid(y2 - y1)
	};
}

/**
 * Constrain rectangle to bounds
 * @param {Object} rect - Rectangle to constrain
 * @param {number} maxWidth - Maximum width bound
 * @param {number} maxHeight - Maximum height bound
 * @returns {Object} Constrained rectangle
 */
export function constrainRectToBounds(rect, maxWidth, maxHeight) {
	return {
		x: clamp(rect.x, 0, maxWidth - Math.abs(rect.w)),
		y: clamp(rect.y, 0, maxHeight - Math.abs(rect.h)),
		w: Math.min(Math.abs(rect.w), maxWidth - rect.x),
		h: Math.min(Math.abs(rect.h), maxHeight - rect.y)
	};
}

/**
 * Update tool button states
 * @param {string} activeToolId - ID of active tool button
 */
export function updateToolButtonStates(activeToolId) {
	document.querySelectorAll('.tool-btn').forEach(btn => {
		btn.classList.remove('active');
	});

	const activeBtn = document.getElementById(activeToolId);
	if (activeBtn) {
		activeBtn.classList.add('active');
	}
}

/**
 * Show tooltip at position
 * @param {HTMLElement} tooltip - Tooltip element
 * @param {string} text - Tooltip text
 * @param {number} x - X position
 * @param {number} y - Y position
 */
export function showTooltip(tooltip, text, x, y) {
	tooltip.textContent = text;
	tooltip.style.left = x + 10 + 'px';
	tooltip.style.top = y - 30 + 'px';
	tooltip.style.display = 'block';
}

/**
 * Hide tooltip
 * @param {HTMLElement} tooltip - Tooltip element
 */
export function hideTooltip(tooltip) {
	tooltip.style.display = 'none';
}

/**
 * Highlight a node in the JSON textarea
 * @param {HTMLTextAreaElement} textarea - JSON textarea
 * @param {Object} node - Node to highlight
 * @param {Object} jsonData - Complete JSON data
 */
export function highlightNodeInJSON(textarea, node, jsonData) {
	if (!node || !jsonData || !jsonData.nodes) return;

	const jsonText = textarea.value;
	const nodeIndex = jsonData.nodes.findIndex(n => n.id === node.id);

	if (nodeIndex === -1) return;

	// Find the node in the JSON text
	const nodePattern = new RegExp(`"id":\\s*${node.id}`, 'g');
	const match = nodePattern.exec(jsonText);

	if (match) {
		textarea.focus();
		textarea.setSelectionRange(match.index, match.index + match[0].length);
		textarea.scrollTop = textarea.scrollHeight * (match.index / jsonText.length);
	}
}

/**
 * Generate connection description from room and node data
 * @param {string} connectionType - Type of connection
 * @param {Object} sourceRoom - Source room info
 * @param {Object} targetRoom - Target room info
 * @returns {string} Generated description
 */
export function generateConnectionDescription(connectionType, sourceRoom, targetRoom) {
	const typeText = connectionType.replace(/([A-Z])/g, ' $1').trim();
	return `${typeText} connection between ${sourceRoom.roomName} and ${targetRoom.roomName}`;
}

/**
 * Validate connection data structure
 * @param {Object} connectionData - Connection data to validate
 * @returns {Object} {valid: boolean, errors: string[]}
 */
export function validateConnectionData(connectionData) {
	const errors = [];

	if (!connectionData) {
		return {
			valid: true,
			errors: []
		}; // null connection is valid (removal)
	}

	if (!connectionData.connectionType) {
		errors.push('Connection type is required');
	}

	if (!connectionData.targetNode) {
		errors.push('Target node is required');
	} else {
		const target = connectionData.targetNode;
		if (!target.area) errors.push('Target area is required');
		if (!target.subarea) errors.push('Target subarea is required');
		if (!target.roomName) errors.push('Target room name is required');
		if (!target.nodeid) errors.push('Target node ID is required');
		if (!target.nodeName) errors.push('Target node name is required');
		if (!target.position) errors.push('Target position is required');
	}

	return {
		valid: errors.length === 0,
		errors
	};
}