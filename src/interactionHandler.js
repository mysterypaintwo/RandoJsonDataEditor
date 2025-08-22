/**
 * Interaction Handler - Manages all mouse and keyboard interactions
 * Handles different tool modes (draw, select, move, resize) and their behaviors
 */

import {
	getMousePos,
	isInResizeCorner,
	findNodeAtPosition,
	getCursorStyle,
	snapToGrid,
	clamp,
	snapRectToGrid,
	constrainRectToBounds
} from './utils.js';

export class InteractionHandler {
	constructor(canvas, mapContainer, state, renderer, uiManager) {
		this.canvas = canvas;
		this.mapContainer = mapContainer;
		this.state = state;
		this.renderer = renderer;
		this.uiManager = uiManager;

		this.setupEventListeners();
	}

	/**
	 * Set up all mouse and keyboard event listeners
	 */
	setupEventListeners() {
		// Mouse events on canvas
		this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
		this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
		this.canvas.addEventListener('contextmenu', this.handleRightClick.bind(this));
		this.canvas.addEventListener('wheel', this.handleWheel.bind(this));

		// Global keyboard events
		document.addEventListener('keydown', this.handleKeydown.bind(this));

		// Window resize
		window.addEventListener('resize', () => {
			this.renderer.redraw(
				this.state.currentRoomImage,
				this.state.nodes,
				this.state.selectedNode,
				this.state.currentRect,
				this.state.scale
			);
		});
	}

	/**
	 * Handle mouse down events - initiate drawing, moving, or selecting
	 * @param {MouseEvent} e - Mouse event
	 */
	handleMouseDown(e) {
		// Prevent text selection during interactions
		if (["draw", "move", "select", "resize"].includes(this.state.mode)) {
			document.body.style.userSelect = 'none';
		}

		const {
			x,
			y
		} = getMousePos(e, this.canvas, this.mapContainer, this.state.scale);

		switch (this.state.mode) {
			case "draw":
				this.startDrawing(x, y);
				break;
			case "move":
				this.startMoving(x, y);
				break;
			case "select":
				this.selectNode(x, y);
				break;
			case "resize":
				this.startResizing(x, y);
				break;
		}

		// Set up global mouse handlers for drawing/moving operations
		if (this.state.isDrawing || this.state.movingNode) {
			this.state.globalMouseMoveHandler = this.handleGlobalMouseMove.bind(this);
			this.state.globalMouseUpHandler = this.handleGlobalMouseUp.bind(this);
			document.addEventListener('mousemove', this.state.globalMouseMoveHandler);
			document.addEventListener('mouseup', this.state.globalMouseUpHandler);
		}

		this.redraw();
	}

	/**
	 * Handle mouse move events - update cursor and show tooltips
	 * @param {MouseEvent} e - Mouse event
	 */
	handleMouseMove(e) {
		const {
			x,
			y
		} = getMousePos(e, this.canvas, this.mapContainer, this.state.scale);

		// Update cursor unless actively dragging/drawing
		if (!this.state.isDrawing && !this.state.movingNode) {
			this.updateCursor(x, y);
		}

		// Handle tooltips for all modes
		this.updateTooltip(x, y, e);
	}

	/**
	 * Handle global mouse move (during drawing/moving operations)
	 * @param {MouseEvent} e - Mouse event
	 */
	handleGlobalMouseMove(e) {
		const {
			x,
			y
		} = getMousePos(e, this.canvas, this.mapContainer, this.state.scale);

		switch (this.state.mode) {
			case "draw":
				this.updateDrawing(x, y, e.ctrlKey);
				break;
			case "move":
				this.updateMoving(x, y);
				break;
			case "resize":
				this.updateResizing(x, y);
				break;
		}

		this.redraw();
	}

	/**
	 * Handle global mouse up (finish drawing/moving operations)
	 * @param {MouseEvent} e - Mouse event
	 */
	handleGlobalMouseUp(e) {
		const {
			x,
			y
		} = getMousePos(e, this.canvas, this.mapContainer, this.state.scale);

		if (this.state.isDrawing) {
			this.finishDrawing();
		}

		if (this.state.movingNode) {
			this.finishMoving();
		}

		// Clean up global handlers
		document.removeEventListener('mousemove', this.state.globalMouseMoveHandler);
		document.removeEventListener('mouseup', this.state.globalMouseUpHandler);

		// Re-enable text selection
		document.body.style.userSelect = 'auto';

		this.updateCursor(x, y);
		this.redraw();
	}

