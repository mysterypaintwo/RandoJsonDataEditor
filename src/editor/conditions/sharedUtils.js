/* =============================================================================
   Shared Utilities - Common functions used across all editors
   
   Contains reusable components and utilities for creating UI elements,
   handling data, and managing shared state across editors.
   ============================================================================= */

// =============================================================================
// Data Source Management
// =============================================================================

/**
 * Global data sources - updated by main controller and used by all editors
 */
window.EditorGlobals = {
	itemList: [],
	eventList: [],
	weaponList: [],
	techMap: new Map(),
	helperMap: new Map(),
	enemyList: [],
	validRoomNodes: [],

	updateAll(itemList, eventList, weaponList, techMap, helperMap, enemyList, validRoomNodes) {
		this.itemList = itemList || [];
		this.eventList = eventList || [];
		this.weaponList = weaponList || [];
		this.techMap = techMap || new Map();
		this.helperMap = helperMap || new Map();
		this.enemyList = enemyList || [];
		this.validRoomNodes = validRoomNodes || [];

		// Notify all listeners
		this.notifyListeners();
	},

	listeners: new Set(),

	addListener(callback) {
		this.listeners.add(callback);
		return () => this.listeners.delete(callback);
	},

	notifyListeners() {
		this.listeners.forEach(callback => {
			try {
				callback(this);
			} catch (e) {
				console.error('Error in EditorGlobals listener:', e);
			}
		});
	}
};

// =============================================================================
// Node and Obstacle Management
// =============================================================================

/**
 * Creates a node checkbox list with filtering and toggle capabilities
 */
