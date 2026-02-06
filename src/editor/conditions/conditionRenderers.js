/* =============================================================================
   Condition Renderers - Specialized rendering logic for each condition type
   
   Separates the rendering and value extraction logic for different condition
   types into manageable, focused classes.
   ============================================================================= */

class ConditionRenderers {
	static renderers = new Map();

	static register(types, renderer) {
		if (typeof types === 'string') {
			types = [types];
		}
		types.forEach(type => {
			this.renderers.set(type, renderer);
		});
	}

	static getRenderer(type) {
		return this.renderers.get(type) || this.renderers.get('default');
	}
}

// =============================================================================
// Logical Condition Renderers
// =============================================================================

class LogicalRenderer {
	static render(editor, type, initialCondition) {
		if (type === 'not') {
			// "not" only accepts a string, not nested conditions
			const container = editor.createInputContainer();

			// Create a select for choosing what to negate
			const select = document.createElement('select');
			select.style.width = '100%';

			const emptyOption = document.createElement('option');
			emptyOption.value = '';
			emptyOption.textContent = '(select condition to negate)';
			select.appendChild(emptyOption);
			// Add flags (events)
			if (window.EditorGlobals.eventList) {
				const eventMap = window.EditorGlobals.eventList;

				for (const [categoryName, flags] of Object.entries(eventMap)) {
					if (!Array.isArray(flags) || !flags.length) continue;

					const group = document.createElement('optgroup');
					group.label = `Flag: ${SelectRenderer.formatCategoryLabel(categoryName)}`;

					flags.forEach(flag => {
						const opt = document.createElement('option');
						opt.value = flag.name; // IMPORTANT: raw string
						opt.textContent = SelectRenderer.stripFlagPrefix(flag.name);
						group.appendChild(opt);
					});

					select.appendChild(group);
				}
			}

			// Add items
			const items = (window.EditorGlobals.itemList || []).sort();
			items.forEach(item => {
				const opt = document.createElement('option');
				opt.value = item;
				opt.textContent = `Item: ${item}`;
				select.appendChild(opt);
			});

			// Add tech
			if (window.EditorGlobals.techMap) {
				for (const [categoryName, catObj] of window.EditorGlobals.techMap.entries()) {
					const group = document.createElement('optgroup');
					group.label = `Tech: ${categoryName}`;
					(catObj.items || []).forEach(tech => {
						const opt = document.createElement('option');
						opt.value = tech.name;
						opt.textContent = tech.name;
						group.appendChild(opt);
					});
					select.appendChild(group);
				}
			}

			// Add helper
			if (window.EditorGlobals.helperMap) {
				for (const [categoryName, catObj] of window.EditorGlobals.helperMap.entries()) {
					const group = document.createElement('optgroup');
					group.label = `Helper: ${categoryName}`;
					(catObj.items || []).forEach(helper => {
						const opt = document.createElement('option');
						opt.value = helper.name;
						opt.textContent = helper.name;
						group.appendChild(opt);
					});
					select.appendChild(group);
				}
			}

			// Set initial value
			if (initialCondition && initialCondition.not) {
				select.value = initialCondition.not;
			}

			container.appendChild(select);
			editor.childrenContainer.appendChild(container);
			editor.inputs.notSelect = select;
			console.log(`[LogicalRenderer.render] Rendered NOT condition`);
			return;
		}

		// For 'and' and 'or', create the add button FIRST
		if (!editor.addButton) {
			console.log(`[LogicalRenderer.render] Creating add button for ${type}`);
			editor.addButton = document.createElement('button');
			editor.addButton.textContent = type === 'and' ? '+ Add Sub-condition' : '+ Add Option';
			editor.addButton.className = 'add-btn';
			editor.addButton.style.marginTop = '8px';
			editor.addButton.addEventListener('click', () => {
				editor.addChildCondition();
			});
			editor.childrenContainer.appendChild(editor.addButton);
			console.log(`[LogicalRenderer.render] Add button created and appended`);
		} else {
			console.log(`[LogicalRenderer.render] Add button already exists`);
		}

		// Extract children array from initialCondition
		let initialChildren = [];
		if (initialCondition) {
			console.log(`[LogicalRenderer.render] Extracting children from initialCondition, type: ${type}`);
			console.log(`[LogicalRenderer.render] initialCondition[${type}]:`, initialCondition[type]);

			if (initialCondition[type] && Array.isArray(initialCondition[type])) {
				// Normal case: { "or": [...] } or { "and": [...] }
				initialChildren = initialCondition[type];
				console.log(`[LogicalRenderer.render] Found ${initialChildren.length} children in initialCondition.${type}`);
			} else if (Array.isArray(initialCondition)) {
				// Edge case: already an array
				initialChildren = initialCondition;
				console.log(`[LogicalRenderer.render] initialCondition is already an array with ${initialChildren.length} items`);
			} else {
				console.warn(`[LogicalRenderer.render] Could not extract children array from:`, initialCondition);
			}
		} else {
			console.log(`[LogicalRenderer.render] No initialCondition provided`);
		}

		console.log(`[LogicalRenderer.render] About to create ${initialChildren.length} child editors`);

		// Add initial children - they will be inserted before the button
		initialChildren.forEach((childData, index) => {
			console.log(`[LogicalRenderer.render] Creating child ${index}/${initialChildren.length}:`, childData);
			const childEditor = editor.addChildCondition(childData, true);
			console.log(`[LogicalRenderer.render] Child ${index} created:`, childEditor ? 'success' : 'FAILED');
		});

		console.log(`[LogicalRenderer.render] END - Created ${editor.childEditors.length} child editors total`);
	}

	static getValue(editor, type) {
		if (type === 'not') {
			const notValue = editor.inputs.notSelect?.value?.trim();
			return notValue ? {
				not: notValue
			} : null;
		} else {
			const childValues = editor.childEditors
				.map(child => child.getValue())
				.filter(value => value !== null && value !== undefined && value !== '');

			// Filter out empty conditions - if a child has selectedType === '' (no condition), getValue returns null
			const validChildValues = childValues.filter(value => {
				// Make sure we have actual data, not just empty objects
				if (typeof value === 'object' && !Array.isArray(value)) {
					return Object.keys(value).length > 0;
				}
				return true;
			});

			// For 'and' and 'or', always return array format
			// But return null if there are no valid children
			return validChildValues.length > 0 ? {
				[type]: validChildValues
			} : null;
		}
	}
}

// =============================================================================
// Simple Selection Renderers
// =============================================================================

class SelectRenderer {
	static render(editor, type, initialCondition) {
		const container = editor.createInputContainer();
		const select = document.createElement('select');
		select.style.width = '100%';

		let emptyOptionStr = '';
		switch (type) {
			default:
				emptyOptionStr = `${type}`;
				break;
			case 'disableEquipment':
				emptyOptionStr = "equipment";
				break;
		}

		const emptyOption = document.createElement('option');
		emptyOption.value = '';
		emptyOption.textContent = `(select ${emptyOptionStr})`;
		select.appendChild(emptyOption);

		const options = this.getOptionsForType(type);

		if (type === 'event') {
			// Create searchable flag selector
			return this.renderSearchableFlags(editor, container, initialCondition);

			const collator = new Intl.Collator(undefined, {
				numeric: true,
				sensitivity: 'base'
			});

			Object.entries(options).forEach(([category, flags]) => {
				const group = document.createElement('optgroup');
				group.label = category;

				flags
					.slice()
					.sort((a, b) => collator.compare(a.name, b.name))
					.forEach(flag => {
						const opt = document.createElement('option');

						// Full value is stored
						opt.value = flag.name;

						// Display value (for searching quickly)
						opt.textContent = this.stripFlagPrefix(flag.name);

						group.appendChild(opt);
					});

				select.appendChild(group);
			});
		} else {
			options.forEach(option => {
				const opt = document.createElement('option');
				opt.value = option;
				opt.textContent = option;
				select.appendChild(opt);
			});
		}

		// Set initial value
		if (initialCondition && initialCondition[type]) {
			select.value = initialCondition[type];
		}

		container.appendChild(select);
		editor.childrenContainer.appendChild(container);
		editor.inputs.select = select;
	}

