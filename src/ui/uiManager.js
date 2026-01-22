/**
 * UI Manager - Handles all UI updates and user interactions
 */
export class UIManager {
	constructor(state) {
		this.state = state;
		this.jsonTextArea = document.getElementById('jsonTextArea');
		this.tooltip = document.getElementById('tooltip');
		this.currentDirSpan = document.getElementById('currentDir');
		this.setupMergeButton();
	}

	/* ============================================================
	 * TOOLBAR / MODE UI (NEW)
	 * ============================================================ */

	setupMergeButton() {
		const toolbar = document.getElementById('toolbar');
		const resizeBtn = document.getElementById('resizeModeBtn');

		const mergeBtn = document.createElement('button');
		mergeBtn.id = 'mergeNodesBtn';
		mergeBtn.className = 'tool-btn';
		mergeBtn.textContent = '🔗 Merge Nodes (Ctrl+M)';
		mergeBtn.style.marginLeft = '20px';
		mergeBtn.style.background = '#FF9800';
		mergeBtn.style.color = 'white';

		mergeBtn.addEventListener('click', () => this.triggerMergeNodes());

		if (resizeBtn && resizeBtn.nextSibling) {
			toolbar.insertBefore(mergeBtn, resizeBtn.nextSibling);
		} else {
			toolbar.appendChild(mergeBtn);
		}

		const modeIndicator = document.createElement('span');
		modeIndicator.id = 'drawModeIndicator';
		modeIndicator.style.cssText = `
			margin-left: 20px;
			padding: 5px 10px;
			display: none;
			background: #2196F3;
			color: white;
			border-radius: 4px;
			font-size: 12px;
			font-weight: bold;
		`;
		toolbar.appendChild(modeIndicator);

		const selectHint = document.createElement('span');
		selectHint.id = 'selectHint';
		selectHint.style.cssText = `
			margin-left: 20px;
			padding: 5px 10px;
			display: none;
			background: #4CAF50;
			color: white;
			border-radius: 4px;
			font-size: 11px;
		`;
		selectHint.textContent = 'Ctrl+Click for multi-select';
		toolbar.appendChild(selectHint);
	}

	triggerMergeNodes() {
		document.dispatchEvent(new KeyboardEvent('keydown', {
			key: 'm',
			ctrlKey: true,
			bubbles: true
		}));
	}

	updateDrawModeIndicator(isTriangleMode) {
		const indicator = document.getElementById('drawModeIndicator');
		if (!indicator) return;

		indicator.textContent = isTriangleMode
			? '▲ Triangle Mode (Press T for Rectangle)'
			: '▢ Rectangle Mode (Press T for Triangle)';
		indicator.style.display = 'inline-block';
	}

	updateModeHints(mode) {
		const drawIndicator = document.getElementById('drawModeIndicator');
		const selectHint = document.getElementById('selectHint');

		if (drawIndicator)
			drawIndicator.style.display = mode === 'draw' ? 'inline-block' : 'none';

		if (selectHint)
			selectHint.style.display = (mode === 'select' || mode === 'move') ? 'inline-block' : 'none';
	}

	updateActiveTool(toolId) {
		document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
		document.getElementById(toolId)?.classList.add('active');

		const mode = toolId.replace('ModeBtn', '');
		this.updateModeHints(mode);

		if (mode === 'draw') {
			this.updateDrawModeIndicator(this.state.triangleDrawMode || false);
		}
	}

	/* ============================================================
	 * JSON / TOOLTIP
	 * ============================================================ */

	updateJsonDisplay(data) {
		if (this.jsonTextArea && data) {
			this.jsonTextArea.value = JSON.stringify(data, null, 2);
		}
	}

	getJsonText() {
		return this.jsonTextArea?.value || '';
	}

	setupJsonEditor(onUpdate) {
		if (!this.jsonTextArea) return;

		let timeout;
		this.jsonTextArea.addEventListener('input', () => {
			clearTimeout(timeout);
			timeout = setTimeout(() => {
				try {
					onUpdate(JSON.parse(this.jsonTextArea.value));
				} catch { }
			}, 500);
		});
	}

	highlightNodeInJSON(node) {
		if (!node || !this.jsonTextArea) return;

		const text = this.jsonTextArea.value;
		const match = new RegExp(`"id":\\s*${node.id}`).exec(text);
		if (match) {
			this.jsonTextArea.focus();
			this.jsonTextArea.setSelectionRange(match.index, match.index + match[0].length);
		}
	}

	updateTooltip(node, x, y) {
		if (!this.tooltip) return;

		if (node) {
			this.tooltip.innerHTML = `${node.name}`.replace(/\n/g, '<br>');
			this.tooltip.style.cssText = `
				position: fixed;
				display: block;
				left: ${x + 10}px;
				top: ${y - 30}px;
				background: #222;
				color: #fff;
				padding: 4px 8px;
				border-radius: 4px;
				font-size: 12px;
				pointer-events: none;
				z-index: 10000;
			`;
		} else {
			this.tooltip.style.display = 'none';
		}
	}

