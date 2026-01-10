/* =============================================================================
   Base Editor Class
   
   Abstract base class for all room property editors. Handles common functionality
   like card creation, drag/drop, collapse/expand, and real-time title updates.
   ============================================================================= */
class BaseEditor {
	constructor(initialData = {}, config = {}) {
		this.config = config;
		this.initialData = this.normalizeData(initialData);
		this.isCollapsed = false;
		this._uid = this.generateUID();
		this._assignedId = this.initialData.id ?? null;
		this.createElement();
		this.populateFields();
		this.setupEventHandlers();
	}
	generateUID() {
		return `${this.config.type}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
	}
	createElement() {
		this.root = document.createElement('div');
		this.root.className = `editor-card ${this.config.className}-card`;
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
		this.toggleButton = document.createElement('button');
		this.toggleButton.textContent = '▼';
		this.toggleButton.className = 'toggle-btn';
		this.toggleButton.style.marginRight = '8px';
		this.toggleButton.style.minWidth = '20px';
		this.toggleButton.style.fontSize = '12px';
		this.toggleButton.style.background = 'transparent';
		this.toggleButton.style.border = 'none';
		this.toggleButton.style.cursor = 'pointer';
		this.titleSpan = document.createElement('span');
		this.titleSpan.style.flex = '1';
		this.headerContainer.appendChild(this.toggleButton);
		this.headerContainer.appendChild(this.titleSpan);
		this.updateTitle();
		this.root.appendChild(this.headerContainer);
	}
	createContentArea() {
		this.contentArea = document.createElement('div');
		this.contentArea.className = 'editor-card-content';
		this.contentArea.style.paddingTop = '8px';
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
		// Set up title update monitoring
		this.setupTitleUpdates();
	}
	setupTitleUpdates() {
		// To be overridden by subclasses to monitor specific fields
	}
	updateTitle(customTitle = null) {
		const title = customTitle || this.getTitleFromData() || this.config.defaultName || 'Unnamed';
		const id = this._assignedId;
		this.titleSpan.textContent = `${this.config.emoji} ${title} ${id != null ? `(ID: ${id})` : ''}`;
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
		// To be overridden by subclasses
		throw new Error('getValue must be implemented by subclass');
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
		this.isCollapsed = false;
		this.contentArea.style.display = 'block';
		this.toggleButton.textContent = '▼';
		this.root.classList.remove('collapsed');
	}
	remove() {
		if (this.onRemove) {
			this.onRemove();
		}
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