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

		// Create checkbox list for flags using event list - NOW USING STYLED VERSION
		this.setsFlagsCheckboxList = this.createStyledFlagCheckboxList(initialFlags || []);
		flagsListContainer.appendChild(this.setsFlagsCheckboxList);

		const content = createDiv([flagsListContainer]);
		card.appendChild(content);

		card.getValue = () => {
			return this.setsFlagsCheckboxList?.getSelectedValues() || [];
		};

		return card;
	}

	/**
	 * Create a styled checkbox list for flags using the improved checkbox container styling
	 */
	createStyledFlagCheckboxList(selectedFlags) {
		const container = document.createElement('div');
		container.className = 'flag-checkbox-container';

		const toggleBtn = document.createElement('button');
		toggleBtn.className = 'node-toggle-btn';
		toggleBtn.textContent = '▼ Hide Unchecked Flags';
		toggleBtn.dataset.hidden = 'false';
		container.appendChild(toggleBtn);

		const listWrapper = document.createElement('div');
		listWrapper.className = 'node-list-wrapper';
		container.appendChild(listWrapper);

		const searchInput = document.createElement('input');
		searchInput.type = 'text';
		searchInput.placeholder = 'Filter flags...';
		searchInput.className = 'node-search-input';
		listWrapper.appendChild(searchInput);

		const checkboxContainer = document.createElement('div');
		checkboxContainer.className = 'improved-checkbox-container';
		listWrapper.appendChild(checkboxContainer);

		let checkboxes = [];
		let eventListenersAdded = false;

		function buildTable() {
			checkboxContainer.innerHTML = '';
			checkboxes = [];

			const eventList = window.EditorGlobals.eventList || [];
			if (!eventList.length) {
				const emptyDiv = document.createElement('div');
				emptyDiv.textContent = '(no flags available)';
				emptyDiv.style.fontStyle = 'italic';
				emptyDiv.style.textAlign = 'center';
				emptyDiv.style.padding = '12px';
				emptyDiv.style.color = '#666';
				checkboxContainer.appendChild(emptyDiv);

				container.getSelectedValues = () => [];
				return;
			}

			const selectedSet = new Set(selectedFlags.map(String));

			eventList.forEach(flag => {
				const row = document.createElement('div');
				row.className = 'improved-checkbox-row';

				const checkboxCell = document.createElement('div');
				checkboxCell.className = 'improved-checkbox-cell';
				
				const checkbox = document.createElement('input');
				checkbox.type = 'checkbox';
				checkbox.className = 'improved-checkbox-input';
				checkbox.checked = selectedSet.has(String(flag));
				checkbox.dataset.flagValue = flag;
				checkboxCell.appendChild(checkbox);

				const labelCell = document.createElement('div');
				labelCell.className = 'improved-checkbox-label';
				labelCell.textContent = flag;

				// Make entire row clickable
				row.addEventListener('click', (e) => {
					if (e.target !== checkbox) {
						checkbox.checked = !checkbox.checked;
						checkbox.dispatchEvent(new Event('change'));
					}
				});

				row.appendChild(checkboxCell);
				row.appendChild(labelCell);
				checkboxContainer.appendChild(row);

				checkboxes.push(checkbox);

				checkbox.addEventListener('change', () => {
					updateRowVisibility();
				});
			});

			function updateRowVisibility() {
				let anyVisible = false;
				checkboxContainer.querySelectorAll('.improved-checkbox-row').forEach(row => {
					const checkbox = row.querySelector('input[type="checkbox"]');
					if (toggleBtn.dataset.hidden === 'true' && !checkbox.checked) {
						row.style.display = 'none';
					} else {
						row.style.display = '';
						anyVisible = true;
					}
				});
				checkboxContainer.style.display = anyVisible ? 'block' : 'none';
				searchInput.style.display = anyVisible ? '' : 'none';
			}

			// Add event listeners only once
			if (!eventListenersAdded) {
				searchInput.addEventListener('input', () => {
					const filter = searchInput.value.toLowerCase();
					checkboxContainer.querySelectorAll('.improved-checkbox-row').forEach(row => {
						const labelText = row.querySelector('.improved-checkbox-label').textContent.toLowerCase();
						row.style.display = labelText.includes(filter) ? '' : 'none';
					});
				});

				toggleBtn.addEventListener('click', () => {
					const currentlyHidden = toggleBtn.dataset.hidden === 'true';
					toggleBtn.dataset.hidden = currentlyHidden ? 'false' : 'true';
					toggleBtn.textContent = currentlyHidden ? '▼ Hide Unchecked Flags' : '▶ Show All Flags';
					updateRowVisibility();
				});

				eventListenersAdded = true;
			}

			updateRowVisibility();

			container.getSelectedValues = () => {
				return checkboxes
					.filter(cb => cb.checked)
					.map(cb => cb.dataset.flagValue);
			};
		}

		// Build initial table
		buildTable();

		// Rebuild when event list changes
		const unsubscribe = window.EditorGlobals.addListener(() => {
			buildTable();
		});

		// Store cleanup function
		container._destroy = unsubscribe;

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
				this.setsFlagsCheckboxList = this.createStyledFlagCheckboxList(currentSelections);
				container.appendChild(this.setsFlagsCheckboxList);
			}
		}
	}

	getValue() {
		const name = this.nameInput.value.trim();
		if (!name) return null;

		const result = {
			name
		};

		// Add required 'requires' field (can be null)
		const requires = this.conditionEditors.requires.getValue();
		result.requires = requires;

		// Add optional fields only if they have values
		const devNote = this.devNoteInput.value.trim();
		if (devNote) result.devNote = devNote;

		const entranceCondition = this.conditionEditors.entrance.getValue();
		if (entranceCondition) result.entranceCondition = entranceCondition;

		const exitCondition = this.conditionEditors.exit.getValue();
		if (exitCondition) result.exitCondition = exitCondition;

		// Obstacle arrays - only include if non-empty
		const clearsObstacles = this.clearsObstaclesList.getSelectedIds().filter(id => id);
		if (clearsObstacles.length > 0) result.clearsObstacles = clearsObstacles;

		const resetsObstacles = this.resetsObstaclesList.getSelectedIds().filter(id => id);
		if (resetsObstacles.length > 0) result.resetsObstacles = resetsObstacles;

		// Boolean fields - only include if true (schema defaults assume false)
		if (this.comesThroughToilet.getValue()) result.comesThroughToilet = true;
		if (this.bypassesDoorShell.getValue()) result.bypassesDoorShell = true;
		if (this.wallJumpAvoid.getValue()) result.wallJumpAvoid = true;
		if (this.flashSuitChecked.getValue()) result.flashSuitChecked = true;

		// Item/flag collections - only include if non-empty
		const collectsItems = this.collectsItemsEditor.getValue().filter(id => id != null);
		if (collectsItems.length > 0) result.collectsItems = collectsItems;

		const setsFlags = this.setsFlagsEditor.getValue().filter(flag => flag && flag.trim());
		if (setsFlags.length > 0) result.setsFlags = setsFlags;

		return cleanObject(result);
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