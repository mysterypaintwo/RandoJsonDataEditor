/**
 * UI Manager - Handles all user interface updates and interactions
 * Manages tooltips, JSON display, door buttons, and tool states
 */
import {
    updateToolButtonStates,
    showTooltip,
    hideTooltip,
    highlightNodeInJSON
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
     */
    promptRename(title, defaultValue) {
        if (document.querySelector('.modal-overlay')) {
            return Promise.resolve(null);
        }

        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.cssText = `
				position: fixed; top: 0; left: 0; right: 0; bottom: 0;
				background: rgba(0,0,0,0.5); display: flex;
				align-items: center; justify-content: center; z-index: 10000;
			`;

            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.cssText = `
				background: white; padding: 20px; border-radius: 8px;
				min-width: 300px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
			`;

            const titleEl = document.createElement('div');
            titleEl.textContent = title;
            titleEl.style.cssText = `margin-bottom: 12px; font-weight: bold; font-size: 16px;`;

            const input = document.createElement('input');
            input.type = 'text';
            input.value = defaultValue;
            input.style.cssText = `
				width: 100%; padding: 8px; margin-bottom: 12px;
				border: 1px solid #ccc; border-radius: 4px;
				font-size: 14px; box-sizing: border-box;
			`;

            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `display: flex; gap: 8px; justify-content: flex-end;`;

            const ok = document.createElement('button');
            ok.textContent = 'OK';
            ok.style.cssText = `
				padding: 8px 16px; background: #4CAF50; color: white;
				border: none; border-radius: 4px; cursor: pointer;
			`;

            const cancel = document.createElement('button');
            cancel.textContent = 'Cancel';
            cancel.style.cssText = `
				padding: 8px 16px; background: #666; color: white;
				border: none; border-radius: 4px; cursor: pointer;
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

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    cleanup(input.value);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cleanup(null);
                }
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) cleanup(null);
            });

            buttonContainer.appendChild(cancel);
            buttonContainer.appendChild(ok);
            modal.appendChild(titleEl);
            modal.appendChild(input);
            modal.appendChild(buttonContainer);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            setTimeout(() => {
                input.focus();
                input.select();
            }, 0);
        });
    }

    updateJsonDisplay(jsonData) {
        if (jsonData) {
            this.jsonTextArea.value = JSON.stringify(jsonData, null, 2);
        }
    }

    highlightNodeInJSON(node, jsonData) {
        highlightNodeInJSON(this.jsonTextArea, node, jsonData);
    }

    updateTooltip(hoverNode, clientX, clientY) {
        if (hoverNode) {
            const text = hoverNode.name.replace(/\n/g, '<br>');
            showTooltip(this.tooltipDiv, text, clientX, clientY);
        } else {
            hideTooltip(this.tooltipDiv);
        }
    }

    updateActiveTool(toolId) {
        updateToolButtonStates(toolId);
    }

    updateWorkingDirectory(dirPath) {
        this.currentDirSpan.textContent = `Working Directory: ${dirPath}`;
    }

    /**
     * Update door buttons based on room data with new sub-room structure
     */
    async updateDoorButtons(roomData) {
        const container = document.getElementById('doorButtons');
        if (!container) return;

        // Clear existing buttons
        container.innerHTML = '';

        if (!roomData || !roomData.nodes) {
            container.innerHTML = '<div style="padding: 10px; color: #999; text-align: center;">No room loaded</div>';
            return;
        }

        // Add instructions header
        const instructions = document.createElement('div');
        instructions.style.cssText = `
			padding: 8px;
			margin-bottom: 8px;
			background: #e3f2fd;
			border-left: 3px solid #2196F3;
			font-size: 11px;
			line-height: 1.4;
			color: #333;
		`;
        instructions.innerHTML = `
			<strong>🖱️ Controls:</strong><br>
			<span style="margin-left: 4px;">Left-click: Navigate</span><br>
			<span style="margin-left: 4px;">Right-click: Edit properties</span>
		`;
        container.appendChild(instructions);

        // Get door nodes grouped by sub-room
        const doorNodes = roomData.nodes.filter(n => n.nodeType === 'door');
        const subRoomGroups = this.groupDoorsBySubRoom(doorNodes, roomData.name);

        // Get all door connections for the current room
        const doorConnections = await this.state.getDoorConnections();

        // Create buttons for each sub-room group
        for (const [subRoomName, doors] of Object.entries(subRoomGroups)) {
            this.createSubRoomSection(container, subRoomName, doors, doorConnections, roomData);
        }

        // Update items list
        this.updateItemsList(roomData);
    }

    /**
     * Update the items list display
     */
    updateItemsList(roomData) {
        const container = document.getElementById('itemsList');
        if (!container) return;

        container.innerHTML = '';

        if (!roomData || !roomData.nodes) {
            return;
        }

        // Get all item nodes
        const itemNodes = roomData.nodes.filter(n => n.nodeType === 'item');

        if (itemNodes.length === 0) {
            return; // CSS ::before will show "No items"
        }

        // Display each item - compact format
        itemNodes.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item-entry';

            // Combine name and type on one line
            const nameDiv = document.createElement('div');
            nameDiv.className = 'item-name';
            nameDiv.textContent = item.name || 'Unnamed Item';

            // Show type in parentheses after name
            if (item.nodeItem) {
                const typeSpan = document.createElement('span');
                typeSpan.className = 'item-type';
                typeSpan.textContent = ` (${item.nodeItem})`;
                nameDiv.appendChild(typeSpan);
            }

            itemDiv.appendChild(nameDiv);

            // Add note if present (on second line, smaller)
            if (item.note && item.note.trim()) {
                const noteDiv = document.createElement('div');
                noteDiv.className = 'item-note';
                noteDiv.textContent = item.note;
                itemDiv.appendChild(noteDiv);
            }

            container.appendChild(itemDiv);
        });
    }

    /**
     * Group door nodes by sub-room based on their names
     */
    groupDoorsBySubRoom(doorNodes, fullRoomName) {
        const groups = {};

        // Check if this is a composite room (contains " / ")
        const isComposite = fullRoomName.includes(' / ');

        if (!isComposite) {
            // Single room - all doors go in one group
            groups[fullRoomName] = doorNodes;
            return groups;
        }

        // Composite room - extract sub-room names from full name
        const subRoomNames = fullRoomName.split(' / ').map(n => n.trim());

        // Initialize groups
        subRoomNames.forEach(name => {
            groups[name] = [];
        });

        // Group doors by matching their name prefix
        doorNodes.forEach(door => {
            let assigned = false;

            for (const subRoomName of subRoomNames) {
                if (door.name.startsWith(subRoomName + ' - ')) {
                    groups[subRoomName].push(door);
                    assigned = true;
                    break;
                }
            }

            // If no match found, add to first group (shouldn't happen with new format)
            if (!assigned && subRoomNames.length > 0) {
                console.warn(`Door "${door.name}" doesn't match any sub-room, adding to first group`);
                groups[subRoomNames[0]].push(door);
            }
        });

        return groups;
    }

    /**
     * Create a section for a sub-room's doors
     */
    createSubRoomSection(container, subRoomName, doors, doorConnections, roomData) {
        // Create section container
        const section = document.createElement('div');
        section.className = 'door-section';
        section.style.cssText = `
			margin-bottom: 16px;
			padding: 10px;
			border: 2px solid #ccc;
			border-radius: 6px;
			background: #fff;
			box-shadow: 0 1px 3px rgba(0,0,0,0.1);
		`;

        // Section header
        const header = document.createElement('div');
        header.className = 'door-section-header';
        header.style.cssText = `
			font-weight: bold;
			font-size: 12px;
			margin-bottom: 10px;
			padding-bottom: 6px;
			border-bottom: 2px solid #ddd;
			color: #333;
		`;
        header.textContent = subRoomName;

        // Create expanded grid for door positions
        const grid = this.createDoorGrid(doors, doorConnections, roomData, subRoomName);

        section.appendChild(header);
        section.appendChild(grid);
        container.appendChild(section);
    }

    /**
     * Create an expanded grid for door positioning with all possible positions
     */
    createDoorGrid(doors, doorConnections, roomData, subRoomName) {
        const grid = document.createElement('div');
        grid.style.cssText = `
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			grid-template-rows: repeat(6, 1fr);
			gap: 3px;
			width: 100%;
		`;

        // Map positions to grid cells - CORRECTED ORDER
        // Row 0: Left-Top, Empty, Right-Top (vertical doors on horizontal walls, top position)
        // Row 1: Top-Left, Top, Top-Right (horizontal doors on vertical walls, top)
        // Row 2: Left, Empty, Right (horizontal doors, middle)
        // Row 3: Left-Lower, Empty, Right-Lower (horizontal doors, lower position)
        // Row 4: Bottom-Left, Bottom, Bottom-Right (horizontal doors on vertical walls, bottom)
        // Row 5: Left-Bottom, Empty, Right-Bottom (vertical doors on horizontal walls, bottom position)
        const positionMap = {
            'left-top': 0,
            // 1 is empty
            'right-top': 2,
            'top-left': 3,
            'top': 4,
            'top-right': 5,
            'left': 6,
            // 7 is empty
            'right': 8,
            'left-lower': 9,
            // 10 is empty
            'right-lower': 11,
            'bottom-left': 12,
            'bottom': 13,
            'bottom-right': 14,
            'left-bottom': 15,
            // 16 is empty
            'right-bottom': 17
        };

        // Empty cell positions
        const emptyCells = new Set([1, 7, 10, 16]);

        // Create empty cells array
        const cells = Array(18).fill(null);

        // Place doors in appropriate grid cells
        doors.forEach(door => {
            const position = this.getGridPosition(door.name);
            const cellIndex = positionMap[position];

            if (cellIndex !== undefined && !emptyCells.has(cellIndex)) {
                const button = this.createDoorButton(door, doorConnections, roomData, subRoomName);
                cells[cellIndex] = button;
            } else if (cellIndex === undefined) {
                console.warn(`Door "${door.name}" mapped to invalid position "${position}"`);
            }
        });

        // Add all cells to grid
        cells.forEach((cell, index) => {
            if (emptyCells.has(index)) {
                // Empty placeholder cell
                const placeholder = document.createElement('div');
                placeholder.style.cssText = `
					background: linear-gradient(135deg, #f9f9f9 25%, transparent 25%, transparent 75%, #f9f9f9 75%),
					            linear-gradient(135deg, #f9f9f9 25%, transparent 25%, transparent 75%, #f9f9f9 75%);
					background-size: 8px 8px;
					background-position: 0 0, 4px 4px;
					border: 1px dashed #e0e0e0;
					border-radius: 3px;
					min-height: 40px;
				`;
                grid.appendChild(placeholder);
            } else if (cell) {
                grid.appendChild(cell);
            } else {
                // Empty cell (no door at this position)
                const empty = document.createElement('div');
                empty.style.cssText = `
					background: #fafafa;
					border: 1px solid #f0f0f0;
					border-radius: 3px;
					min-height: 40px;
				`;
                grid.appendChild(empty);
            }
        });

        return grid;
    }

    /**
     * Extract grid position from door name
     */
    getGridPosition(doorName) {
        // Remove sub-room prefix if present and convert to lowercase
        const parts = doorName.split(' - ');
        const positionPart = (parts.length > 1 ? parts[parts.length - 1] : doorName).toLowerCase();

        // Map door names to grid positions
        // CRITICAL: Check compound positions in correct order (most specific first)

        // Top row variants
        if (positionPart.includes('top-left')) return 'top-left';
        if (positionPart.includes('top-right')) return 'top-right';

        // Bottom row variants  
        if (positionPart.includes('bottom-left')) return 'bottom-left';
        if (positionPart.includes('bottom-right')) return 'bottom-right';

        // Lower variants (horizontal doors on vertical walls)
        if (positionPart.includes('left-lower') || positionPart.includes('left lower')) return 'left-lower';
        if (positionPart.includes('right-lower') || positionPart.includes('right lower')) return 'right-lower';

        // Vertical door variants (doors on horizontal walls, but positioned left/right)
        if (positionPart.includes('left-top') || positionPart.includes('left top')) return 'left-top';
        if (positionPart.includes('right-top') || positionPart.includes('right top')) return 'right-top';
        if (positionPart.includes('left-bottom') || positionPart.includes('left bottom')) return 'left-bottom';
        if (positionPart.includes('right-bottom') || positionPart.includes('right bottom')) return 'right-bottom';

        // Simple positions (check these LAST to avoid false matches)
        if (positionPart.startsWith('top ') || positionPart === 'top door' || positionPart === 'top tunnel') return 'top';
        if (positionPart.startsWith('bottom ') || positionPart === 'bottom door' || positionPart === 'bottom tunnel') return 'bottom';
        if (positionPart.startsWith('left ') || positionPart === 'left door' || positionPart === 'left tunnel') return 'left';
        if (positionPart.startsWith('right ') || positionPart === 'right door' || positionPart === 'right tunnel') return 'right';

        // Default to right if unclear
        console.warn(`Unclear door position for: ${doorName}, defaulting to 'right'`);
        return 'right';
    }

    /**
     * Create a button for a door node
     */
    createDoorButton(door, doorConnections, roomData, subRoomName) {
        const button = document.createElement('button');
        button.className = 'door-btn';
        button.dataset.nodeId = door.id;

        // Extract abbreviated position text
        const abbrev = this.getAbbreviatedPosition(door.name);

        // Find connection for this door
        const connection = doorConnections[door.name];

        // Determine if this is a sub-room connection (same composite room, different sub-room)
        const isSubRoomConnection = connection &&
            connection.targetRoom === roomData.name &&
            connection.targetRoom.includes(' / ');

        // Check if connection is Forward (one-way) or Bidirectional
        const isOneWay = connection?.direction === 'Forward';

        // Choose icon based on connection type
        let icon;
        if (connection?.connectionType === 'Elevator') {
            icon = '🛗'; // Elevator
        } else if (connection?.connectionType === 'Toilet') {
            icon = '🌀'; // Turbo Tube
        } else if (connection?.connectionType === 'ConnectionBridge') {
            icon = '🌉'; // Connection Bridge
        } else if (isSubRoomConnection) {
            // Sub-room connection - check if it's a tunnel or door
            if (door.nodeSubType === 'passage') {
                icon = '🟣'; // Sub-room tunnel (purple circle)
            } else {
                icon = '🔗'; // Sub-room door
            }
        } else if (door.nodeSubType === 'passage') {
            icon = '🔵'; // Regular tunnel
        } else {
            icon = '🚪'; // Regular door
        }

        // Build button label
        let label = `${icon} ${abbrev}`;

        button.textContent = label;

        button.style.cssText = `
			padding: 4px;
			font-size: 10px;
			line-height: 1.3;
			white-space: pre-line;
			cursor: pointer;
			background: #f8f9fa;
			border: 1px solid #ddd;
			border-radius: 3px;
			min-height: 40px;
			transition: background 0.15s, border-color 0.15s;
		`;

        // Add one-way visual indicator
        if (isOneWay) {
            button.classList.add('door-btn-oneway');
        }

        // Build detailed tooltip
        let tooltip = 'No connection';
        if (connection) {
            tooltip = this.buildConnectionTooltip(connection, roomData, door);
            // Add direction info to tooltip
            if (isOneWay) {
                tooltip += ' [One-Way]';
            }
        }

        button.title = tooltip;

        // Style based on connection status
        if (connection) {
            if (isSubRoomConnection) {
                button.style.background = '#e3f2fd'; // Blue tint for sub-room connections
                button.style.borderColor = '#2196F3';
            } else {
                button.style.background = '#d4edda';
                button.style.borderColor = '#28a745';
            }
        } else {
            button.style.opacity = '0.5';
        }

        // Store connection data
        button._doorConnection = connection;
        button._doorNode = door;

        // Left-click: Navigate
        button.addEventListener('click', () => {
            if (connection) {
                this.state.roomManager?.navigateThroughDoor(connection);
            }
        });

        // Right-click: Open editor
        button.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.state.currentRoomData) {
                this.state.roomManager?.openDoorEditor(
                    door.doorOrientation,
                    connection,
                    this.state.currentRoomData
                );
            }
        });

        // Subtle hover effect
        button.addEventListener('mouseenter', () => {
            if (connection) {
                if (isSubRoomConnection) {
                    button.style.background = '#bbdefb';
                } else {
                    button.style.background = '#c3e6cb';
                }
            }
        });

        button.addEventListener('mouseleave', () => {
            if (connection) {
                if (isSubRoomConnection) {
                    button.style.background = '#e3f2fd';
                } else {
                    button.style.background = '#d4edda';
                }
            }
        });

        return button;
    }

    /**
     * Build a detailed tooltip for a door connection
     */
    buildConnectionTooltip(connection, roomData, door) {
        // Get target node from connection - always use the node that's NOT from current room ID and node ID
        const sourceNodeData = connection.nodes?.[0];
        const targetNodeData = connection.nodes?.[1];

        // Determine which node is actually the target (not matching current door's room and node ID)
        let actualTargetNode = targetNodeData;
        if (targetNodeData && targetNodeData.roomid === roomData.id && targetNodeData.nodeid === door.id) {
            // Second node is the current door, so first is the target
            actualTargetNode = sourceNodeData;
        } else if (sourceNodeData && sourceNodeData.roomid === roomData.id && sourceNodeData.nodeid === door.id) {
            // First node is the current door, so second is the target
            actualTargetNode = targetNodeData;
        }

        if (!actualTargetNode) {
            return 'Connection data incomplete';
        }

        // Extract target room name - check if it's a composite room
        const targetRoomParts = connection.targetRoom.split(' / ');
        const isTargetComposite = targetRoomParts.length > 1;

        let targetDisplay;

        // For composite room targets, extract the specific sub-room from node name
        if (isTargetComposite) {
            const targetNodeName = actualTargetNode.nodeName || '';

            // Extract sub-room name from node name (format: "SubRoom - Position Door")
            let targetSubRoom = null;
            const nodeNameParts = targetNodeName.split(' - ');
            if (nodeNameParts.length > 1) {
                // First part is the sub-room name
                targetSubRoom = nodeNameParts[0];
            }

            if (targetSubRoom) {
                targetDisplay = `[Sub-Room] ${targetSubRoom}`;
            } else {
                // Fallback: show full composite name
                targetDisplay = connection.targetRoom;
            }
        } else {
            // Simple room - just show the room name
            targetDisplay = connection.targetRoom;
        }

        // Determine door/tunnel type from connection type
        let targetType = 'Door';
        if (connection.connectionType) {
            if (connection.connectionType.includes('Tunnel')) {
                targetType = 'Tunnel';
            } else if (connection.connectionType === 'Elevator') {
                targetType = 'Elevator';
            } else if (connection.connectionType === 'ConnectionBridge') {
                targetType = 'Connection Bridge';
            } else if (connection.connectionType === 'Toilet') {
                targetType = 'Turbo Tube';
            }
        }

        // Get TARGET position - convert from the target node's actual position and name
        const targetPosition = this.getDisplayPositionFromNode(actualTargetNode, connection.connectionType);

        return `Connected to: ${targetDisplay} (${targetPosition} ${targetType})`;
    }

    /**
     * Get display position from a connection node, handling horizontal/vertical door conversions
     */
    getDisplayPositionFromNode(node, connectionType) {
        if (!node || !node.nodeName) return 'Unknown';

        const nodeName = node.nodeName;

        // For all connection types, extract position from the node name itself
        return this.extractPositionFromNodeName(nodeName);
    }

    /**
     * Extract and format position text from node name
     */
    extractPositionFromNodeName(nodeName) {
        // Remove sub-room prefix if present
        const parts = nodeName.split(' - ');
        const positionPart = parts.length > 1 ? parts[parts.length - 1] : nodeName;

        // Remove " Door" or " Tunnel" suffix
        let position = positionPart.replace(/\s+(Door|Tunnel)$/i, '');

        // Capitalize each word and join with hyphens
        return position.split(/[\s-]+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('-');
    }

    /**
     * Capitalize position for display
     */
    capitalizePosition(position) {
        return position.charAt(0).toUpperCase() + position.slice(1);
    }

    /**
     * Get abbreviated position text for compact display
     */
    getAbbreviatedPosition(fullName) {
        const parts = fullName.split(' - ');
        const positionPart = parts.length > 1 ? parts[parts.length - 1] : fullName;

        // Remove "Door" or "Tunnel" suffix
        let position = positionPart.replace(/\s+(Door|Tunnel)$/i, '');

        // Abbreviate common words
        position = position
            .replace('Top-Left', 'TL')
            .replace('Top-Right', 'TR')
            .replace('Bottom-Left', 'BL')
            .replace('Bottom-Right', 'BR')
            .replace('Left-Lower', 'LL')
            .replace('Right-Lower', 'RL')
            .replace('Left-Top', 'LT')
            .replace('Right-Top', 'RT')
            .replace('Left-Bottom', 'LB')
            .replace('Right-Bottom', 'RB')
            .replace('Top', 'T')
            .replace('Bottom', 'B')
            .replace('Left', 'L')
            .replace('Right', 'R');

        return position;
    }

    showAlert(message) {
        alert(message);
    }

    getJsonText() {
        return this.jsonTextArea.value;
    }

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