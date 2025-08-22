/**
 * Canvas Renderer - Handles all canvas drawing operations
 * Responsible for rendering the room image, nodes, and interactive elements
 */

export class CanvasRenderer {
	constructor(canvas, mapContainer) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");
		this.mapContainer = mapContainer;
	}

	/**
	 * Draw a rectangle with fill and stroke
	 * @param {Object} rect - Rectangle with x, y, w, h properties
	 * @param {string} fillStyle - Fill color/style
	 * @param {string} strokeStyle - Stroke color/style
	 * @param {number} scale - Current zoom scale for line width adjustment
	 */
	drawRect(rect, fillStyle, strokeStyle, scale = 1) {
		// Fill the rectangle
		this.ctx.fillStyle = fillStyle;
		this.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

		// Draw the border
		this.ctx.strokeStyle = strokeStyle;
		this.ctx.lineWidth = 2 / scale;
		this.ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
	}

	/**
	 * Render a single node with appropriate styling based on selection state
	 * @param {Object} node - Node object with position and size
	 * @param {boolean} isSelected - Whether this node is currently selected
	 * @param {number} scale - Current zoom scale
	 */
	renderNode(node, isSelected, scale) {
		const fillStyle = isSelected ? "rgba(255,255,0,0.3)" : "rgba(0,0,255,0.3)";
		const strokeStyle = isSelected ? "yellow" : "blue";
		this.drawRect(node, fillStyle, strokeStyle, scale);
	}

	/**
	 * Render the current drawing rectangle (while user is dragging)
	 * @param {Object} rect - Rectangle being drawn
	 * @param {number} scale - Current zoom scale
	 */
	renderCurrentRect(rect, scale) {
		this.drawRect(rect, "rgba(255,0,0,0.6)", "red", scale);
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
	 * @param {HTMLImageElement} image - The room image to draw
	 */
	drawRoomImage(image) {
		if (image) {
			this.ctx.drawImage(image, 0, 0);
		}
	}

	/**
	 * Complete redraw of the entire canvas
	 * @param {HTMLImageElement} roomImage - Background room image
	 * @param {Array} nodes - Array of nodes to render
	 * @param {Object} selectedNode - Currently selected node (if any)
	 * @param {Object} currentRect - Rectangle being drawn (if any)
	 * @param {number} scale - Current zoom scale
	 */
	redraw(roomImage, nodes, selectedNode, currentRect, scale) {
		// Early exit if no room image loaded
		if (!roomImage) return;

		// Clear canvas and reset transforms
		this.clear();

		// Draw the background room image
		this.drawRoomImage(roomImage);

		// Draw all nodes
		nodes.forEach(node => {
			this.renderNode(node, selectedNode === node, scale);
		});

		// Draw current rectangle being created (if any)
		if (currentRect) {
			this.renderCurrentRect(currentRect, scale);
		}
	}

	/**
	 * Update canvas size and styling based on image and scale
	 * @param {HTMLImageElement} image - The room image
	 * @param {number} scale - Current zoom scale
	 */
	updateCanvasSize(image, scale) {
		if (!image) return;

		// Set actual canvas dimensions
		this.canvas.width = image.width;
		this.canvas.height = image.height;

		// Set display size based on scale
		this.canvas.style.width = image.width * scale + "px";
		this.canvas.style.height = image.height * scale + "px";
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
	 * @param {number} oldScale - Previous scale value
	 * @param {number} newScale - New scale value
	 * @param {number} centerX - X coordinate to center zoom on
	 * @param {number} centerY - Y coordinate to center zoom on
	 */
	updateScrollForZoom(oldScale, newScale, centerX, centerY) {
		const scaleRatio = newScale / oldScale;
		this.mapContainer.scrollLeft = (this.mapContainer.scrollLeft + centerX) * scaleRatio - centerX;
		this.mapContainer.scrollTop = (this.mapContainer.scrollTop + centerY) * scaleRatio - centerY;
	}
}