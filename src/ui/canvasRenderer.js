/**
 * Canvas Renderer - Handles all canvas drawing operations with geometry support
 */
import {
	getNodeBounds
} from '../core/geometryUtils.js';

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
	renderNode(node, isSelected, scale, strats, isDimmed) {
		if (!node?.geometry || node.geometry.length === 0) return;

		const color = node.color || '#0000FF';
		let fillStyle = isSelected ? 'rgba(255,255,0,0.3)' : this.withAlpha(color, 0.3);
		let strokeStyle = isSelected ? 'yellow' : color;

		// Apply dimming - default to dimmed unless explicitly not dimmed
		if (isDimmed) {
			fillStyle = this.withAlpha(color, 0.08);
			strokeStyle = this.withAlpha(color, 0.2);
		}

		this.ctx.save();

		// Fill each shape individually
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

		// Apply tint overlay if node has entrance/exit conditions
		const tintColor = this.getNodeTintColor(node.id, strats);
		if (tintColor && !isDimmed) {
			this.ctx.fillStyle = tintColor;
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
		}

		// Stroke edges
		this.ctx.strokeStyle = strokeStyle;
		this.ctx.lineWidth = 2 / scale;

		for (const shape of node.geometry) {
			if (shape.shape === 'rect') {
				this.strokeRectEdgesIfExterior(node.geometry, shape, scale, strokeStyle);
			} else if (shape.shape === 'tri') {
				this.strokeTriEdgesIfExterior(node.geometry, shape, scale, strokeStyle);
			}
		}

		this.ctx.restore();
		this.renderNodeLabel(node, scale, strats, isDimmed);
	}

	/**
	 * Stroke only the exterior edges of a rectangle
	 */
	strokeRectEdgesIfExterior(allShapes, rect, scale, strokeStyle) {
		const edges = [{
				x1: rect.x,
				y1: rect.y,
				x2: rect.x + rect.w,
				y2: rect.y
			}, // top
			{
				x1: rect.x + rect.w,
				y1: rect.y,
				x2: rect.x + rect.w,
				y2: rect.y + rect.h
			}, // right
			{
				x1: rect.x,
				y1: rect.y + rect.h,
				x2: rect.x + rect.w,
				y2: rect.y + rect.h
			}, // bottom
			{
				x1: rect.x,
				y1: rect.y,
				x2: rect.x,
				y2: rect.y + rect.h
			} // left
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

		const edges = [{
				x1: tri.points[0].x,
				y1: tri.points[0].y,
				x2: tri.points[1].x,
				y2: tri.points[1].y
			},
			{
				x1: tri.points[1].x,
				y1: tri.points[1].y,
				x2: tri.points[2].x,
				y2: tri.points[2].y
			},
			{
				x1: tri.points[2].x,
				y1: tri.points[2].y,
				x2: tri.points[0].x,
				y2: tri.points[0].y
			}
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
			edges.push({
				x1: shape.x,
				y1: shape.y,
				x2: shape.x + shape.w,
				y2: shape.y
			}, {
				x1: shape.x + shape.w,
				y1: shape.y,
				x2: shape.x + shape.w,
				y2: shape.y + shape.h
			}, {
				x1: shape.x,
				y1: shape.y + shape.h,
				x2: shape.x + shape.w,
				y2: shape.y + shape.h
			}, {
				x1: shape.x,
				y1: shape.y,
				x2: shape.x,
				y2: shape.y + shape.h
			});
		} else if (shape.shape === 'tri' && shape.points && shape.points.length === 3) {
			edges.push({
				x1: shape.points[0].x,
				y1: shape.points[0].y,
				x2: shape.points[1].x,
				y2: shape.points[1].y
			}, {
				x1: shape.points[1].x,
				y1: shape.points[1].y,
				x2: shape.points[2].x,
				y2: shape.points[2].y
			}, {
				x1: shape.points[2].x,
				y1: shape.points[2].y,
				x2: shape.points[0].x,
				y2: shape.points[0].y
			});
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
	renderNodeLabel(node, scale, strats, isDimmed) {
		const bounds = getNodeBounds(node);
		const centerX = (bounds.x + bounds.w / 2) * scale;
		const centerY = (bounds.y + bounds.h / 2) * scale;

		// Calculate font size based on bounds and scale
		const fontSize = Math.max(12, Math.min(20, Math.min(bounds.w, bounds.h) * scale * 0.4));

		const label = String(node.id);
		this.ctx.font = `bold ${fontSize}px "Courier New", monospace`;
		this.ctx.textAlign = 'center';
		this.ctx.textBaseline = 'middle';
		const metrics = this.ctx.measureText(label);
		const padding = 4;

		// Draw star as background if node has self-link strats
		const hasSelfLink = this.hasSelfLinkStrats(node.id, strats);
		if (hasSelfLink && !isDimmed) {
			const starSizeMultiplier = 3.5; // Easy to tweak
			const starSize = fontSize * starSizeMultiplier;

			this.ctx.save();
			this.ctx.fillStyle = 'rgba(255, 200, 50, 0.6)';
			this.ctx.strokeStyle = 'rgba(255, 165, 0, 0.8)';
			this.ctx.lineWidth = Math.max(2, starSize * 0.05);
			this.ctx.font = `${starSize}px Arial`;
			this.ctx.strokeText('★', centerX, centerY);
			this.ctx.fillText('★', centerX, centerY);
			this.ctx.restore();
		}

		// Draw semi-transparent background for text
		this.ctx.fillStyle = isDimmed ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.8)';
		this.ctx.fillRect(
			centerX - metrics.width / 2 - padding,
			centerY - fontSize / 2 - padding,
			metrics.width + padding * 2,
			fontSize + padding * 2
		);

		// Draw black outline for contrast
		if (!isDimmed) {
			this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
			this.ctx.lineWidth = Math.max(4, fontSize * 0.3);
			this.ctx.font = `bold ${fontSize}px "Courier New", monospace`;
			this.ctx.strokeText(label, centerX, centerY);
		}

		// Draw the text in a bright, readable color
		this.ctx.fillStyle = isDimmed ? 'rgba(200, 200, 200, 0.4)' : '#FFD700'; // Gold color
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

		if (length === 0) return {
			fromX,
			fromY,
			toX,
			toY
		};

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
		const perpX = Math.sin(angle);
		const perpY = -Math.cos(angle);

		// Left and right corners of the arrow base
		const leftBaseX = baseX + perpX * halfBase;
		const leftBaseY = baseY + perpY * halfBase;
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
	 * Get all hovered strat connection info
	 * worldX, worldY should be in WORLD SPACE coordinates
	 * scale is used to convert to canvas space for comparison
	 */
	getHoveredStratConnections(worldX, worldY, scale) {
		if (!this.stratConnections || worldX === undefined || worldY === undefined) {
			return [];
		}

		// Convert world space to canvas space (stratConnections are stored in canvas space)
		const canvasX = worldX * scale;
		const canvasY = worldY * scale;

		// Threshold in canvas space (remains constant regardless of zoom)
		const threshold = 8;

		const hits = [];

		for (const conn of this.stratConnections) {
			// Connection coords are in canvas space, mouse coords now converted to canvas space
			if (this.isPointNearLine(
					canvasX,
					canvasY,
					conn.fromX,
					conn.fromY,
					conn.toX,
					conn.toY,
					threshold
				)) {
				hits.push(conn);
			}
		}

		return hits;
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
	renderStratConnections(strats, nodes, scale, mouseX, mouseY, hideBaseStrats = false) {
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

		// Collect all valid connections with full strat data
		const allConnections = [];
		strats.forEach((strat, index) => {
			if (!strat.link || strat.link.length !== 2) return;

			// Skip base strats if hidden
			if (hideBaseStrats && strat.name === 'Base') return;

			const [from, to] = strat.link;
			allConnections.push({
				from,
				to,
				name: strat.name,
				index: index + 1, // 1-based index
				hasEntranceCondition: !!strat.entranceCondition,
				hasExitCondition: !!strat.exitCondition,
				isSelfLink: from === to,
				strat: strat // Keep full strat for color detection
			});
		});

		// Store rendered connections for external hover / selection logic
		this.stratConnections = [];

		// Determine what's being hovered
		const worldMouseX = mouseX !== undefined ? mouseX / scale : undefined;
		const worldMouseY = mouseY !== undefined ? mouseY / scale : undefined;

		let hoveredNodeId = null;
		const hoveredConnectionIndices = new Set();

		// Check for hovered nodes first
		if (worldMouseX !== undefined && worldMouseY !== undefined) {
			for (const node of nodes) {
				const bounds = getNodeBounds(node);
				if (worldMouseX >= bounds.x && worldMouseX <= bounds.x + bounds.w &&
					worldMouseY >= bounds.y && worldMouseY <= bounds.y + bounds.h) {
					hoveredNodeId = node.id;
					break;
				}
			}
		}

		// Pre-calculate all curve points and check for hover
		const connectionData = [];

		allConnections.forEach(conn => {
			if (conn.isSelfLink) return; // Skip self-links for connection rendering

			const fromPos = nodePositions.get(conn.from);
			const toPos = nodePositions.get(conn.to);
			if (!fromPos || !toPos) return;

			// Group connections by direction pair
			const sameDirectionConns = allConnections.filter(c =>
				!c.isSelfLink && c.from === conn.from && c.to === conn.to
			);

			// Calculate curve offset for multiple connections in same direction
			let curveOffset = 0;
			if (sameDirectionConns.length > 1) {
				const thisIndex = sameDirectionConns.findIndex(c => c.index === conn.index);
				curveOffset = (thisIndex - (sameDirectionConns.length - 1) / 2) * 15;
			}

			// Direction vector
			const dx = toPos.x - fromPos.x;
			const dy = toPos.y - fromPos.y;
			const length = Math.hypot(dx, dy);

			// Perpendicular offset vector for curve
			const perpX = -dy / length * curveOffset;
			const perpY = dx / length * curveOffset;

			// Calculate control point for quadratic curve
			const midX = (fromPos.x + toPos.x) / 2 + perpX;
			const midY = (fromPos.y + toPos.y) / 2 + perpY;

			const nodePadding = 20;
			const arrowHeadLength = 6;

			// Calculate curve points for collision detection (in WORLD space)
			// Use finer granularity for better hover detection on curved lines
			const curvePoints = [];
			for (let t = 0; t <= 1; t += 0.02) {
				const x = (1 - t) * (1 - t) * fromPos.x + 2 * (1 - t) * t * midX + t * t * toPos.x;
				const y = (1 - t) * (1 - t) * fromPos.y + 2 * (1 - t) * t * midY + t * t * toPos.y;
				curvePoints.push({
					x,
					y
				});
			}

			// Check if mouse is near this curve (only if not hovering a node)
			// Use expanded threshold for curved lines
			let isHovered = false;
			if (worldMouseX !== undefined && worldMouseY !== undefined && hoveredNodeId === null) {
				const hoverThreshold = 12; // Increased threshold for curved lines
				for (let i = 0; i < curvePoints.length - 1; i++) {
					if (this.isPointNearLine(
							worldMouseX, worldMouseY,
							curvePoints[i].x, curvePoints[i].y,
							curvePoints[i + 1].x, curvePoints[i + 1].y,
							hoverThreshold
						)) {
						isHovered = true;
						hoveredConnectionIndices.add(conn.index);
						break;
					}
				}
			}

			// Store all data for rendering
			connectionData.push({
				conn,
				fromPos,
				toPos,
				midX,
				midY,
				length,
				curvePoints,
				isHovered,
				nodePadding,
				arrowHeadLength,
				curveOffset
			});

			// Store connection geometry for external access (in CANVAS space for mouse collision)
			this.stratConnections.push({
				fromX: fromPos.x * scale,
				fromY: fromPos.y * scale,
				toX: toPos.x * scale,
				toY: toPos.y * scale,
				connections: [conn],
				curvePoints: curvePoints.map(p => ({
					x: p.x * scale,
					y: p.y * scale
				})),
				stratIndex: conn.index
			});
		});

		// Store hovered indices for external access
		this.hoveredConnectionIndices = hoveredConnectionIndices;

		// Now render all connections
		connectionData.forEach(data => {
			const {
				conn,
				fromPos,
				toPos,
				midX,
				midY,
				length,
				curvePoints,
				isHovered,
				nodePadding,
				arrowHeadLength,
				curveOffset
			} = data;

			// Get color based on strat type
			const colors = this.getStratColor(conn.strat);

			// Determine if this connection should be dimmed
			const shouldDim = hoveredNodeId !== null ||
				(hoveredConnectionIndices.size > 0 && !hoveredConnectionIndices.has(conn.index));

			let strokeColor = isHovered ? colors.hover : (shouldDim ? colors.dim : colors.base);
			let fillColor = isHovered ? colors.hover : (shouldDim ? colors.dim : colors.base);

			// Calculate start point (after node padding)
			const tStart = nodePadding / length;
			const startX = (1 - tStart) * (1 - tStart) * fromPos.x + 2 * (1 - tStart) * tStart * midX + tStart * tStart * toPos.x;
			const startY = (1 - tStart) * (1 - tStart) * fromPos.y + 2 * (1 - tStart) * tStart * midY + tStart * tStart * toPos.y;

			// Calculate arrow tip position
			const tTip = 1 - nodePadding / length;
			const tipX = (1 - tTip) * (1 - tTip) * fromPos.x + 2 * (1 - tTip) * tTip * midX + tTip * tTip * toPos.x;
			const tipY = (1 - tTip) * (1 - tTip) * fromPos.y + 2 * (1 - tTip) * tTip * midY + tTip * tTip * toPos.y;

			// Calculate end point accounting for arrow head length along the curve
			// We need to find the point that's exactly arrowHeadLength away from tip along the curve
			const tEndApprox = 1 - (nodePadding + arrowHeadLength * 1.2) / length; // Adjust multiplier to account for curve
			const endX = (1 - tEndApprox) * (1 - tEndApprox) * fromPos.x + 2 * (1 - tEndApprox) * tEndApprox * midX + tEndApprox * tEndApprox * toPos.x;
			const endY = (1 - tEndApprox) * (1 - tEndApprox) * fromPos.y + 2 * (1 - tEndApprox) * tEndApprox * midY + tEndApprox * tEndApprox * toPos.y;

			// Draw curved connection line
			ctx.strokeStyle = strokeColor;
			ctx.lineWidth = isHovered ? 3 : 2;

			ctx.beginPath();
			ctx.moveTo(startX, startY);

			// Draw curve to end point (not tip)
			const steps = 20;
			for (let i = 1; i <= steps; i++) {
				const t = tStart + (tEndApprox - tStart) * (i / steps);
				const x = (1 - t) * (1 - t) * fromPos.x + 2 * (1 - t) * t * midX + t * t * toPos.x;
				const y = (1 - t) * (1 - t) * fromPos.y + 2 * (1 - t) * t * midY + t * t * toPos.y;
				ctx.lineTo(x, y);
			}
			ctx.stroke();

			// Draw arrowhead
			ctx.fillStyle = fillColor;
			this.drawArrowHead(ctx, endX, endY, tipX, tipY, 1, 3);
		});

		ctx.restore();
	}
	/**
	 * Get node tint color based on entrance/exit conditions
	 */
	getNodeTintColor(nodeId, strats) {
		if (!strats) return null;

		let hasEntrance = false;
		let hasExit = false;

		for (const strat of strats) {
			if (!strat.link || strat.link.length !== 2) continue;

			// Entrance condition applies to first node in link
			if (strat.entranceCondition && strat.link[0] === nodeId) {
				hasEntrance = true;
			}

			// Exit condition applies to second node in link
			if (strat.exitCondition && strat.link[1] === nodeId) {
				hasExit = true;
			}
		}

		if (hasEntrance && hasExit) return 'rgba(200, 100, 255, 0.4)'; // Purple
		if (hasEntrance) return 'rgba(100, 255, 100, 0.4)'; // Green
		if (hasExit) return 'rgba(255, 200, 100, 0.4)'; // Orange

		return null;
	}

	/**
	 * Check if node has self-link strats
	 */
	hasSelfLinkStrats(nodeId, strats) {
		if (!strats) return false;

		return strats.some(strat =>
			strat.link &&
			strat.link.length === 2 &&
			strat.link[0] === nodeId &&
			strat.link[1] === nodeId
		);
	}

	/**
	 * Check if strat contains specific frame type
	 */
	stratContainsFrameType(strat, frameType) {
		const checkObject = (obj) => {
			if (!obj || typeof obj !== 'object') return false;

			if (obj.hasOwnProperty(frameType)) return true;

			for (const value of Object.values(obj)) {
				if (Array.isArray(value)) {
					for (const item of value) {
						if (checkObject(item)) return true;
					}
				} else if (typeof value === 'object') {
					if (checkObject(value)) return true;
				}
			}

			return false;
		};

		return checkObject(strat);
	}

	/**
	 * Get strat color based on frame requirements
	 */
	getStratColor(strat) {
		// Base strats get their own color
		if (strat.name === 'Base') {
			return {
				base: 'rgba(180, 180, 180, 0.5)',
				hover: 'rgba(200, 200, 200, 1)',
				dim: 'rgba(180, 180, 180, 0.1)'
			};
		}

		// Priority order: lava > acid > electricity > heat > cold > default
		if (this.stratContainsFrameType(strat, 'lavaFrames')) {
			return {
				base: 'rgba(160, 0, 200, 0.7)',
				hover: 'rgba(180, 20, 220, 1)',
				dim: 'rgba(160, 0, 200, 0.15)'
			};
		}
		if (this.stratContainsFrameType(strat, 'acidFrames')) {
			return {
				base: 'rgba(220, 20, 20, 0.7)',
				hover: 'rgba(255, 40, 40, 1)',
				dim: 'rgba(220, 20, 20, 0.15)'
			};
		}
		if (this.stratContainsFrameType(strat, 'electricityFrames')) {
			return {
				base: 'rgba(255, 220, 0, 0.7)',
				hover: 'rgba(255, 240, 40, 1)',
				dim: 'rgba(255, 220, 0, 0.15)'
			};
		}
		if (this.stratContainsFrameType(strat, 'heatFrames')) {
			return {
				base: 'rgba(255, 100, 150, 0.7)',
				hover: 'rgba(255, 130, 180, 1)',
				dim: 'rgba(255, 100, 150, 0.15)'
			};
		}
		if (this.stratContainsFrameType(strat, 'coldFrames')) {
			return {
				base: 'rgba(80, 160, 255, 0.7)',
				hover: 'rgba(100, 180, 255, 1)',
				dim: 'rgba(80, 160, 255, 0.15)'
			};
		}

		// Default orange
		return {
			base: 'rgba(255, 150, 40, 0.7)',
			hover: 'rgba(255, 180, 80, 1)',
			dim: 'rgba(255, 150, 40, 0.15)'
		};
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
				points = [{
						x: x1,
						y: y1
					},
					{
						x: x2,
						y: y1
					},
					{
						x: x1,
						y: y2
					}
				];
			} else if (!dragRight && dragDown) {
				// Quadrant 3: Dragged left and down
				points = [{
						x: x1,
						y: y1
					},
					{
						x: x2,
						y: y1
					},
					{
						x: x2,
						y: y2
					}
				];
			} else if (!dragRight && !dragDown) {
				// Quadrant 2: Dragged left and up
				points = [{
						x: x2,
						y: y1
					},
					{
						x: x2,
						y: y2
					},
					{
						x: x1,
						y: y2
					}
				];
			} else {
				// Quadrant 1: Dragged right and up
				points = [{
						x: x1,
						y: y1
					},
					{
						x: x1,
						y: y2
					},
					{
						x: x2,
						y: y2
					}
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
	redraw(roomImage, nodes, selectedNodes, currentRect, scale, strats, mouseX, mouseY, hideBaseStrats = false) {
		if (!roomImage) return;

		this.ctx.setTransform(1, 0, 0, 1, 0, 0);
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		this.ctx.drawImage(
			roomImage,
			0, 0,
			roomImage.width * scale,
			roomImage.height * scale
		);

		// Determine what's being hovered
		const worldMouseX = mouseX !== undefined ? mouseX / scale : undefined;
		const worldMouseY = mouseY !== undefined ? mouseY / scale : undefined;

		let hoveredNodeId = null;
		let isHoveringConnection = false;

		// Check for hovered nodes
		if (worldMouseX !== undefined && worldMouseY !== undefined) {
			for (const node of nodes) {
				const bounds = getNodeBounds(node);
				if (worldMouseX >= bounds.x && worldMouseX <= bounds.x + bounds.w &&
					worldMouseY >= bounds.y && worldMouseY <= bounds.y + bounds.h) {
					hoveredNodeId = node.id;
					break;
				}
			}

			// If not hovering a node, check for connection hover
			if (hoveredNodeId === null) {
				const hoveredConns = this.getHoveredStratConnections(worldMouseX, worldMouseY, scale);
				isHoveringConnection = hoveredConns.length > 0;
			}
		}

		// Everything is dimmed by default unless explicitly hovered
		const shouldDimEverything = hoveredNodeId !== null || isHoveringConnection;

		// Render all nodes
		const selectedSet = new Set(selectedNodes || []);
		for (const node of nodes) {
			const isSelected = selectedSet.has(node);
			const isDimmed = shouldDimEverything && hoveredNodeId !== node.id;
			this.renderNode(node, isSelected, scale, strats, isDimmed);
		}

		// Render the strat connections
		if (strats) {
			this.renderStratConnections(strats, nodes, scale, mouseX, mouseY, hideBaseStrats);
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