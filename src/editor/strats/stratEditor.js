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
			flashSuitChecked: normalizeBooleanField(data, 'flashSuitChecked')
		};
	}

	populateFields() {
		// Name field - make wider
		this.nameInput = createInput('text', 'Strat Name', this.initialData.name);
		this.nameInput.style.width = '100%';

		// Note field (NEW)
		this.noteInput = document.createElement('textarea');
		this.noteInput.placeholder = 'Note (optional)';
		this.noteInput.rows = 2;
		this.noteInput.style.width = '100%';
		this.noteInput.style.boxSizing = 'border-box';
		this.noteInput.style.padding = '8px';
		this.noteInput.style.border = '1px solid #ccc';
		this.noteInput.style.borderRadius = '4px';
		this.noteInput.style.fontFamily = 'inherit';
		this.noteInput.style.fontSize = '14px';
		this.noteInput.style.marginBottom = '12px';
		if (this.initialData.note) {
			const noteText = Array.isArray(this.initialData.note) ?
				this.initialData.note.join('\n') :
				this.initialData.note;
			this.noteInput.value = noteText;
		}

		// Dev Note field - full width textarea
		this.devNoteInput = document.createElement('textarea');
		this.devNoteInput.placeholder = 'Dev Note (optional)';
		this.devNoteInput.rows = 2;
		this.devNoteInput.style.width = '100%';
		this.devNoteInput.style.boxSizing = 'border-box';
		this.devNoteInput.style.padding = '8px';
		this.devNoteInput.style.border = '1px solid #ccc';
		this.devNoteInput.style.borderRadius = '4px';
		this.devNoteInput.style.fontFamily = 'inherit';
		this.devNoteInput.style.fontSize = '14px';
		this.devNoteInput.style.marginBottom = '12px';
		if (this.initialData.devNote) {
			const devNoteText = Array.isArray(this.initialData.devNote) ?
				this.initialData.devNote.join('\n') :
				this.initialData.devNote;
			this.devNoteInput.value = devNoteText;
		}

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

		// Create collapsible sections
		this.entranceConditionSection = this.createCollapsibleSection('Entrance Condition');
		this.requiresConditionSection = this.createCollapsibleSection('Requirements');
		this.exitConditionSection = this.createCollapsibleSection('Exit Condition');
		this.obstaclesSection = this.createCollapsibleSection('Obstacles');
		this.boolFieldsSection = this.createCollapsibleSection('Advanced Properties', true); // collapsed by default
		this.collectionsSection = this.createCollapsibleSection('Items & Flags', true); // collapsed by default

		// Placeholder divs for conditions
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

		const boolContainer = document.createElement('div');
		boolContainer.style.display = 'flex';
		boolContainer.style.flexDirection = 'column';
		boolContainer.style.gap = '0px';
		[this.comesThroughToilet, this.bypassesDoorShell, this.wallJumpAvoid, this.flashSuitChecked].forEach(cb => {
			boolContainer.appendChild(cb);
		});

		// Items/Flags collection
		this.collectsItemsEditor = this.createCollectsItemsEditor(this.initialData.collectsItems);
		this.setsFlagsEditor = this.createSetsFlagsEditor(this.initialData.setsFlags);

		// Populate collapsible sections
		this.entranceConditionSection.contentArea.appendChild(this.entranceConditionDiv);
		this.requiresConditionSection.contentArea.appendChild(this.requiresConditionDiv);
		this.exitConditionSection.contentArea.appendChild(this.exitConditionDiv);

		this.obstaclesSection.contentArea.appendChild(createLabel('Clears Obstacles:', this.clearsObstaclesList));
		this.obstaclesSection.contentArea.appendChild(createLabel('Resets Obstacles:', this.resetsObstaclesList));

		this.boolFieldsSection.contentArea.appendChild(boolContainer);

		this.collectionsSection.contentArea.appendChild(this.collectsItemsEditor);
		this.collectionsSection.contentArea.appendChild(this.setsFlagsEditor);

		const content = createDiv([
			this.nameInput,
			this.noteInput,
			this.devNoteInput,
			linkContainer,
			this.entranceConditionSection.root,
			this.requiresConditionSection.root,
			this.exitConditionSection.root,
			this.obstaclesSection.root,
			this.boolFieldsSection.root,
			this.collectionsSection.root,
			this.createRemoveButton('Remove Strat')
		]);
		this.contentArea.appendChild(content);

		// DEFERRED: Create condition editors after DOM is ready
		setTimeout(() => {
			if (typeof makeConditionEditor !== 'undefined') {
				this.createConditionEditors();
			} else {
				console.error('makeConditionEditor not available - condition editors will not work!');
			}
		}, 0);
	}

	createCollapsibleSection(title, startCollapsed = false) {
		const section = {
			root: document.createElement('div'),
			header: document.createElement('div'),
			contentArea: document.createElement('div'),
			isCollapsed: startCollapsed
		};

		section.root.className = 'collapsible-section';
		section.root.style.marginBottom = '12px';

		section.header.className = 'collapsible-header';
		section.header.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        cursor: pointer;
        user-select: none;
        font-weight: 600;
    `;

		section.icon = document.createElement('span');
		section.icon.textContent = startCollapsed ? '▶' : '▼';
		section.icon.style.fontSize = '12px';

		section.titleText = document.createElement('span');
		section.titleText.textContent = title;

		section.header.appendChild(section.icon);
		section.header.appendChild(section.titleText);

		section.contentArea.style.cssText = `
        padding: 12px;
        border: 1px solid #dee2e6;
        border-top: none;
        border-radius: 0 0 4px 4px;
        display: ${startCollapsed ? 'none' : 'block'};
    `;

		section.header.addEventListener('click', () => {
			section.isCollapsed = !section.isCollapsed;
			section.icon.textContent = section.isCollapsed ? '▶' : '▼';
			section.contentArea.style.display = section.isCollapsed ? 'none' : 'block';
		});

		section.root.appendChild(section.header);
		section.root.appendChild(section.contentArea);

		// Methods to programmatically control collapse state
		section.collapse = () => {
			if (!section.isCollapsed) {
				section.header.click();
			}
		};

		section.expand = () => {
			if (section.isCollapsed) {
				section.header.click();
			}
		};

		return section;
	}

	getValue() {
		const name = this.nameInput.value.trim();
		if (!name) return null;

		const result = {
			...this.initialData, // preserve unknown fields
			name
		};

		// Add link if both nodes are selected
		const fromNode = parseInt(this.fromNodeSelect.value);
		const toNode = parseInt(this.toNodeSelect.value);
		if (!isNaN(fromNode) && !isNaN(toNode)) {
			result.link = [fromNode, toNode];
		}

		// 'requires' field must always be present (minimum [])
		if (this._conditionEditorsReady && this.requiresEditor) {
			const requiresValue = this.requiresEditor.getValue();
			result.requires = this.flattenRequires(requiresValue);
		} else {
			result.requires = Array.isArray(this.initialData.requires) ?
				this.initialData.requires : [];
		}

		// Optional note field
		const note = this.noteInput.value.trim();
		if (note) result.note = note;

		// Optional devNote field
		const devNote = this.devNoteInput.value.trim();
		if (devNote) result.devNote = devNote;

		// Entrance/Exit conditions - only add if not null
		if (this._conditionEditorsReady) {
			if (this.entranceConditionEditor) {
				const entranceCondition = this.entranceConditionEditor.getValue();
				if (entranceCondition && Object.keys(entranceCondition).length > 0) {
					result.entranceCondition = entranceCondition;
				}
			}

			if (this.exitConditionEditor) {
				const exitCondition = this.exitConditionEditor.getValue();
				if (exitCondition && Object.keys(exitCondition).length > 0) {
					result.exitCondition = exitCondition;
				}
			}
		}

		// Obstacle arrays
		const clearsObstacles = this.clearsObstaclesList.getSelectedIds().filter(id => id);
		if (clearsObstacles.length > 0) result.clearsObstacles = clearsObstacles;

		const resetsObstacles = this.resetsObstaclesList.getSelectedIds().filter(id => id);
		if (resetsObstacles.length > 0) result.resetsObstacles = resetsObstacles;

		// Boolean fields - only include if true OR if explicitly set in original data
		if (this.comesThroughToilet.getValue() || this.initialData.comesThroughToilet === true) {
			result.comesThroughToilet = this.comesThroughToilet.getValue();
		}
		if (this.bypassesDoorShell.getValue() || this.initialData.bypassesDoorShell === true || this.initialData.bypassesDoorShell === 'free') {
			result.bypassesDoorShell = this.bypassesDoorShell.getValue();
		}
		if (this.wallJumpAvoid.getValue() || this.initialData.wallJumpAvoid === true) {
			result.wallJumpAvoid = this.wallJumpAvoid.getValue();
		}
		if (this.flashSuitChecked.getValue() || this.initialData.flashSuitChecked === true) {
			result.flashSuitChecked = this.flashSuitChecked.getValue();
		}

		// Item/flag collections
		const collectsItems = this.collectsItemsEditor.getValue().filter(id => id != null);
		if (collectsItems.length > 0) result.collectsItems = collectsItems;

		const setsFlags = this.setsFlagsEditor.getValue().filter(flag => flag && flag.trim());
		if (setsFlags.length > 0) result.setsFlags = setsFlags;

		const cleaned = cleanObject(result);

		// Requires, entranceCondition, and exitCondition must be retained
		if (!Array.isArray(cleaned.requires)) {
			cleaned.requires = [];
		}
		if (result.entranceCondition != null) {
			cleaned.entranceCondition = result.entranceCondition;
		}
		if (result.exitCondition != null) {
			cleaned.exitCondition = result.exitCondition;
		}

		return cleaned;
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
		// Entrance condition - use specialized editor
		this.entranceConditionDiv.innerHTML = '';
		this.entranceConditionEditor = new EntranceConditionEditor(
			this.entranceConditionDiv,
			this.initialData.entranceCondition
		);

		// Requires - CLEAR first, then create editor
		this.requiresConditionDiv.innerHTML = '';

		// Handle requires array properly - extract the first element if it exists
		let rootCondition = null;
		if (Array.isArray(this.initialData.requires) && this.initialData.requires.length > 0) {
			// Get the first element
			const firstElement = this.initialData.requires[0];

			// If it's already a logical structure (and/or), use it directly
			if (firstElement && typeof firstElement === 'object' &&
				(firstElement.and || firstElement.or || firstElement.not)) {
				rootCondition = firstElement;
			} else {
				// Single item - use as-is
				rootCondition = firstElement;
			}
		}

		this.requiresEditor = makeConditionEditor(
			this.requiresConditionDiv,
			rootCondition,
			0,
			true
		);

		// Exit condition - use specialized editor
		this.exitConditionDiv.innerHTML = '';
		this.exitConditionEditor = new ExitConditionEditor(
			this.exitConditionDiv,
			this.initialData.exitCondition
		);

		// Mark as rendered
		this._conditionEditorsReady = true;
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

	flattenRequires(value) {
		if (!value) return [];
		if (Array.isArray(value)) return value;
		if (value.and && Array.isArray(value.and)) return value.and;
		return [value];
	}

	getValue() {
		const name = this.nameInput.value.trim();
		if (!name) return null;

		const result = {
			...this.initialData, // preserve unknown fields
			name
		};

		// Add link if both nodes are selected
		const fromNode = parseInt(this.fromNodeSelect.value);
		const toNode = parseInt(this.toNodeSelect.value);
		if (!isNaN(fromNode) && !isNaN(toNode)) {
			result.link = [fromNode, toNode];
		}

		// 'requires' field must always be present (minimum [])
		if (this._conditionEditorsReady && this.requiresEditor) {
			const requiresValue = this.requiresEditor.getValue();
			result.requires = this.flattenRequires(requiresValue);
		} else {
			result.requires = Array.isArray(this.initialData.requires) ?
				this.initialData.requires : [];
		}

		// Optional fields
		const devNote = this.devNoteInput.value.trim();
		if (devNote) result.devNote = devNote;

		// Entrance/Exit conditions - only add if not null
		if (this._conditionEditorsReady) {
			if (this.entranceConditionEditor) {
				const entranceCondition = this.entranceConditionEditor.getValue();
				if (entranceCondition && Object.keys(entranceCondition).length > 0) {
					result.entranceCondition = entranceCondition;
				}
			}

			if (this.exitConditionEditor) {
				const exitCondition = this.exitConditionEditor.getValue();
				if (exitCondition && Object.keys(exitCondition).length > 0) {
					result.exitCondition = exitCondition;
				}
			}
		}

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

		const cleaned = cleanObject(result);

		// Requires, entranceCondition, and exitCondition must be retained
		if (!Array.isArray(cleaned.requires)) {
			cleaned.requires = [];
		}
		if (result.entranceCondition != null) {
			cleaned.entranceCondition = result.entranceCondition;
		}
		if (result.exitCondition != null) {
			cleaned.exitCondition = result.exitCondition;
		}

		return cleaned;
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

		// Clean up entrance/exit/requires editors properly
		if (this.entranceConditionEditor && this.entranceConditionEditor.remove) {
			this.entranceConditionEditor.remove();
		}
		if (this.exitConditionEditor && this.exitConditionEditor.remove) {
			this.exitConditionEditor.remove();
		}
		if (this.requiresEditor && this.requiresEditor.remove) {
			this.requiresEditor.remove();
		}

		super.remove();
	}
}