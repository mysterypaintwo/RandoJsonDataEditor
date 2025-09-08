/* =============================================================================
   Enemy Editor
   
   Editor for enemy groups. Handles enemy selection, node assignments,
   spawn conditions, and real-time title updates.
   ============================================================================= */
   class EnemyEditor extends BaseEditor {
	constructor(initialData = {}, validRoomNodes = [], enemyList, itemList, eventList, techMap, helperMap) {
		const config = {
			type: 'enemies',
			className: 'enemy',
			emoji: '👾',
			defaultName: 'Enemy Group',
			idStyle: 'numeric', // e1, e2, e3...
			idPrefix: 'e'
		};
		super(initialData, config);
		this.enemyList = enemyList;
		this.validRoomNodes = validRoomNodes;

		this.itemList = itemList;
		this.eventList = eventList;
		this.techMap = techMap;
		this.helperMap = helperMap;

		// Patch up editors after data arrives
		this.refreshNodeLists();
		this.refreshEnemyList();
		this.refreshAllConditionEditors();
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
		this.quantityInput = createInput('number', 'Quantity', this.initialData.quantity, {
			min: 1
		});
		this.homeNodesList = this.createNodeCheckboxList(this.initialData.homeNodes, 'Home Nodes');
		this.betweenNodesList = this.createNodeCheckboxList(this.initialData.betweenNodes, 'Between Nodes', 2);
		
		this._conditionEditors = [];

		this.spawnCondition = this.createConditionSection('Spawn Condition', this.initialData.spawnCondition, editor => this._conditionEditors.push(editor));
		this.stopSpawnCondition = this.createConditionSection('Stop Spawn Condition', this.initialData.stopSpawnCondition, editor => this._conditionEditors.push(editor));
		this.noteArea = createTextarea('Note (optional)', this.initialData.note);
		this.devNoteInput = createInput('text', 'Developer Note', this.initialData.devNote);
		const topRow = createDiv([this.enemySelect, this.quantityInput], 'enemy-top-row');
		const content = createDiv([
			this.groupInput,
			topRow,
			createLabel('Enemy Patrols These Nodes:', this.homeNodesList),
			createLabel('Encounter Enemy Between These Nodes (Max 2):', this.betweenNodesList),
			this.spawnCondition,
			this.stopSpawnCondition,
			this.noteArea,
			this.devNoteInput,
			this.createRemoveButton('Remove Enemy')
		]);
		this.contentArea.appendChild(content);
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
		if (!this.enemySelect || !this.enemyList || this.enemyList.length === 0) return;
	
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
        if (this.homeNodesList && this.betweenNodesList && this.validRoomNodes && this.validRoomNodes.length > 0) {
            // Get current selections, but safely handle the case where getSelectedValues doesn't exist
            const homeSelectedNodes = (this.homeNodesList.getSelectedValues) 
                ? this.homeNodesList.getSelectedValues() 
                : this.initialData.homeNodes || [];
            const betweenSelectedNodes = (this.betweenNodesList.getSelectedValues) 
                ? this.betweenNodesList.getSelectedValues() 
                : this.initialData.betweenNodes || [];
            
            // Find the containers and replace them
            const homeContainer = this.homeNodesList.parentNode;
            const betweenContainer = this.betweenNodesList.parentNode;
            
            homeContainer.removeChild(this.homeNodesList);
            betweenContainer.removeChild(this.betweenNodesList);
            
            this.homeNodesList = this.createNodeCheckboxList(homeSelectedNodes, 'Home Nodes');
            this.betweenNodesList = this.createNodeCheckboxList(betweenSelectedNodes, 'Between Nodes', 2);
            
            homeContainer.appendChild(this.homeNodesList);
            betweenContainer.appendChild(this.betweenNodesList);
        }
    }
	getTitleFromData() {
		const groupName = this.groupInput?.value?.trim();
		const enemyName = this.enemySelect?.value;
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
		const enemies = this.enemyList?.length
			? this.enemyList
			: ['(no enemies available)'];

		const options = enemies.map(enemy => ({
			value: enemy,
			text: enemy
		}));

		return createSelect(options, selectedEnemy);
	}
	createNodeCheckboxList(selectedNodes, title, maxSelected = Infinity) {
		const container = document.createElement('div');
		container.className = 'node-checkbox-container';
		const toggleBtn = document.createElement('button');
		toggleBtn.className = 'node-toggle-btn';
		toggleBtn.textContent = '▼ Hide Unchecked Nodes';
		container.appendChild(toggleBtn);
		const listWrapper = document.createElement('div');
		listWrapper.className = 'node-list-wrapper';
		container.appendChild(listWrapper);
		const searchInput = createInput('text', 'Filter nodes...');
		searchInput.className = 'node-search-input';
		listWrapper.appendChild(searchInput);
		const table = document.createElement('table');
		table.className = 'node-table';
		listWrapper.appendChild(table);
		const thead = document.createElement('thead');
		const headerRow = document.createElement('tr');
		['Enabled', 'ID', 'Name'].forEach(text => {
			const th = document.createElement('th');
			th.textContent = text;
			headerRow.appendChild(th);
		});
		thead.appendChild(headerRow);
		table.appendChild(thead);
		const tbody = document.createElement('tbody');
		table.appendChild(tbody);
        if (!this.validRoomNodes || !this.validRoomNodes.length) {
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = 3;
            emptyCell.textContent = '(no nodes available)';
            emptyCell.style.fontStyle = 'italic';
            emptyRow.appendChild(emptyCell);
            tbody.appendChild(emptyRow);
            
            // Always add the getSelectedValues method, even when empty
            container.getSelectedValues = () => [];
            return container;
        }
		const selectedSet = new Set(selectedNodes.map(String));
		const checkboxes = [];
		this.validRoomNodes.forEach(node => {
			const row = document.createElement('tr');
			row.className = 'node-row';
			const checkboxCell = document.createElement('td');
			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.checked = selectedSet.has(String(node.id));
			checkboxCell.appendChild(checkbox);
			const idCell = document.createElement('td');
			idCell.textContent = node.id;
			const nameCell = document.createElement('td');
			nameCell.textContent = node.name;
			row.appendChild(checkboxCell);
			row.appendChild(idCell);
			row.appendChild(nameCell);
			tbody.appendChild(row);
			checkboxes.push(checkbox);
			checkbox.addEventListener('change', () => {
				updateRowVisibility();
				enforceMaxSelected();
			});
		});

		function enforceMaxSelected() {
			const checkedCount = checkboxes.filter(cb => cb.checked).length;
			checkboxes.forEach(cb => {
				if (!cb.checked) {
					cb.disabled = checkedCount >= maxSelected;
					cb.parentElement.style.opacity = cb.disabled ? '0.5' : '1';
				}
			});
		}

		function updateRowVisibility() {
			let anyVisible = false;
			tbody.querySelectorAll('tr.node-row').forEach(row => {
				const checkbox = row.querySelector('input[type="checkbox"]');
				if (toggleBtn.dataset.hidden === 'true' && !checkbox.checked) {
					row.style.display = 'none';
				} else {
					row.style.display = '';
					anyVisible = true;
				}
			});
			table.style.display = anyVisible ? 'table' : 'none';
			searchInput.style.display = (anyVisible && toggleBtn.dataset.hidden === 'true') ? '' : (anyVisible ? '' : 'none');
		}
		searchInput.addEventListener('input', () => {
			const filter = searchInput.value.toLowerCase();
			tbody.querySelectorAll('tr.node-row').forEach(row => {
				const nameCell = row.querySelector('td:nth-child(3)');
				if (!nameCell) return;
				row.style.display = nameCell.textContent.toLowerCase().includes(filter) ? '' : 'none';
			});
		});
		toggleBtn.addEventListener('click', () => {
			const currentlyHidden = toggleBtn.dataset.hidden === 'true';
			toggleBtn.dataset.hidden = currentlyHidden ? 'false' : 'true';
			toggleBtn.textContent = currentlyHidden ? '▼ Hide Unchecked Nodes' : '▶ Show All Nodes';
			updateRowVisibility();
		});
		toggleBtn.dataset.hidden = 'false';
		updateRowVisibility();
		enforceMaxSelected();
		// Expose method to get selected values
		container.getSelectedValues = () => {
			return checkboxes
				.filter(cb => cb.checked)
				.map(cb => {
					const row = cb.closest('tr');
					return row.querySelector('td:nth-child(2)').textContent;
				});
		};
		return container;
	}
	createConditionSection(title, initialCondition, pushCallback) {
		const container = createDiv([]);
		const label = createLabel(`${title}:`, null);
		container.appendChild(label);
		const conditionDiv = createDiv([]);
		const conditionEditor = makeConditionEditor(conditionDiv, initialCondition, 0, true);
		
		// Store reference for later updates
    	if (pushCallback) pushCallback(conditionEditor);

		container.appendChild(conditionDiv);
		container.getValue = () => conditionEditor.getValue();
		return container;
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
	
	refreshAllConditionEditors() {
		this._conditionEditors.forEach(editor => {
			editor.setLists({
				itemList: this.itemList,
				eventList: this.eventList,
				techMap: this.techMap,
				helperMap: this.helperMap
			});
		});
	}	
}