	static renderSearchableFlags(editor, container, initialCondition) {
		const wrapper = document.createElement('div');
		wrapper.style.cssText = `
			border: 1px solid #dee2e6;
			border-radius: 4px;
			background: #fff;
		`;

		// Collapse button
		const collapseBtn = document.createElement('button');
		collapseBtn.type = 'button';
		collapseBtn.textContent = '▼ Hide Flag List';
		collapseBtn.style.cssText = `
			width: 100%;
			padding: 8px 12px;
			background: #f8f9fa;
			border: none;
			border-bottom: 1px solid #dee2e6;
			cursor: pointer;
			text-align: left;
			font-weight: 600;
			font-size: 13px;
		`;

		// Search input
		const searchInput = document.createElement('input');
		searchInput.type = 'text';
		searchInput.placeholder = 'Search flags...';
		searchInput.style.cssText = `
			width: 100%;
			padding: 8px 12px;
			border: none;
			border-bottom: 1px solid #dee2e6;
			font-size: 13px;
			box-sizing: border-box;
		`;

		// Select dropdown
		const select = document.createElement('select');
		select.style.cssText = `
			width: 100%;
			padding: 8px 12px;
			border: none;
			font-size: 13px;
			max-height: 300px;
		`;
		select.size = 10; // Show multiple options

		const emptyOption = document.createElement('option');
		emptyOption.value = '';
		emptyOption.textContent = '(select flag)';
		select.appendChild(emptyOption);

		const options = this.getOptionsForType('event');
		const collator = new Intl.Collator(undefined, {
			numeric: true,
			sensitivity: 'base'
		});

		// Build all options
		const allOptions = [];
		Object.entries(options).forEach(([category, flags]) => {
			flags.forEach(flag => {
				allOptions.push({
					category,
					value: flag.name,
					displayText: this.stripFlagPrefix(flag.name),
					searchText: `${category} ${this.stripFlagPrefix(flag.name)}`.toLowerCase()
				});
			});
		});

		// Sort all options
		allOptions.sort((a, b) => collator.compare(a.displayText, b.displayText));

		// Render options grouped by category
		let currentCategory = null;
		let currentGroup = null;

		allOptions.forEach(option => {
			if (option.category !== currentCategory) {
				currentGroup = document.createElement('optgroup');
				currentGroup.label = option.category;
				select.appendChild(currentGroup);
				currentCategory = option.category;
			}

			const opt = document.createElement('option');
			opt.value = option.value;
			opt.textContent = option.displayText;
			opt.dataset.searchText = option.searchText;
			currentGroup.appendChild(opt);
		});

		// Set initial value
		if (initialCondition && initialCondition['event']) {
			select.value = initialCondition['event'];
		}

		// Search functionality
		searchInput.addEventListener('input', () => {
			const filter = searchInput.value.toLowerCase();
			let visibleCount = 0;

			select.querySelectorAll('option').forEach(opt => {
				if (opt.value === '') {
					opt.style.display = ''; // Always show empty option
					return;
				}

				const searchText = opt.dataset.searchText || '';
				const matches = !filter || searchText.includes(filter);
				opt.style.display = matches ? '' : 'none';
				if (matches && opt.value) visibleCount++;
			});

			// Hide empty optgroups
			select.querySelectorAll('optgroup').forEach(group => {
				const visibleOptions = Array.from(group.querySelectorAll('option'))
					.filter(opt => opt.style.display !== 'none');
				group.style.display = visibleOptions.length ? '' : 'none';
			});
		});

		// Collapse functionality
		let isCollapsed = false;
		const contentArea = document.createElement('div');
		contentArea.appendChild(searchInput);
		contentArea.appendChild(select);

		collapseBtn.addEventListener('click', () => {
			isCollapsed = !isCollapsed;
			contentArea.style.display = isCollapsed ? 'none' : 'block';
			collapseBtn.textContent = isCollapsed ? '▶ Show Flag List' : '▼ Hide Flag List';
		});

		wrapper.appendChild(collapseBtn);
		wrapper.appendChild(contentArea);
		container.appendChild(wrapper);
		editor.childrenContainer.appendChild(container);
		editor.inputs.select = select;
	}

	static formatCategoryLabel(key) {
		return key
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			.replace(/^./, c => c.toUpperCase());
	}

	static stripFlagPrefix(name) {
		return name.startsWith('f_') ? name.slice(2) : name;
	}

	static getOptionsForType(type) {
		if (type === 'item' || type === 'disableEquipment') {
			return (window.EditorGlobals.itemList || []).slice().sort();
		} else if (type === 'event') {
			return window.EditorGlobals.eventList || {};
		}
		return [];
	}

	static getValue(editor, type) {
		const selectValue = editor.inputs.select?.value?.trim();
		// Return plain string for items, events, and disableEquipment
		// The schema allows these to appear as plain strings in the requires array
		return selectValue || null;
	}

	static restoreValue(editor, type, value) {
		// Value might be a plain string or wrapped in object
		const actualValue = typeof value === 'string' ? value : value[type];
		if (editor.inputs.select && actualValue) {
			editor.inputs.select.value = actualValue;
		}
	}
}

class DisableEquipmentRenderer {
	static render(editor, type, initialCondition) {
		const container = editor.createInputContainer();
		const select = document.createElement('select');
		select.style.width = '100%';

		const emptyOption = document.createElement('option');
		emptyOption.value = '';
		emptyOption.textContent = '(select equipment)';
		select.appendChild(emptyOption);

		const options = (window.EditorGlobals.itemList || []).slice().sort();
		options.forEach(option => {
			const opt = document.createElement('option');
			opt.value = option;
			opt.textContent = option;
			select.appendChild(opt);
		});

		// Set initial value
		if (initialCondition && initialCondition[type]) {
			select.value = initialCondition[type];
		}

		container.appendChild(select);
		editor.childrenContainer.appendChild(container);
		editor.inputs.select = select;
	}

	static getValue(editor, type) {
		const selectValue = editor.inputs.select?.value?.trim();
		return selectValue ? { [type]: selectValue } : null;
	}

	static restoreValue(editor, type, value) {
		const actualValue = typeof value === 'string' ? value : value[type];
		if (editor.inputs.select && actualValue) {
			editor.inputs.select.value = actualValue;
		}
	}
}

// =============================================================================
// Multi-Select Renderers (Tech/Helper)
// =============================================================================

class MultiSelectRenderer {
	static normalizeInitialSelection(value, key) {
    if (!value) return [];

    if (typeof value === 'string') return [value];

    if (Array.isArray(value)) {
        return value.map(v => typeof v === 'string' ? v : v?.[key]).filter(Boolean);
    }

    if (value.and && Array.isArray(value.and)) {
        return value.and;
    }

    if (value[key]) {
        return Array.isArray(value[key]) ? value[key] : [value[key]];
    }

    return [];
}

static render(editor, type, initialCondition) {
    const container = editor.createInputContainer();

    if (type === 'tech') {
        const selectedTech =
            MultiSelectRenderer.normalizeInitialSelection(
                initialCondition,
                'tech'
            );

        editor.inputs.techCheckboxContainer = createMapCheckboxList(
            window.EditorGlobals.techMap,
            'Tech',
            selectedTech,
            Infinity
        );

        container.appendChild(editor.inputs.techCheckboxContainer);
    }

    else if (type === 'helper') {
        const selectedHelper =
            MultiSelectRenderer.normalizeInitialSelection(
                initialCondition,
                'helper'
            );

        editor.inputs.helperCheckboxContainer = createMapCheckboxList(
            window.EditorGlobals.helperMap,
            'Helper',
            selectedHelper,
            Infinity
        );

        container.appendChild(editor.inputs.helperCheckboxContainer);
    }

    editor.childrenContainer.appendChild(container);
}


