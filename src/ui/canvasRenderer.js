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
    redraw(roomImage, nodes, selectedNode, currentRect, scale, enemies) {
        if (!roomImage) return;

        // Clear canvas
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background image at scaled size
        this.ctx.drawImage(
            roomImage,
            0, 0,
            roomImage.width * scale,
            roomImage.height * scale
        );

        // Render junction nodes with colors
        for (const node of nodes) {
            if (node.nodeType !== 'junction') {
                //console.warn('Skipping non-junction node:', node);
                continue;
            }

            const scaledNode = {
                x: node.x * scale,
                y: node.y * scale,
                w: node.w * scale,
                h: node.h * scale
            };

            const color = node.color || '#0000FF';
            const fillStyle = selectedNode === node ?
                'rgba(255,255,0,0.3)' :
                this.withAlpha(color, 0.3);
            const strokeStyle = selectedNode === node ? 'yellow' : color;

            this.drawRect(scaledNode, fillStyle, strokeStyle, 1);
        };

        // Render enemy nodes
        this.renderEnemyNodes(enemies, nodes, scale);

        if (currentRect) {
            const scaledRect = {
                x: currentRect.x * scale,
                y: currentRect.y * scale,
                w: currentRect.w * scale,
                h: currentRect.h * scale
            };
            this.renderCurrentRect(scaledRect, 1);
        }
    }
    /**
     * Update canvas size and styling based on image and scale
     * @param {HTMLImageElement} image - The room image
     * @param {number} scale - Current zoom scale
     */
    updateCanvasSize(image, scale = 1) {
        if (!image) return;
        // Adjust canvas intrinsic size to match current scale
        this.canvas.width = image.width * scale;
        this.canvas.height = image.height * scale;
        // CSS size stays 1:1 with intrinsic canvas
        this.canvas.style.width = this.canvas.width + "px";
        this.canvas.style.height = this.canvas.height + "px";
        // Disable smoothing for pixel-perfect visuals
        this.ctx.imageSmoothingEnabled = false;
        // Reset scroll to top-left
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
    /**
     * Render enemy patrol areas as circles
     * @param {Array} enemies - Enemy data
     * @param {Array} nodes - All nodes
     * @param {number} scale - Current zoom scale
     */
    renderEnemyNodes(enemies, nodes, scale) {
        if (!enemies || !enemies.length) return;

        enemies.forEach(enemy => {
            // Decide which nodes this enemy uses
            const nodeIds =
                Array.isArray(enemy.homeNodes) && enemy.homeNodes.length ?
                enemy.homeNodes :
                Array.isArray(enemy.betweenNodes) && enemy.betweenNodes.length === 2 ?
                enemy.betweenNodes : [];

            if (!nodeIds.length) {
                console.warn('[EnemyRenderer] Enemy has no patrol nodes:', enemy);
                return;
            }

            // Resolve node objects (string/number safe)
            const patrolNodes = nodeIds
                .map(id => nodes.find(n => String(n.id) === String(id)))
                .filter(Boolean);

            if (!patrolNodes.length) {
                console.warn('[EnemyRenderer] No matching nodes for enemy:', enemy, nodeIds);
                return;
            }

            // Draw one circle per node, for homeNodes
            if (enemy.homeNodes?.length) {
                patrolNodes.forEach(node => {
                    this.drawEnemyAtNode(enemy, node, scale);
                });
                return;
            }

            // Draw at midpoint, for betweenNodes
            if (enemy.betweenNodes?.length === 2 && patrolNodes.length === 2) {
                const [a, b] = patrolNodes;

                const centerX =
                    ((a.x + a.w / 2) + (b.x + b.w / 2)) / 2 * scale;
                const centerY =
                    ((a.y + a.h / 2) + (b.y + b.h / 2)) / 2 * scale;

                const radius =
                    Math.max(a.w, a.h, b.w, b.h) * scale * 0.8;

                this.drawEnemyCircle(enemy, centerX, centerY, radius, scale);
            }
        });
    }

    drawEnemyAtNode(enemy, node, scale) {
        const centerX = (node.x + node.w / 2) * scale;
        const centerY = (node.y + node.h / 2) * scale;
        const radius = Math.max(node.w, node.h) * scale * 0.7;

        this.drawEnemyCircle(enemy, centerX, centerY, radius, scale);
    }

    drawEnemyCircle(enemy, x, y, radius, scale) {
        this.ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
        this.ctx.strokeStyle = 'rgba(255, 50, 50, 0.85)';
        this.ctx.lineWidth = 2 / scale;

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Label
        const label = (enemy.groupName || '')
            .substring(0, 4)
            .toUpperCase();

        if (label) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.font = `${12 / scale}px monospace`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(label, x, y);
        }
    }
}