	/* ============================================================
	 * WORKING DIRECTORY
	 * ============================================================ */

	updateWorkingDirectory(dir) {
		if (this.currentDirSpan) {
			this.currentDirSpan.textContent = `Working Directory: ${dir}`;
		}
	}

	/* ============================================================
	 * DOOR NAVIGATION PANEL (MERGED + RESTORED)
	 * ============================================================ */

	async updateDoorButtons(roomData) {
		const container = document.getElementById('doorButtons');
		if (!container) return;

		container.innerHTML = '';

		if (!roomData?.nodes) {
			container.innerHTML = '<div class="door-panel-empty">No room loaded</div>';
			return;
		}

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


		const doorNodes = roomData.nodes.filter(n => n.nodeType === 'door');
		const connections = await this.state.getDoorConnections();
		const groups = this.groupDoorsBySubRoom(doorNodes, roomData.name);

		for (const [subRoomName, doors] of Object.entries(groups)) {
			this.createSubRoomSection(container, subRoomName, doors, connections, roomData);
		}

		this.updateItemsList(roomData);
	}

	isCompositeRoom(name) {
		if (!name) return false;
		if (name === 'PYR-TRO Elevator / PYR Entrance Lobby') return false;
		return name.includes(' / ');
	}

	groupDoorsBySubRoom(doors, fullName) {
		if (!this.isCompositeRoom(fullName)) {
			return { [fullName]: doors };
		}

		const subRooms = fullName.split(' / ').map(s => s.trim());
		const groups = Object.fromEntries(subRooms.map(s => [s, []]));

		for (const door of doors) {
			const match = subRooms.find(sr => door.name.startsWith(sr + ' - '));
			(groups[match || subRooms[0]]).push(door);
		}

		return groups;
	}

createSubRoomSection(container, name, doors, connections, roomData) {
	const section = document.createElement('div');
	section.className = 'door-section';

	// RESTORED styling (was lost)
	section.style.cssText = `
		margin-bottom: 16px;
		padding: 10px;
		border: 2px solid #ccc;
		border-radius: 6px;
		background: #fff;
		box-shadow: 0 1px 3px rgba(0,0,0,0.1);
	`;

	const header = document.createElement('div');
	header.className = 'door-section-header';
	header.textContent = name;

	// RESTORED header styling
	header.style.cssText = `
		font-weight: bold;
		font-size: 12px;
		margin-bottom: 10px;
		padding-bottom: 6px;
		border-bottom: 2px solid #ddd;
		color: #333;
	`;

	section.appendChild(header);
	section.appendChild(this.createDoorGrid(doors, connections, roomData));
	container.appendChild(section);
}


createDoorGrid(doors, connections, roomData) {
	const grid = document.createElement('div');
	grid.style.cssText = `
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-rows: repeat(6, 1fr);
		gap: 3px;
		width: 100%;
	`;

	const positionMap = {
		'left-top': 0,
		'right-top': 2,
		'top-left': 3,
		'top': 4,
		'top-right': 5,
		'left': 6,
		'right': 8,
		'left-lower': 9,
		'right-lower': 11,
		'bottom-left': 12,
		'bottom': 13,
		'bottom-right': 14,
		'left-bottom': 15,
		'right-bottom': 17
	};

	const emptyCells = new Set([1, 7, 10, 16]);
	const cells = Array(18).fill(null);

	for (const door of doors) {
		const pos = this.getGridPosition(door.name);
		const idx = positionMap[pos];
		if (idx !== undefined && !emptyCells.has(idx)) {
			cells[idx] = this.createDoorButton(door, connections, roomData);
		}
	}

	cells.forEach((cell, idx) => {
		if (emptyCells.has(idx)) {
			const placeholder = document.createElement('div');
			placeholder.style.cssText = `
				border: 1px dashed #e0e0e0;
				border-radius: 3px;
				min-height: 40px;
			`;
			grid.appendChild(placeholder);
		} else if (cell) {
			grid.appendChild(cell);
		} else {
			const empty = document.createElement('div');
			empty.style.cssText = `
				border: 1px solid #f0f0f0;
				border-radius: 3px;
				min-height: 40px;
			`;
			grid.appendChild(empty);
		}
	});

	return grid;
}


getGridPosition(name) {
	const part = name.split(' - ').pop().toLowerCase();

	if (part.includes('top-left')) return 'top-left';
	if (part.includes('top-right')) return 'top-right';
	if (part.includes('bottom-left')) return 'bottom-left';
	if (part.includes('bottom-right')) return 'bottom-right';

	if (part.includes('left-lower')) return 'left-lower';
	if (part.includes('right-lower')) return 'right-lower';

	if (part.includes('left-top')) return 'left-top';
	if (part.includes('right-top')) return 'right-top';
	if (part.includes('left-bottom')) return 'left-bottom';
	if (part.includes('right-bottom')) return 'right-bottom';

	if (part.startsWith('top')) return 'top';
	if (part.startsWith('bottom')) return 'bottom';
	if (part.startsWith('left')) return 'left';
	if (part.startsWith('right')) return 'right';

	return 'right';
}