    static getValue(editor, type) {
        if (type === 'tech') {
            const selectedTech = editor.inputs.techCheckboxContainer?.getSelectedValues() || [];
            // Return array of tech names if multiple, single string if one
            if (selectedTech.length === 0) return null;
            if (selectedTech.length === 1) return selectedTech[0];
            return { and: selectedTech };  // Wrap multiple in AND
        } else if (type === 'helper') {
            const selectedHelper = editor.inputs.helperCheckboxContainer?.getSelectedValues() || [];
            // Return array of helper names if multiple, single string if one
            if (selectedHelper.length === 0) return null;
            if (selectedHelper.length === 1) return selectedHelper[0];
            return { and: selectedHelper };  // Wrap multiple in AND
        }
        return null;
    }
}

// =============================================================================
// Node-Based Renderers
// =============================================================================

class NodeRenderer {
	static render(editor, type, initialCondition) {
		const container = editor.createInputContainer();

		const initialValue = initialCondition && initialCondition[type] ? [initialCondition[type]] : [];

		let maxSelected = 1;
		let filterBy = "All";

		switch (type) {
			case 'itemNotCollectedAtNode':
			case 'itemCollectedAtNode':
				filterBy = "item";
				break;
		}

		editor.inputs.nodeCheckboxList = createNodeCheckboxList(
			initialValue,
			'Nodes',
			maxSelected,
			filterBy
		);
		container.appendChild(editor.inputs.nodeCheckboxList);
		editor.childrenContainer.appendChild(container);
	}

	static getValue(editor, type) {
		const selectedNodes = editor.inputs.nodeCheckboxList?.getSelectedValues();
		if (selectedNodes && selectedNodes.length > 0) {
			const nodeId = parseInt(selectedNodes[0]);
			return {
				[type]: nodeId
			};
		}
		return null;
	}

	static restoreValue(editor, type, value) {
		// Node lists rebuild themselves, so restoration happens automatically
		// during the rebuild process
	}
}

// =============================================================================
// Obstacle Renderers
// =============================================================================

class ObstacleRenderer {
	static render(editor, type, initialCondition) {
		const container = editor.createInputContainer();

		const initialValue = initialCondition && initialCondition[type] ?
			initialCondition[type] : [];

		editor.inputs.obstacleCheckboxList = createObstacleCheckboxList(
			initialValue,
			'Obstacles'
		);
		container.appendChild(editor.inputs.obstacleCheckboxList);
		editor.childrenContainer.appendChild(container);
	}

	static getValue(editor, type) {
		const selectedObstacles = editor.inputs.obstacleCheckboxList?.getSelectedIds();
		return (selectedObstacles && selectedObstacles.length > 0) ? {
			[type]: selectedObstacles
		} : null;
	}
}

// =============================================================================
// Notable Renderer
// =============================================================================

class NotableRenderer {
	static render(editor, type, initialCondition) {
		const container = editor.createInputContainer();

		const notableSelect = document.createElement('select');
		notableSelect.style.width = '100%';

		const emptyOption = document.createElement('option');
		emptyOption.value = '';
		emptyOption.textContent = '(select notable)';
		notableSelect.appendChild(emptyOption);

		// Get current notables from the NotableEditor
		if (typeof NotableEditor !== 'undefined') {
			const notables = NotableEditor.getNotableSnapshot();
			notables.forEach(notable => {
				const option = document.createElement('option');
				option.value = notable.name;
				option.textContent = notable.name || `(Notable ${notable.id})`;
				notableSelect.appendChild(option);
			});
		}

		if (initialCondition && initialCondition.notable) {
			notableSelect.value = initialCondition.notable;
		}

		container.appendChild(notableSelect);
		editor.childrenContainer.appendChild(container);
		editor.inputs.notableSelect = notableSelect;

		// Subscribe to notable changes
		if (typeof NotableEditor !== 'undefined') {
			const unsubscribe = NotableEditor.onNotablesChanged((notables) => {
				if (!editor.inputs.notableSelect) return;

				const currentValue = editor.inputs.notableSelect.value;
				editor.inputs.notableSelect.innerHTML = '';

				const emptyOption = document.createElement('option');
				emptyOption.value = '';
				emptyOption.textContent = '(select notable)';
				editor.inputs.notableSelect.appendChild(emptyOption);

				notables.forEach(notable => {
					const option = document.createElement('option');
					option.value = notable.name;
					option.textContent = notable.name || `(Notable ${notable.id})`;
					editor.inputs.notableSelect.appendChild(option);
				});

				editor.inputs.notableSelect.value = currentValue;
			});

			editor.subscriptions.push(unsubscribe);
		}
	}

	static getValue(editor, type) {
		const notableName = editor.inputs.notableSelect?.value;
		// Return plain string (notable name), not wrapped in object
		return notableName || null;
	}
}

// =============================================================================
// Resource Array Renderer
// =============================================================================

class ResourceArrayRenderer {
	static render(editor, type, initialCondition) {
		const container = editor.createInputContainer();

		const resourcesContainer = createDynamicList(
			'Resource Entries',
			(resource = null) => {
				const resourceTypes = type === 'resourceConsumed' ? ['RegularEnergy', 'ReserveEnergy', 'Energy'] : RESOURCE_TYPES;
				return createResourceEntry(
					resource?.type || '',
					resource?.count || 0,
					resourceTypes
				);
			},
			initialCondition?.[type] || []
		);

		container.appendChild(resourcesContainer);
		editor.childrenContainer.appendChild(container);
		editor.inputs.resourceArrayContainer = resourcesContainer;
	}

	static getValue(editor, type) {
		const resourceEntries = editor.inputs.resourceArrayContainer?.getValue() || [];
		return resourceEntries.length > 0 ? {
			[type]: resourceEntries
		} : null;
	}
}

// =============================================================================
// Simple Number Input Renderer
// =============================================================================

class SimpleNumberRenderer {
	static render(editor, type, initialCondition) {
		const container = editor.createInputContainer();

		const input = document.createElement('input');
		input.type = 'number';
		input.min = type === 'shineChargeFrames' ? '0' : '1';
		input.placeholder = CONDITION_PLACEHOLDERS[type] || 'Value';

		if (initialCondition && initialCondition[type] !== undefined) {
			input.value = initialCondition[type];
		} else
			input.value = input.min;

		container.appendChild(input);
		editor.childrenContainer.appendChild(container);
		editor.inputs.simpleNumberInput = input;
	}

	static getValue(editor, type) {
		const numberValue = parseInt(editor.inputs.simpleNumberInput?.value);
		return (numberValue > 0 || (type === 'shineChargeFrames' && numberValue >= 0)) ? {
			[type]: numberValue
		} : null;
	}
}

// =============================================================================
// Ammo Condition Renderer
// =============================================================================

class AmmoRenderer {
	static render(editor, type, initialCondition) {
		const container = editor.createInputContainer();

		const typeSelect = document.createElement('select');
		AMMO_TYPES.forEach(ammoType => {
			const option = document.createElement('option');
			option.value = ammoType;
			option.textContent = ammoType;
			typeSelect.appendChild(option);
		});

		const countInput = document.createElement('input');
		countInput.type = 'number';
		countInput.min = '1';
		countInput.value = countInput.min;
		countInput.placeholder = 'Amount';
		countInput.style.marginLeft = '8px';

		if (initialCondition && initialCondition[type]) {
			typeSelect.value = initialCondition[type].type || 'Missile';
			countInput.value = initialCondition[type].count || 1;
		}

		container.appendChild(typeSelect);
		container.appendChild(countInput);
		editor.childrenContainer.appendChild(container);

		editor.inputs.ammoTypeSelect = typeSelect;
		editor.inputs.ammoCountInput = countInput;
	}

