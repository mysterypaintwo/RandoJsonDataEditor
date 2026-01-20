/* =============================================================================
   
   A configurable grid editor for editing map tile masks with dynamic resizing
   and paint color selection for representing different tile values.
   
   Supports:
   - 0 = Not in room (dark gray)
   - 1 = In room (light blue) 
   - 2 = Part of node (bright green)
   
   Usage:
   const tileMapEditor = new TileMapEditor({
     initialData: [[0,1,0,1], [1,0,1,0]],
     onChange: (newMask) => { console.log('Updated:', newMask); },
     colors: { 0: '#999', 1: '#3498db', 2: '#2ecc71' }
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

        // Color configuration for different tile values
        this.colors = options.colors || {
            0: '#bdc3c7', // Not in room - gray
            1: '#3498db', // In room - blue
            2: '#2ecc71' // Part of node - green
        };

        this.gridColor = options.gridColor || '#95a5a6';
        this.boundaryColor = options.boundaryColor || '#2c3e50';
        this.boundaryWidth = options.boundaryWidth || 3;
        this.allowResize = options.allowResize !== false; // Default true

        // Current paint color (0, 1, or 2)
        this.currentPaintColor = 1;

        // Tile state - 2D array
        this.tiles = this.initializeTiles();

        // Drawing state
        this.isDrawing = false;
        this.lastCell = null;

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
                tiles[y][x] = (this.initialData[y] && this.initialData[y][x] !== undefined) ?
                    this.initialData[y][x] :
                    0;
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
        this.container.style.padding = '8px';
        this.container.style.backgroundColor = '#fff';
        this.container.style.userSelect = 'none';

        // Create canvas
        this.canvas = document.createElement('canvas');
        this.updateCanvasSize();
        this.canvas.style.cursor = 'crosshair';
        this.canvas.style.display = 'block';

        this.ctx = this.canvas.getContext('2d');

        // Color legend
        this.createColorLegend();

        // Paint color selector
        this.createPaintSelector();

        // Toolbar
        this.createToolbar();

        this.container.appendChild(this.canvas);
        this.container.appendChild(this.legendContainer);
        this.container.appendChild(this.paintSelector);
        this.container.appendChild(this.toolbar);

        this.render();
    }

    createColorLegend() {
        this.legendContainer = document.createElement('div');
        this.legendContainer.style.marginTop = '8px';
        this.legendContainer.style.padding = '8px';
        this.legendContainer.style.backgroundColor = '#f8f9fa';
        this.legendContainer.style.borderRadius = '4px';
        this.legendContainer.style.fontSize = '12px';
        this.legendContainer.style.display = 'flex';
        this.legendContainer.style.gap = '12px';
        this.legendContainer.style.flexWrap = 'wrap';

        const legendTitle = document.createElement('div');
        legendTitle.textContent = 'Legend:';
        legendTitle.style.fontWeight = '600';
        legendTitle.style.marginRight = '8px';
        this.legendContainer.appendChild(legendTitle);

        const legends = [{
                value: 0,
                label: 'Not in room'
            },
            {
                value: 1,
                label: 'In room'
            },
            {
                value: 2,
                label: 'Part of node'
            }
        ];

        legends.forEach(({
            value,
            label
        }) => {
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '4px';

            const colorBox = document.createElement('div');
            colorBox.style.width = '16px';
            colorBox.style.height = '16px';
            colorBox.style.backgroundColor = this.colors[value];
            colorBox.style.border = '1px solid #7f8c8d';
            colorBox.style.borderRadius = '2px';

            const text = document.createElement('span');
            text.textContent = `${value} - ${label}`;

            item.appendChild(colorBox);
            item.appendChild(text);
            this.legendContainer.appendChild(item);
        });
    }

    createPaintSelector() {
        this.paintSelector = document.createElement('div');
        this.paintSelector.style.marginTop = '8px';
        this.paintSelector.style.padding = '8px';
        this.paintSelector.style.backgroundColor = '#f8f9fa';
        this.paintSelector.style.borderRadius = '4px';
        this.paintSelector.style.display = 'flex';
        this.paintSelector.style.alignItems = 'center';
        this.paintSelector.style.gap = '8px';
        this.paintSelector.style.flexWrap = 'wrap';

        const label = document.createElement('span');
        label.textContent = 'Paint Color:';
        label.style.fontWeight = '600';
        label.style.fontSize = '12px';
        this.paintSelector.appendChild(label);

        this.paintButtons = {};

        [0, 1, 2].forEach(value => {
            const btn = document.createElement('button');
            btn.textContent = value;
            btn.style.width = '32px';
            btn.style.height = '32px';
            btn.style.backgroundColor = this.colors[value];
            btn.style.border = '2px solid #7f8c8d';
            btn.style.borderRadius = '4px';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '14px';
            btn.style.fontWeight = '600';
            btn.style.color = value === 0 ? '#fff' : '#2c3e50';
            btn.style.transition = 'all 0.2s';

            btn.addEventListener('click', () => {
                this.currentPaintColor = value;
                this.updatePaintButtonStyles();
            });

            btn.addEventListener('mouseenter', () => {
                if (this.currentPaintColor !== value) {
                    btn.style.transform = 'scale(1.1)';
                }
            });

            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'scale(1)';
            });

            this.paintButtons[value] = btn;
            this.paintSelector.appendChild(btn);
        });

        this.updatePaintButtonStyles();
    }

    updatePaintButtonStyles() {
        Object.entries(this.paintButtons).forEach(([value, btn]) => {
            if (parseInt(value) === this.currentPaintColor) {
                btn.style.borderColor = '#2c3e50';
                btn.style.borderWidth = '3px';
                btn.style.boxShadow = '0 0 8px rgba(0,0,0,0.3)';
            } else {
                btn.style.borderColor = '#7f8c8d';
                btn.style.borderWidth = '2px';
                btn.style.boxShadow = 'none';
            }
        });
    }

    createToolbar() {
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
        fillBtn.textContent = 'Fill All (Current Color)';
        fillBtn.className = 'add-btn';
        fillBtn.style.fontSize = '12px';
        fillBtn.style.padding = '4px 8px';

        buttonRow.appendChild(clearBtn);
        buttonRow.appendChild(fillBtn);
        this.toolbar.appendChild(buttonRow);

        // Store buttons
        this.clearBtn = clearBtn;
        this.fillBtn = fillBtn;
    }

    updateCanvasSize() {
        this.canvas.width = this.width * this.cellSize;
        this.canvas.height = this.height * this.cellSize;
    }

    setupEventHandlers() {
        // Mouse events for drawing
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

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
        newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, newWidth));
        newHeight = Math.max(this.minHeight, Math.min(this.maxHeight, newHeight));

        if (newWidth === this.width && newHeight === this.height) return;

        const newTiles = [];
        for (let y = 0; y < newHeight; y++) {
            newTiles[y] = [];
            for (let x = 0; x < newWidth; x++) {
                newTiles[y][x] = (this.tiles[y] && this.tiles[y][x] !== undefined) ? this.tiles[y][x] : 0;
            }
        }

        this.width = newWidth;
        this.height = newHeight;
        this.tiles = newTiles;

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
            return {
                x,
                y
            };
        }
        return null;
    }

    handleMouseDown(e) {
        const cell = this.getCellFromMouse(e);
        if (!cell) return;

        this.isDrawing = true;

        // Right click = erase (tile 0)
        this.activePaintColor = (e.button === 2) ? 0 : this.currentPaintColor;

        this.lastCell = `${cell.x},${cell.y}`;
        this.paintCell(cell.x, cell.y, this.activePaintColor);
    }

    handleMouseMove(e) {
        if (!this.isDrawing) return;

        const cell = this.getCellFromMouse(e);
        if (!cell) return;

        const cellKey = `${cell.x},${cell.y}`;
        if (cellKey === this.lastCell) return;

        this.lastCell = cellKey;
        this.paintCell(cell.x, cell.y, this.activePaintColor);
    }

    handleMouseUp() {
        this.isDrawing = false;
        this.lastCell = null;
        this.activePaintColor = null;
    }

    paintCell(x, y, paintColor = this.currentPaintColor) {
        if (this.tiles[y][x] !== paintColor) {
            this.tiles[y][x] = paintColor;
            this.render();
            this.notifyChange();
        }
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
                this.tiles[y][x] = this.currentPaintColor;
            }
        }
        this.render();
        this.notifyChange();
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = this.colors[0];
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw tiles
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const value = this.tiles[y][x];
                this.ctx.fillStyle = this.colors[value] || this.colors[0];
                this.ctx.fillRect(
                    x * this.cellSize,
                    y * this.cellSize,
                    this.cellSize,
                    this.cellSize
                );
            }
        }

        // Draw grid
        this.ctx.strokeStyle = this.gridColor;
        this.ctx.lineWidth = 1;

        for (let x = 0; x <= this.width; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.cellSize, 0);
            this.ctx.lineTo(x * this.cellSize, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.height; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.cellSize);
            this.ctx.lineTo(this.canvas.width, y * this.cellSize);
            this.ctx.stroke();
        }

        // Draw boundary
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
        // Return proper 2D array format matching schema
        return this.tiles.map(row => [...row]);
    }

    setValue(newData) {
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
                        this.tiles[y][x] = newData[y][x] !== undefined ? newData[y][x] : 0;
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
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);

        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}