	/**
	 * Handle right-click context menu - delete nodes in select mode
	 * @param {MouseEvent} e - Mouse event
	 */
	handleRightClick(e) {
		e.preventDefault();
		if (this.state.mode !== "select") return;

		const {
			x,
			y
		} = getMousePos(e, this.canvas, this.mapContainer, this.state.scale);
		const nodeToDelete = findNodeAtPosition(this.state.nodes, x, y);

		if (nodeToDelete) {
			this.state.removeNode(nodeToDelete.id);
			this.uiManager.updateJsonDisplay(this.state.currentRoomData);
			this.redraw();
		}
	}

	/**
	 * Handle mouse wheel for zooming (with Ctrl key)
	 * @param {WheelEvent} e - Wheel event
	 */
	handleWheel(e) {
		if (!e.ctrlKey) return;
		e.preventDefault();

		const rect = this.canvas.getBoundingClientRect();
		const centerX = e.clientX - rect.left;
		const centerY = e.clientY - rect.top;

		this.handleZoom(e, centerX, centerY);
	}

	/**
	 * Handle keyboard shortcuts
	 * @param {KeyboardEvent} e - Keyboard event
	 */
	handleKeydown(e) {
		// Zoom shortcuts (Ctrl +/-)
		if (e.ctrlKey && ['+', '=', '-'].includes(e.key)) {
			e.preventDefault();
			const rect = this.canvas.getBoundingClientRect();
			this.handleZoom({
				deltaY: e.key === '-' ? 1 : -1
			}, rect.width / 2, rect.height / 2);
			return;
		}

		// Mode switching shortcuts (1-4)
		const modeMap = {
			"1": "draw",
			"2": "select",
			"3": "move",
			"4": "resize"
		};
		if (modeMap[e.key]) {
			this.state.setMode(modeMap[e.key]);
			this.uiManager.updateActiveTool(`${this.state.mode}ModeBtn`);
			this.redraw();
		}

		// Delete selected node
		if (e.key === "Delete" && this.state.selectedNode) {
			this.state.removeNode(this.state.selectedNode.id);
			this.uiManager.updateJsonDisplay(this.state.currentRoomData);
			this.redraw();
		}
	}

	/**
	 * Start drawing a new rectangle
	 * @param {number} x - Starting X coordinate
	 * @param {number} y - Starting Y coordinate
	 */
	startDrawing(x, y) {
		this.state.startDrawing(x, y);
	}

	/**
	 * Update the rectangle being drawn
	 * @param {number} x - Current X coordinate
	 * @param {number} y - Current Y coordinate
	 * @param {boolean} snapToGrid - Whether to snap to 8px grid (Ctrl key held)
	 */
	updateDrawing(x, y, snapToGrid) {
		if (!this.state.isDrawing || !this.state.currentRoomImage) return;

		let endX = snapToGrid ? Math.round(x / 8) * 8 : x;
		let endY = snapToGrid ? Math.round(y / 8) * 8 : y;

		// Clamp to image bounds
		endX = clamp(endX, 0, this.state.currentRoomImage.width);
		endY = clamp(endY, 0, this.state.currentRoomImage.height);

		this.state.updateCurrentRect({
			x: this.state.startX,
			y: this.state.startY,
			w: endX - this.state.startX,
			h: endY - this.state.startY
		});
	}

	/**
	 * Finish drawing and create a new node
	 */
	finishDrawing() {
		if (!this.state.currentRect) return;

		// Normalize and snap rectangle to grid
		let rect = snapRectToGrid(this.state.currentRect);

		// Constrain to image bounds
		rect = constrainRectToBounds(rect, this.state.currentRoomImage.width, this.state.currentRoomImage.height);

		// Create the node
		this.state.addNode(rect);
		this.state.finishDrawing();

		// Update UI
		this.uiManager.updateJsonDisplay(this.state.currentRoomData);
	}

	/**
	 * Start moving a node
	 * @param {number} x - Mouse X coordinate
	 * @param {number} y - Mouse Y coordinate
	 */
	startMoving(x, y) {
		const nodeToMove = findNodeAtPosition(this.state.nodes, x, y);
		if (nodeToMove) {
			this.state.selectedNode = nodeToMove;
			this.state.startMoving(nodeToMove, x - nodeToMove.x, y - nodeToMove.y);
			this.uiManager.highlightNodeInJSON(nodeToMove, this.state.currentRoomData);
		}
	}