	static getValue(editor, type) {
		const ammoType = editor.inputs.ammoTypeSelect?.value;
		const count = parseInt(editor.inputs.ammoCountInput?.value);
		return (ammoType && count > 0) ? {
			[type]: {
				type: ammoType,
				count
			}
		} : null;
	}
}

// =============================================================================
// Empty Object Renderer (for flash suit conditions, etc.)
// =============================================================================

class EmptyObjectRenderer {
	static render(editor, type, initialCondition) {
		const container = editor.createInputContainer();
		container.innerHTML = `<em>No additional properties required for ${type}</em>`;
		editor.childrenContainer.appendChild(container);
	}

	static getValue(editor, type) {
		return {
			[type]: {}
		};
	}
}

// =============================================================================
// Special Value Renderers (free/never)
// =============================================================================

class SpecialValueRenderer {
	static render(editor, type, initialCondition) {
		const container = editor.createInputContainer();
		container.innerHTML = `<em>This condition is always ${type === 'free' ? 'satisfied' : 'unsatisfied'}</em>`;
		editor.childrenContainer.appendChild(container);
	}

	static getValue(editor, type) {
		return type;
	}
}

// =============================================================================
// Enemy Kill Renderer
// =============================================================================
class EnemyKillRenderer {
	static render(editor, type, initialCondition) {
		const container = editor.createInputContainer();

		// Create a more user-friendly interface
		const enemyGroupsContainer = document.createElement('div');
		enemyGroupsContainer.style.border = '1px solid #ddd';
		enemyGroupsContainer.style.borderRadius = '6px';
		enemyGroupsContainer.style.padding = '8px';
		enemyGroupsContainer.style.marginBottom = '8px';

		const label = document.createElement('div');
		label.textContent = 'Enemy Group Sets (each group can be hit by same AOE attack):';
		label.style.fontWeight = 'bold';
		label.style.marginBottom = '8px';
		enemyGroupsContainer.appendChild(label);

		const groupsWrapper = document.createElement('div');
		enemyGroupsContainer.appendChild(groupsWrapper);

		const addGroupBtn = document.createElement('button');
		addGroupBtn.textContent = '+ Add Enemy Group Set';
		addGroupBtn.className = 'add-btn';
		addGroupBtn.style.marginTop = '8px';
		enemyGroupsContainer.appendChild(addGroupBtn);

		// Get enemy groups from EnemyEditor instances - SAFELY
		let availableEnemyGroups = [];
		try {
			availableEnemyGroups = getCurrentEnemyGroups() || [];
		} catch (error) {
			console.warn('Failed to get current enemy groups:', error);
			availableEnemyGroups = [];
		}

		const updateAvailableGroups = () => {
			try {
				const previousGroups = [...availableEnemyGroups];
				availableEnemyGroups = getCurrentEnemyGroups() || [];

				// Check if any previously selected groups are no longer available
				const previousIds = new Set(previousGroups.map(g => g.id));
				const currentIds = new Set(availableEnemyGroups.map(g => g.id));
				const removedIds = [...previousIds].filter(id => !currentIds.has(id));

				// Update all existing dropdowns and clear invalid selections
				updateAllEnemySelects(removedIds);
			} catch (error) {
				console.warn('Error updating available groups:', error);
			}
		};

		const updateAllEnemySelects = (removedIds = []) => {
			try {
				const allEnemySelects = groupsWrapper.querySelectorAll('select');
				allEnemySelects.forEach(select => {
					const currentValue = select.value;

					// Clear selection if it was removed
					const shouldClear = removedIds.includes(currentValue);

					select.innerHTML = '';

					const emptyOption = document.createElement('option');
					emptyOption.value = '';
					emptyOption.textContent = availableEnemyGroups.length > 0 ?
						'(select enemy group)' :
						'(no enemy groups defined - add enemies to this room first)';
					select.appendChild(emptyOption);

					availableEnemyGroups.forEach(group => {
						const option = document.createElement('option');
						option.value = group.id;
						option.textContent = group.displayName;
						select.appendChild(option);
					});

					// Restore value only if it's still valid
					select.value = shouldClear ? '' : currentValue;
				});
			} catch (error) {
				console.warn('Error updating enemy selects:', error);
			}
		};

		const createEnemyGroup = (initialEnemies = []) => {
			const groupDiv = document.createElement('div');
			groupDiv.style.border = '1px solid #ccc';
			groupDiv.style.borderRadius = '4px';
			groupDiv.style.padding = '8px';
			groupDiv.style.marginBottom = '8px';
			groupDiv.style.backgroundColor = 'rgba(255,255,255,0.8)';

			const groupHeader = document.createElement('div');
			groupHeader.style.display = 'flex';
			groupHeader.style.justifyContent = 'space-between';
			groupHeader.style.alignItems = 'center';
			groupHeader.style.marginBottom = '8px';

			const groupTitle = document.createElement('strong');
			groupTitle.textContent = 'Enemy Group';

			const removeGroupBtn = document.createElement('button');
			removeGroupBtn.textContent = '× Remove Group';
			removeGroupBtn.className = 'remove-btn';
			removeGroupBtn.style.fontSize = '12px';
			removeGroupBtn.style.padding = '4px 8px';
			removeGroupBtn.onclick = () => groupDiv.remove();

			groupHeader.appendChild(groupTitle);
			groupHeader.appendChild(removeGroupBtn);
			groupDiv.appendChild(groupHeader);

			const enemiesWrapper = document.createElement('div');
			groupDiv.appendChild(enemiesWrapper);

			const addEnemyBtn = document.createElement('button');
			addEnemyBtn.textContent = '+ Add Enemy Group';
			addEnemyBtn.className = 'add-btn';
			addEnemyBtn.style.fontSize = '12px';
			addEnemyBtn.style.padding = '4px 8px';
			groupDiv.appendChild(addEnemyBtn);

			const createEnemyEntry = (enemyGroup = '') => {
				const enemyDiv = document.createElement('div');
				enemyDiv.style.display = 'flex';
				enemyDiv.style.gap = '8px';
				enemyDiv.style.marginBottom = '4px';
				enemyDiv.style.alignItems = 'center';

				const enemySelect = document.createElement('select');
				enemySelect.style.flex = '1';

				const emptyOption = document.createElement('option');
				emptyOption.value = '';
				emptyOption.textContent = availableEnemyGroups.length > 0 ?
					'(select enemy group)' :
					'(no enemy groups defined - add enemies to this room first)';
				enemySelect.appendChild(emptyOption);

				availableEnemyGroups.forEach(group => {
					const option = document.createElement('option');
					option.value = group.id;
					option.textContent = group.displayName;
					enemySelect.appendChild(option);
				});

				if (enemyGroup) {
					enemySelect.value = enemyGroup;
				}

				const removeEnemyBtn = document.createElement('button');
				removeEnemyBtn.textContent = '×';
				removeEnemyBtn.className = 'remove-btn';
				removeEnemyBtn.style.fontSize = '12px';
				removeEnemyBtn.style.width = '24px';
				removeEnemyBtn.style.height = '24px';
				removeEnemyBtn.onclick = () => enemyDiv.remove();

				enemyDiv.appendChild(enemySelect);
				enemyDiv.appendChild(removeEnemyBtn);
				enemiesWrapper.appendChild(enemyDiv);
			};

			// Add initial enemies
			if (initialEnemies.length > 0) {
				initialEnemies.forEach(enemy => createEnemyEntry(enemy));
			} else {
				createEnemyEntry(); // Add one empty entry
			}

			addEnemyBtn.onclick = () => createEnemyEntry();

			groupDiv.getEnemies = () => {
				return Array.from(enemiesWrapper.querySelectorAll('select'))
					.map(select => select.value)
					.filter(value => value.trim() !== '');
			};

			return groupDiv;
		};

		// Initialize with existing data
		const initialData = initialCondition?.enemyKill?.enemies || [];
		if (initialData.length > 0) {
			initialData.forEach(group => {
				const groupDiv = createEnemyGroup(group);
				groupsWrapper.appendChild(groupDiv);
			});
		} else {
			// Add one empty group by default
			const groupDiv = createEnemyGroup();
			groupsWrapper.appendChild(groupDiv);
		}

		addGroupBtn.onclick = () => {
			const groupDiv = createEnemyGroup();
			groupsWrapper.appendChild(groupDiv);
		};

		// Subscribe to enemy changes - listen to DOM mutations in enemies container
		// Make this more defensive to prevent freezing
		let mutationObserver = null;
		try {
			const enemiesContainer = document.getElementById('enemiesContainer');
			if (enemiesContainer) {
				mutationObserver = new MutationObserver((mutations) => {
					let shouldUpdate = false;
					try {
						mutations.forEach(mutation => {
							if (mutation.type === 'childList' ||
								(mutation.type === 'characterData' &&
									mutation.target.parentElement?.matches('input[placeholder*="Group Name"]'))) {
								shouldUpdate = true;
							}
						});
						if (shouldUpdate) {
							// Debounce the update to prevent excessive calls
							clearTimeout(updateAvailableGroups.timeout);
							updateAvailableGroups.timeout = setTimeout(updateAvailableGroups, 100);
						}
					} catch (error) {
						console.warn('Error in mutation observer:', error);
					}
				});

				mutationObserver.observe(enemiesContainer, {
					childList: true,
					subtree: true,
					characterData: true
				});
			}
		} catch (error) {
			console.warn('Failed to set up mutation observer:', error);
		}

		// Store observer for cleanup - make sure it exists before storing
		if (mutationObserver) {
			editor.subscriptions.push(() => {
				try {
					mutationObserver.disconnect();
				} catch (error) {
					console.warn('Error disconnecting mutation observer:', error);
				}
			});
		}

		// Also listen for input changes on enemy name fields - more defensive
		const handleEnemyNameChange = () => {
			clearTimeout(handleEnemyNameChange.timeout);
			handleEnemyNameChange.timeout = setTimeout(updateAvailableGroups, 100); // Debounced
		};

		// Add event delegation for input changes - make it safer
		try {
			const enemiesContainer = document.getElementById('enemiesContainer');
			if (enemiesContainer) {
				const inputHandler = (e) => {
					if (e.target.matches('input[placeholder*="Group Name"]')) {
						handleEnemyNameChange();
					}
				};

				enemiesContainer.addEventListener('input', inputHandler);

				// Store cleanup for input handler too
				editor.subscriptions.push(() => {
					try {
						enemiesContainer.removeEventListener('input', inputHandler);
					} catch (error) {
						console.warn('Error removing input handler:', error);
					}
				});
			}
		} catch (error) {
			console.warn('Failed to set up input handler:', error);
		}

		// Optional properties section - create once to avoid duplication
		const optionsContainer = document.createElement('div');
		optionsContainer.style.marginTop = '12px';
		optionsContainer.style.border = '1px solid #ddd';
		optionsContainer.style.borderRadius = '6px';
		optionsContainer.style.padding = '8px';

		const optionsTitle = document.createElement('div');
		optionsTitle.textContent = 'Optional Properties:';
		optionsTitle.style.fontWeight = 'bold';
		optionsTitle.style.marginBottom = '8px';
		optionsContainer.appendChild(optionsTitle);

		// Explicit weapons - with remove functionality
		const explicitWeaponsContainer = createDynamicList(
			'Explicit Weapons',
			(weaponData = null) => {
				const wrapper = document.createElement('div');
				wrapper.style.display = 'flex';
				wrapper.style.gap = '8px';
				wrapper.style.alignItems = 'center';
				wrapper.style.marginBottom = '4px';

				const select = document.createElement('select');
				select.style.flex = '1';

				const emptyOption = document.createElement('option');
				emptyOption.value = '';
				emptyOption.textContent = '(select weapon)';
				select.appendChild(emptyOption);

				(window.EditorGlobals.weaponList || []).forEach(weapon => {
					const option = document.createElement('option');
					option.value = weapon.name;
					option.textContent = weapon.name;
					select.appendChild(option);
				});

				if (weaponData && weaponData.value) {
					select.value = weaponData.value;
				}

				const removeBtn = document.createElement('button');
				removeBtn.textContent = '×';
				removeBtn.className = 'remove-btn';
				removeBtn.style.fontSize = '12px';
				removeBtn.style.width = '24px';
				removeBtn.style.height = '24px';
				removeBtn.onclick = () => wrapper.remove();

				wrapper.appendChild(select);
				wrapper.appendChild(removeBtn);

				wrapper.getValue = () => select.value.trim() || null;
				return wrapper;
			},
			(initialCondition?.enemyKill?.explicitWeapons || []).map(w => ({
				value: w
			}))
		);

		// Excluded weapons - with remove functionality
		const excludedWeaponsContainer = createDynamicList(
			'Excluded Weapons',
			(weaponData = null) => {
				const wrapper = document.createElement('div');
				wrapper.style.display = 'flex';
				wrapper.style.gap = '8px';
				wrapper.style.alignItems = 'center';
				wrapper.style.marginBottom = '4px';

				const select = document.createElement('select');
				select.style.flex = '1';

				const emptyOption = document.createElement('option');
				emptyOption.value = '';
				emptyOption.textContent = '(select weapon)';
				select.appendChild(emptyOption);

				(window.EditorGlobals.weaponList || []).forEach(weapon => {
					const option = document.createElement('option');
					option.value = weapon.name;
					option.textContent = weapon.name;
					select.appendChild(option);
				});

				if (weaponData && weaponData.value) {
					select.value = weaponData.value;
				}

				const removeBtn = document.createElement('button');
				removeBtn.textContent = '×';
				removeBtn.className = 'remove-btn';
				removeBtn.style.fontSize = '12px';
				removeBtn.style.width = '24px';
				removeBtn.style.height = '24px';
				removeBtn.onclick = () => wrapper.remove();

				wrapper.appendChild(select);
				wrapper.appendChild(removeBtn);

				wrapper.getValue = () => select.value.trim() || null;
				return wrapper;
			},
			(initialCondition?.enemyKill?.excludedWeapons || []).map(w => ({
				value: w
			}))
		);

		// Farmable ammo using unified checkbox list
		const farmableAmmoContainer = createUnifiedCheckboxList(
			AMMO_TYPES,
			'Farmable Ammo',
			initialCondition?.enemyKill?.farmableAmmo || [], {
				showToggleButton: false,
				columns: ['Enabled', 'Ammo Type']
			}
		);

		optionsContainer.appendChild(explicitWeaponsContainer);
		optionsContainer.appendChild(excludedWeaponsContainer);
		optionsContainer.appendChild(farmableAmmoContainer);

		container.appendChild(enemyGroupsContainer);
		container.appendChild(optionsContainer);
		editor.childrenContainer.appendChild(container);

		editor.inputs.enemyKillGroupsWrapper = groupsWrapper;
		editor.inputs.explicitWeaponsContainer = explicitWeaponsContainer;
		editor.inputs.excludedWeaponsContainer = excludedWeaponsContainer;
		editor.inputs.farmableAmmoContainer = farmableAmmoContainer;
	}