	createDoorButton(door, connections, roomData) {
		const btn = document.createElement('button');
		btn.className = 'door-btn';

btn.style.cssText = `
	padding: 4px;
	font-size: 10px;
	line-height: 1.3;
	white-space: pre-line;
	cursor: pointer;
	min-height: 40px;
	box-sizing: border-box;
`;


		const connection = connections[door.name];
		const abbrev = this.getAbbreviatedPosition(door.name);

		let icon = '🚪';
		if (connection?.connectionType === 'Elevator') icon = '🛗';
		else if (connection?.connectionType === 'Toilet') icon = '🌀';
		else if (connection?.connectionType === 'ConnectionBridge') icon = '🌉';
		else if (door.nodeSubType === 'passage') icon = '🔵';

		btn.textContent = `${icon} ${abbrev}`;

if (connection) {
	btn.classList.add('door-connected');

	// Forward vs bidirectional
	if (connection.direction === 'Forward') {
		btn.classList.add('door-btn-oneway');
	} else {
		btn.classList.add('door-btn-bidirectional');
	}

	// Sub-room connections (same composite room)
	if (
		this.isCompositeRoom(roomData.name) &&
		connection.targetRoom === roomData.name
	) {
		btn.classList.add('door-subroom');
	}

	// Tunnel vs door
	if (door.nodeSubType === 'passage') {
		btn.classList.add('door-passage');
	}

	btn.title = this.buildConnectionTooltip(connection, roomData, door);

	btn.onclick = () =>
		this.state.roomManager?.navigateThroughDoor(connection);

	btn.oncontextmenu = e => {
		e.preventDefault();
		this.state.roomManager?.openDoorEditor(
			door.doorOrientation,
			connection,
			roomData
		);
	};
} else {
	btn.classList.add('door-disconnected');
}

		return btn;
	}

	buildConnectionTooltip(connection, roomData, door) {
		const nodes = connection.nodes || [];
		const targetNode = nodes.find(
			n => !(n.roomid === roomData.id && n.nodeid === door.id)
		);

		if (!targetNode) return 'Connection data incomplete';

		let targetRoom = connection.targetRoom;
		if (this.isCompositeRoom(targetRoom) && targetNode.nodeName?.includes(' - ')) {
			targetRoom = `[Sub-Room] ${targetNode.nodeName.split(' - ')[0]}`;
		}

		const pos = this.extractPositionFromNodeName(targetNode.nodeName);
		const type = connection.connectionType || 'Door';

		return `Connected to: ${targetRoom} (${pos} ${type})` +
			(connection.direction === 'Forward' ? ' [One-Way]' : '');
	}

	extractPositionFromNodeName(name) {
		return name.split(' - ').pop().replace(/\s+(Door|Tunnel)$/i, '');
	}

	getAbbreviatedPosition(name) {
		return name.split(' - ').pop()
			.replace(/\s+(Door|Tunnel)$/i, '')
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
	}

	/* ============================================================
	 * ITEMS LIST
	 * ============================================================ */

	updateItemsList(roomData) {
		const container = document.getElementById('itemsList');
		if (!container) return;

		container.innerHTML = '';

		const items = roomData?.nodes?.filter(n => n.nodeType === 'item') || [];
		for (const item of items) {
			const div = document.createElement('div');
			div.className = 'item-entry';

			div.innerHTML = `
				<div class="item-name">${item.nodeItem || 'Unknown Item'}</div>
				<div class="item-type">Type: ${item.nodeSubType || 'visible'}</div>
				${item.note ? `<div class="item-note">${item.note}</div>` : ''}
			`;
			container.appendChild(div);
		}
	}

	showAlert(msg) {
		// Create custom modal instead of alert()
		const modal = document.createElement('div');
		modal.className = 'modal-overlay';
		modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; align-items: center; justify-content: center;';
		
		const content = document.createElement('div');
		content.style.cssText = 'background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); min-width: 300px;';
		
		const message = document.createElement('div');
		message.textContent = msg;
		message.style.cssText = 'margin-bottom: 16px; font-size: 14px;';
		
		const okBtn = document.createElement('button');
		okBtn.textContent = 'OK';
		okBtn.style.cssText = 'padding: 8px 16px; background: #4CAF50; color: white; border: none; cursor: pointer; border-radius: 4px; float: right;';
		
		content.appendChild(message);
		content.appendChild(okBtn);
		modal.appendChild(content);
		document.body.appendChild(modal);
		
		const cleanup = () => modal.remove();
		
		okBtn.onclick = cleanup;
		okBtn.focus();
		
		okBtn.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === 'Escape') {
				e.preventDefault();
				cleanup();
			}
		});
		
		modal.addEventListener('click', (e) => {
			if (e.target === modal) cleanup();
		});
	}
}