	/**
	 * Update node position while moving
	 * @param {number} x - Current mouse X coordinate
	 * @param {number} y - Current mouse Y coordinate
	 */
	updateMoving(x, y) {
		if (!this.state.movingNode || !this.state.currentRoomImage) return;

		// Calculate new position with offset
		let newX = x - this.state.offsetX;
		let newY = y - this.state.offsetY;

		// Constrain to image bounds
		newX = clamp(newX, 0, this.state.currentRoomImage.width - this.state.movingNode.w);
		newY = clamp(newY, 0, this.state.currentRoomImage.height - this.state.movingNode.h);

		// Snap to grid
		newX = snapToGrid(newX);
		newY = snapToGrid(newY);

		// Update node position
		this.state.updateNodePosition(this.state.movingNode, newX, newY);
	}

	/**
	 * Finish moving a node
	 */
	finishMoving() {
		this.state.stopMoving();
		this.uiManager.updateJsonDisplay(this.state.currentRoomData);
	}

	/**
	 * Select a node at the given coordinates
	 * @param {number} x - Mouse X coordinate
	 * @param {number} y - Mouse Y coordinate
	 */
	selectNode(x, y) {
		this.state.selectedNode = findNodeAtPosition(this.state.nodes, x, y);
		if (this.state.selectedNode) {
			this.uiManager.highlightNodeInJSON(this.state.selectedNode, this.state.currentRoomData);
		}
	}

	/**
	 * Start resizing a node
	 * @param {number} x - Mouse X coordinate
	 * @param {number} y - Mouse Y coordinate
	 */
	startResizing(x, y) {
		const nodeToResize = this.state.nodes.find(n => isInResizeCorner(n, x, y));
		if (nodeToResize) {
			this.state.startMoving(nodeToResize, x - nodeToResize.x, y - nodeToResize.y);
		}
	}

	/**
	 * Update node dimensions while resizing
	 * @param {number} x - Current mouse X coordinate
	 * @param {number} y - Current mouse Y coordinate
	 */
	updateResizing(x, y) {
		if (!this.state.movingNode || !this.state.currentRoomImage) return;

		// Calculate new dimensions
		let newW = x - this.state.movingNode.x;
		let newH = y - this.state.movingNode.y;

		// Snap to grid and enforce minimum size
		newW = Math.max(8, snapToGrid(newW));
		newH = Math.max(8, snapToGrid(newH));

		// Constrain to image bounds
		newW = Math.min(newW, this.state.currentRoomImage.width - this.state.movingNode.x);
		newH = Math.min(newH, this.state.currentRoomImage.height - this.state.movingNode.y);

		// Update node dimensions
		this.state.updateNodeDimensions(this.state.movingNode, newW, newH);
	}

	/**
	 * Update cursor based on current mode and hover state
	 * @param {number} x - Mouse X coordinate
	 * @param {number} y - Mouse Y coordinate
	 */
	updateCursor(x, y) {
		const hoverNode = findNodeAtPosition(this.state.nodes, x, y);
		const isResizeCorner = hoverNode && isInResizeCorner(hoverNode, x, y);
		const isMoving = !!this.state.movingNode;

		const cursor = getCursorStyle(this.state.mode, hoverNode, isResizeCorner, isMoving);
		this.canvas.style.cursor = cursor;
	}

	/**
	 * Update tooltip display
	 * @param {number} x - Mouse X coordinate
	 * @param {number} y - Mouse Y coordinate
	 * @param {MouseEvent} e - Original mouse event for client coordinates
	 */
	updateTooltip(x, y, e) {
		const hoverNode = findNodeAtPosition(this.state.nodes, x, y);
		this.uiManager.updateTooltip(hoverNode, e.clientX, e.clientY);
	}

	/**
	 * Handle zoom operations
	 * @param {Object} e - Event object with deltaY property
	 * @param {number} centerX - X coordinate to center zoom on
	 * @param {number} centerY - Y coordinate to center zoom on
	 */
	handleZoom(e, centerX, centerY) {
		if (!this.state.currentRoomImage) return;

		const oldScale = this.state.scale;
		const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
		const newScale = this.state.scale * zoomFactor;

		this.state.setScale(newScale);

		// Update canvas display size
		this.renderer.updateCanvasSize(this.state.currentRoomImage, this.state.scale);

		// Adjust scroll position to center zoom
		this.renderer.updateScrollForZoom(oldScale, this.state.scale, centerX, centerY);

		this.redraw();
	}

	/**
	 * Trigger a complete redraw
	 */
	redraw() {
		this.renderer.redraw(
			this.state.currentRoomImage,
			this.state.nodes,
			this.state.selectedNode,
			this.state.currentRect,
			this.state.scale
		);
	}
}