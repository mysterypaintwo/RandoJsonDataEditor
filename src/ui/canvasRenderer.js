/**
 * Canvas Renderer - Handles all canvas drawing operations with geometry support
 */
import { getNodeBounds } from '../core/geometryUtils.js';

export class CanvasRenderer {
    constructor(canvas, mapContainer) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.mapContainer = mapContainer;
    }

    withAlpha(color, alpha) {
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        if (color.startsWith('rgb(')) {
            return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
        }
        return color;
    }

    /**
     * Render a single shape from geometry
     */
    renderShape(shape, fillStyle, strokeStyle, scale) {
        if (shape.shape === 'rect') {
            this.ctx.fillStyle = fillStyle;
            this.ctx.fillRect(shape.x * scale, shape.y * scale, shape.w * scale, shape.h * scale);
            this.ctx.strokeStyle = strokeStyle;
            this.ctx.lineWidth = 2 / scale;
            this.ctx.strokeRect(shape.x * scale, shape.y * scale, shape.w * scale, shape.h * scale);
        } else if (shape.shape === 'tri' && shape.points && shape.points.length === 3) {
            this.ctx.beginPath();
            this.ctx.moveTo(shape.points[0].x * scale, shape.points[0].y * scale);
            this.ctx.lineTo(shape.points[1].x * scale, shape.points[1].y * scale);
            this.ctx.lineTo(shape.points[2].x * scale, shape.points[2].y * scale);
            this.ctx.closePath();
            this.ctx.fillStyle = fillStyle;
            this.ctx.fill();
            this.ctx.strokeStyle = strokeStyle;
            this.ctx.lineWidth = 2 / scale;
            this.ctx.stroke();
        }
    }

	/**
	 * Render a node with all its geometry shapes as a unified polygon
	 */
	renderNode(node, isSelected, scale) {
		if (!node?.geometry || node.geometry.length === 0) return;

		const color = node.color || '#0000FF';
		const fillStyle = isSelected ? 'rgba(255,255,0,0.3)' : this.withAlpha(color, 0.3);
		const strokeStyle = isSelected ? 'yellow' : color;

		this.ctx.save();

		// Fill each shape individually (allows for complex fills)
		this.ctx.fillStyle = fillStyle;
		for (const shape of node.geometry) {
			this.ctx.beginPath();
			if (shape.shape === 'rect') {
				this.ctx.rect(
					shape.x * scale, 
					shape.y * scale, 
					shape.w * scale, 
					shape.h * scale
				);
			} else if (shape.shape === 'tri' && shape.points && shape.points.length === 3) {
				this.ctx.moveTo(shape.points[0].x * scale, shape.points[0].y * scale);
				this.ctx.lineTo(shape.points[1].x * scale, shape.points[1].y * scale);
				this.ctx.lineTo(shape.points[2].x * scale, shape.points[2].y * scale);
				this.ctx.closePath();
			}
			this.ctx.fill();
		}

		// Create a composite path for stroking only the exterior
		// This uses the destination-out blend mode trick
		this.ctx.globalCompositeOperation = 'source-over';
		
		// Draw all shapes again for outline
		this.ctx.strokeStyle = strokeStyle;
		this.ctx.lineWidth = 2 / scale;
		
		for (const shape of node.geometry) {
			this.ctx.beginPath();
			if (shape.shape === 'rect') {
				this.ctx.rect(
					shape.x * scale, 
					shape.y * scale, 
					shape.w * scale, 
					shape.h * scale
				);
			} else if (shape.shape === 'tri' && shape.points && shape.points.length === 3) {
				this.ctx.moveTo(shape.points[0].x * scale, shape.points[0].y * scale);
				this.ctx.lineTo(shape.points[1].x * scale, shape.points[1].y * scale);
				this.ctx.lineTo(shape.points[2].x * scale, shape.points[2].y * scale);
				this.ctx.closePath();
			}
			
			// Only stroke edges that aren't shared with another shape
			// We'll do this by checking each edge
			if (shape.shape === 'rect') {
				this.strokeRectEdgesIfExterior(node.geometry, shape, scale, strokeStyle);
			} else if (shape.shape === 'tri') {
				this.strokeTriEdgesIfExterior(node.geometry, shape, scale, strokeStyle);
			}
		}

		this.ctx.restore();
		this.renderNodeLabel(node, scale);
	}

	/**
	 * Stroke only the exterior edges of a rectangle
	 */
	strokeRectEdgesIfExterior(allShapes, rect, scale, strokeStyle) {
		const edges = [
			{ x1: rect.x, y1: rect.y, x2: rect.x + rect.w, y2: rect.y }, // top
			{ x1: rect.x + rect.w, y1: rect.y, x2: rect.x + rect.w, y2: rect.y + rect.h }, // right
			{ x1: rect.x, y1: rect.y + rect.h, x2: rect.x + rect.w, y2: rect.y + rect.h }, // bottom
			{ x1: rect.x, y1: rect.y, x2: rect.x, y2: rect.y + rect.h } // left
		];

		this.ctx.strokeStyle = strokeStyle;
		this.ctx.lineWidth = 2 / scale;

		edges.forEach(edge => {
			if (!this.isEdgeSharedWithAnotherShape(allShapes, rect, edge)) {
				this.ctx.beginPath();
				this.ctx.moveTo(edge.x1 * scale, edge.y1 * scale);
				this.ctx.lineTo(edge.x2 * scale, edge.y2 * scale);
				this.ctx.stroke();
			}
		});
	}

	/**
	 * Stroke only the exterior edges of a triangle
	 */
	strokeTriEdgesIfExterior(allShapes, tri, scale, strokeStyle) {
		if (!tri.points || tri.points.length !== 3) return;

		const edges = [
			{ x1: tri.points[0].x, y1: tri.points[0].y, x2: tri.points[1].x, y2: tri.points[1].y },
			{ x1: tri.points[1].x, y1: tri.points[1].y, x2: tri.points[2].x, y2: tri.points[2].y },
			{ x1: tri.points[2].x, y1: tri.points[2].y, x2: tri.points[0].x, y2: tri.points[0].y }
		];

		this.ctx.strokeStyle = strokeStyle;
		this.ctx.lineWidth = 2 / scale;

		edges.forEach(edge => {
			if (!this.isEdgeSharedWithAnotherShape(allShapes, tri, edge)) {
				this.ctx.beginPath();
				this.ctx.moveTo(edge.x1 * scale, edge.y1 * scale);
				this.ctx.lineTo(edge.x2 * scale, edge.y2 * scale);
				this.ctx.stroke();
			}
		});
	}

	/**
	 * Check if an edge is shared with another shape in the geometry
	 */
	isEdgeSharedWithAnotherShape(allShapes, currentShape, edge) {
		const epsilon = 0.1; // Tolerance for floating point comparison

		for (const shape of allShapes) {
			if (shape === currentShape) continue;

			const shapeEdges = this.getShapeEdges(shape);
			
			for (const otherEdge of shapeEdges) {
				// Check if edges are the same (in either direction)
				if (this.edgesMatch(edge, otherEdge, epsilon)) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Get all edges of a shape
	 */
	getShapeEdges(shape) {
		const edges = [];

		if (shape.shape === 'rect') {
			edges.push(
				{ x1: shape.x, y1: shape.y, x2: shape.x + shape.w, y2: shape.y },
				{ x1: shape.x + shape.w, y1: shape.y, x2: shape.x + shape.w, y2: shape.y + shape.h },
				{ x1: shape.x, y1: shape.y + shape.h, x2: shape.x + shape.w, y2: shape.y + shape.h },
				{ x1: shape.x, y1: shape.y, x2: shape.x, y2: shape.y + shape.h }
			);
		} else if (shape.shape === 'tri' && shape.points && shape.points.length === 3) {
			edges.push(
				{ x1: shape.points[0].x, y1: shape.points[0].y, x2: shape.points[1].x, y2: shape.points[1].y },
				{ x1: shape.points[1].x, y1: shape.points[1].y, x2: shape.points[2].x, y2: shape.points[2].y },
				{ x1: shape.points[2].x, y1: shape.points[2].y, x2: shape.points[0].x, y2: shape.points[0].y }
			);
		}

		return edges;
	}

	/**
	 * Check if two edges match (in either direction)
	 */
	edgesMatch(edge1, edge2, epsilon) {
		// Check forward direction
		const forwardMatch = 
			Math.abs(edge1.x1 - edge2.x1) < epsilon &&
			Math.abs(edge1.y1 - edge2.y1) < epsilon &&
			Math.abs(edge1.x2 - edge2.x2) < epsilon &&
			Math.abs(edge1.y2 - edge2.y2) < epsilon;

		// Check reverse direction
		const reverseMatch = 
			Math.abs(edge1.x1 - edge2.x2) < epsilon &&
			Math.abs(edge1.y1 - edge2.y2) < epsilon &&
			Math.abs(edge1.x2 - edge2.x1) < epsilon &&
			Math.abs(edge1.y2 - edge2.y1) < epsilon;

		return forwardMatch || reverseMatch;
	}

    /**
     * Render node ID label at center of bounding box with pixel-art font
     */
    renderNodeLabel(node, scale) {
        const bounds = getNodeBounds(node);
        const centerX = (bounds.x + bounds.w / 2) * scale;
        const centerY = (bounds.y + bounds.h / 2) * scale;

        // Calculate font size based on bounds and scale (slightly larger)
        const fontSize = Math.max(12, Math.min(20, Math.min(bounds.w, bounds.h) * scale * 0.4));

        // Get complementary text color based on node color
        const textColor = this.getComplementaryTextColor(node.color || '#0000FF');

        // Draw text background for better readability
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        const label = String(node.id);
        const metrics = this.ctx.measureText(label);
        const padding = 2;
        
        this.ctx.fillRect(
            centerX - metrics.width / 2 - padding,
            centerY - fontSize / 2 - padding,
            metrics.width + padding * 2,
            fontSize + padding * 2
        );

        // Draw the text
        this.ctx.fillStyle = textColor;
        this.ctx.fillText(label, centerX, centerY);
	}
	/**
	 * Calculate offset for connection line to avoid overlaps
	 */
	getConnectionOffset(fromId, toId, allConnections) {
		// Count how many connections exist between these two nodes
		const connectionKey = `${Math.min(fromId, toId)}-${Math.max(fromId, toId)}`;
		const parallelConnections = allConnections.filter(conn => {
			const connKey = `${Math.min(conn.from, conn.to)}-${Math.max(conn.from, conn.to)}`;
			return connKey === connectionKey;
		});
		
		if (parallelConnections.length <= 1) return 0;
		
		// Find this connection's index
		const thisIndex = parallelConnections.findIndex(conn => 
			conn.from === fromId && conn.to === toId
		);
		
		// Offset perpendicular to the line
		const offsetAmount = 8;
		return (thisIndex - (parallelConnections.length - 1) / 2) * offsetAmount;
	}

	/**
	 * Shorten line endpoints to prevent overlap with node labels
	 */
	getShortenedLineEndpoints(fromX, fromY, toX, toY, shortenAmount) {
		const dx = toX - fromX;
		const dy = toY - fromY;
		const length = Math.sqrt(dx * dx + dy * dy);
		
		if (length === 0) return { fromX, fromY, toX, toY };
		
		const unitX = dx / length;
		const unitY = dy / length;
		
		return {
			fromX: fromX + unitX * shortenAmount,
			fromY: fromY + unitY * shortenAmount,
			toX: toX - unitX * shortenAmount,
			toY: toY - unitY * shortenAmount
		};
	}

	/**
	 * Draw a filled triangular arrow head at the end of a line
	 * - Arrow tip points from (fromX, fromY) → (toX, toY)
	 * - Base is flat and perpendicular to the line direction
	 * - Size is defined in WORLD SPACE (scale should usually be 1)
	 */
	drawArrowHead(ctx, fromX, fromY, toX, toY, scale, thickness = 1) {
		// Length of arrow head from base to tip
		const headLength = 6 * scale;

		// Half-width of the flat base (controls visual thickness)
		const halfBase = thickness * scale * 2;

		// Direction angle of the line
		const angle = Math.atan2(toY - fromY, toX - fromX);

		// Arrow tip position (points exactly at line end)
		const tipX = toX;
		const tipY = toY;

		// Center of the arrow base (pulled back from tip)
		const baseX = tipX - headLength * Math.cos(angle);
		const baseY = tipY - headLength * Math.sin(angle);

		// Perpendicular vector for constructing a flat base
		const perpX =  Math.sin(angle);
		const perpY = -Math.cos(angle);

		// Left and right corners of the arrow base
		const leftBaseX  = baseX + perpX * halfBase;
		const leftBaseY  = baseY + perpY * halfBase;
		const rightBaseX = baseX - perpX * halfBase;
		const rightBaseY = baseY - perpY * halfBase;

		// Draw filled triangular arrow head
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(tipX, tipY);
		ctx.lineTo(leftBaseX, leftBaseY);
		ctx.lineTo(rightBaseX, rightBaseY);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}
	
	/**
	 * Get hovered strat connection info
	 * worldX, worldY should be in WORLD SPACE coordinates
	 * scale is used to convert to canvas space for comparison
	 */
	getHoveredStratConnection(worldX, worldY, scale) {
		if (!this.stratConnections || worldX === undefined || worldY === undefined) return null;
		
		// Convert world space to canvas space (stratConnections are stored in canvas space)
		const canvasX = worldX * scale;
		const canvasY = worldY * scale;
		
		// Threshold in canvas space (remains constant regardless of zoom)
		const threshold = 8;
		
		for (const conn of this.stratConnections) {
			// Connection coords are in canvas space, mouse coords now converted to canvas space
			if (this.isPointNearLine(canvasX, canvasY, conn.fromX, conn.fromY, conn.toX, conn.toY, threshold)) {
				return conn;
			}
		}
		return null;
	}
	
	/**
	 * Check if point is near a line segment
	 */
	isPointNearLine(px, py, x1, y1, x2, y2, threshold) {
		const dx = x2 - x1;
		const dy = y2 - y1;
		const length = Math.sqrt(dx * dx + dy * dy);
		
		if (length === 0) return false;
		
		// Project point onto line
		const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));
		const projX = x1 + t * dx;
		const projY = y1 + t * dy;
		
		// Check distance
		const dist = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
		return dist <= threshold;
	}

	/**
	 * Get the base point of an arrowhead
	 * This is where the line should end so it does not overlap the arrowhead
	 */
	getArrowBasePoint(fromX, fromY, toX, toY, headLength) {
		const angle = Math.atan2(toY - fromY, toX - fromX);

		return {
			x: toX - headLength * Math.cos(angle),
			y: toY - headLength * Math.sin(angle)
		};
	}
	
	/**
	 * Render strat connections between nodes
	 * Handles layout offsets, hover detection, scaling, and arrowheads
	 */
	renderStratConnections(strats, nodes, scale, mouseX, mouseY) {
		if (!strats || !nodes) return;

		const ctx = this.ctx;

		// Apply global scale once (all drawing in world space)
		ctx.save();
		ctx.scale(scale, scale);

		// Build node position map (node centers, WORLD SPACE)
		const nodePositions = new Map();
		nodes.forEach(node => {
			const bounds = getNodeBounds(node);
			nodePositions.set(node.id, {
				x: bounds.x + bounds.w / 2,
				y: bounds.y + bounds.h / 2
			});
		});

		// Collect all valid connections
		const allConnections = [];
		strats.forEach((strat, index) => {
			if (!strat.link || strat.link.length !== 2) return;

			const [from, to] = strat.link;
			if (from !== to) {
				allConnections.push({
					from,
					to,
					name: strat.name,
					index: index + 1 // 1-based index
				});
			}
		});

		// Store rendered connections for external hover / selection logic
		this.stratConnections = [];

		allConnections.forEach(conn => {
			const fromPos = nodePositions.get(conn.from);
			const toPos   = nodePositions.get(conn.to);
			if (!fromPos || !toPos) return;

			// Offset parallel connections to avoid overlap
			const offset = this.getConnectionOffset(
				conn.from,
				conn.to,
				allConnections
			);

			// Direction vector
			const dx = toPos.x - fromPos.x;
			const dy = toPos.y - fromPos.y;
			const length = Math.hypot(dx, dy);

			// Perpendicular offset vector
			const perpX = -dy / length * offset;
			const perpY =  dx / length * offset;

			// Base connection line (before shortening)
			const baseFromX = fromPos.x + perpX;
			const baseFromY = fromPos.y + perpY;
			const baseToX   = toPos.x   + perpX;
			const baseToY   = toPos.y   + perpY;

			const nodePadding     = 20; // spacing from node centers
			const arrowHeadLength = 6;  // must match drawArrowHead (WORLD SPACE)

			// Shorten both ends to avoid overlapping node visuals
			const padded = this.getShortenedLineEndpoints(
				baseFromX,
				baseFromY,
				baseToX,
				baseToY,
				nodePadding
			);

			// Further shorten ONLY the arrow end to stop at arrow base
			const arrowBase = this.getArrowBasePoint(
				padded.fromX,
				padded.fromY,
				padded.toX,
				padded.toY,
				arrowHeadLength
			);

			// Final line endpoints (WORLD SPACE)
			const fromX = padded.fromX;
			const fromY = padded.fromY;
			const toX   = arrowBase.x; // line ends at arrow base
			const toY   = arrowBase.y;

			// Check if this connection has a reverse counterpart
			const isBidirectional = allConnections.some(c =>
				c.from === conn.to && c.to === conn.from
			);
			
			// Store connection geometry for hover detection (In canvas space for mouse collision testing)
			this.stratConnections.push({
				fromX: fromX * scale,
				fromY: fromY * scale,
				toX: toX * scale,
				toY: toY * scale,
				connections: [conn],
				isBidirectional
			});
			
			// Convert mouse position to world space for hit testing
			const worldMouseX = mouseX / scale;
			const worldMouseY = mouseY / scale;

			const isHovered =
				mouseX !== undefined &&
				mouseY !== undefined &&
				this.isPointNearLine(
					worldMouseX,
					worldMouseY,
					fromX,
					fromY,
					toX,
					toY,
					8
				);

			// Draw connection line
			ctx.strokeStyle = isHovered
				? 'rgba(255, 200, 0, 0.9)'
				: 'rgba(255, 165, 0, 0.6)';

			ctx.lineWidth = isHovered ? 3 : 2;

			ctx.beginPath();
			ctx.moveTo(fromX, fromY);
			ctx.lineTo(toX, toY);
			ctx.stroke();

			// Draw arrowhead(s) at the true padded endpoint
			ctx.fillStyle = isHovered
				? 'rgba(255, 180, 0, 1)'
				: 'rgba(255, 140, 0, 0.8)';

			const lineThickness = 3;

			if (isBidirectional) {
				this.drawArrowHead(ctx, fromX, fromY, padded.toX, padded.toY, 1, lineThickness);
				this.drawArrowHead(ctx, padded.toX, padded.toY, fromX, fromY, 1, lineThickness);
			} else {
				this.drawArrowHead(ctx, fromX, fromY, padded.toX, padded.toY, 1, lineThickness);
			}
		});

		ctx.restore();
	}
	
    /**
     * Get a complementary text color that contrasts well with the node color
     */
    getComplementaryTextColor(hexColor) {
        // Parse hex color
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Return white for dark colors, black for light colors
        return luminance > 0.5 ? '#000000' : '#FFFFFF';
    }
	
	/**
	 * Render the current drawing rectangle or triangle preview
	 */
	renderCurrentRect(rect, scale) {
		if (rect.isTriangle) {
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
			
			// Same logic as createTriangleFromRect
			if (dragRight && dragDown) {
				// Quadrant 4: Dragged right and down
				points = [
					{ x: x1, y: y1 },
					{ x: x2, y: y1 },
					{ x: x1, y: y2 }
				];
			} else if (!dragRight && dragDown) {
				// Quadrant 3: Dragged left and down
				points = [
					{ x: x1, y: y1 },
					{ x: x2, y: y1 },
					{ x: x2, y: y2 }
				];
			} else if (!dragRight && !dragDown) {
				// Quadrant 2: Dragged left and up
				points = [
					{ x: x2, y: y1 },
					{ x: x2, y: y2 },
					{ x: x1, y: y2 }
				];
			} else {
				// Quadrant 1: Dragged right and up
				points = [
					{ x: x1, y: y1 },
					{ x: x1, y: y2 },
					{ x: x2, y: y2 }
				];
			}
			
			this.ctx.beginPath();
			this.ctx.moveTo(points[0].x * scale, points[0].y * scale);
			this.ctx.lineTo(points[1].x * scale, points[1].y * scale);
			this.ctx.lineTo(points[2].x * scale, points[2].y * scale);
			this.ctx.closePath();
			
			this.ctx.fillStyle = "rgba(255,0,0,0.3)";
			this.ctx.fill();
			this.ctx.strokeStyle = "red";
			this.ctx.lineWidth = 2 / scale;
			this.ctx.stroke();
		} else {
			this.ctx.fillStyle = "rgba(255,0,0,0.6)";
			this.ctx.fillRect(rect.x * scale, rect.y * scale, rect.w * scale, rect.h * scale);
			this.ctx.strokeStyle = "red";
			this.ctx.lineWidth = 2 / scale;
			this.ctx.strokeRect(rect.x * scale, rect.y * scale, rect.w * scale, rect.h * scale);
		}
	}
	
    /**
     * Clear the entire canvas
     */
    clear() {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Draw the room background image
     */
    drawRoomImage(image) {
        if (image) {
            this.ctx.drawImage(image, 0, 0);
        }
    }

    /**
     * Complete redraw of the entire canvas
     */
	redraw(roomImage, nodes, selectedNodes, currentRect, scale, strats, mouseX, mouseY) {
		if (!roomImage) return;

		this.ctx.setTransform(1, 0, 0, 1, 0, 0);
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		this.ctx.drawImage(
			roomImage,
			0, 0,
			roomImage.width * scale,
			roomImage.height * scale
		);

		// Render all nodes
		const selectedSet = new Set(selectedNodes || []);
		for (const node of nodes) {
			const isSelected = selectedSet.has(node);
			this.renderNode(node, isSelected, scale);
		}

		// Render the strat connections
		if (strats) {
			this.renderStratConnections(strats, nodes, scale, mouseX, mouseY);
		}

		// Render the current (user-drawing) rect
		if (currentRect) {
			this.renderCurrentRect(currentRect, scale);
		}
	}

    /**
     * Update canvas size based on image and scale
     */
    updateCanvasSize(image, scale = 1) {
        if (!image) return;
        
        this.canvas.width = image.width * scale;
        this.canvas.height = image.height * scale;
        this.canvas.style.width = this.canvas.width + "px";
        this.canvas.style.height = this.canvas.height + "px";
        
        this.ctx.imageSmoothingEnabled = false;
        this.resetScrollPosition();
    }

    /**
     * Reset scroll position to top-left
     */
    resetScrollPosition() {
        this.mapContainer.scrollLeft = 0;
        this.mapContainer.scrollTop = 0;
    }

    /**
     * Update scroll position for zoom centering
     */
    updateScrollForZoom(oldScale, newScale, centerX, centerY) {
        const scaleRatio = newScale / oldScale;
        this.mapContainer.scrollLeft = (this.mapContainer.scrollLeft + centerX) * scaleRatio - centerX;
        this.mapContainer.scrollTop = (this.mapContainer.scrollTop + centerY) * scaleRatio - centerY;
    }
}