	static getValue(editor, type) {
		const groups = Array.from(editor.inputs.enemyKillGroupsWrapper?.children || [])
			.map(groupDiv => groupDiv.getEnemies ? groupDiv.getEnemies() : [])
			.filter(group => group.length > 0);

		if (groups.length === 0) return null;

		const result = {
			enemyKill: {
				enemies: groups
			}
		};

		// Add optional properties if they have values
		const explicitWeapons = (editor.inputs.explicitWeaponsContainer?.getValue() || []).filter(w => w);
		if (explicitWeapons.length > 0) {
			result.enemyKill.explicitWeapons = explicitWeapons;
		}

		const excludedWeapons = (editor.inputs.excludedWeaponsContainer?.getValue() || []).filter(w => w);
		if (excludedWeapons.length > 0) {
			result.enemyKill.excludedWeapons = excludedWeapons;
		}

		const farmableAmmo = editor.inputs.farmableAmmoContainer?.getSelectedValues() || [];
		if (farmableAmmo.length > 0) {
			result.enemyKill.farmableAmmo = farmableAmmo;
		}

		return result;
	}
}

// =============================================================================
// Refill Renderer
// =============================================================================

class RefillRenderer {
	static render(editor, type, initialCondition) {
		const container = editor.createInputContainer();

		// Use unified checkbox list for better formatting
		const refillContainer = createUnifiedCheckboxList(
			RESOURCE_TYPES,
			'Resource Types',
			initialCondition?.refill || [], {
				showToggleButton: false,
				columns: ['Enabled', 'Resource Type']
			}
		);

		container.appendChild(refillContainer);
		editor.childrenContainer.appendChild(container);
		editor.inputs.refillContainer = refillContainer;
	}

