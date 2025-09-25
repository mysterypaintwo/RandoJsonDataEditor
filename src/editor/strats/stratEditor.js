/* =============================================================================
   Strat Editor

   Editor for room strats. Handles conditions, obstacle interactions,
   and real-time title updates. Uses a modular condition system.
   ============================================================================= */

   class StratEditor extends BaseEditor {
	constructor(initialData = {}, validRoomNodes = []) {
		const config = {
			type: 'strats',
			className: 'strat',
			emoji: '📘',
			defaultName: 'Strat',
			idStyle: 'numeric', // 1, 2, 3...
			idPrefix: ''
		};
		super(initialData, config);
		this.validRoomNodes = validRoomNodes;

		// Subscribe to global data changes for dynamic obstacle updates
		this.globalUnsubscribe = window.EditorGlobals.addListener(() => {
			// Strat editor mainly needs obstacle updates, which are handled
			// automatically by the obstacle checkbox lists
			this.refreshCollectsItemsEditor();
			this.refreshSetsFlagsEditor();
		});
	}

	normalizeData(data) {
		return {
			name: normalizeStringField(data, 'name'),
			devNote: normalizeStringField(data, 'devNote'),
			entranceCondition: data?.entranceCondition || null,
			exitCondition: data?.exitCondition || null,
			requires: data?.requires || null,
			clearsObstacles: normalizeArrayField(data, 'clearsObstacles'),
			resetsObstacles: normalizeArrayField(data, 'resetsObstacles'),
			comesThroughToilet: normalizeBooleanField(data, 'comesThroughToilet'),
			bypassesDoorShell: normalizeBooleanField(data, 'bypassesDoorShell'),
			collectsItems: normalizeArrayField(data, 'collectsItems'),
			setsFlags: normalizeArrayField(data, 'setsFlags'),
			wallJumpAvoid: normalizeBooleanField(data, 'wallJumpAvoid'),
			flashSuitChecked: normalizeBooleanField(data, 'flashSuitChecked'),
			id: data?.id
		};
	}

	populateFields() {
		this.nameInput = createInput('text', 'Strat Name', this.initialData.name);
		this.devNoteInput = createInput('text', 'Dev Note', this.initialData.devNote);

		// Create placeholder divs for conditions
		this.entranceConditionDiv = createDiv([]);
		this.requiresConditionDiv = createDiv([]);
		this.exitConditionDiv = createDiv([]);

		// Obstacle tables
		this.clearsObstaclesList = createObstacleCheckboxList(this.initialData.clearsObstacles, 'Clears Obstacles');
		this.resetsObstaclesList = createObstacleCheckboxList(this.initialData.resetsObstacles, 'Resets Obstacles');

		// Boolean checkboxes with robust click handling
		this.comesThroughToilet = this.createClickableCheckbox('Toilet comes between this room and the other room (If this strat involves a door)', this.initialData.comesThroughToilet);
		this.bypassesDoorShell = this.createClickableCheckbox('Allows exiting without opening the door', this.initialData.bypassesDoorShell);
		this.wallJumpAvoid = this.createClickableCheckbox('Wall jump avoid (technical flag)', this.initialData.wallJumpAvoid);
		this.flashSuitChecked = this.createClickableCheckbox('Flash suit compatibility has been verified', this.initialData.flashSuitChecked);

		const boolCheckboxes = [
			this.comesThroughToilet,
			this.bypassesDoorShell,
			this.wallJumpAvoid,
			this.flashSuitChecked
		];

		// Create vertical layout for checkboxes instead of grid
		const boolContainer = document.createElement('div');
		boolContainer.style.display = 'flex';
		boolContainer.style.flexDirection = 'column';
		boolContainer.style.gap = '0px';
		boolCheckboxes.forEach(checkbox => {
			boolContainer.appendChild(checkbox);
		});

		// Items/Flags collection with dedicated editors
		this.collectsItemsEditor = this.createCollectsItemsEditor(this.initialData.collectsItems);
		this.setsFlagsEditor = this.createSetsFlagsEditor(this.initialData.setsFlags);

		const content = createDiv([
			this.nameInput,
			this.devNoteInput,
			createLabel('Entrance Condition:', this.entranceConditionDiv),
			createLabel('Requirements:', this.requiresConditionDiv),
			createLabel('Exit Condition:', this.exitConditionDiv),
			'hr',
			createLabel('Clears Obstacles:', this.clearsObstaclesList),
			createLabel('Resets Obstacles:', this.resetsObstaclesList),
			'hr',
			boolContainer,
			'hr',
			this.collectsItemsEditor,
			this.setsFlagsEditor,
			this.createRemoveButton('Remove Strat')
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

		this.conditionEditors = {
			entrance: this.createConditionSection(this.entranceConditionDiv, this.initialData.entranceCondition),
			requires: this.createConditionSection(this.requiresConditionDiv, this.initialData.requires),
			exit: this.createConditionSection(this.exitConditionDiv, this.initialData.exitCondition)
		};
	}

	setupTitleUpdates() {
		this.nameInput.addEventListener('input', () => {
			this.updateTitle(this.nameInput.value.trim());
		});
	}

	getTitleFromData() {
		return this.nameInput?.value?.trim() || '';
	}

	createConditionSection(containerDiv, initialCondition) {
		const conditionDiv = createDiv([]);
		const conditionEditor = makeConditionEditor(conditionDiv, initialCondition, 0, true);

		containerDiv.appendChild(conditionDiv);
		containerDiv.getValue = () => conditionEditor.getValue();
		return containerDiv;
	}

	/**
	 * Create a checkbox with clickable text label for better UX - single line format
	 */
	createClickableCheckbox(labelText, initialValue) {
		const container = document.createElement('div');
		container.className = 'clickable-checkbox-grid';

		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.checked = !!initialValue;
		checkbox.className = 'checkbox-cell';

		const label = document.createElement('span');
		label.textContent = labelText;
		label.className = 'label-cell';

		// Make the entire row clickable
		container.addEventListener('click', (e) => {
			if (e.target !== checkbox) {
				checkbox.checked = !checkbox.checked;
			}
		});

		container.appendChild(checkbox);
		container.appendChild(label);

		container.getValue = () => checkbox.checked;

		return container;
	}

	createCollectsItemsEditor(initialItems) {
		const card = document.createElement('div');
		card.className = 'editor-card unlocks-doors-card';

		const header = document.createElement('div');
		header.className = 'editor-card-header';
		header.textContent = '📦 Items collected by this Strat';
		card.appendChild(header);

		// Container for checkbox list
		const itemsListContainer = document.createElement('div');
		itemsListContainer.style.marginBottom = '8px';

		// Create checkbox list for item nodes
		const initialNodeIds = (initialItems || []).map(String);
		this.collectsItemsCheckboxList = createNodeCheckboxList(
			initialNodeIds,
			'Item Nodes',
			Infinity, // Allow multiple selections
			'item' // Filter to only item nodes
		);

		itemsListContainer.appendChild(this.collectsItemsCheckboxList);

		const content = createDiv([itemsListContainer]);
		card.appendChild(content);

		card.getValue = () => {
			const selectedNodes = this.collectsItemsCheckboxList?.getSelectedValues() || [];
			return selectedNodes.map(nodeId => parseInt(nodeId)).filter(id => !isNaN(id));
		};

		return card;
	}

	createSetsFlagsEditor(initialFlags) {
		const card = document.createElement('div');
		card.className = 'editor-card unlocks-doors-card';

		const header = document.createElement('div');
		header.className = 'editor-card-header';
		header.textContent = '🚩 Flags set by this Strat';
		card.appendChild(header);

		// Container for checkbox list
		const flagsListContainer = document.createElement('div');
		flagsListContainer.style.marginBottom = '8px';

		// Create checkbox list for flags using event list
		this.setsFlagsCheckboxList = this.createFlagCheckboxList(initialFlags || []);
		flagsListContainer.appendChild(this.setsFlagsCheckboxList);

		const content = createDiv([flagsListContainer]);
		card.appendChild(content);

		card.getValue = () => {
			return this.setsFlagsCheckboxList?.getSelectedValues() || [];
		};

		return card;
	}

	/**
	 * Create a checkbox list for flags using the event list
	 */
	createFlagCheckboxList(selectedFlags) {
		const container = document.createElement('div');
		container.className = 'flag-checkbox-container';

		const toggleBtn = document.createElement('button');
		toggleBtn.className = 'node-toggle-btn';
		toggleBtn.textContent = '▼ Hide Unchecked Flags';
		container.appendChild(toggleBtn);

		const listWrapper = document.createElement('div');
		listWrapper.className = 'node-list-wrapper';
		container.appendChild(listWrapper);

		const searchInput = document.createElement('input');
		searchInput.type = 'text';
		searchInput.placeholder = 'Filter flags...';
		searchInput.className = 'node-search-input';
		listWrapper.appendChild(searchInput);

		const table = document.createElement('table');
		table.className = 'node-table';
		listWrapper.appendChild(table);

		const thead = document.createElement('thead');
		const headerRow = document.createElement('tr');
		['Enabled', 'Flag Name'].forEach(text => {
			const th = document.createElement('th');
			th.textContent = text;
			headerRow.appendChild(th);
		});
		thead.appendChild(headerRow);
		table.appendChild(thead);

		const tbody = document.createElement('tbody');
		table.appendChild(tbody);

		function buildTable() {
			tbody.innerHTML = '';

			const eventList = window.EditorGlobals.eventList || [];
			if (!eventList.length) {
				const emptyRow = document.createElement('tr');
				const emptyCell = document.createElement('td');
				emptyCell.colSpan = 2;
				emptyCell.textContent = '(no flags available)';
				emptyCell.style.fontStyle = 'italic';
				emptyRow.appendChild(emptyCell);
				tbody.appendChild(emptyRow);

				container.getSelectedValues = () => [];
				return;
			}

			const selectedSet = new Set(selectedFlags.map(String));
			const checkboxes = [];

			eventList.forEach(flag => {
				const row = document.createElement('tr');
				row.className = 'flag-row';

				const checkboxCell = document.createElement('td');
				const checkbox = document.createElement('input');
				checkbox.type = 'checkbox';
				checkbox.checked = selectedSet.has(String(flag));
				checkboxCell.appendChild(checkbox);

				const nameCell = document.createElement('td');
				nameCell.textContent = flag;

				row.appendChild(checkboxCell);
				row.appendChild(nameCell);
				tbody.appendChild(row);

				checkboxes.push(checkbox);

				checkbox.addEventListener('change', () => {
					updateRowVisibility();
				});
			});

			function updateRowVisibility() {
				let anyVisible = false;
				tbody.querySelectorAll('tr.flag-row').forEach(row => {
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
				tbody.querySelectorAll('tr.flag-row').forEach(row => {
					const nameCell = row.querySelector('td:nth-child(2)');
					if (!nameCell) return;
					row.style.display = nameCell.textContent.toLowerCase().includes(filter) ? '' : 'none';
				});
			});

			toggleBtn.addEventListener('click', () => {
				const currentlyHidden = toggleBtn.dataset.hidden === 'true';
				toggleBtn.dataset.hidden = currentlyHidden ? 'false' : 'true';
				toggleBtn.textContent = currentlyHidden ? '▼ Hide Unchecked Flags' : '▶ Show All Flags';
				updateRowVisibility();
			});

			toggleBtn.dataset.hidden = 'false';
			updateRowVisibility();

			container.getSelectedValues = () => {
				return checkboxes
					.filter(cb => cb.checked)
					.map(cb => {
						const row = cb.closest('tr');
						return row.querySelector('td:nth-child(2)').textContent;
					});
			};
		}

		// Build initial table
		buildTable();

		// Store cleanup function
		container._destroy = () => {
			// No specific cleanup needed for this implementation
		};

		return container;
	}

	refreshCollectsItemsEditor() {
		// The node checkbox list will automatically refresh when EditorGlobals changes
		// No additional action needed due to the new global system
	}

	refreshSetsFlagsEditor() {
		if (this.setsFlagsCheckboxList) {
			// Get current selections
			const currentSelections = this.setsFlagsCheckboxList.getSelectedValues();

			// Find the container and rebuild
			const container = this.setsFlagsCheckboxList.parentNode;
			if (container) {
				// Clean up old list
				if (this.setsFlagsCheckboxList._destroy) {
					this.setsFlagsCheckboxList._destroy();
				}

				container.removeChild(this.setsFlagsCheckboxList);
				this.setsFlagsCheckboxList = this.createFlagCheckboxList(currentSelections);
				container.appendChild(this.setsFlagsCheckboxList);
			}
		}
	}

	getValue() {
		const name = this.nameInput.value.trim();
		if (!name) return null;

		return {
			name,
			devNote: this.devNoteInput.value.trim(),
			entranceCondition: this.conditionEditors.entrance.getValue(),
			exitCondition: this.conditionEditors.exit.getValue(),
			requires: this.conditionEditors.requires.getValue(),
			clearsObstacles: this.clearsObstaclesList.getSelectedIds(),
			resetsObstacles: this.resetsObstaclesList.getSelectedIds(),
			comesThroughToilet: this.comesThroughToilet.getValue(),
			bypassesDoorShell: this.bypassesDoorShell.getValue(),
			collectsItems: this.collectsItemsEditor.getValue(),
			setsFlags: this.setsFlagsEditor.getValue(),
			wallJumpAvoid: this.wallJumpAvoid.getValue(),
			flashSuitChecked: this.flashSuitChecked.getValue()
		};
	}

	remove() {
		// Clean up global data subscription
		if (this.globalUnsubscribe) {
			this.globalUnsubscribe();
			this.globalUnsubscribe = null;
		}

		// Clean up obstacle lists
		if (this.clearsObstaclesList && this.clearsObstaclesList._destroy) {
			this.clearsObstaclesList._destroy();
		}
		if (this.resetsObstaclesList && this.resetsObstaclesList._destroy) {
			this.resetsObstaclesList._destroy();
		}

		// Clean up item/flag lists
		if (this.collectsItemsCheckboxList && this.collectsItemsCheckboxList._destroy) {
			this.collectsItemsCheckboxList._destroy();
		}
		if (this.setsFlagsCheckboxList && this.setsFlagsCheckboxList._destroy) {
			this.setsFlagsCheckboxList._destroy();
		}

		super.remove();
	}
}