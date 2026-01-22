/* =============================================================================
   Base Editor Class
   
   Abstract base class for all room property editors. Handles common functionality
   like card creation, drag/drop, collapse/expand, and real-time title updates.
   ============================================================================= */

class BaseEditor {
    constructor(initialData = {}, config = {}) {
        this.config = config;
        this.initialData = this.normalizeData(initialData);
        this.isCollapsed = true; // Start collapsed by default
        this.hasRendered = false; // Track if content has been rendered
        this._uid = this.generateUID();
        this._assignedId = this.initialData.id ?? null;
        this.createElement();
        this.populateFields();
        this.setupEventHandlers();

        // IMPORTANT: Always render content immediately on construction
        // Lazy rendering caused the data to never display when loading from file
        this.renderContent();

        // Then collapse it for performance
        this.collapse();
    }

    generateUID() {
        return `${this.config.type}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
    }

    createElement() {
        this.root = document.createElement('div');
        this.root.className = `editor-card ${this.config.className}-card collapsed`;
        this.createHeader();
        this.createContentArea();
        this.root._uid = this._uid;
        this.root._assignedId = this._assignedId;
        this.root.getValue = () => this.getValue();
        this.root.collapse = () => this.collapse();
        this.root.expand = () => this.expand();
        this.root.setAssignedId = (newId) => this.setAssignedId(newId);
    }

	createHeader() {
		this.headerContainer = document.createElement('div');
		this.headerContainer.className = 'editor-card-header';
		this.headerContainer.style.cursor = 'grab';
		this.headerContainer.style.userSelect = 'none';
		this.headerContainer.style.display = 'flex';
		this.headerContainer.style.alignItems = 'center';
		this.headerContainer.style.gap = '8px';

		this.toggleButton = document.createElement('button');
		this.toggleButton.textContent = '▶'; // Start with collapsed icon
		this.toggleButton.className = 'toggle-btn';
		this.toggleButton.style.marginRight = '8px';
		this.toggleButton.style.minWidth = '20px';
		this.toggleButton.style.fontSize = '12px';
		this.toggleButton.style.background = 'transparent';
		this.toggleButton.style.border = 'none';
		this.toggleButton.style.cursor = 'pointer';

		this.titleSpan = document.createElement('span');
		this.titleSpan.style.flex = '1';

		// Add remove button to header (for quick deletion)
		this.headerRemoveButton = document.createElement('button');
		this.headerRemoveButton.textContent = '✕';
		this.headerRemoveButton.className = 'header-remove-btn';
		this.headerRemoveButton.style.minWidth = '24px';
		this.headerRemoveButton.style.padding = '4px 8px';
		this.headerRemoveButton.style.fontSize = '14px';
		this.headerRemoveButton.style.background = '#ff6b6b';
		this.headerRemoveButton.style.color = 'white';
		this.headerRemoveButton.style.border = 'none';
		this.headerRemoveButton.style.borderRadius = '3px';
		this.headerRemoveButton.style.cursor = 'pointer';
		this.headerRemoveButton.title = 'Delete this item';

		this.headerContainer.appendChild(this.toggleButton);
		this.headerContainer.appendChild(this.titleSpan);
		this.headerContainer.appendChild(this.headerRemoveButton);

		this.updateTitle();

		this.root.appendChild(this.headerContainer);
	}

    createContentArea() {
        this.contentArea = document.createElement('div');
        this.contentArea.className = 'editor-card-content';
        this.contentArea.style.paddingTop = '8px';
        this.contentArea.style.display = 'none'; // Start hidden
        this.root.appendChild(this.contentArea);
    }

	setupEventHandlers() {
		this.toggleButton.addEventListener('click', (e) => {
			e.stopPropagation();
			this.toggle();
		});

		this.toggleButton.addEventListener('mousedown', (e) => {
			e.stopPropagation();
		});

		// Header remove button
		this.headerRemoveButton.addEventListener('click', (e) => {
			e.stopPropagation();
			if (confirm('Are you sure you want to delete this item?')) {
				this.remove();
			}
		});

		this.headerRemoveButton.addEventListener('mousedown', (e) => {
			e.stopPropagation();
		});

		// Double-click header to toggle
		this.headerContainer.addEventListener('dblclick', (e) => {
			if (e.target === this.headerContainer || e.target === this.titleSpan) {
				this.toggle();
			}
		});

		// Set up title update monitoring (debounced)
		this.setupTitleUpdates();
	}

    setupTitleUpdates() {
        // To be overridden by subclasses to monitor specific fields
    }

    updateTitle(customTitle = null) {
        // Debounce title updates
        if (this._titleUpdateTimeout) {
            clearTimeout(this._titleUpdateTimeout);
        }

        this._titleUpdateTimeout = setTimeout(() => {
            const title = customTitle || this.getTitleFromData() || this.config.defaultName || 'Unnamed';
            const id = this._assignedId;
            this.titleSpan.textContent = `${this.config.emoji} ${title} ${id != null ? `(ID: ${id})` : ''}`;
        }, 100); // 100ms debounce
    }

    getTitleFromData() {
        // To be overridden by subclasses
        return null;
    }

    populateFields() {
        // To be overridden by subclasses
        throw new Error('populateFields must be implemented by subclass');
    }

    normalizeData(data) {
        // To be overridden by subclasses
        return data || {};
    }

    getValue() {
        // If not rendered yet, render now to get values
        if (!this.hasRendered) {
            this.renderContent();
        }

        // If still rendering (async operations), wait for completion
        if (this._isRendering) {
            console.warn('getValue called while still rendering, waiting...');
            // This shouldn't happen but we handle it gracefully
        }

        // To be overridden by subclasses
        throw new Error('getValue must be implemented by subclass');
    }

    renderContent() {
        if (this.hasRendered) return;

        console.log(`Rendering content for ${this.config.type} ${this._uid}`);
        this._isRendering = true;
        this.hasRendered = true;

        // Clear any placeholder content
        this.contentArea.innerHTML = '';

        // Populate fields (implemented by subclasses)
        this.populateFields();

        this._isRendering = false;
    }

    toggle() {
        if (this.isCollapsed) {
            this.expand();
        } else {
            this.collapse();
        }
    }

    collapse() {
        this.isCollapsed = true;
        this.contentArea.style.display = 'none';
        this.toggleButton.textContent = '▶';
        this.root.classList.add('collapsed');
    }

    expand() {
        // Lazy render content on first expand
        if (!this.hasRendered) {
            this.renderContent();
        }

        this.isCollapsed = false;
        this.contentArea.style.display = 'block';
        this.toggleButton.textContent = '▼';
        this.root.classList.remove('collapsed');
    }

	remove() {
		console.log(`[BaseEditor] Removing ${this.config.type} ${this._uid}`);
		
		// Call the onRemove callback FIRST, before any DOM manipulation
		if (this.onRemove) {
			this.onRemove();
		}

		// Clean up any pending timeouts
		if (this._titleUpdateTimeout) {
			clearTimeout(this._titleUpdateTimeout);
		}

		// Clean up any condition editors
		if (this.entranceConditionEditor && this.entranceConditionEditor.remove) {
			this.entranceConditionEditor.remove();
		}
		if (this.exitConditionEditor && this.exitConditionEditor.remove) {
			this.exitConditionEditor.remove();
		}
		if (this.requiresEditor && this.requiresEditor.remove) {
			this.requiresEditor.remove();
		}

		// Finally remove from DOM
		this.root.remove();
	}

    // Utility method for creating remove buttons
    createRemoveButton(text, customCallback = null) {
        const button = createRemoveButton(text, () => {
            if (customCallback) {
                customCallback();
            } else {
                this.remove();
            }
        });
        return button;
    }

    // Utility method for attaching to containers with drag support
    attachToContainer(container, renumberCallback) {
        container.appendChild(this.root);
        makeCardDraggable(this.root, container, this.config.type, renumberCallback);
        return this.root;
    }

    // Method to update assigned ID (called during renumbering)
    setAssignedId(newId) {
        console.log(`Setting ID: ${newId} for ${this.config.type}`);
        this._assignedId = newId;
        this.root._assignedId = newId;
        this.updateTitle();
    }
}