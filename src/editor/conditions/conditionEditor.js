/* =============================================================================
   Super Metroid: X-Fusion Condition Editor
   
   Provides a hierarchical condition editor supporting nested AND/OR/NOT logic,
   item requirements, event triggers, environment conditions, and strat references.
   ============================================================================= */
// Configuration for different condition types
const CONDITION_CONFIG = {
	types: {
		'': {
			label: '(no condition)',
			icon: '•',
			color: '#f8f8f8',
			description: 'No condition required'
		},
		'and': {
			label: 'All of these must be true',
			icon: '∧',
			color: '#cce5ff',
			description: 'Logical AND - all sub-conditions must be satisfied'
		},
		'or': {
			label: 'Any of these can be true',
			icon: '∨',
			color: '#fff0cc',
			description: 'Logical OR - at least one sub-condition must be satisfied'
		},
		'not': {
			label: 'None of these may be true',
			icon: '¬',
			color: '#ffd6d6',
			description: 'Logical NOT - None of these sub-conditions may be satisfied'
		},
		'item': {
			label: 'Requires item',
			icon: '🎒',
			color: '#e6ffe6',
			description: 'Requires a specific item or upgrade'
		},
		'event': {
			label: 'Triggered by event',
			icon: '⚡',
			color: '#ffe6f0',
			description: 'Requires a specific game event to have occurred'
		},
		'strat': {
			label: 'Requires strat',
			icon: '📘',
			color: '#e3f2fd',
			description: 'Requires execution of a specific strategy or notable trick'
		},
		'environment': {
			label: 'Environment condition',
			icon: '🌿',
			color: '#f0f0f0',
			description: 'Requires specific environmental conditions'
		}
	},
	indentSize: 15,
	maxDepth: 10
};
// Main factory function
function makeConditionEditor(container, initialCondition, indentLevel = 0, isRoot = false) {
	if (indentLevel > CONDITION_CONFIG.maxDepth) {
		console.warn('Maximum condition nesting depth reached');
		return createEmptyConditionEditor(container);
	}
	const editor = new ConditionEditor(container, initialCondition, indentLevel, isRoot);
	return editor;
}
class ConditionEditor {
	constructor(container, initialCondition, indentLevel = 0, isRoot = false) {
		this.container = container;
		this.initialCondition = initialCondition;
		this.indentLevel = indentLevel;
		this.childEditors = [];
		this.isCollapsed = false;
		this.isRoot = isRoot;
		this.createElement();
		this.setupEventHandlers();
		this.renderCondition();
	}
	createElement() {
		this.root = document.createElement('div');
		this.root.className = 'condition-block editor-card';
		this.root.style.marginLeft = `${this.indentLevel * CONDITION_CONFIG.indentSize}px`;
		this.root.style.padding = '8px 12px';
		this.root.style.borderRadius = '6px';
		this.root.style.marginBottom = '6px';
		this.root.style.border = '1px solid #ddd';
		this.createHeader();
		this.createChildrenContainer();
		this.container.appendChild(this.root);
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
			const option = document.createElement('option');
			option.value = value;
			option.textContent = config.label;
			option.title = config.description;
			this.typeSelect.appendChild(option);
		});
		// Set initial selection
		if (this.initialCondition) {
			const initialType = Object.keys(this.initialCondition)[0];
			if (initialType && CONDITION_CONFIG.types[initialType]) {
				this.typeSelect.value = initialType;
			}
		}
	}
	setupEventHandlers() {
		this.typeSelect.addEventListener('change', () => {
			this.clearChildren();
			this.renderCondition();
		});
		this.removeButton.addEventListener('click', () => {
			this.remove();
		});
		this.toggleButton.addEventListener('click', () => {
			this.toggleCollapse();
		});
	}
	renderCondition() {
		const selectedType = this.typeSelect.value;
		const config = CONDITION_CONFIG.types[selectedType];
		this.updateStyles(config);
		this.clearChildren();
		if (selectedType === 'and' || selectedType === 'or' || selectedType === 'not') {
			this.renderLogicalCondition(selectedType);
		} else if (selectedType === 'item' || selectedType === 'event' || selectedType === 'strat') {
			this.renderSelectCondition(selectedType);
		} else if (selectedType === 'environment') {
			this.renderTextCondition();
		}
	}
	updateStyles(config) {
		this.root.style.backgroundColor = config.color;
		this.iconSpan.textContent = config.icon;
		const isLogical = ['and', 'or', 'not'].includes(this.typeSelect.value);
		this.toggleButton.style.display = isLogical ? 'block' : 'none';
		this.root.className = `condition-block editor-card ${this.typeSelect.value}`;
		this.removeButton.style.display = this.isRoot ? 'none' : 'block';
	}
	renderLogicalCondition(type) {
		const initialChildren = (this.initialCondition && this.initialCondition[type]) || [];
		initialChildren.forEach(childData => {
			this.addChildCondition(childData, false);
		});
		if (!this.addButton) {
			this.addButton = document.createElement('button');
			this.addButton.textContent = type === 'and' ? '+ Add Sub-condition' : '+ Add Option';
			this.addButton.className = 'add-btn';
			this.addButton.style.marginTop = '8px';
			this.addButton.addEventListener('click', () => {
				this.addChildCondition();
			});
		}
		this.childrenContainer.appendChild(this.addButton);
	}
	renderSelectCondition(type) {
		const select = document.createElement('select');
		select.style.marginLeft = '25px';
		select.style.backgroundColor = CONDITION_CONFIG.types[type].color;
		select.style.width = '100%';
		const emptyOption = document.createElement('option');
		emptyOption.value = '';
		emptyOption.textContent = `(select ${type})`;
		select.appendChild(emptyOption);
		const options = this.getOptionsForType(type);
		options.forEach(option => {
			const opt = document.createElement('option');
			opt.value = option;
			opt.textContent = option;
			select.appendChild(opt);
		});
		// Set initial value
		if (this.initialCondition && this.initialCondition[type]) {
			select.value = this.initialCondition[type];
		}
		this.childrenContainer.appendChild(select);
	}
	renderTextCondition() {
		const input = document.createElement('input');
		input.type = 'text';
		input.placeholder = 'Enter environment condition (e.g., "heated", "underwater")';
		input.style.marginLeft = '25px';
		input.style.backgroundColor = CONDITION_CONFIG.types.environment.color;
		input.style.width = '100%';
		input.style.padding = '6px';
		input.style.borderRadius = '4px';
		input.style.border = '1px solid #ccc';
		if (this.initialCondition && this.initialCondition.environment) {
			input.value = this.initialCondition.environment;
		}
		this.childrenContainer.appendChild(input);
	}
	addChildCondition(initialData = null, appendAddButton = true) {
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
	clearChildren() {
		this.childEditors = [];
		this.childrenContainer.innerHTML = '';
	}
	toggleCollapse() {
		this.isCollapsed = !this.isCollapsed;
		this.childrenContainer.style.display = this.isCollapsed ? 'none' : 'block';
		this.toggleButton.textContent = this.isCollapsed ? '▶' : '▼';
	}
	remove() {
		this.root.remove();
	}
	getOptionsForType(type) {
		if (type === 'item') {
			return (window.CONDITION_ITEMS || this.getDefaultItems()).sort();
		} else if (type === 'event') {
			return (window.CONDITION_EVENTS || this.getDefaultEvents()).sort();
		} else if (type === 'strat') {
			return this.getStratOptions().sort();
		}
		return [];
	}
	getStratOptions() {
		// Combine regular strats and notables
		const strats = [];
		// Get regular strats
		const stratCards = Array.from(document.querySelectorAll('.strat-card'));
		stratCards.forEach(card => {
			const nameInput = card._nameInput;
			if (nameInput && nameInput.value.trim()) {
				strats.push(nameInput.value.trim());
			}
		});
		// Get notables (prefixed to distinguish them)
		const notableCards = Array.from(document.querySelectorAll('.notable-card'));
		notableCards.forEach(card => {
			const nameInput = card._nameInput;
			if (nameInput && nameInput.value.trim()) {
				strats.push(`Notable: ${nameInput.value.trim()}`);
			}
		});
		return strats.length > 0 ? strats : ['(no strats or notables defined yet)'];
	}
	getDefaultItems() {
		return [
			'Morph', 'Bombs', 'PowerBombs', 'Missiles', 'Super',
			'Charge', 'Ice', 'Wave', 'Spazer', 'Plasma',
			'Varia', 'Gravity', 'HiJump', 'SpeedBooster', 'SpaceJump',
			'ScrewAttack', 'SpringBall', 'Grapple', 'XRay',
			'canWallJump', 'canBombHop', 'canShineCharge'
		];
	}
	getDefaultEvents() {
		return [
			'f_DefeatedRidley', 'f_DefeatedKraid', 'f_DefeatedPhantoon', 'f_DefeatedDraygon',
			'f_SavedAnimals', 'f_UsedAcidChozoStatue', 'f_MaridiaGlassTubesBroken'
		];
	}
	getValue() {
		const selectedType = this.typeSelect.value;
		if (!selectedType) {
			return null;
		}
		if (selectedType === 'and' || selectedType === 'or' || selectedType === 'not') {
			const childValues = this.childEditors
				.map(editor => editor.getValue())
				.filter(value => value !== null);
			return childValues.length > 0 ? {
				[selectedType]: childValues
			} : null;
		} else if (selectedType === 'item' || selectedType === 'event') {
			const select = this.childrenContainer.querySelector('select');
			const selectedValue = select ? select.value : '';
			return selectedValue ? {
				[selectedType]: selectedValue
			} : null;
		} else if (selectedType === 'strat') {
			const select = this.childrenContainer.querySelector('select');
			const selectedValue = select ? select.value : '';
			if (!selectedValue) return null;
			// Handle notable strats specially
			if (selectedValue.startsWith('Notable: ')) {
				const notableName = selectedValue.replace('Notable: ', '');
				return {
					notable: notableName
				};
			} else {
				return {
					strat: selectedValue
				};
			}
		} else if (selectedType === 'environment') {
			const input = this.childrenContainer.querySelector('input');
			const inputValue = input ? input.value.trim() : '';
			return inputValue ? {
				[selectedType]: inputValue
			} : null;
		}
		return null;
	}
	isValid() {
		const selectedType = this.typeSelect.value;
		if (!selectedType) {
			return true;
		}
		if (selectedType === 'and' || selectedType === 'or' || selectedType === 'not') {
			const validChildren = this.childEditors.filter(editor => editor.isValid());
			return validChildren.length > 0;
		} else if (selectedType === 'item' || selectedType === 'event' || selectedType === 'strat') {
			const select = this.childrenContainer.querySelector('select');
			return select && select.value;
		} else if (selectedType === 'environment') {
			const input = this.childrenContainer.querySelector('input');
			return input && input.value.trim();
		}
		return false;
	}
	getDescription() {
		const selectedType = this.typeSelect.value;
		if (!selectedType) {
			return 'No condition';
		}
		const config = CONDITION_CONFIG.types[selectedType];
		if (selectedType === 'and' || selectedType === 'or') {
			const childDescriptions = this.childEditors
				.map(editor => editor.getDescription())
				.filter(desc => desc !== 'No condition');
			if (childDescriptions.length === 0) {
				return 'No condition';
			} else if (childDescriptions.length === 1) {
				return childDescriptions[0];
			} else {
				const connector = selectedType === 'and' ? ' AND ' : ' OR ';
				return `(${childDescriptions.join(connector)})`;
			}
		} else if (selectedType === 'not') {
			const childDescriptions = this.childEditors
				.map(editor => editor.getDescription())
				.filter(desc => desc !== 'No condition');
			if (childDescriptions.length === 0) {
				return 'No condition';
			}
			return `NOT (${childDescriptions[0]})`;
		} else if (selectedType === 'item' || selectedType === 'event' || selectedType === 'strat') {
			const select = this.childrenContainer.querySelector('select');
			const value = select ? select.value : '';
			return value ? `${config.label}: ${value}` : 'No condition';
		} else if (selectedType === 'environment') {
			const input = this.childrenContainer.querySelector('input');
			const value = input ? input.value.trim() : '';
			return value ? `${config.label}: ${value}` : 'No condition';
		}
		return config.label;
	}
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
		getDescription: () => 'No condition'
	};
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = {
		makeConditionEditor
	};
}