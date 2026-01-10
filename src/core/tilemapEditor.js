/* =============================================================================
   Reusable TileMap Editor Component
   
   A configurable grid editor for editing map tile masks with dynamic resizing.
   Can be embedded in any editor that needs tilemap editing functionality.
   
   Usage:
   const tileMapEditor = new TileMapEditor({
     width: 8,
     height: 8,
     initialData: [[0,1,0,1], [1,0,1,0]],
     onChange: (newMask) => { console.log('Updated:', newMask); }
   });
   tileMapEditor.attachTo(containerElement);
   ============================================================================= */

class TileMapEditor {
    constructor(options = {}) {
        // Determine dimensions from initialData if provided
        if (options.initialData && Array.isArray(options.initialData) && options.initialData.length > 0) {
            this.height = options.initialData.length;
            this.width = Math.max(...options.initialData.map(row => Array.isArray(row) ? row.length : 0));
        } else {
            this.width = options.width || 8;
            this.height = options.height || 8;
        }
        
        this.minWidth = options.minWidth || 1;
        this.minHeight = options.minHeight || 1;
        this.maxWidth = options.maxWidth || 32;
        this.maxHeight = options.maxHeight || 32;
        this.initialData = options.initialData || [];
        this.onChange = options.onChange || (() => {});
        this.cellSize = options.cellSize || 30;
        this.enabledColor = options.enabledColor || '#3498db';
        this.disabledColor = options.disabledColor || '#ecf0f1';
        this.hoverColor = options.hoverColor || '#5dade2';
        this.gridColor = options.gridColor || '#bdc3c7';
        this.boundaryColor = options.boundaryColor || '#2c3e50';
        this.boundaryWidth = options.boundaryWidth || 3;
        this.allowResize = options.allowResize !== false; // Default true
        
        // Tile state - 2D array
        this.tiles = this.initializeTiles();
        
        // Drawing state
        this.isDrawing = false;
        this.drawMode = null; // 'enable' or 'disable'
        this.lastCell = null; // Track last cell to prevent re-triggering
        
        // Bind methods to maintain context
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        
        this.createElement();
        this.setupEventHandlers();
    }
    
