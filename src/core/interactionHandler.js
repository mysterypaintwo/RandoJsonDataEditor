/**
 * Interaction Handler - Multi-select and geometry-aware interactions
 */
import {
    getMousePos,
    getCursorStyle,
    snapToGrid,
    clamp,
    snapRectToGrid,
    constrainRectToBounds
} from './utils.js';
import {
    getNodeBounds,
    isPointInNode,
    translateNodeGeometry,
    scaleNodeGeometry,
    isInResizeCorner,
    mergeNodesGeometry,
    normalizeGeometry
} from './geometryUtils.js';

export class InteractionHandler {
    constructor(canvas, mapContainer, state, renderer, uiManager) {
        this.canvas = canvas;
        this.mapContainer = mapContainer;
        this.state = state;
        this.renderer = renderer;
        this.uiManager = uiManager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('contextmenu', this.handleRightClick.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));

        document.addEventListener('keydown', this.handleKeydown.bind(this));
        
        window.addEventListener('resize', () => {
			this.renderer.redraw(
				this.state.currentRoomImage,
				this.state.nodes,
				this.state.selectedNodes,
				this.state.currentRect,
				this.state.scale,
				this.state.currentRoomData?.strats,
				undefined, // mouseX - will be set by handleMouseMove
				undefined  // mouseY
			);
        });
    }

	async handleDoubleClick(e) {
		// Check if any modal is open
		if (document.querySelector('.modal-overlay[style*="display: flex"]')) return;
		
		// Only in select or move mode
		if (this.state.mode !== "select" && this.state.mode !== "move") return;

		// Prevent default to stop text selection
		e.preventDefault();

		const { x, y } = getMousePos(e, this.canvas, this.mapContainer, this.state.scale);
		const nodeToRename = this.findNodeAtPosition(x, y);

		// Only allow renaming junction nodes
		if (nodeToRename && nodeToRename.nodeType === 'junction') {
			// Create inline rename modal
			const modal = document.createElement('div');
			modal.className = 'modal-overlay';
			modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; align-items: center; justify-content: center;';
			
			const content = document.createElement('div');
			content.style.cssText = 'background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
			
			const title = document.createElement('h3');
			title.textContent = 'Rename Junction Node';
			title.style.marginTop = '0';
			
			const input = document.createElement('input');
			input.type = 'text';
			input.value = nodeToRename.name;
			input.style.cssText = 'width: 300px; padding: 8px; font-size: 14px; margin: 12px 0; box-sizing: border-box;';
			
			const btnContainer = document.createElement('div');
			btnContainer.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px;';
			
			const cancelBtn = document.createElement('button');
			cancelBtn.textContent = 'Cancel';
			cancelBtn.style.cssText = 'padding: 8px 16px;';
			
			const okBtn = document.createElement('button');
			okBtn.textContent = 'OK';
			okBtn.style.cssText = 'padding: 8px 16px; background: #4CAF50; color: white; border: none; cursor: pointer;';
			
			btnContainer.appendChild(cancelBtn);
			btnContainer.appendChild(okBtn);
			content.appendChild(title);
			content.appendChild(input);
			content.appendChild(btnContainer);
			modal.appendChild(content);
			document.body.appendChild(modal);
			
			input.focus();
			input.select();
			
			const cleanup = () => modal.remove();
			
			const save = () => {
				const newName = input.value.trim();
				if (newName) {
					nodeToRename.name = newName;
					this.state.currentRoomData.nodes = this.state.nodes;
					this.uiManager.updateJsonDisplay(this.state.currentRoomData);
					this.redraw();
				}
				cleanup();
			};
			
			okBtn.onclick = save;
			cancelBtn.onclick = cleanup;
			
			// Handle keyboard
			input.addEventListener('keydown', (event) => {
				event.stopPropagation(); // Prevent shortcuts
				if (event.key === 'Enter') {
					event.preventDefault();
					save();
				} else if (event.key === 'Escape') {
					event.preventDefault();
					cleanup();
				}
			});
			
			modal.addEventListener('click', (event) => {
				if (event.target === modal) cleanup();
			});
		}
	}

    handleMouseDown(e) {
        if (["draw", "move", "select", "resize"].includes(this.state.mode)) {
            document.body.style.userSelect = 'none';
        }

        const { x, y } = getMousePos(e, this.canvas, this.mapContainer, this.state.scale);
        const multiSelect = e.ctrlKey || e.shiftKey;

        switch (this.state.mode) {
            case "draw":
                this.startDrawing(x, y);
                break;
            case "move":
                this.startMoving(x, y, multiSelect);
                break;
            case "select":
                this.selectNode(x, y, multiSelect);
                break;
            case "resize":
                this.startResizing(x, y);
                break;
        }

        if (this.state.isDrawing || this.state.movingNodes.length > 0) {
            this.state.globalMouseMoveHandler = this.handleGlobalMouseMove.bind(this);
            this.state.globalMouseUpHandler = this.handleGlobalMouseUp.bind(this);
            document.addEventListener('mousemove', this.state.globalMouseMoveHandler);
            document.addEventListener('mouseup', this.state.globalMouseUpHandler);
        }

        this.redraw();
    }

	handleMouseMove(e) {
		const { x, y } = getMousePos(e, this.canvas, this.mapContainer, this.state.scale);

		if (!this.state.isDrawing && this.state.movingNodes.length === 0) {
			this.updateCursor(x, y);
		}

		this.updateTooltip(x, y, e);
	}

    handleGlobalMouseMove(e) {
        const { x, y } = getMousePos(e, this.canvas, this.mapContainer, this.state.scale);

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

    handleGlobalMouseUp(e) {
        const { x, y } = getMousePos(e, this.canvas, this.mapContainer, this.state.scale);

        if (this.state.isDrawing) {
            this.finishDrawing();
        }
        if (this.state.movingNodes.length > 0) {
            this.finishMoving();
        }

        document.removeEventListener('mousemove', this.state.globalMouseMoveHandler);
        document.removeEventListener('mouseup', this.state.globalMouseUpHandler);
        document.body.style.userSelect = 'auto';

        this.updateCursor(x, y);
        this.redraw();
    }

    handleRightClick(e) {
        e.preventDefault();
        if (this.state.mode !== "select") return;

        const { x, y } = getMousePos(e, this.canvas, this.mapContainer, this.state.scale);
        const nodeToDelete = this.findNodeAtPosition(x, y);

        // Only allow deleting junction nodes
        if (nodeToDelete && nodeToDelete.nodeType === 'junction') {
            this.state.removeNodes([nodeToDelete.id]);
            this.uiManager.updateJsonDisplay(this.state.currentRoomData);
            this.redraw();
        }
    }

    handleWheel(e) {
        if (!e.ctrlKey) return;
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const centerX = e.clientX - rect.left;
        const centerY = e.clientY - rect.top;
        this.handleZoom(e, centerX, centerY);
    }

    handleKeydown(e) {
		// Block shortcuts if any modal is open
		if (document.querySelector('.modal-overlay[style*="display: flex"]')) {
			return;
		}

        // Zoom shortcuts
        if (e.ctrlKey && ['+', '=', '-'].includes(e.key)) {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            this.handleZoom({ deltaY: e.key === '-' ? 1 : -1 }, rect.width / 2, rect.height / 2);
            return;
        }

        // Merge nodes (Ctrl+M)
        if (e.ctrlKey && e.key.toLowerCase() === 'm') {
            e.preventDefault();
            this.mergeSelectedNodes();
            return;
        }

        // Toggle triangle mode (T key) - only in draw mode
        if (e.key.toLowerCase() === 't' && this.state.mode === 'draw') {
            e.preventDefault();
            this.state.triangleDrawMode = !this.state.triangleDrawMode;
            this.uiManager.updateDrawModeIndicator(this.state.triangleDrawMode);
            return;
        }

        // Mode switching
        const modeMap = { "1": "draw", "2": "select", "3": "move", "4": "resize" };
        if (modeMap[e.key]) {
            this.state.setMode(modeMap[e.key]);
            this.uiManager.updateActiveTool(`${this.state.mode}ModeBtn`);
            this.redraw();
        }

        // Delete selected nodes (only junction nodes)
        if (e.key === "Delete" && this.state.selectedNodes.length > 0) {
            const junctionIds = this.state.selectedNodes
                .filter(n => n.nodeType === 'junction')
                .map(n => n.id);
            
            if (junctionIds.length > 0) {
                this.state.removeNodes(junctionIds);
                this.uiManager.updateJsonDisplay(this.state.currentRoomData);
                this.redraw();
            }
        }
    }

    mergeSelectedNodes() {
        const junctionNodes = this.state.selectedNodes.filter(n => n.nodeType === 'junction');
        
        if (junctionNodes.length < 2) {
            this.uiManager.showAlert('Select at least 2 junction nodes to merge');
            return;
        }

        // Check if nodes are adjacent (share at least one edge/vertex)
        if (!this.areNodesAdjacent(junctionNodes)) {
            this.uiManager.showAlert('Selected nodes must be adjacent to each other to merge');
            return;
        }

        // Merge geometry from all selected nodes
        const mergedGeometry = mergeNodesGeometry(junctionNodes);
        
        // Keep the first node, update its geometry
        const keepNode = junctionNodes[0];
        keepNode.geometry = mergedGeometry;
        keepNode.name = `Merged Junction ${keepNode.id}`;

        // Remove other nodes
        const removeIds = junctionNodes.slice(1).map(n => n.id);
        this.state.removeNodes(removeIds);

        // Update selection to just the merged node
        this.state.selectedNodes = [keepNode];

        this.uiManager.updateJsonDisplay(this.state.currentRoomData);
        this.redraw();
    }

    areNodesAdjacent(nodes) {
        // Check if all nodes share at least one edge or touch each other
        for (let i = 0; i < nodes.length; i++) {
            let hasConnection = false;
            for (let j = 0; j < nodes.length; j++) {
                if (i === j) continue;
                if (this.doNodesTouchOrOverlap(nodes[i], nodes[j])) {
                    hasConnection = true;
                    break;
                }
            }
            if (!hasConnection && nodes.length > 1) {
                return false;
            }
        }
        return true;
    }

    doNodesTouchOrOverlap(node1, node2) {
        const bounds1 = getNodeBounds(node1);
        const bounds2 = getNodeBounds(node2);
        
        // Check if bounding boxes touch or overlap (including edges)
        const horizontalOverlap = bounds1.x <= bounds2.x + bounds2.w && bounds1.x + bounds1.w >= bounds2.x;
        const verticalOverlap = bounds1.y <= bounds2.y + bounds2.h && bounds1.y + bounds1.h >= bounds2.y;
        
        return horizontalOverlap && verticalOverlap;
    }

    findNodeAtPosition(x, y) {
        // Search in reverse to find topmost node
        for (let i = this.state.nodes.length - 1; i >= 0; i--) {
            if (isPointInNode(this.state.nodes[i], x, y)) {
                return this.state.nodes[i];
            }
        }
        return null;
    }

    startDrawing(x, y) {
        this.state.startDrawing(x, y);
    }

	updateDrawing(x, y, snapToGrid) {
		if (!this.state.isDrawing || !this.state.currentRoomImage) return;

		let endX = snapToGrid ? Math.round(x / 8) * 8 : x;
		let endY = snapToGrid ? Math.round(y / 8) * 8 : y;

		endX = clamp(endX, 0, this.state.currentRoomImage.width);
		endY = clamp(endY, 0, this.state.currentRoomImage.height);

		this.state.updateCurrentRect({
			x: this.state.startX,
			y: this.state.startY,
			w: endX - this.state.startX,
			h: endY - this.state.startY,
			isTriangle: this.state.triangleDrawMode
		});
	}

    finishDrawing() {
        if (!this.state.currentRect) return;

        let rect = snapRectToGrid(this.state.currentRect);
        rect = constrainRectToBounds(rect, this.state.currentRoomImage.width, this.state.currentRoomImage.height);

        // If in triangle mode, create triangle from rectangle drag
        if (this.state.triangleDrawMode) {
            this.createTriangleFromRect(rect);
        } else {
            // Regular rectangle mode
            this.state.addNode(rect);
        }

        this.state.finishDrawing();
        this.uiManager.updateJsonDisplay(this.state.currentRoomData);
    }

	createTriangleFromRect(rect) {
		// Use the same logic as the preview to ensure consistency
		const width = Math.abs(rect.w);
		const height = Math.abs(rect.h);
		
		const x1 = Math.min(rect.x, rect.x + rect.w);
		const y1 = Math.min(rect.y, rect.y + rect.h);
		const x2 = x1 + width;
		const y2 = y1 + height;

		// Determine which quadrant the drag went (relative to start point)
		const dragRight = rect.w >= 0;
		const dragDown = rect.h >= 0;

		let points;
		
		// Create right triangles based on drag quadrant
		if (dragRight && dragDown) {
			// Quadrant 4: Dragged right and down
			// Right angle at top-left
			points = [
				{ x: x1, y: y1 },  // Top-left (right angle)
				{ x: x2, y: y1 },  // Top-right
				{ x: x1, y: y2 }   // Bottom-left
			];
		} else if (!dragRight && dragDown) {
			// Quadrant 3: Dragged left and down
			// Right angle at top-right
			points = [
				{ x: x1, y: y1 },  // Top-left
				{ x: x2, y: y1 },  // Top-right (right angle)
				{ x: x2, y: y2 }   // Bottom-right
			];
		} else if (!dragRight && !dragDown) {
			// Quadrant 2: Dragged left and up
			// Right angle at bottom-right
			points = [
				{ x: x2, y: y1 },  // Top-right
				{ x: x2, y: y2 },  // Bottom-right (right angle)
				{ x: x1, y: y2 }   // Bottom-left
			];
		} else {
			// Quadrant 1: Dragged right and up
			// Right angle at bottom-left
			points = [
				{ x: x1, y: y1 },  // Top-left
				{ x: x1, y: y2 },  // Bottom-left (right angle)
				{ x: x2, y: y2 }   // Bottom-right
			];
		}

		// Snap to 8x8 grid
		const snappedPoints = points.map(p => ({
			x: Math.round(p.x / 8) * 8,
			y: Math.round(p.y / 8) * 8
		}));

		this.state.addTriangleNode(snappedPoints);
	}

    selectNode(x, y, multiSelect) {
        const clickedNode = this.findNodeAtPosition(x, y);

        if (clickedNode) {
            this.state.toggleNodeSelection(clickedNode, multiSelect);
            this.uiManager.highlightNodeInJSON(clickedNode, this.state.currentRoomData);
        } else if (!multiSelect) {
            this.state.clearSelection();
        }
    }

    startMoving(x, y, multiSelect) {
        const nodeToMove = this.findNodeAtPosition(x, y);
        
        if (nodeToMove) {
            // If clicking on an already selected node, move all selected nodes
            const isAlreadySelected = this.state.selectedNodes.some(n => n.id === nodeToMove.id);
            
            if (!isAlreadySelected) {
                this.state.toggleNodeSelection(nodeToMove, multiSelect);
            }

            this.state.startMovingNodes(this.state.selectedNodes, x, y);
            
            if (this.state.selectedNodes.length === 1) {
                this.uiManager.highlightNodeInJSON(this.state.selectedNodes[0], this.state.currentRoomData);
            }
        }
    }

    updateMoving(x, y) {
        if (this.state.movingNodes.length === 0 || !this.state.currentRoomImage) return;

        for (const node of this.state.movingNodes) {
            const offset = this.state.moveOffsets.get(node.id);
            if (!offset) continue;

            const bounds = getNodeBounds(node);
            let newX = x - offset.x;
            let newY = y - offset.y;

            // Constrain to image bounds
            newX = clamp(newX, 0, this.state.currentRoomImage.width - bounds.w);
            newY = clamp(newY, 0, this.state.currentRoomImage.height - bounds.h);

            // Snap to grid
            newX = snapToGrid(newX);
            newY = snapToGrid(newY);

            // Calculate delta and translate
            const dx = newX - bounds.x;
            const dy = newY - bounds.y;

            translateNodeGeometry(node, dx, dy);
            normalizeGeometry(node.geometry);
        }
    }

    finishMoving() {
        this.state.stopMoving();
        this.uiManager.updateJsonDisplay(this.state.currentRoomData);
    }

    startResizing(x, y) {
        const nodeToResize = this.state.nodes.find(n => isInResizeCorner(n, x, y));
        if (nodeToResize) {
            this.state.startMovingNodes([nodeToResize], x, y);
        }
    }

    updateResizing(x, y) {
        if (this.state.movingNodes.length === 0 || !this.state.currentRoomImage) return;

        const node = this.state.movingNodes[0];
        const bounds = getNodeBounds(node);

        let newW = x - bounds.x;
        let newH = y - bounds.y;

        newW = Math.max(8, snapToGrid(newW));
        newH = Math.max(8, snapToGrid(newH));

        newW = Math.min(newW, this.state.currentRoomImage.width - bounds.x);
        newH = Math.min(newH, this.state.currentRoomImage.height - bounds.y);

        scaleNodeGeometry(node, newW, newH);
        normalizeGeometry(node.geometry);
    }

    updateCursor(x, y) {
        const hoverNode = this.findNodeAtPosition(x, y);
        const isResizeCorner = hoverNode && isInResizeCorner(hoverNode, x, y);
        const isMoving = this.state.movingNodes.length > 0;
        const cursor = getCursorStyle(this.state.mode, hoverNode, isResizeCorner, isMoving);
        this.canvas.style.cursor = cursor;
    }
    
    updateTooltip(x, y, e) {
        // Check if hovering over any node at the current world position
        const hoverNode = this.findNodeAtPosition(x, y);

        // Nodes take priority over strat connections
        if (hoverNode) {
            this.uiManager.updateTooltip(hoverNode, e.clientX, e.clientY);
            return;
        }

        // Check for all hovered strat connections at the current world position
        const stratConns = this.renderer.getHoveredStratConnections(
            x,
            y,
            this.state.scale
        );

        // If one or more strat connections are hovered, list all of them in the tooltip
        if (stratConns.length > 0) {
            const stratList = stratConns
                .flatMap(conn => conn.connections)
                .map(c => `• [${c.index}] ${c.name}`)
                .join('\n');

            this.uiManager.updateTooltip(
                { name: `Strats:\n${stratList}` },
                e.clientX,
                e.clientY
            );
            return;
        }

        // Clear tooltip if nothing is currently hovered
        this.uiManager.updateTooltip(null, e.clientX, e.clientY);
    }

	
    handleZoom(e, centerX, centerY) {
        if (!this.state.currentRoomImage) return;

        const oldScale = this.state.scale;
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newScale = this.state.scale * zoomFactor;

        this.state.setScale(newScale);
        this.renderer.updateCanvasSize(this.state.currentRoomImage, newScale);
        this.renderer.updateScrollForZoom(oldScale, newScale, centerX, centerY);
        this.redraw();
    }

	redraw() {
		this.renderer.redraw(
			this.state.currentRoomImage,
			this.state.nodes,
			this.state.selectedNodes,
			this.state.currentRect,
			this.state.scale,
			this.state.currentRoomData?.strats,
			undefined, // mouseX - will be set by handleMouseMove
			undefined  // mouseY
		);
	}
}