/**
 * Geometry Utilities - Helper functions for working with node geometry
 */

/**
 * Get the bounding box of a node's geometry
 * @param {Object} node - Node with geometry array
 * @returns {Object} {x, y, w, h} bounding box
 */
export function getNodeBounds(node) {
    if (!node?.geometry || node.geometry.length === 0) {
        return { x: 0, y: 0, w: 0, h: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const shape of node.geometry) {
        if (shape.shape === 'rect') {
            minX = Math.min(minX, shape.x);
            minY = Math.min(minY, shape.y);
            maxX = Math.max(maxX, shape.x + shape.w);
            maxY = Math.max(maxY, shape.y + shape.h);
        } else if (shape.shape === 'tri' && shape.points) {
            for (const point of shape.points) {
                minX = Math.min(minX, point.x);
                minY = Math.min(minY, point.y);
                maxX = Math.max(maxX, point.x);
                maxY = Math.max(maxY, point.y);
            }
        }
    }

    return {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY
    };
}

/**
 * Check if a point is inside a node's geometry
 * @param {Object} node - Node with geometry array
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {boolean} True if point is inside any shape in the geometry
 */
export function isPointInNode(node, x, y) {
    if (!node?.geometry) return false;

    for (const shape of node.geometry) {
        if (shape.shape === 'rect') {
            if (x >= shape.x && x <= shape.x + shape.w &&
                y >= shape.y && y <= shape.y + shape.h) {
                return true;
            }
        } else if (shape.shape === 'tri' && shape.points) {
            if (isPointInTriangle(x, y, shape.points)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Check if point is inside a triangle
 * @param {number} x - Point X
 * @param {number} y - Point Y
 * @param {Array} points - Triangle points [{x, y}, {x, y}, {x, y}]
 * @returns {boolean}
 */
function isPointInTriangle(x, y, points) {
    if (points.length !== 3) return false;
    
    const [p0, p1, p2] = points;
    const area = 0.5 * (-p1.y * p2.x + p0.y * (-p1.x + p2.x) + p0.x * (p1.y - p2.y) + p1.x * p2.y);
    const s = 1 / (2 * area) * (p0.y * p2.x - p0.x * p2.y + (p2.y - p0.y) * x + (p0.x - p2.x) * y);
    const t = 1 / (2 * area) * (p0.x * p1.y - p0.y * p1.x + (p0.y - p1.y) * x + (p1.x - p0.x) * y);
    
    return s >= 0 && t >= 0 && (s + t) <= 1;
}

/**
 * Translate all shapes in a node's geometry by dx, dy
 * @param {Object} node - Node to translate
 * @param {number} dx - Delta X
 * @param {number} dy - Delta Y
 */
export function translateNodeGeometry(node, dx, dy) {
    if (!node?.geometry) return;

    for (const shape of node.geometry) {
        if (shape.shape === 'rect') {
            shape.x += dx;
            shape.y += dy;
        } else if (shape.shape === 'tri' && shape.points) {
            for (const point of shape.points) {
                point.x += dx;
                point.y += dy;
            }
        }
    }
}

/**
 * Scale a node's geometry from a corner
 * @param {Object} node - Node to scale
 * @param {number} newW - New width
 * @param {number} newH - New height
 */
export function scaleNodeGeometry(node, newW, newH) {
    const bounds = getNodeBounds(node);
    if (bounds.w === 0 || bounds.h === 0) return;

    const scaleX = newW / bounds.w;
    const scaleY = newH / bounds.h;
    const originX = bounds.x;
    const originY = bounds.y;

    for (const shape of node.geometry) {
        if (shape.shape === 'rect') {
            shape.x = Math.round(originX + (shape.x - originX) * scaleX);
            shape.y = Math.round(originY + (shape.y - originY) * scaleY);
            shape.w = Math.max(8, Math.round(shape.w * scaleX));
            shape.h = Math.max(8, Math.round(shape.h * scaleY));
        } else if (shape.shape === 'tri' && shape.points) {
            for (const point of shape.points) {
                point.x = Math.round(originX + (point.x - originX) * scaleX);
                point.y = Math.round(originY + (point.y - originY) * scaleY);
            }
        }
    }
}

/**
 * Normalize geometry to ensure no negative coordinates
 * @param {Array} geometry - Geometry array to normalize
 */
export function normalizeGeometry(geometry) {
    if (!geometry || geometry.length === 0) return;

    // Find minimum coordinates
    let minX = Infinity;
    let minY = Infinity;

    for (const shape of geometry) {
        if (shape.shape === 'rect') {
            minX = Math.min(minX, shape.x);
            minY = Math.min(minY, shape.y);
        } else if (shape.shape === 'tri' && shape.points) {
            for (const point of shape.points) {
                minX = Math.min(minX, point.x);
                minY = Math.min(minY, point.y);
            }
        }
    }

    // If we have negative coordinates, shift everything
    if (minX < 0 || minY < 0) {
        const shiftX = minX < 0 ? -minX : 0;
        const shiftY = minY < 0 ? -minY : 0;

        for (const shape of geometry) {
            if (shape.shape === 'rect') {
                shape.x += shiftX;
                shape.y += shiftY;
            } else if (shape.shape === 'tri' && shape.points) {
                for (const point of shape.points) {
                    point.x += shiftX;
                    point.y += shiftY;
                }
            }
        }
    }
}

/**
 * Merge multiple nodes' geometry into one
 * @param {Array} nodes - Array of nodes to merge
 * @returns {Array} Combined geometry array
 */
export function mergeNodesGeometry(nodes) {
    const combined = [];
    
    for (const node of nodes) {
        if (node?.geometry) {
            // Deep clone each shape
            for (const shape of node.geometry) {
                if (shape.shape === 'rect') {
                    combined.push({
                        shape: 'rect',
                        x: shape.x,
                        y: shape.y,
                        w: shape.w,
                        h: shape.h
                    });
                } else if (shape.shape === 'tri' && shape.points) {
                    combined.push({
                        shape: 'tri',
                        points: shape.points.map(p => ({ x: p.x, y: p.y }))
                    });
                }
            }
        }
    }

    normalizeGeometry(combined);
    return combined;
}

/**
 * Check if point is in resize corner of node
 * @param {Object} node - Node to check
 * @param {number} x - Mouse X
 * @param {number} y - Mouse Y
 * @returns {boolean}
 */
export function isInResizeCorner(node, x, y) {
    const bounds = getNodeBounds(node);
    const cornerSize = 10;
    
    return (
        x >= bounds.x + bounds.w - cornerSize &&
        x <= bounds.x + bounds.w &&
        y >= bounds.y + bounds.h - cornerSize &&
        y <= bounds.y + bounds.h
    );
}