    initializeTiles() {
        const tiles = [];
        for (let y = 0; y < this.height; y++) {
            tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                // Initialize from data if available, otherwise default to 0
                tiles[y][x] = (this.initialData[y] && this.initialData[y][x]) ? 1 : 0;
            }
        }
        return tiles;
    }
    
    createElement() {
        this.container = document.createElement('div');
        this.container.className = 'tilemap-editor';
        this.container.style.display = 'inline-block';
        this.container.style.border = '2px solid ' + this.gridColor;
        this.container.style.borderRadius = '4px';
        this.container.style.padding = '4px';
        this.container.style.backgroundColor = '#fff';
        this.container.style.userSelect = 'none';
        
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.updateCanvasSize();
        this.canvas.style.cursor = 'crosshair';
        this.canvas.style.display = 'block';
        
        this.ctx = this.canvas.getContext('2d');
        
        // Toolbar
        this.toolbar = document.createElement('div');
        this.toolbar.style.marginTop = '8px';
        this.toolbar.style.display = 'flex';
        this.toolbar.style.gap = '8px';
        this.toolbar.style.justifyContent = 'center';
        this.toolbar.style.flexWrap = 'wrap';
        
        // Size controls (if allowed)
        if (this.allowResize) {
            const sizeControls = document.createElement('div');
            sizeControls.style.display = 'flex';
            sizeControls.style.gap = '8px';
            sizeControls.style.alignItems = 'center';
            sizeControls.style.marginBottom = '8px';
            
            // Width controls
            const widthLabel = document.createElement('span');
            widthLabel.textContent = 'Width:';
            widthLabel.style.fontSize = '12px';
            widthLabel.style.fontWeight = '600';
            
            const widthMinus = document.createElement('button');
            widthMinus.textContent = '−';
            widthMinus.className = 'size-btn';
            widthMinus.style.padding = '4px 8px';
            widthMinus.style.fontSize = '14px';
            
            const widthInput = document.createElement('input');
            widthInput.type = 'number';
            widthInput.min = this.minWidth;
            widthInput.max = this.maxWidth;
            widthInput.value = this.width;
            widthInput.style.width = '50px';
            widthInput.style.textAlign = 'center';
            widthInput.style.padding = '4px';
            
            const widthPlus = document.createElement('button');
            widthPlus.textContent = '+';
            widthPlus.className = 'size-btn';
            widthPlus.style.padding = '4px 8px';
            widthPlus.style.fontSize = '14px';
            
            // Height controls
            const heightLabel = document.createElement('span');
            heightLabel.textContent = 'Height:';
            heightLabel.style.fontSize = '12px';
            heightLabel.style.fontWeight = '600';
            heightLabel.style.marginLeft = '12px';
            
            const heightMinus = document.createElement('button');
            heightMinus.textContent = '−';
            heightMinus.className = 'size-btn';
            heightMinus.style.padding = '4px 8px';
            heightMinus.style.fontSize = '14px';
            
            const heightInput = document.createElement('input');
            heightInput.type = 'number';
            heightInput.min = this.minHeight;
            heightInput.max = this.maxHeight;
            heightInput.value = this.height;
            heightInput.style.width = '50px';
            heightInput.style.textAlign = 'center';
            heightInput.style.padding = '4px';
            
            const heightPlus = document.createElement('button');
            heightPlus.textContent = '+';
            heightPlus.className = 'size-btn';
            heightPlus.style.padding = '4px 8px';
            heightPlus.style.fontSize = '14px';
            
            sizeControls.appendChild(widthLabel);
            sizeControls.appendChild(widthMinus);
            sizeControls.appendChild(widthInput);
            sizeControls.appendChild(widthPlus);
            sizeControls.appendChild(heightLabel);
            sizeControls.appendChild(heightMinus);
            sizeControls.appendChild(heightInput);
            sizeControls.appendChild(heightPlus);
            
            this.toolbar.appendChild(sizeControls);
            
            // Store references
            this.widthInput = widthInput;
            this.heightInput = heightInput;
            this.widthMinus = widthMinus;
            this.widthPlus = widthPlus;
            this.heightMinus = heightMinus;
            this.heightPlus = heightPlus;
        }
        
        // Action buttons
        const buttonRow = document.createElement('div');
        buttonRow.style.display = 'flex';
        buttonRow.style.gap = '8px';
        buttonRow.style.justifyContent = 'center';
        
        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Clear All';
        clearBtn.className = 'secondary-btn';
        clearBtn.style.fontSize = '12px';
        clearBtn.style.padding = '4px 8px';
        
        const fillBtn = document.createElement('button');
        fillBtn.textContent = 'Fill All';
        fillBtn.className = 'add-btn';
        fillBtn.style.fontSize = '12px';
        fillBtn.style.padding = '4px 8px';
        
        buttonRow.appendChild(clearBtn);
        buttonRow.appendChild(fillBtn);
        this.toolbar.appendChild(buttonRow);
        
        this.container.appendChild(this.canvas);
        this.container.appendChild(this.toolbar);
        
        // Store buttons
        this.clearBtn = clearBtn;
        this.fillBtn = fillBtn;
        
        this.render();
    }
    
    updateCanvasSize() {
        this.canvas.width = this.width * this.cellSize;
        this.canvas.height = this.height * this.cellSize;
    }
    
    setupEventHandlers() {
        // Mouse events for drawing - global mouse tracking
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        
        // Use document-level listeners to track mouse even when outside canvas
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
        
        // Toolbar buttons
        this.clearBtn.addEventListener('click', () => this.clearAll());
        this.fillBtn.addEventListener('click', () => this.fillAll());
        
        // Size controls
        if (this.allowResize) {
            this.widthMinus.addEventListener('click', () => this.resizeGrid(this.width - 1, this.height));
            this.widthPlus.addEventListener('click', () => this.resizeGrid(this.width + 1, this.height));
            this.heightMinus.addEventListener('click', () => this.resizeGrid(this.width, this.height - 1));
            this.heightPlus.addEventListener('click', () => this.resizeGrid(this.width, this.height + 1));
            
            this.widthInput.addEventListener('change', (e) => {
                const newWidth = parseInt(e.target.value);
                this.resizeGrid(newWidth, this.height);
            });
            
            this.heightInput.addEventListener('change', (e) => {
                const newHeight = parseInt(e.target.value);
                this.resizeGrid(this.width, newHeight);
            });
        }
    }
    
    resizeGrid(newWidth, newHeight) {
        // Clamp values
        newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, newWidth));
        newHeight = Math.max(this.minHeight, Math.min(this.maxHeight, newHeight));
        
        if (newWidth === this.width && newHeight === this.height) return;
        
        // Create new tiles array
        const newTiles = [];
        for (let y = 0; y < newHeight; y++) {
            newTiles[y] = [];
            for (let x = 0; x < newWidth; x++) {
                // Copy existing tile if it exists, otherwise default to 0
                newTiles[y][x] = (this.tiles[y] && this.tiles[y][x] !== undefined) ? this.tiles[y][x] : 0;
            }
        }
        
        this.width = newWidth;
        this.height = newHeight;
        this.tiles = newTiles;
        
        // Update UI
        if (this.widthInput) this.widthInput.value = newWidth;
        if (this.heightInput) this.heightInput.value = newHeight;
        
        this.updateCanvasSize();
        this.render();
        this.notifyChange();
    }
    
    getCellFromMouse(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.cellSize);
        const y = Math.floor((e.clientY - rect.top) / this.cellSize);
        
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return { x, y };
        }
        return null;
    }
    
    handleMouseDown(e) {
        const cell = this.getCellFromMouse(e);
        if (!cell) return;
        
        this.isDrawing = true;
        // Set draw mode based on current cell state
        this.drawMode = this.tiles[cell.y][cell.x] === 0 ? 'enable' : 'disable';
        this.lastCell = `${cell.x},${cell.y}`;
        this.toggleCell(cell.x, cell.y);
    }
    
    handleMouseMove(e) {
        if (!this.isDrawing) return;
        
        const cell = this.getCellFromMouse(e);
        if (!cell) return;
        
        const cellKey = `${cell.x},${cell.y}`;
        // Only update if we've moved to a different cell
        if (cellKey === this.lastCell) return;
        
        this.lastCell = cellKey;
        
        // Apply draw mode to cell
        const targetValue = this.drawMode === 'enable' ? 1 : 0;
        if (this.tiles[cell.y][cell.x] !== targetValue) {
            this.tiles[cell.y][cell.x] = targetValue;
            this.render();
            this.notifyChange();
        }
    }
    
    handleMouseUp() {
        this.isDrawing = false;
        this.drawMode = null;
        this.lastCell = null;
    }
    
    toggleCell(x, y) {
        this.tiles[y][x] = this.tiles[y][x] === 0 ? 1 : 0;
        this.render();
        this.notifyChange();
    }
    
    clearAll() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = 0;
            }
        }
        this.render();
        this.notifyChange();
    }
    
    fillAll() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = 1;
            }
        }
        this.render();
        this.notifyChange();
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = this.disabledColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw tiles
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const enabled = this.tiles[y][x] === 1;
                this.ctx.fillStyle = enabled ? this.enabledColor : this.disabledColor;
                this.ctx.fillRect(
                    x * this.cellSize,
                    y * this.cellSize,
                    this.cellSize,
                    this.cellSize
                );
            }
        }
        
        // Draw thin grid
        this.ctx.strokeStyle = this.gridColor;
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x <= this.width; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.cellSize, 0);
            this.ctx.lineTo(x * this.cellSize, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= this.height; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.cellSize);
            this.ctx.lineTo(this.canvas.width, y * this.cellSize);
            this.ctx.stroke();
        }
        
        // Draw thick boundary around the entire grid
        this.ctx.strokeStyle = this.boundaryColor;
        this.ctx.lineWidth = this.boundaryWidth;
        this.ctx.strokeRect(
            this.boundaryWidth / 2,
            this.boundaryWidth / 2,
            this.canvas.width - this.boundaryWidth,
            this.canvas.height - this.boundaryWidth
        );
    }
    
    getValue() {
        // Return 2D array, removing trailing empty rows/columns
        const result = [];
        let maxY = 0;
        let maxX = 0;
        
        // Find actual bounds
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.tiles[y][x] === 1) {
                    maxY = Math.max(maxY, y);
                    maxX = Math.max(maxX, x);
                }
            }
        }
        
        // Build result up to actual bounds
        for (let y = 0; y <= maxY; y++) {
            result[y] = [];
            for (let x = 0; x <= maxX; x++) {
                result[y][x] = this.tiles[y][x];
            }
        }
        
        return result.length > 0 ? result : null;
    }
    
    setValue(newData) {
        // Determine new dimensions if data provided
        if (newData && Array.isArray(newData) && newData.length > 0) {
            const newHeight = newData.length;
            const newWidth = Math.max(...newData.map(row => Array.isArray(row) ? row.length : 0));
            
            if (newWidth !== this.width || newHeight !== this.height) {
                this.width = newWidth;
                this.height = newHeight;
                if (this.widthInput) this.widthInput.value = newWidth;
                if (this.heightInput) this.heightInput.value = newHeight;
                this.updateCanvasSize();
            }
        }
        
        this.tiles = this.initializeTiles();
        if (newData && Array.isArray(newData)) {
            for (let y = 0; y < Math.min(newData.length, this.height); y++) {
                if (Array.isArray(newData[y])) {
                    for (let x = 0; x < Math.min(newData[y].length, this.width); x++) {
                        this.tiles[y][x] = newData[y][x] ? 1 : 0;
                    }
                }
            }
        }
        this.render();
    }
    
    notifyChange() {
        if (this.onChange) {
            this.onChange(this.getValue());
        }
    }
    
    attachTo(container) {
        container.appendChild(this.container);
        return this;
    }
    
    remove() {
        // Clean up event listeners
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}