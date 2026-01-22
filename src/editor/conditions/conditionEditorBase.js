/* =============================================================================
   Base Condition Editor Class
   
   Main class for creating and managing condition editors. Handles the core
   structure, type selection, and delegates specific rendering to specialized
   renderer classes.
   ============================================================================= */
   class ConditionEditor {
	constructor(container, initialCondition, indentLevel = 0, isRoot = false) {
    this.container = container;

    console.log(`[ConditionEditor CONSTRUCTOR] indentLevel=${indentLevel}, isRoot=${isRoot}, initialCondition:`, initialCondition);

    // Handle plain string conditions (item/tech/helper/flag names)
    if (typeof initialCondition === 'string') {
        const detectedType = ConditionEditor.detectStringType(initialCondition);
        console.log(`[ConditionEditor] Detected string type: ${detectedType} for "${initialCondition}"`);
        if (detectedType) {
            // Convert to object format for internal handling
            this.initialCondition = { [detectedType]: initialCondition };
        } else {
            this.initialCondition = initialCondition;
        }
    } else {
        this.initialCondition = initialCondition;
    }

    console.log(`[ConditionEditor] After normalization, initialCondition:`, this.initialCondition);

    this.indentLevel = indentLevel;
    this.childEditors = [];
    this.isCollapsed = false;
    this.isRoot = isRoot;
    // Cleanup functions for subscriptions
    this.subscriptions = [];
    this.createElement();
    this.setupEventHandlers();
    // Subscribe to global data changes
    this.subscriptions.push(
        window.EditorGlobals.addListener(() => this.refreshDataSources())
    );
}
	createElement() {
		this.root = document.createElement('div');
		this.root.className = 'condition-block editor-card none';
		this.root.style.marginLeft = `${this.indentLevel * CONDITION_CONFIG.indentSize}px`;
		this.root.style.padding = '8px 12px';
		this.root.style.borderRadius = '6px';
		this.root.style.marginBottom = '6px';
		this.root.style.border = '1px solid #ddd';
		this.createHeader();
		this.createChildrenContainer();
		this.container.appendChild(this.root);
	}
	/**
	 * Detect what type of condition a plain string represents
	 */
	static detectStringType(str) {
		if (!str || typeof str !== 'string') return null;
		
		// Check for flag (starts with f_)
		if (str.startsWith('f_')) return 'event';
		
		// Check for helper (starts with h_)
		if (str.startsWith('h_')) return 'helper';
		
		// Check against known lists
		if (window.EditorGlobals.itemList && window.EditorGlobals.itemList.includes(str)) {
			return 'item';
		}
		
		// Check tech map
		if (window.EditorGlobals.techMap) {
			for (const [categoryName, catObj] of window.EditorGlobals.techMap.entries()) {
				const found = (catObj.items || []).some(item => item.name === str);
				if (found) return 'tech';
			}
		}
		
		// Could be notable - we'll handle this as tech/item fallback
		return 'tech'; // Default to tech if unknown
	}
	createHeader() {
		this.headerContainer = document.createElement('div');
		this.headerContainer.style.display = 'flex';
		this.headerContainer.style.alignItems = 'center';
		this.headerContainer.style.gap = '8px';
		// Collapse/expand button for logical conditions
		this.toggleButton = document.createElement('button');
		this.toggleButton.textContent = '▼';
		this.toggleButton.style.display = 'none';
		this.toggleButton.style.minWidth = '24px';
		this.toggleButton.style.padding = '2px';
		this.toggleButton.style.fontSize = '12px';
		this.toggleButton.style.background = 'transparent';
		this.toggleButton.style.border = 'none';
		this.toggleButton.style.cursor = 'pointer';
		this.iconSpan = document.createElement('span');
		this.iconSpan.style.minWidth = '20px';
		this.iconSpan.style.textAlign = 'center';
		this.typeSelect = document.createElement('select');
		this.typeSelect.style.flex = '1';
		this.populateTypeSelect();
		this.removeButton = document.createElement('button');
		this.removeButton.textContent = '✕';
		this.removeButton.style.minWidth = '24px';
		this.removeButton.style.padding = '4px';
		this.removeButton.style.fontSize = '12px';
		this.removeButton.style.background = '#ff6b6b';
		this.removeButton.style.color = 'white';
		this.removeButton.style.border = 'none';
		this.removeButton.style.borderRadius = '3px';
		this.removeButton.title = 'Remove this condition';
		this.headerContainer.appendChild(this.toggleButton);
		this.headerContainer.appendChild(this.iconSpan);
		this.headerContainer.appendChild(this.typeSelect);
		this.headerContainer.appendChild(this.removeButton);
		this.root.appendChild(this.headerContainer);
	}
	createChildrenContainer() {
		this.childrenContainer = document.createElement('div');
		this.childrenContainer.className = 'children';
		this.childrenContainer.style.marginTop = '8px';
		this.root.appendChild(this.childrenContainer);
	}
	populateTypeSelect() {
    Object.entries(CONDITION_CONFIG.types).forEach(([value, config]) => {
        // Only allow "free" and "never" if this is the root editor
        if ((value === 'free' || value === 'never') && !this.isRoot) return;
        const option = document.createElement('option');
        option.value = value;
        let appendedType = "";
        if (config.label != '(no condition)')
            appendedType = value + ": ";
        option.textContent = appendedType + config.label;
        option.title = config.description;
        this.typeSelect.appendChild(option);
    });
    
    // Set initial selection - handle both object and string formats
    if (this.initialCondition) {
        let initialType = null;
        if (typeof this.initialCondition === 'string') {
            // Handle "free" and "never" cases
            initialType = this.initialCondition;
            console.log(`[populateTypeSelect] String type detected: ${initialType}`);
        } else if (typeof this.initialCondition === 'object' && this.initialCondition !== null) {
            // Get the first key from the object
            const keys = Object.keys(this.initialCondition);
            initialType = keys[0];
            console.log(`[populateTypeSelect] Object type detected: ${initialType}, all keys:`, keys);
        }
        
        if (initialType && CONDITION_CONFIG.types[initialType]) {
            this.typeSelect.value = initialType;
            console.log(`[populateTypeSelect] Set dropdown to: ${initialType}`);
        } else {
            // Default to empty/none if we can't determine type
            this.typeSelect.value = '';
            console.log(`[populateTypeSelect] Could not determine type, defaulting to empty`);
        }
    } else {
        console.log(`[populateTypeSelect] No initialCondition provided`);
    }
}
	setupEventHandlers() {
		this.typeSelect.addEventListener('change', () => {
			console.log(`[ConditionEditor] Type changed to: ${this.typeSelect.value}`);
			
			// Clean up child editors before clearing
			this.childEditors.forEach(child => {
				if (child && child.remove) {
					child.remove();
				}
			});
			
			// Clear children and inputs
			this.clearChildren();
			
			// Re-render with the new type but NO initial data (user is changing type)
			// Store the current type so renderCondition knows we're switching
			this._isSwitchingType = true;
			this.renderCondition();
			this._isSwitchingType = false;
		});
		
		this.removeButton.addEventListener('click', () => {
			this.remove();
		});
		
		this.toggleButton.addEventListener('click', () => {
			this.toggleCollapse();
		});
		
		// Initial render - only called on first creation
		this.renderCondition();
	}
	renderCondition() {
		const selectedType = this.typeSelect.value;
		const config = CONDITION_CONFIG.types[selectedType];
		
		console.log(`[renderCondition] START - selectedType: ${selectedType}, isSwitching: ${this._isSwitchingType}, initialCondition:`, this.initialCondition);
		
		this.updateStyles(config);
		this.clearChildren();
		
		console.log(`[renderCondition] After clearChildren, childEditors count: ${this.childEditors.length}`);
		
		// Get the appropriate renderer for this condition type
		const renderer = ConditionRenderers.getRenderer(selectedType);
		if (renderer) {
			console.log(`[renderCondition] Found renderer for type: ${selectedType}`);
			// Only pass initialCondition if we're NOT switching types manually
			const dataToPass = this._isSwitchingType ? null : this.initialCondition;
			console.log(`[renderCondition] Passing data to renderer:`, dataToPass);
			renderer.render(this, selectedType, dataToPass);
			console.log(`[renderCondition] After renderer.render, childEditors count: ${this.childEditors.length}`);
		} else {
			console.warn(`[renderCondition] No renderer found for type: ${selectedType}`);
		}
		
		console.log(`[renderCondition] END`);
	}
	updateStyles(config) {
		this.root.style.backgroundColor = config.color;
		this.iconSpan.textContent = config.icon;
		const isLogical = ['and', 'or'].includes(this.typeSelect.value);
		this.toggleButton.style.display = isLogical ? 'block' : 'none';
		this.root.className = `condition-block editor-card ${this.typeSelect.value}`;
		this.removeButton.style.display = this.isRoot ? 'none' : 'block';
	}
	createInputContainer() {
		const container = document.createElement('div');
		container.style.marginLeft = '25px';
		container.style.display = 'flex';
		container.style.flexDirection = 'column';
		container.style.gap = '6px';
		return container;
	}
	clearChildren() {
		this.childEditors = [];
		this.childrenContainer.innerHTML = '';
		// Clear any stored input references
		this.inputs = {};
	}
	toggleCollapse() {
		this.isCollapsed = !this.isCollapsed;
		this.childrenContainer.style.display = this.isCollapsed ? 'none' : 'block';
		this.toggleButton.textContent = this.isCollapsed ? '▶' : '▼';
	}
	addChildCondition(initialData = null, appendAddButton = true) {
		if (this.indentLevel >= CONDITION_CONFIG.maxDepth) {
			console.warn('Maximum condition nesting depth reached');
			return null;
		}
		
		console.log(`[addChildCondition] Adding child with data:`, initialData);
		
		const childContainer = document.createElement('div');
		const childEditor = makeConditionEditor(childContainer, initialData, this.indentLevel + 1, false);
		this.childEditors.push(childEditor);
		
		if (this.addButton && appendAddButton) {
			this.childrenContainer.insertBefore(childContainer, this.addButton);
		} else {
			this.childrenContainer.appendChild(childContainer);
		}
		
		return childEditor;
	}
	getValue() {
		const selectedType = this.typeSelect.value;
		if (!selectedType) return null;
		
		// Get the appropriate renderer for this condition type
		const renderer = ConditionRenderers.getRenderer(selectedType);
		if (renderer && renderer.getValue) {
			const value = renderer.getValue(this, selectedType);
			
			// If this is a root editor for 'requires', always wrap in array
			if (this.isRoot && value !== null) {
				// If it's already a simple string or a single condition object, wrap it
				if (typeof value === 'string' || (typeof value === 'object' && !Array.isArray(value))) {
					return [value];
				}
				// If it's an 'and' or 'or' object, return it as-is (it contains the array)
				if (value.and || value.or) {
					return [value];
				}
				return value;
			}
			
			return value;
		}
		return null;
	}
	refreshDataSources() {
		// Re-render if we have dynamic data dependencies
		const selectedType = this.typeSelect.value;
		const dynamicTypes = [
			'item', 'event', 'tech', 'helper', 'doorUnlockedAtNode',
			'itemNotCollectedAtNode', 'itemCollectedAtNode', 'obstaclesCleared',
			'obstaclesNotCleared', 'resetRoom', 'notable', 'disableEquipment'
		];
		if (dynamicTypes.includes(selectedType)) {
			// Store current value before re-rendering
			const currentValue = this.getValue();
			this.renderCondition();
			// Try to restore previous selections where possible
			if (currentValue) {
				this.restoreValue(currentValue);
			}
		}
		// Refresh child editors
		this.childEditors.forEach(child => child.refreshDataSources());
	}
	restoreValue(value) {
		// Attempt to restore previous value - implementation depends on condition type
		const selectedType = this.typeSelect.value;
		const renderer = ConditionRenderers.getRenderer(selectedType);
		if (renderer && renderer.restoreValue) {
			renderer.restoreValue(this, selectedType, value);
		}
	}
	setLists(data) {
		// Legacy method for backward compatibility
		// The new system uses EditorGlobals instead
		console.warn('setLists is deprecated, use EditorGlobals instead');
	}
	remove() {
		// Clean up subscriptions
		this.subscriptions.forEach(unsubscribe => {
			try {
				unsubscribe();
			} catch (e) {
				console.error('Error cleaning up subscription:', e);
			}
		});
		this.subscriptions = [];
		// Clean up child editors
		this.childEditors.forEach(child => child.remove());
		// Remove from DOM
		this.root.remove();
	}
}
// Factory function for creating condition editors
function makeConditionEditor(container, initialCondition, indentLevel = 0, isRoot = false) {
	if (indentLevel > CONDITION_CONFIG.maxDepth) {
		console.warn('Maximum condition nesting depth reached');
		return createEmptyConditionEditor(container);
	}
	const editor = new ConditionEditor(container, initialCondition, indentLevel, isRoot);
	return editor;
}

function createEmptyConditionEditor(container) {
	const emptyDiv = document.createElement('div');
	emptyDiv.textContent = 'Maximum nesting depth reached';
	emptyDiv.style.fontStyle = 'italic';
	emptyDiv.style.color = '#999';
	container.appendChild(emptyDiv);
	return {
		getValue: () => null,
		isValid: () => true,
		getDescription: () => 'No condition',
		setLists: () => {},
		remove: () => emptyDiv.remove(),
		refreshDataSources: () => {}
	};
}