	static getValue(editor, type) {
		const selectedResources = editor.inputs.refillContainer?.getSelectedValues() || [];
		return selectedResources.length > 0 ? {
			refill: selectedResources
		} : null;
	}
}

// =============================================================================
// Partial Refill Renderer
// =============================================================================

class PartialRefillRenderer {
	static render(editor, type, initialCondition) {
		const container = editor.createInputContainer();

		const inputsWrapper = document.createElement('div');
		inputsWrapper.style.display = 'flex';
		inputsWrapper.style.gap = '8px';
		inputsWrapper.style.alignItems = 'center';

		const typeSelect = document.createElement('select');
		typeSelect.style.flex = '1';
		RESOURCE_TYPES.forEach(resourceType => {
			const option = document.createElement('option');
			option.value = resourceType;
			option.textContent = resourceType;
			typeSelect.appendChild(option);
		});

		const limitInput = document.createElement('input');
		limitInput.type = 'number';
		limitInput.min = '0';
		limitInput.placeholder = 'Limit';
		limitInput.style.flex = '1';

		if (initialCondition && initialCondition.partialRefill) {
			typeSelect.value = initialCondition.partialRefill.type || 'Energy';
			limitInput.value = initialCondition.partialRefill.limit || '';
		}

		inputsWrapper.appendChild(typeSelect);
		inputsWrapper.appendChild(limitInput);
		container.appendChild(inputsWrapper);
		editor.childrenContainer.appendChild(container);

		editor.inputs.partialRefillTypeSelect = typeSelect;
		editor.inputs.partialRefillLimitInput = limitInput;
	}

	static getValue(editor, type) {
		const refillType = editor.inputs.partialRefillTypeSelect?.value;
		const refillLimit = parseInt(editor.inputs.partialRefillLimitInput?.value);
		return (refillType && refillLimit >= 0) ? {
			partialRefill: {
				type: refillType,
				limit: refillLimit
			}
		} : null;
	}
}

// =============================================================================
// Shinespark Renderer
// =============================================================================

class ShinesparkRenderer {
	static render(editor, type, initialCondition) {
		const container = editor.createInputContainer();

		const framesWrapper = document.createElement('div');
		framesWrapper.style.display = 'flex';
		framesWrapper.style.gap = '8px';
		framesWrapper.style.alignItems = 'center';
		framesWrapper.style.marginBottom = '6px';

		const framesInput = document.createElement('input');
		framesInput.type = 'number';
		framesInput.min = '0';
		framesInput.placeholder = 'Required frames';
		framesInput.value = framesInput.min;
		framesInput.style.flex = '1';

		const excessInput = document.createElement('input');
		excessInput.type = 'number';
		excessInput.min = '0';
		excessInput.placeholder = 'Excess frames (optional)';
		excessInput.value = excessInput.min;
		excessInput.style.flex = '1';

		if (initialCondition && initialCondition.shinespark) {
			framesInput.value = initialCondition.shinespark.frames || '0';
			excessInput.value = initialCondition.shinespark.excessFrames || '0';
		}

		framesWrapper.appendChild(framesInput);
		framesWrapper.appendChild(excessInput);
		container.appendChild(framesWrapper);

		// Add explanation text
		const helpText = document.createElement('div');
		helpText.style.fontSize = '12px';
		helpText.style.color = '#666';
		helpText.style.fontStyle = 'italic';
		helpText.textContent = 'Excess frames: duration that isn\'t required to complete the objective';
		container.appendChild(helpText);

		editor.childrenContainer.appendChild(container);

		editor.inputs.shinesparkFramesInput = framesInput;
		editor.inputs.shinesparkExcessInput = excessInput;
	}

	static getValue(editor, type) {
		const frames = parseInt(editor.inputs.shinesparkFramesInput?.value);
		const excessFrames = parseInt(editor.inputs.shinesparkExcessInput?.value);
		if (frames >= 0) {
			const result = {
				shinespark: {
					frames
				}
			};
			if (excessFrames > 0) {
				result.shinespark.excessFrames = excessFrames;
			}
			return result;
		}
		return null;
	}
}

// =============================================================================
// Enemy Damage Renderer
// =============================================================================

class EnemyDamageRenderer {
	static render(editor, type, initialCondition) {
		const container = editor.createInputContainer();

		const inputsWrapper = document.createElement('div');
		inputsWrapper.style.display = 'flex';
		inputsWrapper.style.gap = '8px';
		inputsWrapper.style.alignItems = 'center';

		const enemyInput = document.createElement('select');
		enemyInput.style.flex = '2';

		const emptyOption = document.createElement('option');
		emptyOption.value = '';
		emptyOption.textContent = '(select enemy)';
		enemyInput.appendChild(emptyOption);

		const options = (window.EditorGlobals.enemyList || []).sort();
		options.forEach(enemy => {
			const opt = document.createElement('option');
			opt.value = enemy.name;
			opt.textContent = enemy.name;
			enemyInput.appendChild(opt);
		});

		const typeInput = document.createElement('input');
		typeInput.type = 'text';
		typeInput.placeholder = 'Attack type';
		typeInput.style.flex = '1';

		const hitsInput = document.createElement('input');
		hitsInput.type = 'number';
		hitsInput.min = '1';
		hitsInput.placeholder = 'Hits';
		hitsInput.value = 1;
		hitsInput.style.flex = '1';

		if (initialCondition && initialCondition.enemyDamage) {
			enemyInput.value = initialCondition.enemyDamage.enemy || '';
			typeInput.value = initialCondition.enemyDamage.type || '';
			hitsInput.value = initialCondition.enemyDamage.hits || '';
		}

		inputsWrapper.appendChild(enemyInput);
		inputsWrapper.appendChild(typeInput);
		inputsWrapper.appendChild(hitsInput);
		container.appendChild(inputsWrapper);
		editor.childrenContainer.appendChild(container);

		editor.inputs.enemyDamageEnemyInput = enemyInput;
		editor.inputs.enemyDamageTypeInput = typeInput;
		editor.inputs.enemyDamageHitsInput = hitsInput;
	}

