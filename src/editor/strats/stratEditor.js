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
			idStyle: 'numeric',
			idPrefix: ''
		};
		super(initialData, config);
		this.validRoomNodes = validRoomNodes;

		this.globalUnsubscribe = window.EditorGlobals.addListener(() => {
			this.refreshCollectsItemsEditor();
			this.refreshSetsFlagsEditor();
		});
	}

	normalizeData(data) {
		return {
			name: normalizeStringField(data, 'name'),
			devNote: normalizeStringField(data, 'devNote'),
			link: data?.link || null,
			entranceCondition: data?.entranceCondition || null,
			requires: Array.isArray(data?.requires) ? data.requires : [],
			exitCondition: data?.exitCondition || null,
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

		// Link (From/To) node selection
		const linkContainer = document.createElement('div');
		linkContainer.style.marginBottom = '12px';

		const linkLabel = document.createElement('label');
		linkLabel.textContent = 'Link (From → To):';
		linkLabel.style.fontWeight = '600';
		linkLabel.style.display = 'block';
		linkLabel.style.marginBottom = '6px';
		linkContainer.appendChild(linkLabel);

		const linkInputs = document.createElement('div');
		linkInputs.style.display = 'flex';
		linkInputs.style.gap = '8px';
		linkInputs.style.alignItems = 'center';

		this.fromNodeSelect = document.createElement('select');
		this.fromNodeSelect.style.flex = '1';
		this.toNodeSelect = document.createElement('select');
		this.toNodeSelect.style.flex = '1';

		const arrow = document.createElement('span');
		arrow.textContent = '→';
		arrow.style.fontSize = '18px';

		linkInputs.appendChild(this.fromNodeSelect);
		linkInputs.appendChild(arrow);
		linkInputs.appendChild(this.toNodeSelect);
		linkContainer.appendChild(linkInputs);

		this.populateNodeSelects();

		if (this.initialData.link && Array.isArray(this.initialData.link) && this.initialData.link.length === 2) {
			this.fromNodeSelect.value = this.initialData.link[0];
			this.toNodeSelect.value = this.initialData.link[1];
		}

		// Create placeholder divs for conditions - using new editors
		this.entranceConditionDiv = createDiv([]);
		this.requiresConditionDiv = createDiv([]);
		this.exitConditionDiv = createDiv([]);

		// Obstacle tables
		this.clearsObstaclesList = createObstacleCheckboxList(this.initialData.clearsObstacles, 'Clears Obstacles');
		this.resetsObstaclesList = createObstacleCheckboxList(this.initialData.resetsObstacles, 'Resets Obstacles');

		// Boolean checkboxes
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

		const boolContainer = document.createElement('div');
		boolContainer.style.display = 'flex';
		boolContainer.style.flexDirection = 'column';
		boolContainer.style.gap = '0px';
		boolCheckboxes.forEach(checkbox => {
			boolContainer.appendChild(checkbox);
		});

		// Items/Flags collection
		this.collectsItemsEditor = this.createCollectsItemsEditor(this.initialData.collectsItems);
		this.setsFlagsEditor = this.createSetsFlagsEditor(this.initialData.setsFlags);

		const content = createDiv([
			this.nameInput,
			this.devNoteInput,
			linkContainer,
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

	populateNodeSelects() {
		const currentFrom = this.fromNodeSelect ? this.fromNodeSelect.value : null;
		const currentTo = this.toNodeSelect ? this.toNodeSelect.value : null;

		this.fromNodeSelect.innerHTML = '';
		this.toNodeSelect.innerHTML = '';

		const emptyFrom = document.createElement('option');
		emptyFrom.value = '';
		emptyFrom.textContent = '(select from node)';
		this.fromNodeSelect.appendChild(emptyFrom);

		const emptyTo = document.createElement('option');
		emptyTo.value = '';
		emptyTo.textContent = '(select to node)';
		this.toNodeSelect.appendChild(emptyTo);

		window.EditorGlobals.validRoomNodes.forEach(node => {
			const optionFrom = document.createElement('option');
			optionFrom.value = node.id;
			optionFrom.textContent = `${node.id}: ${node.name}`;
			this.fromNodeSelect.appendChild(optionFrom);

			const optionTo = document.createElement('option');
			optionTo.value = node.id;
			optionTo.textContent = `${node.id}: ${node.name}`;
			this.toNodeSelect.appendChild(optionTo);
		});

		if (currentFrom !== null) {
			this.fromNodeSelect.value = currentFrom;
		} else if (this.initialData.link && this.initialData.link.length === 2) {
			this.fromNodeSelect.value = this.initialData.link[0];
		}

		if (currentTo !== null) {
			this.toNodeSelect.value = currentTo;
		} else if (this.initialData.link && this.initialData.link.length === 2) {
			this.toNodeSelect.value = this.initialData.link[1];
		}
	}

	refreshNodeSelects() {
		if (this.fromNodeSelect && this.toNodeSelect) {
			const fromValue = this.fromNodeSelect.value;
			const toValue = this.toNodeSelect.value;

			this.populateNodeSelects();

			this.fromNodeSelect.value = fromValue;
			this.toNodeSelect.value = toValue;
		}
	}

	createConditionEditors() {
		if (typeof makeConditionEditor === 'undefined') {
			console.error('makeConditionEditor not available, retrying...');
			setTimeout(() => this.createConditionEditors(), 100);
			return;
		}

		// Entrance condition - use new editor
		this.entranceConditionEditor = new EntranceConditionEditor(
			this.entranceConditionDiv,
			this.initialData.entranceCondition
		);

		// Requires - use existing condition editor
		const requiresDiv = createDiv([]);
		const rootCondition = Array.isArray(this.initialData.requires) ?
			this.initialData.requires[0] ?? null :
			this.initialData.requires;

		this.requiresEditor = makeConditionEditor(
			requiresDiv,
			rootCondition,
			0,
			true
		);
		this.requiresConditionDiv.appendChild(requiresDiv);

		// Exit condition - use new editor
		this.exitConditionEditor = new ExitConditionEditor(
			this.exitConditionDiv,
			this.initialData.exitCondition
		);
	}

	setupTitleUpdates() {
		this.nameInput.addEventListener('input', () => {
			this.updateTitle(this.nameInput.value.trim());
		});
	}

	getTitleFromData() {
		return this.nameInput?.value?.trim() || '';
	}

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

		const itemsListContainer = document.createElement('div');
		itemsListContainer.style.marginBottom = '8px';

		const initialNodeIds = (initialItems || []).map(String);
		this.collectsItemsCheckboxList = createNodeCheckboxList(
			initialNodeIds,
			'Item Nodes',
			Infinity,
			'item'
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

		const flagsListContainer = document.createElement('div');
		flagsListContainer.style.marginBottom = '8px';

		this.setsFlagsCheckboxList = this.createStyledFlagCheckboxList(initialFlags || []);
		flagsListContainer.appendChild(this.setsFlagsCheckboxList);

		const content = createDiv([flagsListContainer]);
		card.appendChild(content);

		card.getValue = () => {
			return this.setsFlagsCheckboxList?.getSelectedValues() || [];
		};

		return card;
	}

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

			const eventMap = window.EditorGlobals.eventList || {};

			const categories = Object.entries(eventMap);
			if (!categories.length) {
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

			const collator = new Intl.Collator(undefined, {
				numeric: true,
				sensitivity: 'base'
			});

			categories.forEach(([category, flags]) => {
				if (!Array.isArray(flags) || !flags.length) return;

				const header = document.createElement('div');
				header.className = 'flag-category-header';
				header.textContent = category;
				checkboxContainer.appendChild(header);

				flags
					.slice()
					.sort((a, b) => collator.compare(a.name, b.name))
					.forEach(flag => {
						const row = document.createElement('div');
						row.className = 'improved-checkbox-row';

						const checkboxCell = document.createElement('div');
						checkboxCell.className = 'improved-checkbox-cell';

						const checkbox = document.createElement('input');
						checkbox.type = 'checkbox';
						checkbox.className = 'improved-checkbox-input';
						checkbox.checked = selectedSet.has(flag.name);
						checkbox.dataset.flagValue = flag.name;
						checkboxCell.appendChild(checkbox);

						const labelCell = document.createElement('div');
						labelCell.className = 'improved-checkbox-label';
						labelCell.textContent = SelectRenderer.stripFlagPrefix(flag.name);

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

						checkbox.addEventListener('change', updateRowVisibility);
					});
			});

			function updateRowVisibility() {
				checkboxContainer
					.querySelectorAll('.improved-checkbox-row')
					.forEach(row => {
						const checkbox = row.querySelector('input[type="checkbox"]');
						if (toggleBtn.dataset.hidden !== 'true' || checkbox.checked) {
							row.style.display = '';
						} else {
							row.style.display = 'none';
						}
					});
			}

			if (!eventListenersAdded) {
				searchInput.addEventListener('input', () => {
					const filter = searchInput.value.toLowerCase();
					checkboxContainer
						.querySelectorAll('.improved-checkbox-row')
						.forEach(row => {
							const text = row
								.querySelector('.improved-checkbox-label')
								.textContent
								.toLowerCase();
							row.style.display = text.includes(filter) ? '' : 'none';
						});
				});

				toggleBtn.addEventListener('click', () => {
					const hidden = toggleBtn.dataset.hidden === 'true';
					toggleBtn.dataset.hidden = hidden ? 'false' : 'true';
					toggleBtn.textContent = hidden ?
						'▼ Hide Unchecked Flags' :
						'▶ Show All Flags';
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

		buildTable();

		const unsubscribe = window.EditorGlobals.addListener(() => {
			buildTable();
		});

		container._destroy = unsubscribe;

		return container;
	}

	refreshCollectsItemsEditor() {
		this.refreshNodeSelects();
	}

	refreshSetsFlagsEditor() {
		if (this.setsFlagsCheckboxList) {
			const currentSelections = this.setsFlagsCheckboxList.getSelectedValues();

			const container = this.setsFlagsCheckboxList.parentNode;
			if (container) {
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

		// Add link if both nodes are selected
		const fromNode = parseInt(this.fromNodeSelect.value);
		const toNode = parseInt(this.toNodeSelect.value);
		if (!isNaN(fromNode) && !isNaN(toNode)) {
			result.link = [fromNode, toNode];
		}

		// Add required 'requires' field
		const requires = this.requiresEditor.getValue();
		result.requires = requires || [];

		// Optional fields
		const devNote = this.devNoteInput.value.trim();
		if (devNote) result.devNote = devNote;

		const entranceCondition = this.entranceConditionEditor.getValue();
		if (entranceCondition) result.entranceCondition = entranceCondition;

		const exitCondition = this.exitConditionEditor.getValue();
		if (exitCondition) result.exitCondition = exitCondition;

		// Obstacle arrays
		const clearsObstacles = this.clearsObstaclesList.getSelectedIds().filter(id => id);
		if (clearsObstacles.length > 0) result.clearsObstacles = clearsObstacles;

		const resetsObstacles = this.resetsObstaclesList.getSelectedIds().filter(id => id);
		if (resetsObstacles.length > 0) result.resetsObstacles = resetsObstacles;

		// Boolean fields
		if (this.comesThroughToilet.getValue()) result.comesThroughToilet = true;
		if (this.bypassesDoorShell.getValue()) result.bypassesDoorShell = true;
		if (this.wallJumpAvoid.getValue()) result.wallJumpAvoid = true;
		if (this.flashSuitChecked.getValue()) result.flashSuitChecked = true;

		// Item/flag collections
		const collectsItems = this.collectsItemsEditor.getValue().filter(id => id != null);
		if (collectsItems.length > 0) result.collectsItems = collectsItems;

		const setsFlags = this.setsFlagsEditor.getValue().filter(flag => flag && flag.trim());
		if (setsFlags.length > 0) result.setsFlags = setsFlags;

		return cleanObject(result);
	}

	remove() {
		if (this.globalUnsubscribe) {
			this.globalUnsubscribe();
			this.globalUnsubscribe = null;
		}

		if (this.clearsObstaclesList && this.clearsObstaclesList._destroy) {
			this.clearsObstaclesList._destroy();
		}
		if (this.resetsObstaclesList && this.resetsObstaclesList._destroy) {
			this.resetsObstaclesList._destroy();
		}

		if (this.collectsItemsCheckboxList && this.collectsItemsCheckboxList._destroy) {
			this.collectsItemsCheckboxList._destroy();
		}
		if (this.setsFlagsCheckboxList && this.setsFlagsCheckboxList._destroy) {
			this.setsFlagsCheckboxList._destroy();
		}

		// Clean up entrance/exit editors
		if (this.entranceConditionEditor) {
			this.entranceConditionEditor.remove();
		}
		if (this.exitConditionEditor) {
			this.exitConditionEditor.remove();
		}

		super.remove();
	}
}