function createNodeCheckboxList(selectedNodes, title, maxSelected = Infinity, filterBy = "All") {
	const container = document.createElement('div');
	container.className = 'node-checkbox-container';

	const toggleBtn = document.createElement('button');
	toggleBtn.className = 'node-toggle-btn';
	toggleBtn.textContent = '▼ Hide Unchecked Nodes';
	container.appendChild(toggleBtn);

	const listWrapper = document.createElement('div');
	listWrapper.className = 'node-list-wrapper';
	container.appendChild(listWrapper);

	const searchInput = document.createElement('input');
	searchInput.type = 'text';
	searchInput.placeholder = 'Filter nodes...';
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

	function buildTable() {
		tbody.innerHTML = '';

		if (!window.EditorGlobals.validRoomNodes || !window.EditorGlobals.validRoomNodes.length) {
			const emptyRow = document.createElement('tr');
			const emptyCell = document.createElement('td');
			emptyCell.colSpan = 3;
			emptyCell.textContent = '(no nodes available)';
			emptyCell.style.fontStyle = 'italic';
			emptyRow.appendChild(emptyCell);
			tbody.appendChild(emptyRow);

			container.getSelectedValues = () => [];
			return;
		}

		const selectedSet = new Set(selectedNodes.map(String));
		const checkboxes = [];

		window.EditorGlobals.validRoomNodes.forEach(node => {
			// Skip nodes that don't match filter
			if (filterBy !== "All" && node.nodeType !== filterBy) {
				return;
			}

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

	// Rebuild when nodes change
	const unsubscribe = window.EditorGlobals.addListener(() => {
		buildTable();
	});

	// Store cleanup function
	container._destroy = unsubscribe;

	return container;
}

/**
 * Creates an obstacle checkbox list with dynamic updates
 */
function createObstacleCheckboxList(selectedObstacles, title) {
	const container = document.createElement('div');
	container.className = 'obstacle-checkbox-container';

	// Track selection by UID to survive renumbering
	const selectedUIDs = new Set();

	// Map initial IDs to UIDs using current snapshot
	if (typeof ObstacleEditor !== 'undefined') {
		ObstacleEditor.getObstacleSnapshot()
			.filter(o => selectedObstacles.map(String).includes(String(o.id)))
			.forEach(o => selectedUIDs.add(o.uid));
	}

	const toggleBtn = document.createElement('button');
	toggleBtn.className = 'node-toggle-btn';
	toggleBtn.textContent = '▼ Hide Unchecked Obstacles';
	toggleBtn.dataset.hidden = 'false';
	container.appendChild(toggleBtn);

	const listWrapper = document.createElement('div');
	listWrapper.className = 'node-list-wrapper';
	container.appendChild(listWrapper);

	const searchInput = document.createElement('input');
	searchInput.type = 'text';
	searchInput.placeholder = 'Filter obstacles (id/name)…';
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

	// Subscribe to obstacle changes if ObstacleEditor exists
	let obstacleUnsubscribe = null;
	if (typeof ObstacleEditor !== 'undefined') {
		obstacleUnsubscribe = ObstacleEditor.onObstaclesChanged(buildRows);
	}

	// Initial build
	if (typeof ObstacleEditor !== 'undefined') {
		buildRows(ObstacleEditor.getObstacleSnapshot());
	}

	// Store cleanup function
	container._destroy = () => {
		if (obstacleUnsubscribe) obstacleUnsubscribe();
	};

	// Expose method to get selected IDs
	container.getSelectedIds = () => {
		if (typeof ObstacleEditor === 'undefined') return [];
		const snap = ObstacleEditor.getObstacleSnapshot();
		const byUid = new Map(snap.map(o => [o.uid, o.id]));
		return Array.from(selectedUIDs)
			.map(uid => byUid.get(uid))
			.filter(id => id != null)
			.map(String);
	};

	return container;
}

// =============================================================================
// Tech/Helper Map Checkbox Lists
// =============================================================================

/**
 * Creates a checkbox list for tech/helper maps with search and filtering
 */
function createMapCheckboxList(map, label, initialSelected = []) {
	const container = document.createElement('div');
	container.className = 'checkbox-map-container';

	// Add type-specific class for CSS hover
	container.classList.add(label.toLowerCase()); // 'tech' or 'helper'

	const initialSet = new Set((initialSelected || []).map(x => String(x)));

	const collapseButton = document.createElement('button');
	collapseButton.textContent = 'Hide List ▼';
	collapseButton.style.marginBottom = '6px';
	collapseButton.style.padding = '2px 6px';
	collapseButton.style.fontSize = '12px';
	collapseButton.style.cursor = 'pointer';
	container.appendChild(collapseButton);

	const searchInput = document.createElement('input');
	searchInput.type = 'text';
	searchInput.placeholder = `Filter ${label}...`;
	searchInput.style.marginBottom = '6px';
	container.appendChild(searchInput);

	const table = document.createElement('table');
	table.style.width = '100%';
	table.style.borderCollapse = 'collapse';
	container.appendChild(table);
	const tbody = document.createElement('tbody');
	table.appendChild(tbody);

	const checkboxes = [];

	function renderItemRow(item, depth = 0) {
		const row = document.createElement('tr');

		// Checkbox cell
		const cbCell = document.createElement('td');
		cbCell.style.width = '40px';
		cbCell.style.textAlign = 'center';
		cbCell.style.cursor = 'pointer'; // entire cell clickable

		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.style.width = '20px';
		checkbox.style.height = '20px';
		checkbox.style.margin = '0';

		const itemIdStr = item.id !== undefined && item.id !== null ? String(item.id) : null;
		const isChecked = (itemIdStr && initialSet.has(itemIdStr)) || initialSet.has(String(item.name));
		checkbox.checked = !!isChecked;

		cbCell.appendChild(checkbox);
		row.appendChild(cbCell);

		// Name cell
		const nameCell = document.createElement('td');
		nameCell.style.cursor = 'pointer';
		nameCell.style.borderRight = '1px solid #ccc'; // vertical line to devNote
		nameCell.style.textAlign = 'left';

		let displayLabel = item.name;
		if (item.extensionTech) displayLabel += ' [Ext]';
		nameCell.textContent = displayLabel;
		row.appendChild(nameCell);

		// Note/devNote cell
		const noteCell = document.createElement('td');
		noteCell.textContent = Array.isArray(item.devNote) ?
			item.devNote.join(' ') :
			item.devNote || item.note || '';
		row.appendChild(noteCell);

		tbody.appendChild(row);

		checkboxes.push({
			checkbox,
			item
		});

		// Make entire first two cells clickable to toggle checkbox
		[cbCell, nameCell].forEach(cell => {
			cell.addEventListener('click', () => {
				checkbox.checked = !checkbox.checked;
			});
		});

		(item.extensionTechs || []).forEach(ext => renderItemRow(ext, depth + 1));
	}

	for (const [categoryName, catObj] of map.entries()) {
		const catRow = document.createElement('tr');
		const catCell = document.createElement('td');
		catCell.colSpan = 3;
		catCell.textContent = categoryName;
		catCell.style.fontWeight = 'bold';
		catCell.style.borderBottom = '2px solid #bbb';
		catRow.appendChild(catCell);
		tbody.appendChild(catRow);

		(catObj.items || []).forEach(item => renderItemRow(item));
	}

	searchInput.addEventListener('input', () => {
		const filter = searchInput.value.toLowerCase();
		tbody.querySelectorAll('tr').forEach(row => {
			const nameCell = row.querySelector('td:nth-child(2)');
			const noteCell = row.querySelector('td:nth-child(3)');
			if (!nameCell) return;
			const textToCheck = nameCell.textContent + ' ' + (noteCell ? noteCell.textContent : '');
			row.style.display = textToCheck.toLowerCase().includes(filter) ? '' : 'none';
		});
	});

	collapseButton.addEventListener('click', () => {
		const isHidden = table.style.display === 'none';
		table.style.display = isHidden ? '' : 'none';
		searchInput.style.display = isHidden ? '' : 'none';
		collapseButton.textContent = isHidden ? 'Hide List ▼' : 'Show List ▶';
	});

	container.getSelectedValues = () => {
		return checkboxes.filter(cb => cb.checkbox.checked).map(cb => cb.item.name);
	};

	return container;
}

// =============================================================================
// UI Element Creation Helpers
// =============================================================================

/**
 * Creates a collapsible container with toggle functionality
 */
function createCollapsibleContainer(title, content, isCollapsed = false) {
	const container = document.createElement('div');
	container.className = 'collapsible-container';

	const header = document.createElement('div');
	header.className = 'collapsible-header';
	header.style.cursor = 'pointer';
	header.style.display = 'flex';
	header.style.alignItems = 'center';
	header.style.gap = '8px';

	const toggleBtn = document.createElement('span');
	toggleBtn.textContent = isCollapsed ? '▶' : '▼';
	toggleBtn.style.fontSize = '12px';

	const titleSpan = document.createElement('span');
	titleSpan.textContent = title;
	titleSpan.style.fontWeight = 'bold';

	header.appendChild(toggleBtn);
	header.appendChild(titleSpan);

	const contentDiv = document.createElement('div');
	contentDiv.className = 'collapsible-content';
	contentDiv.style.display = isCollapsed ? 'none' : 'block';
	contentDiv.appendChild(content);

	header.addEventListener('click', () => {
		const isHidden = contentDiv.style.display === 'none';
		contentDiv.style.display = isHidden ? 'block' : 'none';
		toggleBtn.textContent = isHidden ? '▼' : '▶';
	});

	container.appendChild(header);
	container.appendChild(contentDiv);

	return container;
}

/**
 * Creates a resource entry editor (type + count inputs)
 */
function createResourceEntry(initialType = '', initialCount = 0, resourceTypes = RESOURCE_TYPES) {
	const entry = document.createElement('div');
	entry.style.display = 'flex';
	entry.style.gap = '8px';
	entry.style.marginBottom = '4px';

	const typeSelect = document.createElement('select');
	resourceTypes.forEach(rt => {
		const option = document.createElement('option');
		option.value = rt;
		option.textContent = rt;
		typeSelect.appendChild(option);
	});

	const countInput = document.createElement('input');
	countInput.type = 'number';
	countInput.min = '0';
	countInput.placeholder = 'Count';

	const removeBtn = document.createElement('button');
	removeBtn.textContent = '×';
	removeBtn.style.background = '#ff6b6b';
	removeBtn.style.color = 'white';
	removeBtn.style.border = 'none';
	removeBtn.style.borderRadius = '3px';
	removeBtn.style.cursor = 'pointer';
	removeBtn.onclick = () => entry.remove();

	if (initialType) typeSelect.value = initialType;
	if (initialCount) countInput.value = initialCount;

	entry.appendChild(typeSelect);
	entry.appendChild(countInput);
	entry.appendChild(removeBtn);

	entry.getValue = () => {
		const type = typeSelect.value;
		const count = parseInt(countInput.value);
		return (type && count >= 0) ? {
			type,
			count
		} : null;
	};

	return entry;
}

/**
 * Creates a dynamic list container with add/remove functionality and proper pluralization
 */
function createDynamicList(title, createItemFn, initialItems = []) {
	const container = document.createElement('div');
	container.className = 'dynamic-list';

	const titleDiv = document.createElement('div');
	titleDiv.textContent = title;
	titleDiv.style.fontWeight = 'bold';
	titleDiv.style.marginBottom = '8px';
	container.appendChild(titleDiv);

	const itemsContainer = document.createElement('div');
	container.appendChild(itemsContainer);

	const addBtn = document.createElement('button');
	// Handle proper pluralization
	const singularForm = getSingularForm(title);
	addBtn.textContent = `+ Add ${singularForm}`;
	addBtn.className = 'add-btn';
	addBtn.style.marginTop = '8px';
	container.appendChild(addBtn);

	function addItem(initialData) {
		const item = createItemFn(initialData);
		itemsContainer.appendChild(item);
		return item;
	}

	addBtn.onclick = () => addItem();

	// Add initial items
	initialItems.forEach(item => addItem(item));

	container.getValue = () => {
		return Array.from(itemsContainer.children)
			.map(child => child.getValue ? child.getValue() : null)
			.filter(value => value !== null);
	};

	container.addItem = addItem;

	return container;
}

/**
 * Helper function to get singular form for proper button labeling
 */
function getSingularForm(title) {
	// Extract the main word from titles like "Resource Entries" -> "Resource Entry"
	const words = title.split(' ');
	const lastWord = words[words.length - 1].toLowerCase();

	// Handle common plurals
	const pluralMap = {
		'entries': 'Entry',
		'enemies': 'Enemy',
		'weapons': 'Weapon',
		'drops': 'Drop',
		'resources': 'Resource',
		'items': 'Item',
		'flags': 'Flag'
	};

	if (pluralMap[lastWord]) {
		words[words.length - 1] = pluralMap[lastWord];
		return words.join(' ');
	}

	// Default fallback - remove 's' if it ends with 's'
	if (lastWord.endsWith('s')) {
		words[words.length - 1] = lastWord.slice(0, -1);
		return words.join(' ');
	}

	return title;
}

/**
 * Get current enemy groups from EnemyEditor instances
 */
function getCurrentEnemyGroups() {
	const enemyGroups = [];

	// Find all enemy cards in the enemies container
	const enemiesContainer = document.getElementById('enemiesContainer');
	if (enemiesContainer) {
		const enemyCards = enemiesContainer.querySelectorAll('.enemy-card');
		enemyCards.forEach(card => {
			const groupNameInput = card.querySelector('input[placeholder*="Group Name"]');
			const groupName = groupNameInput?.value?.trim();
			const assignedId = card._assignedId;

			if (groupName && assignedId) {
				enemyGroups.push({
					id: assignedId,
					name: groupName,
					displayName: `${groupName} (ID: ${assignedId})`
				});
			}
		});
	}

	return enemyGroups;
}

/**
 * Creates a unified checkbox list component with clickable text labels
 */
function createUnifiedCheckboxList(items, title, selectedItems = [], options = {}) {
	const {
		maxSelected = Infinity,
			filterBy = null,
			displayProperty = 'name',
			valueProperty = 'id',
			showToggleButton = true,
			columns = ['Enabled', 'Name']
	} = options;

	const container = document.createElement('div');
	container.className = 'unified-checkbox-container';

	let toggleBtn;
	if (showToggleButton) {
		toggleBtn = document.createElement('button');
		toggleBtn.className = 'checkbox-toggle-btn';
		toggleBtn.textContent = `▼ Hide Unchecked ${title}`;
		toggleBtn.dataset.hidden = 'false';
		container.appendChild(toggleBtn);
	}

	const listWrapper = document.createElement('div');
	listWrapper.className = 'checkbox-list-wrapper';
	container.appendChild(listWrapper);

	const searchInput = document.createElement('input');
	searchInput.type = 'text';
	searchInput.placeholder = `Filter ${title.toLowerCase()}...`;
	searchInput.className = 'checkbox-search-input';
	listWrapper.appendChild(searchInput);

	const table = document.createElement('table');
	table.className = 'checkbox-table';
	listWrapper.appendChild(table);

	const thead = document.createElement('thead');
	const headerRow = document.createElement('tr');
	columns.forEach(text => {
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

		if (!items.length) {
			const emptyRow = document.createElement('tr');
			const emptyCell = document.createElement('td');
			emptyCell.colSpan = columns.length;
			emptyCell.textContent = `(no ${title.toLowerCase()} available)`;
			emptyCell.style.fontStyle = 'italic';
			emptyRow.appendChild(emptyCell);
			tbody.appendChild(emptyRow);

			container.getSelectedValues = () => [];
			return;
		}

		const selectedSet = new Set(selectedItems.map(String));
		const checkboxes = [];

		items.forEach(item => {
			// Apply filter if specified
			if (filterBy && item.nodeType && item.nodeType !== filterBy) {
				return;
			}

			const row = document.createElement('tr');
			row.className = 'checkbox-row';

			const checkboxCell = document.createElement('td');
			checkboxCell.style.textAlign = 'center';
			checkboxCell.style.cursor = 'pointer';

			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';

			const itemValue = typeof item === 'string' ? item : (item[valueProperty] || item[displayProperty]);
			checkbox.checked = selectedSet.has(String(itemValue));
			checkboxCell.appendChild(checkbox);

			const nameCell = document.createElement('td');
			nameCell.style.cursor = 'pointer';
			const displayText = typeof item === 'string' ? item : (item.displayName || item[displayProperty] || itemValue);
			nameCell.textContent = displayText;

			// Make cells clickable
			[checkboxCell, nameCell].forEach(cell => {
				cell.addEventListener('click', () => {
					checkbox.checked = !checkbox.checked;
					updateRowVisibility();
					enforceMaxSelected();
				});
			});

			row.appendChild(checkboxCell);
			row.appendChild(nameCell);
			tbody.appendChild(row);

			checkboxes.push({
				checkbox,
				item,
				value: itemValue
			});

			checkbox.addEventListener('change', () => {
				updateRowVisibility();
				enforceMaxSelected();
			});
		});

		function enforceMaxSelected() {
			const checkedCount = checkboxes.filter(cb => cb.checkbox.checked).length;
			checkboxes.forEach(cb => {
				if (!cb.checkbox.checked) {
					cb.checkbox.disabled = checkedCount >= maxSelected;
					cb.checkbox.parentElement.style.opacity = cb.checkbox.disabled ? '0.5' : '1';
				}
			});
		}

		function updateRowVisibility() {
			let anyVisible = false;
			tbody.querySelectorAll('tr.checkbox-row').forEach(row => {
				const checkbox = row.querySelector('input[type="checkbox"]');
				const hideUnchecked = toggleBtn && toggleBtn.dataset.hidden === 'true';

				if (hideUnchecked && !checkbox.checked) {
					row.style.display = 'none';
				} else {
					row.style.display = '';
					anyVisible = true;
				}
			});

			table.style.display = anyVisible ? 'table' : 'none';
			if (searchInput) {
				searchInput.style.display = anyVisible ? '' : 'none';
			}
		}

		searchInput.addEventListener('input', () => {
			const filter = searchInput.value.toLowerCase();
			tbody.querySelectorAll('tr.checkbox-row').forEach(row => {
				const nameCell = row.querySelector('td:nth-child(2)');
				if (!nameCell) return;
				row.style.display = nameCell.textContent.toLowerCase().includes(filter) ? '' : 'none';
			});
		});

		if (toggleBtn) {
			toggleBtn.addEventListener('click', () => {
				const currentlyHidden = toggleBtn.dataset.hidden === 'true';
				toggleBtn.dataset.hidden = currentlyHidden ? 'false' : 'true';
				toggleBtn.textContent = currentlyHidden ? `▼ Hide Unchecked ${title}` : `▶ Show All ${title}`;
				updateRowVisibility();
			});
		}

		updateRowVisibility();
		enforceMaxSelected();

		container.getSelectedValues = () => {
			return checkboxes
				.filter(cb => cb.checkbox.checked)
				.map(cb => cb.value);
		};
	}

	// Build initial table
	buildTable();

	// Store rebuild function for dynamic updates
	container._rebuild = buildTable;

	return container;
}