	static getValue(editor, type) {
		const enemy = editor.inputs.enemyDamageEnemyInput?.value?.trim();
		const damageType = editor.inputs.enemyDamageTypeInput?.value?.trim();
		const hits = parseInt(editor.inputs.enemyDamageHitsInput?.value);
		return (enemy && damageType && hits > 0) ? {
			enemyDamage: {
				enemy,
				type: damageType,
				hits
			}
		} : null;
	}
}

// =============================================================================
// Auto Reserve Trigger Renderer
// =============================================================================

class AutoReserveRenderer {
	static render(editor, type, initialCondition) {
		const container = editor.createInputContainer();

		const inputsWrapper = document.createElement('div');
		inputsWrapper.style.display = 'flex';
		inputsWrapper.style.gap = '8px';
		inputsWrapper.style.alignItems = 'center';

		const minInput = document.createElement('input');
		minInput.type = 'number';
		minInput.min = '0';
		minInput.placeholder = 'Min reserve (default: 1)';
		minInput.style.flex = '1';

		const maxInput = document.createElement('input');
		maxInput.type = 'number';
		maxInput.min = '0';
		maxInput.placeholder = 'Max reserve (default: 400)';
		maxInput.style.flex = '1';

		if (initialCondition && initialCondition.autoReserveTrigger) {
			minInput.value = initialCondition.autoReserveTrigger.minReserveEnergy || '';
			maxInput.value = initialCondition.autoReserveTrigger.maxReserveEnergy || '';
		}

		inputsWrapper.appendChild(minInput);
		inputsWrapper.appendChild(maxInput);
		container.appendChild(inputsWrapper);
		editor.childrenContainer.appendChild(container);

		editor.inputs.autoReserveMinInput = minInput;
		editor.inputs.autoReserveMaxInput = maxInput;
	}

	static getValue(editor, type) {
		const minReserve = parseInt(editor.inputs.autoReserveMinInput?.value) || undefined;
		const maxReserve = parseInt(editor.inputs.autoReserveMaxInput?.value) || undefined;
		const result = {
			autoReserveTrigger: {}
		};
		if (minReserve !== undefined) result.autoReserveTrigger.minReserveEnergy = minReserve;
		if (maxReserve !== undefined) result.autoReserveTrigger.maxReserveEnergy = maxReserve;
		return result;
	}
}

// =============================================================================
// Runway-based Renderers
// =============================================================================

class RunwayRenderer {
	static render(editor, type, initialCondition) {
		const container = editor.createInputContainer();

		// Main inputs wrapper
		const mainWrapper = document.createElement('div');
		mainWrapper.style.display = 'flex';
		mainWrapper.style.gap = '8px';
		mainWrapper.style.alignItems = 'center';
		mainWrapper.style.marginBottom = '8px';

		const tilesInput = document.createElement('input');
		tilesInput.type = 'number';
		tilesInput.min = '1';
		tilesInput.max = '45';
		tilesInput.step = '0.5';
		tilesInput.placeholder = type === 'speedBall' ? 'Runway length' : 'Used tiles';
		tilesInput.style.flex = '1';

		const openEndInput = document.createElement('input');
		openEndInput.type = 'number';
		openEndInput.min = '0';
		openEndInput.max = '2';
		openEndInput.placeholder = 'Open ends';
		openEndInput.style.flex = '1';

		mainWrapper.appendChild(tilesInput);
		mainWrapper.appendChild(openEndInput);
		container.appendChild(mainWrapper);

		// Optional slope inputs - grouped and labeled
		const slopeLabel = document.createElement('div');
		slopeLabel.textContent = 'Optional slope properties:';
		slopeLabel.style.fontSize = '12px';
		slopeLabel.style.fontWeight = '600';
		slopeLabel.style.marginBottom = '4px';
		slopeLabel.style.color = '#666';
		container.appendChild(slopeLabel);

		const slopeContainer = document.createElement('div');
		slopeContainer.style.display = 'grid';
		slopeContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
		slopeContainer.style.gap = '6px';

		const slopeInputs = {};
		const slopeLabels = {
			'gentleUpTiles': 'Gentle up',
			'gentleDownTiles': 'Gentle down',
			'steepUpTiles': 'Steep up',
			'steepDownTiles': 'Steep down',
			'startingDownTiles': 'Starting down'
		};

		Object.entries(slopeLabels).forEach(([slope, label]) => {
			const input = document.createElement('input');
			input.type = 'number';
			input.min = '0';
			input.placeholder = label;
			slopeContainer.appendChild(input);
			slopeInputs[slope] = input;
		});

		// Set initial values from initialCondition
		if (initialCondition && initialCondition[type]) {
			const data = initialCondition[type];
			if (data.usedTiles !== undefined) tilesInput.value = data.usedTiles;
			if (data.length !== undefined) tilesInput.value = data.length;
			if (data.openEnd !== undefined) openEndInput.value = data.openEnd;
			
			Object.keys(slopeInputs).forEach(slope => {
				if (data[slope] !== undefined) {
					slopeInputs[slope].value = data[slope];
				}
			});
		}

		container.appendChild(slopeContainer);
		editor.childrenContainer.appendChild(container);

		editor.inputs.runwayTilesInput = tilesInput;
		editor.inputs.runwayOpenEndInput = openEndInput;
		editor.inputs.runwaySlopeInputs = slopeInputs;
	}

	static getValue(editor, type) {
		const usedTiles = parseFloat(editor.inputs.runwayTilesInput?.value);
		const openEnd = parseInt(editor.inputs.runwayOpenEndInput?.value);
		
		if (isNaN(usedTiles) || usedTiles <= 0) return null;
		if (isNaN(openEnd) || openEnd < 0) return null;
		
		// For speedBall, use 'length' instead of 'usedTiles'
		const result = {
			[type]: type === 'speedBall' ? { length: usedTiles, openEnd } : { usedTiles, openEnd }
		};
		
		// Add slope properties if they have values
		Object.keys(editor.inputs.runwaySlopeInputs || {}).forEach(slope => {
			const value = parseInt(editor.inputs.runwaySlopeInputs[slope].value);
			if (!isNaN(value) && value > 0) {
				result[type][slope] = value;
			}
		});
		
		return result;
	}
}

// =============================================================================
// Reset Room Renderer
// =============================================================================

class ResetRoomRenderer {
	static render(editor, type, initialCondition) {
		const container = editor.createInputContainer();

		// Use checkbox list for node selection
		const initialNodes = initialCondition && initialCondition.resetRoom && initialCondition.resetRoom.nodes ?
			initialCondition.resetRoom.nodes.map(String) : [];

		editor.inputs.resetRoomNodesList = createNodeCheckboxList(initialNodes, 'Entry Nodes');
		container.appendChild(editor.inputs.resetRoomNodesList);
		editor.childrenContainer.appendChild(container);
	}

	static getValue(editor, type) {
		const resetNodes = editor.inputs.resetRoomNodesList?.getSelectedValues() || [];
		return resetNodes.length > 0 ? {
			resetRoom: {
				nodes: resetNodes.map(n => parseInt(n))
			}
		} : null;
	}
}

// =============================================================================
// Frames with Energy Drops Renderer
// =============================================================================

