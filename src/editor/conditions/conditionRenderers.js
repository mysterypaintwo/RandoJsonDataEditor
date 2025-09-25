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
		const initialChildren = (initialCondition && initialCondition[type]) || [];
		initialChildren.forEach(childData => {
			editor.addChildCondition(childData, false);
		});

		if (!editor.addButton) {
			editor.addButton = document.createElement('button');
			editor.addButton.textContent = type === 'and' ? '+ Add Sub-condition' : '+ Add Option';
			editor.addButton.className = 'add-btn';
			editor.addButton.style.marginTop = '8px';
			editor.addButton.addEventListener('click', () => {
				editor.addChildCondition();
			});
		}
		editor.childrenContainer.appendChild(editor.addButton);
	}

	static getValue(editor, type) {
		if (type === 'not') {
			const childValue = editor.childEditors[0]?.getValue();
			return childValue ? {
				[type]: childValue
			} : null;
		} else {
			const childValues = editor.childEditors
				.map(child => child.getValue())
				.filter(value => value !== null);
			return childValues.length > 0 ? {
				[type]: childValues
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

	static getOptionsForType(type) {
		if (type === 'item' || type === 'disableEquipment') {
			return (window.EditorGlobals.itemList || []).sort();
		} else if (type === 'event') {
			return (window.EditorGlobals.eventList || []).sort();
		}
		return [];
	}

	static getValue(editor, type) {
		const selectValue = editor.inputs.select?.value?.trim();
		return selectValue ? {
			[type]: selectValue
		} : null;
	}

	static restoreValue(editor, type, value) {
		if (editor.inputs.select && value[type]) {
			editor.inputs.select.value = value[type];
		}
	}
}

// =============================================================================
// Multi-Select Renderers (Tech/Helper)
// =============================================================================

class MultiSelectRenderer {
	static render(editor, type, initialCondition) {
		const container = editor.createInputContainer();

		if (type === 'tech') {
			editor.inputs.techCheckboxContainer = createMapCheckboxList(
				window.EditorGlobals.techMap,
				'Tech',
				initialCondition?.tech || []
			);
			container.appendChild(editor.inputs.techCheckboxContainer);
		} else if (type === 'helper') {
			editor.inputs.helperCheckboxContainer = createMapCheckboxList(
				window.EditorGlobals.helperMap,
				'Helper',
				initialCondition?.helper || []
			);
			container.appendChild(editor.inputs.helperCheckboxContainer);
		}

		editor.childrenContainer.appendChild(container);
	}

	static getValue(editor, type) {
		if (type === 'tech') {
			const selectedTech = editor.inputs.techCheckboxContainer?.getSelectedValues();
			return (selectedTech && selectedTech.length > 0) ? {
				[type]: selectedTech[0]
			} : null;
		} else if (type === 'helper') {
			const selectedHelper = editor.inputs.helperCheckboxContainer?.getSelectedValues();
			return (selectedHelper && selectedHelper.length > 0) ? {
				[type]: selectedHelper[0]
			} : null;
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

		const initialValue = initialCondition && initialCondition[type] ?
			[initialCondition[type]] : [];

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
		return notableName ? {
			notable: notableName
		} : null;
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
		}

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

		// Get enemy groups from EnemyEditor instances
		const availableEnemyGroups = getCurrentEnemyGroups();

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
			removeGroupBtn.style.background = '#ff6b6b';
			removeGroupBtn.style.color = 'white';
			removeGroupBtn.style.border = 'none';
			removeGroupBtn.style.borderRadius = '3px';
			removeGroupBtn.style.padding = '4px 8px';
			removeGroupBtn.style.cursor = 'pointer';
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
				emptyOption.textContent = availableEnemyGroups.length > 0 ? '(select enemy group)' : '(no enemy groups defined - add enemies to this room first)';
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
				removeEnemyBtn.style.background = '#ff6b6b';
				removeEnemyBtn.style.color = 'white';
				removeEnemyBtn.style.border = 'none';
				removeEnemyBtn.style.borderRadius = '3px';
				removeEnemyBtn.style.width = '24px';
				removeEnemyBtn.style.height = '24px';
				removeEnemyBtn.style.cursor = 'pointer';
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

		// Optional properties section
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

		// Explicit weapons
		const explicitWeaponsContainer = createDynamicList(
			'Explicit Weapons',
			() => {
				const select = document.createElement('select');
				select.style.flex = '1';

				const emptyOption = document.createElement('option');
				emptyOption.value = '';
				emptyOption.textContent = '(select weapon)';
				select.appendChild(emptyOption);

				(window.EditorGlobals.weaponList || []).forEach(weapon => {
					const option = document.createElement('option');
					option.value = weapon.id;
					option.textContent = weapon.name;
					select.appendChild(option);
				});

				select.getValue = () => select.value.trim() || null;
				return select;
			},
			(initialCondition?.enemyKill?.explicitWeapons || []).map(w => ({
				value: w
			}))
		);

		// Excluded weapons
		const excludedWeaponsContainer = createDynamicList(
			'Excluded Weapons',
			() => {
				const select = document.createElement('select');
				select.style.flex = '1';

				const emptyOption = document.createElement('option');
				emptyOption.value = '';
				emptyOption.textContent = '(select weapon)';
				select.appendChild(emptyOption);

				(window.EditorGlobals.weaponList || []).forEach(weapon => {
					const option = document.createElement('option');
					option.value = weapon.id;
					option.textContent = weapon.name;
					select.appendChild(option);
				});

				select.getValue = () => select.value.trim() || null;
				return select;
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
		const explicitWeapons = editor.inputs.explicitWeaponsContainer?.getValue() || [];
		if (explicitWeapons.length > 0) {
			result.enemyKill.explicitWeapons = explicitWeapons;
		}

		const excludedWeapons = editor.inputs.excludedWeaponsContainer?.getValue() || [];
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

		const typeSelect = document.createElement('select');
		RESOURCE_TYPES.forEach(resourceType => {
			const option = document.createElement('option');
			option.value = resourceType;
			option.textContent = resourceType;
			typeSelect.appendChild(option);
		});

		const limitInput = document.createElement('input');
		limitInput.type = 'number';
		limitInput.min = '0';
		limitInput.placeholder = 'Value this partial refill stops at';
		limitInput.style.marginLeft = '8px';

		if (initialCondition && initialCondition.partialRefill) {
			typeSelect.value = initialCondition.partialRefill.type || 'Energy';
			limitInput.value = initialCondition.partialRefill.limit || 0;
		}

		container.appendChild(typeSelect);
		container.appendChild(limitInput);
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

		const framesInput = document.createElement('input');
		framesInput.type = 'number';
		framesInput.min = '0';
		framesInput.placeholder = 'Frames';

		const excessInput = document.createElement('input');
		excessInput.type = 'number';
		excessInput.min = '0';
		excessInput.placeholder = `[Optional] Duration (in frames) that *aren't* required to complete this shinespark objective.`;
		excessInput.style.marginLeft = '8px';

		if (initialCondition && initialCondition.shinespark) {
			framesInput.value = initialCondition.shinespark.frames || 0;
			excessInput.value = initialCondition.shinespark.excessFrames || '';
		}

		container.appendChild(framesInput);
		container.appendChild(excessInput);
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

		const enemyInput = document.createElement('select');
		enemyInput.style.width = '100%';

		const emptyOption = document.createElement('option');
		emptyOption.value = '';
		emptyOption.textContent = `(select enemy)`;
		enemyInput.appendChild(emptyOption);

		const options = (window.EditorGlobals.enemyList || []).sort();
		options.forEach(enemy => {
			const opt = document.createElement('option');
			opt.value = enemy.id;
			opt.textContent = enemy.name;
			enemyInput.appendChild(opt);
		});

		// Set initial value
		if (initialCondition && initialCondition[type]) {
			enemyInput.value = initialCondition[type];
		}

		const typeInput = document.createElement('input');
		typeInput.type = 'text';
		typeInput.placeholder = 'Attack type';
		typeInput.style.marginLeft = '8px';

		const hitsInput = document.createElement('input');
		hitsInput.type = 'number';
		hitsInput.min = '1';
		hitsInput.placeholder = 'Hits';
		hitsInput.style.marginLeft = '8px';

		if (initialCondition && initialCondition.enemyDamage) {
			enemyInput.value = initialCondition.enemyDamage.enemy || '';
			typeInput.value = initialCondition.enemyDamage.type || '';
			hitsInput.value = initialCondition.enemyDamage.hits || 1;
		}

		container.appendChild(enemyInput);
		container.appendChild(typeInput);
		container.appendChild(hitsInput);
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

		const minInput = document.createElement('input');
		minInput.type = 'number';
		minInput.min = '0';
		minInput.placeholder = 'Min reserve energy (default: 1)';

		const maxInput = document.createElement('input');
		maxInput.type = 'number';
		maxInput.min = '0';
		maxInput.placeholder = 'Max reserve energy (default: 400)';
		maxInput.style.marginLeft = '8px';

		if (initialCondition && initialCondition.autoReserveTrigger) {
			minInput.value = initialCondition.autoReserveTrigger.minReserveEnergy || '';
			maxInput.value = initialCondition.autoReserveTrigger.maxReserveEnergy || '';
		}

		container.appendChild(minInput);
		container.appendChild(maxInput);
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

		const tilesInput = document.createElement('input');
		tilesInput.type = 'number';
		tilesInput.min = '1';
		tilesInput.max = '45';
		tilesInput.step = '0.5';
		tilesInput.placeholder = type === 'speedBall' ? 'Runway length' : 'Used tiles';

		const openEndInput = document.createElement('input');
		openEndInput.type = 'number';
		openEndInput.min = '0';
		openEndInput.max = '2';
		openEndInput.placeholder = 'Open ends';
		openEndInput.style.marginLeft = '8px';

		// Optional slope inputs
		const slopeContainer = document.createElement('div');
		slopeContainer.style.marginTop = '8px';
		slopeContainer.style.display = 'grid';
		slopeContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
		slopeContainer.style.gap = '4px';

		const slopeInputs = {};
		['gentleUpTiles', 'gentleDownTiles', 'steepUpTiles', 'steepDownTiles', 'startingDownTiles'].forEach(slope => {
			const input = document.createElement('input');
			input.type = 'number';
			input.min = '0';
			input.placeholder = slope.replace(/([A-Z])/g, ' $1').toLowerCase();
			slopeContainer.appendChild(input);
			slopeInputs[slope] = input;
		});

		if (initialCondition && initialCondition[type]) {
			const data = initialCondition[type];
			tilesInput.value = data.usedTiles || data.length || '';
			openEndInput.value = data.openEnd || '';
			Object.keys(slopeInputs).forEach(slope => {
				if (data[slope] !== undefined) {
					slopeInputs[slope].value = data[slope];
				}
			});
		}

		container.appendChild(tilesInput);
		container.appendChild(openEndInput);
		container.appendChild(slopeContainer);
		editor.childrenContainer.appendChild(container);

		editor.inputs.runwayTilesInput = tilesInput;
		editor.inputs.runwayOpenEndInput = openEndInput;
		editor.inputs.runwaySlopeInputs = slopeInputs;
	}

	static getValue(editor, type) {
		const usedTiles = parseFloat(editor.inputs.runwayTilesInput?.value);
		const openEnd = parseInt(editor.inputs.runwayOpenEndInput?.value);
		if (usedTiles > 0 && openEnd >= 0) {
			const result = {
				[type]: {
					usedTiles,
					openEnd
				}
			};
			// For speedBall, use 'length' instead of 'usedTiles'
			if (type === 'speedBall') {
				result[type] = {
					length: usedTiles,
					openEnd
				};
			}
			// Add slope properties if they have values
			Object.keys(editor.inputs.runwaySlopeInputs || {}).forEach(slope => {
				const value = parseInt(editor.inputs.runwaySlopeInputs[slope].value);
				if (value > 0) {
					result[type][slope] = value;
				}
			});
			return result;
		}
		return null;
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
		container.innerHTML = `<em>Renderer not yet implemented for ${type}</em>`;
		editor.childrenContainer.appendChild(container);
	}

	static getValue(editor, type) {
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
ConditionRenderers.register(['item', 'event', 'disableEquipment'], SelectRenderer);

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
	'draygonElectricityFrames',
	'shineChargeFrames',
	'cycleFrames',
	'simpleCycleFrames',
	'heatFrames',
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
ConditionRenderers.register(['heatFramesWithEnergyDrops', 'lavaFramesWithEnergyDrops'], FramesWithDropsRenderer);

// Boss requirements
ConditionRenderers.register('ridleyKill', RidleyKillRenderer);

// Default fallback
ConditionRenderers.register('default', DefaultRenderer);