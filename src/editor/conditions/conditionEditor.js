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
			label: 'All of these must be true ("and")',
			icon: '∧',
			color: '#cce5ff',
			description: 'Logical AND - all sub-conditions must be satisfied'
		},
		'or': {
			label: 'Any of these can be true ("or")',
			icon: '∨',
			color: '#fff0cc',
			description: 'Logical OR - at least one sub-condition must be satisfied'
		},
		'not': {
			label: 'None of these may be true ("not")',
			icon: '¬',
			color: '#ffd6d6',
			description: 'Logical NOT - None of these sub-conditions may be satisfied'
		},
		'event': {
			label: 'Triggered by event',
			icon: '⚡',
			color: '#ffdfee', // soft pink, visible but pastel
			description: 'Requires a specific game event to have occurred'
		},
		'item': {
			label: 'Requires Item',
			icon: '🎒',
			color: '#e0ffe0', // soft mint green, still pastel but visible
			description: 'Requires a specific item or upgrade'
		},
		'tech': {
			label: 'Requires Tech',
			icon: '📘',
			color: '#dbeeff', // soft baby blue
			description: 'Requires execution of specific Tech Logical Requirement(s)'
		},
		'helper': {
			label: 'Requires Helper',
			icon: '📘',
			color: '#f7c2c9', // toned-down pink, less saturated
			description: 'Requires execution of specific Helper Logical Requirement(s)'
		},
		'damageRun': {
			label: 'Hell Run / Cold Run',
			icon: '🏃',
			color: '#f4c28a', // soft yellow-beige
			description: 'The amount of frames it takes to get through a heated or cold room'
		},
		'environment': {
			label: 'Environment condition',
			icon: '🌿',
			color: '#e8e8e8', // light gray-beige, visible but subtle
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
		this.itemList = null;
		this.eventList = null;
		this.techMap = null;
		this.helperMap = null;
		this.createElement();
		this.setupEventHandlers();
	}
	createElement() {
		this.root = document.createElement('div');
		//const typeClass = this.typeSelect.value || 'none';
		//this.root.className = `condition-block editor-card ${typeClass}`;
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
		switch (selectedType) {
			case 'and':
			case 'or':
			case 'not':
				this.renderLogicalCondition(selectedType);
				break;
			case 'item':
			case 'event':
			case 'tech':
			case 'helper':
				this.renderSelectCondition(selectedType);
				break;
			case 'environment':
				this.renderEnvironmentCondition();
				break;
			case 'damageRun':
				this.renderDamageRunCondition();
				break;
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
		const container = document.createElement('div');
		container.style.marginLeft = '25px';
		container.style.display = 'flex';
		container.style.flexDirection = 'column';
		container.style.gap = '6px';
		if (type === 'tech') {
			this._techCheckboxContainer = this.createMapCheckboxList(this.techMap, 'Tech', this.initialCondition?.tech || []);
			container.appendChild(this._techCheckboxContainer);
		} else if (type === 'helper') {
			this._helperCheckboxContainer = this.createMapCheckboxList(this.helperMap, 'Helper', this.initialCondition?.helper || []);
			container.appendChild(this._helperCheckboxContainer);
		} else {
			// fallback to single-select
			const select = document.createElement('select');
			select.style.width = '100%';
			const emptyOption = document.createElement('option');
			emptyOption.value = '';
			emptyOption.textContent = `(select ${type})`;
			select.appendChild(emptyOption);
			container.appendChild(select);
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
		}
		this.childrenContainer.appendChild(container);
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
	renderEnvironmentCondition() {
		const select = document.createElement('select');
		select.style.marginLeft = '25px';
		select.style.backgroundColor = CONDITION_CONFIG.types.environment.color;
		select.style.width = '100%';
		// Add placeholder
		const emptyOption = document.createElement('option');
		emptyOption.value = '';
		emptyOption.textContent = '(select environment)';
		select.appendChild(emptyOption);
		// Add fixed options
		['heated', 'freezing', 'underwater'].forEach(opt => {
			const option = document.createElement('option');
			option.value = opt;
			option.textContent = opt;
			select.appendChild(option);
		});
		// Set initial value
		if (this.initialCondition && this.initialCondition.environment) {
			select.value = this.initialCondition.environment;
		}
		this.childrenContainer.appendChild(select);
	}
	addChildCondition(initialData = null, appendAddButton = true) {
		const childContainer = document.createElement('div');
		const childEditor = makeConditionEditor(childContainer, initialData, this.indentLevel + 1, false);
		// immediately give the child the current lists
		childEditor.setLists({
			itemList: this.itemList,
			eventList: this.eventList,
			techMap: this.techMap,
			helperMap: this.helperMap
		});
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
			return (this.itemList || this.getDefaultItems()).sort();
		} else if (type === 'event') {
			return (this.eventList || this.getDefaultEvents()).sort();
		}
		return [];
	}
	getDefaultItems() {
		return [
			'Items failed to load'
		];
	}
	getDefaultEvents() {
		return [
			'Events failed to load'
		];
	}
	getValue() {
		const selectedType = this.typeSelect.value;
		if (!selectedType) return null;
		switch (selectedType) {
			case 'and':
			case 'or':
			case 'not': {
				const childValues = this.childEditors
					.map(editor => editor.getValue())
					.filter(v => v !== null);
				return childValues.length ? {
					[selectedType]: childValues
				} : null;
			}
			case 'item':
			case 'event': {
				const select = this.childrenContainer.querySelector('select');
				const val = select ? select.value : '';
				return val ? {
					[selectedType]: val
				} : null;
			}
			case 'tech': {
				if (!this._techCheckboxContainer) return null;
				const selected = this._techCheckboxContainer.getSelectedValues();
				return selected.length ? {
					tech: selected
				} : null;
			}
			case 'helper': {
				if (!this._helperCheckboxContainer) return null;
				const selected = this._helperCheckboxContainer.getSelectedValues();
				return selected.length ? {
					helper: selected
				} : null;
			}
			case 'environment': {
				const input = this.childrenContainer.querySelector('input');
				const val = input ? input.value.trim() : '';
				return val ? {
					[selectedType]: val
				} : null;
			}
			case 'damageRun': {
				const typeVal = this._damageRunTypeSelect?.value;
				const frameVal = parseInt(this._damageRunFrameInput?.value, 10);
				if (!typeVal || isNaN(frameVal)) return null;
				return typeVal === 'Hell Run' ? {
					heatFrames: frameVal
				} : {
					coldFrames: frameVal
				};
			}
			default:
				return null;
		}
	}
	isValid() {
		const selectedType = this.typeSelect.value;
		if (!selectedType) return true;
		switch (selectedType) {
			case 'and':
			case 'or':
			case 'not':
				return this.childEditors.some(editor => editor.isValid());
			case 'item':
			case 'event':
			case 'tech':
			case 'helper': {
				const select = this.childrenContainer.querySelector('select');
				return !!(select && select.value);
			}
			case 'environment': {
				const input = this.childrenContainer.querySelector('input');
				return !!(input && input.value.trim());
			}
			case 'damageRun': {
				const typeVal = this._damageRunTypeSelect?.value;
				const frameVal = this._damageRunFrameInput?.value;
				return typeVal && typeVal !== '(Select a Damage Run Type)' && frameVal !== '';
			}
			default:
				return false;
		}
	}
	getDescription() {
		const selectedType = this.typeSelect.value;
		if (!selectedType) return 'No condition';
		const config = CONDITION_CONFIG.types[selectedType];
		switch (selectedType) {
			case 'and':
			case 'or': {
				const childDescs = this.childEditors
					.map(editor => editor.getDescription())
					.filter(d => d !== 'No condition');
				if (!childDescs.length) return 'No condition';
				if (childDescs.length === 1) return childDescs[0];
				const connector = selectedType === 'and' ? ' AND ' : ' OR ';
				return `(${childDescs.join(connector)})`;
			}
			case 'not': {
				const childDescs = this.childEditors
					.map(editor => editor.getDescription())
					.filter(d => d !== 'No condition');
				return childDescs.length ? `NOT (${childDescs[0]})` : 'No condition';
			}
			case 'item':
			case 'event':
			case 'tech':
			case 'helper': {
				const select = this.childrenContainer.querySelector('select');
				const val = select ? select.value : '';
				return val ? `${config.label}: ${val}` : 'No condition';
			}
			case 'environment': {
				const input = this.childrenContainer.querySelector('input');
				const val = input ? input.value.trim() : '';
				return val ? `${config.label}: ${val}` : 'No condition';
			}
			default:
				return config.label;
		}
	}
	setLists({
		itemList,
		eventList,
		techMap,
		helperMap
	}) {
		this.itemList = itemList || [];
		this.eventList = eventList || [];
		this.techMap = techMap || {};
		this.helperMap = helperMap || {};
		// Render condition now that lists exist
		this.renderCondition();
		// propagate lists to child editors after children exist
		this.childEditors.forEach(child => child.setLists({
			itemList,
			eventList,
			techMap,
			helperMap
		}));
	}
	renderDamageRunCondition() {
		const container = document.createElement('div');
		container.style.marginLeft = '25px';
		container.style.display = 'flex';
		container.style.flexDirection = 'column';
		container.style.gap = '6px';
		// Dropdown for Hell / Cold
		const typeSelect = document.createElement('select');
		['(Select a Damage Run Type)', 'Hell Run', 'Cold Run'].forEach(opt => {
			const option = document.createElement('option');
			option.value = opt;
			option.textContent = opt;
			typeSelect.appendChild(option);
		});
		if (this.initialCondition?.damageRunType) {
			typeSelect.value = this.initialCondition.damageRunType;
		}
		// Numbers-only input for frames
		const frameInput = document.createElement('input');
		frameInput.type = 'number';
		frameInput.min = '0';
		frameInput.max = '999999';
		frameInput.step = '1';
		frameInput.placeholder = '# of frames to reach goal (for avg. skilled player, no mistakes. Not TAS!)';
		frameInput.style.width = '500px';
		// Enforce valid integer on input
		frameInput.addEventListener('input', () => {
			if (frameInput.value === '') return;
			let val = parseInt(frameInput.value, 10);
			if (isNaN(val)) val = 0;
			if (val < 0) val = 0;
			if (val > 99999) val = 99999;
			frameInput.value = val;
		});
		container.appendChild(typeSelect);
		container.appendChild(frameInput);
		this.childrenContainer.appendChild(container);
		// Save references for getValue
		this._damageRunTypeSelect = typeSelect;
		this._damageRunFrameInput = frameInput;
	}
	createMapCheckboxList(map, label, initialSelected = []) {
		const container = document.createElement('div');
		container.className = 'checkbox-map-container';

		// Add type-specific class for CSS hover
		container.classList.add(label.toLowerCase()); // 'tech' or 'helper'
		
		const initialSet = new Set((initialSelected || []).map(x => String(x)));
	
		const collapseButton = document.createElement('button');
		collapseButton.textContent = 'Hide List ▼';
		collapseButton.style.marginBottom = '6px';
		collapseButton.style.padding = '2px 6px';
		collapseButton.style.fontSize = '12px';
		collapseButton.style.cursor = 'pointer';
		container.appendChild(collapseButton);
	
		const searchInput = document.createElement('input');
		searchInput.type = 'text';
		searchInput.placeholder = `Filter ${label}...`;
		searchInput.style.marginBottom = '6px';
		container.appendChild(searchInput);
	
		const table = document.createElement('table');
		table.style.width = '100%';
		table.style.borderCollapse = 'collapse';
		container.appendChild(table);
		const tbody = document.createElement('tbody');
		table.appendChild(tbody);
	
		const checkboxes = [];
	
		function renderItemRow(item, depth = 0) {
			const row = document.createElement('tr');
	
			// Checkbox cell
			const cbCell = document.createElement('td');
			cbCell.style.width = '40px';
			cbCell.style.textAlign = 'center';
			cbCell.style.cursor = 'pointer'; // entire cell clickable
	
			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.style.width = '20px';
			checkbox.style.height = '20px';
			checkbox.style.margin = '0';
	
			const itemIdStr = item.id !== undefined && item.id !== null ? String(item.id) : null;
			const isChecked = (itemIdStr && initialSet.has(itemIdStr)) || initialSet.has(String(item.name));
			checkbox.checked = !!isChecked;
	
			cbCell.appendChild(checkbox);
			row.appendChild(cbCell);
	
			// Name cell
			const nameCell = document.createElement('td');
			nameCell.style.cursor = 'pointer';
			nameCell.style.borderRight = '1px solid #ccc'; // vertical line to devNote
			nameCell.style.paddingLeft = `${depth * 12}px`; // indentation for nested
	
			let displayLabel = item.name;
			if (item.extensionTech) displayLabel += ' [Ext]';
			nameCell.textContent = displayLabel;
			row.appendChild(nameCell);
	
			// Note/devNote cell
			const noteCell = document.createElement('td');
			noteCell.textContent = Array.isArray(item.devNote)
				? item.devNote.join(' ')
				: item.devNote || item.note || '';
			row.appendChild(noteCell);
	
			tbody.appendChild(row);
	
			checkboxes.push({ checkbox, item });
	
			// Make entire first two cells clickable to toggle checkbox
			[cbCell, nameCell].forEach(cell => {
				cell.addEventListener('click', () => {
					checkbox.checked = !checkbox.checked;
				});
			});
	
			(item.extensionTechs || []).forEach(ext => renderItemRow(ext, depth + 1));
		}
	
		for (const [categoryName, catObj] of map.entries()) {
			const catRow = document.createElement('tr');
			const catCell = document.createElement('td');
			catCell.colSpan = 3;
			catCell.textContent = categoryName;
			catCell.style.fontWeight = 'bold';
			catCell.style.borderBottom = '2px solid #bbb';
			catRow.appendChild(catCell);
			tbody.appendChild(catRow);
	
			(catObj.items || []).forEach(item => renderItemRow(item));
		}
	
		searchInput.addEventListener('input', () => {
			const filter = searchInput.value.toLowerCase();
			tbody.querySelectorAll('tr').forEach(row => {
				const nameCell = row.querySelector('td:nth-child(2)');
				const noteCell = row.querySelector('td:nth-child(3)');
				if (!nameCell) return;
				const textToCheck = nameCell.textContent + ' ' + (noteCell ? noteCell.textContent : '');
				row.style.display = textToCheck.toLowerCase().includes(filter) ? '' : 'none';
			});
		});
	
		collapseButton.addEventListener('click', () => {
			const isHidden = table.style.display === 'none';
			table.style.display = isHidden ? '' : 'none';
			searchInput.style.display = isHidden ? '' : 'none';
			collapseButton.textContent = isHidden ? 'Hide List ▼' : 'Show List ▶';
		});
	
		container.getSelectedValues = () => {
			return checkboxes.filter(cb => cb.checkbox.checked).map(cb => cb.item.name);
		};
	
		return container;
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