class FramesWithDropsRenderer {
	static render(editor, type, initialCondition) {
		const container = editor.createInputContainer();

		const framesInput = document.createElement('input');
		framesInput.type = 'number';
		framesInput.min = '1';
		framesInput.value = framesInput.min;
		framesInput.placeholder = 'Frames';

		const dropsContainer = createDynamicList(
			'Enemy Drops',
			(drop = null) => {
				const entry = document.createElement('div');
				entry.style.display = 'flex';
				entry.style.gap = '8px';
				entry.style.marginBottom = '4px';
				entry.style.width = '100%';

				const enemySelect = document.createElement('select');
				enemySelect.style.maxWidth = '100%';
				enemySelect.style.minWidth = 'fit-content';
				enemySelect.style.width = 'auto';

				const emptyOption = document.createElement('option');
				emptyOption.value = '';
				emptyOption.textContent = '(select enemy)';
				enemySelect.appendChild(emptyOption);

				(window.EditorGlobals.enemyList || []).forEach(enemy => {
					const opt = document.createElement('option');
					opt.value = enemy.id;
					opt.textContent = enemy.name;
					enemySelect.appendChild(opt);
				});

				const countInput = document.createElement('input');
				countInput.type = 'number';
				countInput.min = '1';
				countInput.placeholder = 'How many of this enemy are in this room';

				if (drop) {
					enemySelect.value = drop.enemy;
					countInput.value = drop.count;
				}

				entry.appendChild(enemySelect);
				entry.appendChild(countInput);

				entry.getValue = () => {
					const enemy = enemySelect.value?.trim();
					const count = parseInt(countInput.value);
					return (enemy && count > 0) ? {
						enemy,
						count
					} : null;
				};

				return entry;
			},
			initialCondition?.[type]?.drops || []
		);

		if (initialCondition && initialCondition[type]) {
			framesInput.value = initialCondition[type].frames || '';
		}

		container.appendChild(framesInput);
		container.appendChild(dropsContainer);
		editor.childrenContainer.appendChild(container);

		editor.inputs.framesWithDropsFramesInput = framesInput;
		editor.inputs.framesWithDropsContainer = dropsContainer;
	}

	static getValue(editor, type) {
		const frames = parseInt(editor.inputs.framesWithDropsFramesInput?.value);
		const drops = editor.inputs.framesWithDropsContainer?.getValue() || [];
		return (frames > 0) ? {
			[type]: {
				frames,
				drops
			}
		} : null;
	}
}

// =============================================================================
// Ridley Kill Renderer
// =============================================================================

class RidleyKillRenderer {
	static render(editor, type, initialCondition) {
		const container = editor.createInputContainer();

		// Use unified checkbox list for better formatting
		const checkboxItems = [{
				id: 'powerBombs',
				name: 'Power Bombs allowed',
				checked: initialCondition?.ridleyKill?.powerBombs !== false
			},
			{
				id: 'gMode',
				name: 'G-Mode fight',
				checked: initialCondition?.ridleyKill?.gMode === true
			}
		];

		const checkboxContainer = createUnifiedCheckboxList(
			checkboxItems,
			'Options',
			checkboxItems.filter(item => item.checked).map(item => item.id), {
				showToggleButton: false,
				columns: ['Enabled', 'Option'],
				valueProperty: 'id',
				displayProperty: 'name'
			}
		);

		const stuckSelect = document.createElement('select');
		stuckSelect.innerHTML = `
            <option value="">Not stuck</option>
            <option value="top">Stuck at top</option>
            <option value="bottom">Stuck at bottom</option>
        `;
		stuckSelect.value = initialCondition?.ridleyKill?.stuck || '';
		stuckSelect.style.marginTop = '8px';
		stuckSelect.style.width = '100%';

		container.appendChild(checkboxContainer);
		container.appendChild(stuckSelect);
		editor.childrenContainer.appendChild(container);

		editor.inputs.ridleyCheckboxContainer = checkboxContainer;
		editor.inputs.ridleyStuckSelect = stuckSelect;
	}

	static getValue(editor, type) {
		const selectedOptions = editor.inputs.ridleyCheckboxContainer?.getSelectedValues() || [];
		const powerBombs = selectedOptions.includes('powerBombs');
		const gMode = selectedOptions.includes('gMode');
		const stuck = editor.inputs.ridleyStuckSelect?.value || null;

		const ridleyResult = {
			ridleyKill: {}
		};
		if (!powerBombs) ridleyResult.ridleyKill.powerBombs = false;
		if (gMode) ridleyResult.ridleyKill.gMode = true;
		if (stuck) ridleyResult.ridleyKill.stuck = stuck;
		return ridleyResult;
	}
}

// =============================================================================
// Default/Fallback Renderer
// =============================================================================

class DefaultRenderer {
	static render(editor, type, initialCondition) {
		const container = editor.createInputContainer();
		if (type != '')
			container.innerHTML = `<em>Renderer not yet implemented for ${type}</em>`;
		else
			container.innerHTML = ``;
		editor.childrenContainer.appendChild(container);
	}

	static getValue(editor, type) {
		// Empty type means "no condition" - return null
		if (!type || type === '') {
			return null;
		}
		console.warn(`getValue not implemented for condition type: ${type}`);
		return null;
	}
}

// =============================================================================
// Register all renderers
// =============================================================================

// Logical conditions
ConditionRenderers.register(['and', 'or', 'not'], LogicalRenderer);

// Simple selections
ConditionRenderers.register(['item', 'event'], SelectRenderer);
ConditionRenderers.register('disableEquipment', DisableEquipmentRenderer);

// Multi-select conditions
ConditionRenderers.register(['tech', 'helper'], MultiSelectRenderer);

// Node-based conditions
ConditionRenderers.register([
	'doorUnlockedAtNode',
	'itemNotCollectedAtNode',
	'itemCollectedAtNode',
	'resetRoom'
], NodeRenderer);

// Obstacle conditions
ConditionRenderers.register([
	'obstaclesCleared',
	'obstaclesNotCleared'
], ObstacleRenderer);

// Notable condition
ConditionRenderers.register('notable', NotableRenderer);

// Resource array conditions
ConditionRenderers.register([
	'resourceAtMost',
	'resourceCapacity',
	'resourceMaxCapacity',
	'resourceAvailable',
	'resourceConsumed',
	'resourceMissingAtMost'
], ResourceArrayRenderer);

// Simple number conditions
ConditionRenderers.register([
	'acidFrames',
	'gravitylessAcidFrames',
	'electricityFrames',
	'aqaWaterLevel',
	'shineChargeFrames',
	'cycleFrames',
	'simpleCycleFrames',
	'coldFrames',
	'heatFrames',
	'simpleColdFrames',
	'simpleHeatFrames',
	'gravitylessHeatFrames',
	'hibashiHits',
	'lavaFrames',
	'gravitylessLavaFrames',
	'samusEaterFrames',
	'metroidFrames',
	'spikeHits',
	'thornHits',
	'electricityHits'
], SimpleNumberRenderer);

// Ammo conditions
ConditionRenderers.register(['ammo', 'ammoDrain'], AmmoRenderer);

// Empty object conditions
ConditionRenderers.register([
	'gainFlashSuit',
	'useFlashSuit',
	'noFlashSuit'
], EmptyObjectRenderer);

// Special value conditions  
ConditionRenderers.register(['free', 'never'], SpecialValueRenderer);

// Enemy kill
ConditionRenderers.register('enemyKill', EnemyKillRenderer);

// Resource management
ConditionRenderers.register('refill', RefillRenderer);
ConditionRenderers.register('partialRefill', PartialRefillRenderer);

// Health management
ConditionRenderers.register('shinespark', ShinesparkRenderer);
ConditionRenderers.register('enemyDamage', EnemyDamageRenderer);
ConditionRenderers.register('autoReserveTrigger', AutoReserveRenderer);

// Momentum-based
ConditionRenderers.register(['canShineCharge', 'getBlueSpeed', 'speedBall'], RunwayRenderer);

// Lock-related
ConditionRenderers.register('resetRoom', ResetRoomRenderer);

// Heat/Lava with drops
ConditionRenderers.register(['heatFramesWithEnergyDrops', 'coldFramesWithEnergyDrops', 'lavaFramesWithEnergyDrops'], FramesWithDropsRenderer);

// Boss requirements
ConditionRenderers.register('ridleyKill', RidleyKillRenderer);

// Default fallback
ConditionRenderers.register('default', DefaultRenderer);