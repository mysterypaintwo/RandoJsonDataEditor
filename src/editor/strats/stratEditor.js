/* =============================================================================
   Strat Editor
   
   Editor for room strategies. Handles conditions, obstacle interactions,
   door unlocking, and real-time title updates.
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
			gModeRegainMobility: normalizeBooleanField(data, 'gModeRegainMobility'),
			bypassesDoorShell: normalizeBooleanField(data, 'bypassesDoorShell'),
			unlocksDoors: normalizeArrayField(data, 'unlocksDoors'),
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
		// Condition sections
		this.conditionEditors = {
			entrance: this.createConditionSection('Entrance Condition', this.initialData.entranceCondition),
			requires: this.createConditionSection('Requirements', this.initialData.requires),
			exit: this.createConditionSection('Exit Condition', this.initialData.exitCondition)
		};
		// Obstacle tables
		this.clearsObstaclesList = this.createObstacleCheckboxList(this.initialData.clearsObstacles, 'Clears Obstacles');
		this.resetsObstaclesList = this.createObstacleCheckboxList(this.initialData.resetsObstacles, 'Resets Obstacles');
		// Boolean checkboxes
		this.comesThroughToilet = createCheckbox('Toilet comes between this room and the other room (If this strat involves a door)', this.initialData.comesThroughToilet);
		this.gModeRegainMobility = createCheckbox('Allows regaining mobility when entering with G-mode immobile', this.initialData.gModeRegainMobility);
		this.bypassesDoorShell = createCheckbox('Allows exiting without opening the door', this.initialData.bypassesDoorShell);
		const boolCheckboxes = [
			this.comesThroughToilet,
			this.gModeRegainMobility,
			this.bypassesDoorShell
		];
		const boolGrid = createCheckboxGrid(boolCheckboxes);
		// Doors unlocking
		this.unlocksEditor = this.createUnlocksDoorsEditor(this.initialData.unlocksDoors);
		const content = createDiv([
			this.nameInput,
			this.devNoteInput,
			...Object.values(this.conditionEditors),
			'hr',
			createLabel('Clears Obstacles:', this.clearsObstaclesList),
			createLabel('Resets Obstacles:', this.resetsObstaclesList),
			'hr',
			boolGrid,
			'hr',
			this.unlocksEditor,
			this.createRemoveButton('Remove Strat')
		]);
		this.contentArea.appendChild(content);
	}
	setupTitleUpdates() {
		this.nameInput.addEventListener('input', () => {
			this.updateTitle(this.nameInput.value.trim());
		});
	}
	getTitleFromData() {
		return this.nameInput?.value?.trim() || '';
	}
	createConditionSection(title, initialCondition) {
		const container = createDiv([]);
		const label = createLabel(`${title}:`, null);
		container.appendChild(label);
		const conditionDiv = createDiv([]);
		const conditionEditor = makeConditionEditor(conditionDiv, initialCondition, 0, true);
		container.appendChild(conditionDiv);
		container.getValue = () => conditionEditor.getValue();
		return container;
	}
	createObstacleCheckboxList(initialSelectedIds, title) {
		const container = document.createElement('div');
		container.className = 'obstacle-checkbox-container';
		// Track selection by UID to survive renumbering
		const selectedUIDs = new Set();
		// Map initial IDs to UIDs using current snapshot
		ObstacleEditor.getObstacleSnapshot()
			.filter(o => initialSelectedIds.map(String).includes(String(o.id)))
			.forEach(o => selectedUIDs.add(o.uid));
		const toggleBtn = document.createElement('button');
		toggleBtn.className = 'node-toggle-btn';
		toggleBtn.textContent = '▼ Hide Unchecked Obstacles';
		toggleBtn.dataset.hidden = 'false';
		container.appendChild(toggleBtn);
		const listWrapper = document.createElement('div');
		listWrapper.className = 'node-list-wrapper';
		container.appendChild(listWrapper);
		const searchInput = createInput('text', 'Filter obstacles (id/name)…');
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

		function buildRows(snapshot) {
			tbody.innerHTML = '';
			if (!snapshot.length) {
				const emptyRow = document.createElement('tr');
				const emptyCell = document.createElement('td');
				emptyCell.colSpan = 3;
				emptyCell.textContent = '(no obstacles in this room)';
				emptyCell.style.fontStyle = 'italic';
				emptyRow.appendChild(emptyCell);
				tbody.appendChild(emptyRow);
				updateTableVisibility();
				return;
			}
			snapshot.forEach(obs => {
				const row = document.createElement('tr');
				row.className = 'obstacle-row';
				const chkCell = document.createElement('td');
				chkCell.style.textAlign = 'center';
				const chk = document.createElement('input');
				chk.type = 'checkbox';
				chk.checked = selectedUIDs.has(obs.uid);
				chk.dataset.uid = obs.uid;
				chkCell.appendChild(chk);
				const idCell = document.createElement('td');
				idCell.textContent = obs.id ?? '';
				const nameCell = document.createElement('td');
				nameCell.textContent = obs.name || `(Obstacle ${obs.id ?? ''})`;
				row.appendChild(chkCell);
				row.appendChild(idCell);
				row.appendChild(nameCell);
				tbody.appendChild(row);
				chk.addEventListener('change', () => {
					if (chk.checked) selectedUIDs.add(obs.uid);
					else selectedUIDs.delete(obs.uid);
					updateRowVisibility();
					updateTableVisibility();
				});
			});
			updateRowVisibility();
			updateTableVisibility();
		}

		function updateRowVisibility() {
			const hideUnchecked = toggleBtn.dataset.hidden === 'true';
			const filter = (searchInput.value || '').toLowerCase();
			const rows = tbody.querySelectorAll('tr.obstacle-row');
			if (!rows.length) {
				listWrapper.style.display = 'none';
				return;
			} else {
				listWrapper.style.display = '';
			}
			let anyVisible = false;
			rows.forEach(row => {
				const checkbox = row.querySelector('input[type="checkbox"]');
				const idTxt = row.children[1]?.textContent?.toLowerCase() || '';
				const nameTxt = row.children[2]?.textContent?.toLowerCase() || '';
				const matchesFilter = !filter || idTxt.includes(filter) || nameTxt.includes(filter);
				const passesToggle = !hideUnchecked || (checkbox && checkbox.checked);
				row.style.display = matchesFilter && passesToggle ? '' : 'none';
				if (row.style.display !== 'none') anyVisible = true;
			});
			let placeholder = tbody.querySelector('.no-match-row');
			if (rows.length && !anyVisible) {
				if (!placeholder) {
					placeholder = document.createElement('tr');
					placeholder.className = 'no-match-row';
					const td = document.createElement('td');
					td.colSpan = 3;
					td.style.fontStyle = 'italic';
					td.textContent = '(no obstacles match filter)';
					placeholder.appendChild(td);
					tbody.appendChild(placeholder);
				}
				placeholder.style.display = '';
			} else if (placeholder) {
				placeholder.style.display = 'none';
			}
			searchInput.style.display = rows.length > 0 ? '' : 'none';
		}

		function updateTableVisibility() {
			const hideUnchecked = toggleBtn.dataset.hidden === 'true';
			const anyChecked = selectedUIDs.size > 0;
			if (hideUnchecked && !anyChecked) {
				tbody.style.display = 'none';
			} else {
				tbody.style.display = '';
			}
			searchInput.style.display = '';
		}
		searchInput.addEventListener('input', () => {
			updateRowVisibility();
			updateTableVisibility();
		});
		toggleBtn.addEventListener('click', () => {
			const hidden = toggleBtn.dataset.hidden === 'true';
			toggleBtn.dataset.hidden = hidden ? 'false' : 'true';
			toggleBtn.textContent = hidden ? '▼ Hide Unchecked Obstacles' : '▶ Show All Obstacles';
			updateRowVisibility();
			updateTableVisibility();
		});
		// Subscribe to obstacle changes
		const unsubscribe = ObstacleEditor.onObstaclesChanged(buildRows);
		// Expose method to get selected IDs
		container.getSelectedIds = () => {
			const snap = ObstacleEditor.getObstacleSnapshot();
			const byUid = new Map(snap.map(o => [o.uid, o.id]));
			return Array.from(selectedUIDs)
				.map(uid => byUid.get(uid))
				.filter(id => id != null)
				.map(String);
		};
		container._destroy = () => unsubscribe();
		return container;
	}
	createUnlocksDoorsEditor(initialDoors) {
		const card = document.createElement('div');
		card.className = 'editor-card unlocks-doors-card';
		const header = document.createElement('div');
		header.className = 'editor-card-header';
		header.textContent = '🔑 Doors unlocked by this Strat';
		card.appendChild(header);
		const itemsContainer = createDiv([], 'door-entries');

		function addDoorEntry(entry = null) {
			const entryDiv = createDiv([], 'door-entry');
			const typesSelect = createSelect([{
					value: 'super',
					text: 'Super Missiles'
				},
				{
					value: 'missiles',
					text: 'Missiles'
				},
				{
					value: 'powerbomb',
					text: 'Power Bombs'
				},
				{
					value: 'ammo',
					text: 'Ammo'
				}
			], entry?.types || [], true);
			const requiresSelect = createSelect([{
					value: 'never',
					text: 'Never'
				},
				{
					value: 'canPrepareForNextRoom',
					text: 'Can Prepare for Next Room'
				},
				{
					value: 'SpaceJump',
					text: 'Space Jump'
				},
				{
					value: 'canWalljump',
					text: 'Can Walljump'
				}
			], entry?.requires || [], true);
			const removeBtn = createRemoveButton('Remove Door Unlock', () => entryDiv.remove());
			entryDiv.appendChild(typesSelect);
			entryDiv.appendChild(requiresSelect);
			entryDiv.appendChild(removeBtn);
			itemsContainer.appendChild(entryDiv);
		}
		// Add existing doors
		(initialDoors || []).forEach(door => addDoorEntry(door));
		const addBtn = document.createElement('button');
		addBtn.textContent = '+ Add Door Unlock';
		addBtn.className = 'add-btn';
		addBtn.addEventListener('click', () => addDoorEntry());
		const content = createDiv([itemsContainer, addBtn]);
		card.appendChild(content);
		card.getValue = () => {
			return Array.from(itemsContainer.children).map(entryDiv => {
				const selects = entryDiv.querySelectorAll('select');
				if (selects.length < 2) return null;
				const types = Array.from(selects[0].selectedOptions).map(opt => opt.value);
				const requires = Array.from(selects[1].selectedOptions).map(opt => opt.value);
				return types.length > 0 ? {
					types,
					requires
				} : null;
			}).filter(Boolean);
		};
		return card;
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
			gModeRegainMobility: this.gModeRegainMobility.getValue(),
			bypassesDoorShell: this.bypassesDoorShell.getValue(),
			unlocksDoors: this.unlocksEditor.getValue()
		};
	}
}