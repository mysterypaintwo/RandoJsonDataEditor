/* =============================================================================
   Enemy Editor
   
   Editor for enemy groups. Handles enemy selection, node assignments,
   spawn conditions, and real-time title updates.
   ============================================================================= */

   class EnemyEditor extends BaseEditor {
	constructor(initialData = {}, validRoomNodes = []) {
		const config = {
			type: 'enemies',
			className: 'enemy',
			emoji: '👾',
			defaultName: 'Enemy Group',
			idStyle: 'numeric', // e1, e2, e3...
			idPrefix: 'e'
		};
		super(initialData, config);
		this.validRoomNodes = validRoomNodes;

		// Subscribe to global data changes
		this.globalUnsubscribe = window.EditorGlobals.addListener(() => {
			this.refreshNodeLists();
			this.refreshEnemyList();
		});

		// Initial setup
		this.refreshNodeLists();
		this.refreshEnemyList();
	}

	normalizeData(data) {
		return {
			groupName: normalizeStringField(data, 'groupName'),
			enemyName: normalizeStringField(data, 'enemyName'),
			quantity: normalizeNumberField(data, 'quantity', 1),
			homeNodes: normalizeArrayField(data, 'homeNodes'),
			betweenNodes: normalizeArrayField(data, 'betweenNodes'),
			spawnCondition: data?.spawnCondition || null,
			stopSpawnCondition: data?.stopSpawnCondition || null,
			note: normalizeStringField(data, 'note'),
			devNote: normalizeStringField(data, 'devNote'),
			id: data?.id
		};
	}

	populateFields() {
		this.groupInput = createInput('text', 'Group Name (e.g., "Top Pirates")', this.initialData.groupName);
		this.enemySelect = this.createEnemySelect(this.initialData.enemyName);
		this.quantityInput = createInput('number', 'How many of this enemy are in this room', this.initialData.quantity, {
			min: 1
		});
		this.homeNodesList = createNodeCheckboxList(this.initialData.homeNodes, 'Home Nodes');
		this.betweenNodesList = createNodeCheckboxList(this.initialData.betweenNodes, 'Between Nodes', 2);

		// Create placeholder divs for conditions instead of creating editors immediately
		this.spawnConditionDiv = createDiv([]);
		this.stopSpawnConditionDiv = createDiv([]);

		this.noteArea = createTextarea('Note (optional)', this.initialData.note);
		this.devNoteInput = createInput('text', 'Developer Note', this.initialData.devNote);

		const topRow = createDiv([this.enemySelect, this.quantityInput], 'enemy-top-row');
		const content = createDiv([
			this.groupInput,
			topRow,
			createLabel('Enemy Patrols These Nodes:', this.homeNodesList),
			createLabel('Encounter Enemy Between These Nodes (Max 2):', this.betweenNodesList),
			createLabel('Spawn Condition:', this.spawnConditionDiv),
			createLabel('Stop Spawn Condition:', this.stopSpawnConditionDiv),
			this.noteArea,
			this.devNoteInput,
			this.createRemoveButton('Remove Enemy')
		]);
		this.contentArea.appendChild(content);

		// Defer condition editor creation
		setTimeout(() => this.createConditionEditors(), 0);
	}

	createConditionEditors() {
		if (typeof makeConditionEditor === 'undefined') {
			console.error('makeConditionEditor not available, retrying...');
			setTimeout(() => this.createConditionEditors(), 100);
			return;
		}

		this.spawnCondition = this.createConditionSection(this.spawnConditionDiv, this.initialData.spawnCondition);
		this.stopSpawnCondition = this.createConditionSection(this.stopSpawnConditionDiv, this.initialData.stopSpawnCondition);
	}

	setupTitleUpdates() {
		this.groupInput.addEventListener('input', () => {
			this.updateTitle();
		});
		this.enemySelect.addEventListener('change', () => {
			this.updateTitle();
		});
	}

	refreshEnemyList() {
		if (!this.enemySelect || !window.EditorGlobals.enemyList || window.EditorGlobals.enemyList.length === 0) return;

		const currentValue = this.enemySelect.value;
		const newSelect = this.createEnemySelect(currentValue);

		// Replace DOM node
		this.enemySelect.parentNode.replaceChild(newSelect, this.enemySelect);
		this.enemySelect = newSelect;

		// Re-attach title updates
		this.enemySelect.addEventListener('change', () => {
			this.updateTitle();
		});
	}

	refreshNodeLists() {
		// Only refresh if the elements exist and we have nodes
		if (this.homeNodesList && this.betweenNodesList && window.EditorGlobals.validRoomNodes && window.EditorGlobals.validRoomNodes.length > 0) {
			// Get current selections, but safely handle the case where getSelectedValues doesn't exist
			const homeSelectedNodes = (this.homeNodesList.getSelectedValues) ?
				this.homeNodesList.getSelectedValues() :
				this.initialData.homeNodes || [];
			const betweenSelectedNodes = (this.betweenNodesList.getSelectedValues) ?
				this.betweenNodesList.getSelectedValues() :
				this.initialData.betweenNodes || [];

			// Find the containers and replace them
			const homeContainer = this.homeNodesList.parentNode;
			const betweenContainer = this.betweenNodesList.parentNode;

			// Clean up old lists
			if (this.homeNodesList._destroy) this.homeNodesList._destroy();
			if (this.betweenNodesList._destroy) this.betweenNodesList._destroy();

			homeContainer.removeChild(this.homeNodesList);
			betweenContainer.removeChild(this.betweenNodesList);

			this.homeNodesList = createNodeCheckboxList(homeSelectedNodes, 'Home Nodes');
			this.betweenNodesList = createNodeCheckboxList(betweenSelectedNodes, 'Between Nodes', 2);

			homeContainer.appendChild(this.homeNodesList);
			betweenContainer.appendChild(this.betweenNodesList);
		}
	}

	getTitleFromData() {
		const groupName = this.groupInput?.value?.trim();
		const enemyName = window.EditorGlobals.enemyList[this.enemySelect?.value - 1]?.name;
		if (groupName && enemyName) {
			return `${groupName} (${enemyName})`;
		} else if (groupName) {
			return groupName;
		} else if (enemyName) {
			return enemyName;
		}
		return null;
	}

	createEnemySelect(selectedEnemy) {
		const enemies = window.EditorGlobals.enemyList?.length
			? window.EditorGlobals.enemyList
			: [{ id: '', name: '(no enemies available)' }];
	
		const options = enemies.map(enemy => ({
			value: enemy.id,
			text: enemy.name
		}));
	
		return createSelect(options, selectedEnemy);
	}	

	createConditionSection(containerDiv, initialCondition) {
		const conditionDiv = createDiv([]);
		const conditionEditor = makeConditionEditor(conditionDiv, initialCondition, 0, true);

		containerDiv.appendChild(conditionDiv);
		containerDiv.getValue = () => conditionEditor.getValue();
		return containerDiv;
	}

	getValue() {
		if (!this.groupInput.value.trim() && !this.enemySelect.value) return null;
		return {
			groupName: this.groupInput.value.trim(),
			enemyName: this.enemySelect.value,
			quantity: parseInt(this.quantityInput.value) || 1,
			homeNodes: this.homeNodesList.getSelectedValues(),
			betweenNodes: this.betweenNodesList.getSelectedValues(),
			spawnCondition: this.spawnCondition.getValue(),
			stopSpawnCondition: this.stopSpawnCondition.getValue(),
			note: this.noteArea.value.trim(),
			devNote: this.devNoteInput.value.trim()
		};
	}

	remove() {
		// Clean up global data subscription
		if (this.globalUnsubscribe) {
			this.globalUnsubscribe();
			this.globalUnsubscribe = null;
		}

		// Clean up node lists
		if (this.homeNodesList && this.homeNodesList._destroy) {
			this.homeNodesList._destroy();
		}
		if (this.betweenNodesList && this.betweenNodesList._destroy) {
			this.betweenNodesList._destroy();
		}

		super.remove();
	}
}