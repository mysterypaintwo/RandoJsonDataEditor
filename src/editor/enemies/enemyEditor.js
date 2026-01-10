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
			idStyle: 'numeric',
			idPrefix: 'e'
		};
		super(initialData, config);
		this.validRoomNodes = validRoomNodes;

		this.globalUnsubscribe = window.EditorGlobals.addListener(() => {
			this.refreshNodeLists();
			this.refreshEnemyList();
		});

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
			spawnCondition: data?.spawnCondition || data?.spawn || null,
			stopSpawnCondition: data?.stopSpawnCondition || data?.stopSpawn || null,
			note: normalizeStringField(data, 'note'),
			devNote: normalizeStringField(data, 'devNote'),
			id: data?.id
		};
	}

	populateFields() {
		this.groupInput = createInput('text', 'Group Name (e.g., "Top Pirates")', this.initialData.groupName);
		const enemyId = this.getEnemyIdFromName(this.initialData.enemyName);
		this.enemySelect = this.createEnemySelect(enemyId);

		this.quantityInput = createInput('number', 'How many of this enemy are in this room', this.initialData.quantity, {
			min: 1
		});

		// Create node lists with mutual exclusion
		this.homeNodesList = createNodeCheckboxList(this.initialData.homeNodes, 'Home Nodes');
		this.betweenNodesList = createNodeCheckboxList(this.initialData.betweenNodes, 'Between Nodes', 2);

		// Set up mutual exclusion
		this.setupMutualExclusion();

		this.spawnConditionDiv = createDiv([]);
		this.stopSpawnConditionDiv = createDiv([]);

		this.noteArea = createTextarea('Note (optional)', this.initialData.note);
		this.devNoteInput = createInput('text', 'Developer Note', this.initialData.devNote);

		const topRow = createDiv([this.enemySelect, this.quantityInput], 'enemy-top-row');
		const content = createDiv([
			this.groupInput,
			topRow,
			createLabel('Enemy Patrol Nodes:', this.homeNodesList),
			createLabel('Encounter Enemy Between These Nodes (Max 2; Only use if Patrol Nodes is unused):', this.betweenNodesList),
			createLabel('Spawn Condition:', this.spawnConditionDiv),
			createLabel('Stop Spawn Condition:', this.stopSpawnConditionDiv),
			this.noteArea,
			this.devNoteInput,
			this.createRemoveButton('Remove Enemy')
		]);
		this.contentArea.appendChild(content);

		setTimeout(() => this.createConditionEditors(), 0);
	}

	setupMutualExclusion() {
		// Link the two lists for mutual exclusion
		this.homeNodesList._mutualExclusionList = this.betweenNodesList;
		this.betweenNodesList._mutualExclusionList = this.homeNodesList;

		// Check initial states and disable appropriately
		const homeHasSelections = this.homeNodesList.getSelectedValues().length > 0;
		const betweenHasSelections = this.betweenNodesList.getSelectedValues().length > 0;

		if (homeHasSelections && this.betweenNodesList.setDisabled) {
			this.betweenNodesList.setDisabled(true);
		}
		if (betweenHasSelections && this.homeNodesList.setDisabled) {
			this.homeNodesList.setDisabled(true);
		}
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

		this.enemySelect.parentNode.replaceChild(newSelect, this.enemySelect);
		this.enemySelect = newSelect;

		this.enemySelect.addEventListener('change', () => {
			this.updateTitle();
		});
	}

	refreshNodeLists() {
		if (this.homeNodesList && this.betweenNodesList && window.EditorGlobals.validRoomNodes && window.EditorGlobals.validRoomNodes.length > 0) {
			const homeSelectedNodes = (this.homeNodesList.getSelectedValues) ?
				this.homeNodesList.getSelectedValues() :
				this.initialData.homeNodes || [];
			const betweenSelectedNodes = (this.betweenNodesList.getSelectedValues) ?
				this.betweenNodesList.getSelectedValues() :
				this.initialData.betweenNodes || [];

			const homeContainer = this.homeNodesList.parentNode;
			const betweenContainer = this.betweenNodesList.parentNode;

			if (this.homeNodesList._destroy) this.homeNodesList._destroy();
			if (this.betweenNodesList._destroy) this.betweenNodesList._destroy();

			homeContainer.removeChild(this.homeNodesList);
			betweenContainer.removeChild(this.betweenNodesList);

			this.homeNodesList = createNodeCheckboxList(homeSelectedNodes, 'Home Nodes');
			this.betweenNodesList = createNodeCheckboxList(betweenSelectedNodes, 'Between Nodes', 2);

			// Re-establish mutual exclusion
			this.setupMutualExclusion();

			homeContainer.appendChild(this.homeNodesList);
			betweenContainer.appendChild(this.betweenNodesList);
		}
	}

	getTitleFromData() {
		const groupName = this.groupInput?.value?.trim();
		const enemyId = parseInt(this.enemySelect?.value);
		const enemyName = window.EditorGlobals.enemyList
			.find(e => e.id === enemyId)?.name;

		if (groupName && enemyName) return `${groupName} (${enemyName})`;
		if (groupName) return groupName;
		if (enemyName) return enemyName;
		return null;
	}

	getEnemyIdFromName(name) {
		if (!name || !window.EditorGlobals.enemyList) return null;

		const enemy = window.EditorGlobals.enemyList.find(e => e.name === name);
		return enemy ? enemy.id : null;
	}

	createEnemySelect(selectedEnemyId) {
		const enemies = window.EditorGlobals.enemyList?.length ?
			window.EditorGlobals.enemyList : [{
				id: '',
				name: '(no enemies available)'
			}];

		const options = enemies.map(enemy => ({
			value: String(enemy.id),
			text: enemy.name
		}));

		return createSelect(options, selectedEnemyId != null ? String(selectedEnemyId) : null);
	}

	createConditionSection(containerDiv, initialCondition) {
		const conditionDiv = createDiv([]);

		const rootCondition = Array.isArray(initialCondition) ?
			initialCondition[0] ?? null :
			initialCondition;

		const conditionEditor = makeConditionEditor(
			conditionDiv,
			rootCondition,
			0,
			true
		);

		containerDiv.appendChild(conditionDiv);

		containerDiv.getValue = () => {
			return conditionEditor.getValue();
		};

		return containerDiv;
	}

	getValue() {
		if (!this.groupInput.value.trim() && !this.enemySelect.value) return null;

		const result = {
			groupName: this.groupInput.value.trim(),
			enemyName: window.EditorGlobals.enemyList[this.enemySelect.value - 1].name,
			quantity: parseInt(this.quantityInput.value) || 1,
		};

		// Handle node assignments - schema expects either homeNodes OR betweenNodes, not both
		const homeNodes = this.homeNodesList.getSelectedValues().map(n => parseInt(n)).filter(n => !isNaN(n));
		const betweenNodes = this.betweenNodesList.getSelectedValues().map(n => parseInt(n)).filter(n => !isNaN(n));

		if (betweenNodes.length > 0) {
			// betweenNodes takes precedence and must be exactly 2 nodes
			if (betweenNodes.length === 2) {
				result.betweenNodes = betweenNodes;
			} else {
				console.warn('betweenNodes must contain exactly 2 nodes, falling back to homeNodes');
				if (homeNodes.length > 0) {
					result.homeNodes = homeNodes;
				}
			}
		} else if (homeNodes.length > 0) {
			result.homeNodes = homeNodes;
		}

		// Handle conditions
		const spawn = this.spawnCondition?.getValue();
		if (Array.isArray(spawn)) {
			result.spawn = spawn;
		}

		const stopSpawn = this.stopSpawnCondition?.getValue();
		if (Array.isArray(stopSpawn)) {
			result.stopSpawn = stopSpawn;
		}

		// Optional fields
		const note = this.noteArea.value.trim();
		if (note) result.note = note;

		const devNote = this.devNoteInput.value.trim();
		if (devNote) result.devNote = devNote;

		return cleanObject(result);
	}

	remove() {
		if (this.globalUnsubscribe) {
			this.globalUnsubscribe();
			this.globalUnsubscribe = null;
		}

		if (this.homeNodesList && this.homeNodesList._destroy) {
			this.homeNodesList._destroy();
		}
		if (this.betweenNodesList && this.betweenNodesList._destroy) {
			this.betweenNodesList._destroy();
		}

		super.remove();
	}
}