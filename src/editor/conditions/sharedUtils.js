/* =============================================================================
   Shared Utilities - Common functions used across all editors
   
   Contains reusable components and utilities for creating UI elements,
   handling data, and managing shared state across editors.
   ============================================================================= */

// =============================================================================
// Validation Utilities
// =============================================================================

const ValidationUtils = {
    // Validate hex pattern for extra run speed
    validateHexSpeed(value) {
        if (!value || value.trim() === '') return { valid: true };
        const pattern = /^\$[0-9A-F]\.[0-9A-F]+$/;
        if (!pattern.test(value)) {
            return {
                valid: false,
                message: 'Must match pattern $X.Y (e.g., $4.0, $F.8) where X and Y are hex digits 0-9 or A-F'
            };
        }
        return { valid: true };
    },

    // Validate number range
    validateNumber(value, min, max, label) {
        if (value === '' || value === null || value === undefined) {
            return { valid: true };
        }
        const num = parseFloat(value);
        if (isNaN(num)) {
            return { valid: false, message: `${label} must be a number` };
        }
        if (min !== undefined && num < min) {
            return { valid: false, message: `${label} must be at least ${min}` };
        }
        if (max !== undefined && num > max) {
            return { valid: false, message: `${label} must be at most ${max}` };
        }
        return { valid: true };
    },

    // Show inline error
    showFieldError(input, message) {
        // Remove existing error
        const existing = input.parentElement.querySelector('.field-error');
        if (existing) existing.remove();

        if (!message) return;

        const error = document.createElement('div');
        error.className = 'field-error';
        error.textContent = message;
        error.style.color = '#e74c3c';
        error.style.fontSize = '11px';
        error.style.marginTop = '4px';
        error.style.fontWeight = '600';
        input.parentElement.appendChild(error);
        input.style.borderColor = '#e74c3c';
    },

    clearFieldError(input) {
        const existing = input.parentElement.querySelector('.field-error');
        if (existing) existing.remove();
        input.style.borderColor = '';
    }
};

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

	const checkboxContainer = document.createElement('div');
	checkboxContainer.className = 'improved-checkbox-container';
	listWrapper.appendChild(checkboxContainer);

	let checkboxes = [];
	let eventListenersAdded = false;

	function buildTable() {
		checkboxContainer.innerHTML = '';
		checkboxes = [];

		if (!window.EditorGlobals.validRoomNodes || !window.EditorGlobals.validRoomNodes.length) {
			const emptyDiv = document.createElement('div');
			emptyDiv.textContent = '(no nodes available)';
			emptyDiv.style.fontStyle = 'italic';
			emptyDiv.style.textAlign = 'center';
			emptyDiv.style.padding = '12px';
			emptyDiv.style.color = '#666';
			checkboxContainer.appendChild(emptyDiv);

			container.getSelectedValues = () => [];
			return;
		}

		const selectedSet = new Set(selectedNodes.map(String));

		window.EditorGlobals.validRoomNodes.forEach(node => {
			// Skip nodes that don't match filter
			if (filterBy !== "All" && node.nodeType !== filterBy) {
				return;
			}

			const row = document.createElement('div');
			row.className = 'improved-checkbox-row';

			const checkboxCell = document.createElement('div');
			checkboxCell.className = 'improved-checkbox-cell';
			
			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.className = 'improved-checkbox-input';
			checkbox.checked = selectedSet.has(String(node.id));
			checkbox.dataset.nodeId = node.id;
			checkboxCell.appendChild(checkbox);

			const labelCell = document.createElement('div');
			labelCell.className = 'improved-checkbox-label';
			labelCell.textContent = `${node.id}: ${node.name}`;

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
				enforceMaxSelected();
				enforceMutualExclusion();
			});
		});

		function enforceMaxSelected() {
			const checkedCount = checkboxes.filter(cb => cb.checked).length;
			checkboxes.forEach(cb => {
				if (!cb.checked) {
					cb.disabled = checkedCount >= maxSelected;
					const row = cb.closest('.improved-checkbox-row');
					if (row) {
						row.style.opacity = cb.disabled ? '0.5' : '1';
						row.style.cursor = cb.disabled ? 'not-allowed' : 'pointer';
					}
				}
			});
		}

		function enforceMutualExclusion() {
			// If we have a mutual exclusion list, check if this list has selections
			if (container._mutualExclusionList) {
				const thisHasSelections = checkboxes.some(cb => cb.checked);
				
				// Grey out the mutual exclusion list if this list has selections
				if (container._mutualExclusionList.setDisabled) {
					container._mutualExclusionList.setDisabled(thisHasSelections);
				}
			}
		}

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
				toggleBtn.textContent = currentlyHidden ? '▼ Hide Unchecked Nodes' : '▶ Show All Nodes';
				updateRowVisibility();
			});

			eventListenersAdded = true;
		}

		toggleBtn.dataset.hidden = 'false';
		updateRowVisibility();
		enforceMaxSelected();
		enforceMutualExclusion();

		container.getSelectedValues = () => {
			return checkboxes
				.filter(cb => cb.checked)
				.map(cb => cb.dataset.nodeId);
		};
		
		// Method to disable/enable all checkboxes
		container.setDisabled = (disabled) => {
			checkboxes.forEach(cb => {
				if (!cb.checked) {
					cb.disabled = disabled;
					const row = cb.closest('.improved-checkbox-row');
					if (row) {
						row.style.opacity = disabled ? '0.3' : '1';
						row.style.cursor = disabled ? 'not-allowed' : 'pointer';
					}
				}
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

	const checkboxContainer = document.createElement('div');
	checkboxContainer.className = 'improved-checkbox-container';
	listWrapper.appendChild(checkboxContainer);

	function buildRows(snapshot) {
		checkboxContainer.innerHTML = '';
		
		// Clean up selections for obstacles that no longer exist
		const currentUIDs = new Set(snapshot.map(obs => obs.uid));
		const toRemove = [...selectedUIDs].filter(uid => !currentUIDs.has(uid));
		toRemove.forEach(uid => selectedUIDs.delete(uid));
		
		if (!snapshot.length) {
			const emptyDiv = document.createElement('div');
			emptyDiv.textContent = '(no obstacles in this room)';
			emptyDiv.style.fontStyle = 'italic';
			emptyDiv.style.textAlign = 'center';
			emptyDiv.style.padding = '12px';
			emptyDiv.style.color = '#666';
			checkboxContainer.appendChild(emptyDiv);
			updateTableVisibility();
			return;
		}

		snapshot.forEach(obs => {
			const row = document.createElement('div');
			row.className = 'improved-checkbox-row obstacle-row';

			const checkboxCell = document.createElement('div');
			checkboxCell.className = 'improved-checkbox-cell';
			
			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.className = 'improved-checkbox-input';
			checkbox.checked = selectedUIDs.has(obs.uid);
			checkbox.dataset.uid = obs.uid;
			checkboxCell.appendChild(checkbox);

			const labelCell = document.createElement('div');
			labelCell.className = 'improved-checkbox-label';
			labelCell.textContent = `${obs.id || ''}: ${obs.name || `(Obstacle ${obs.id || ''})`}`;

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

			checkbox.addEventListener('change', () => {
				if (checkbox.checked) selectedUIDs.add(obs.uid);
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
		const rows = checkboxContainer.querySelectorAll('.obstacle-row');
		if (!rows.length) {
			listWrapper.style.display = 'none';
			return;
		} else {
			listWrapper.style.display = '';
		}

		let anyVisible = false;
		rows.forEach(row => {
			const checkbox = row.querySelector('input[type="checkbox"]');
			const labelText = row.querySelector('.improved-checkbox-label').textContent.toLowerCase();
			const matchesFilter = !filter || labelText.includes(filter);
			const passesToggle = !hideUnchecked || (checkbox && checkbox.checked);
			row.style.display = matchesFilter && passesToggle ? '' : 'none';
			if (row.style.display !== 'none') anyVisible = true;
		});

		let placeholder = checkboxContainer.querySelector('.no-match-placeholder');
		if (rows.length && !anyVisible) {
			if (!placeholder) {
				placeholder = document.createElement('div');
				placeholder.className = 'no-match-placeholder';
				placeholder.style.fontStyle = 'italic';
				placeholder.style.textAlign = 'center';
				placeholder.style.padding = '12px';
				placeholder.style.color = '#666';
				placeholder.textContent = '(no obstacles match filter)';
				checkboxContainer.appendChild(placeholder);
			}
			placeholder.style.display = '';
		} else if (placeholder) {
			placeholder.style.display = 'none';
		}
	}

	function updateTableVisibility() {
		const hideUnchecked = toggleBtn.dataset.hidden === 'true';
		const anyChecked = selectedUIDs.size > 0;
		if (hideUnchecked && !anyChecked) {
			checkboxContainer.style.display = 'none';
		} else {
			checkboxContainer.style.display = 'block';
		}
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

/**
 * Utility function to clean objects by removing empty/null/undefined fields
 */
function cleanObject(obj) {
	if (!obj || typeof obj !== 'object') return obj;
	
	const cleaned = {};
	Object.entries(obj).forEach(([key, value]) => {
		// Skip null, undefined, empty strings, and empty arrays
		if (value === null || value === undefined || value === '') return;
		if (Array.isArray(value) && value.length === 0) return;
		if (typeof value === 'object' && Object.keys(value).length === 0) return;
		
		// Recursively clean nested objects
		if (typeof value === 'object' && !Array.isArray(value)) {
			const cleanedNested = cleanObject(value);
			if (Object.keys(cleanedNested).length > 0) {
				cleaned[key] = cleanedNested;
			}
		} else {
			cleaned[key] = value;
		}
	});
	
	return cleaned;
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

    // Button container for all three buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '6px';
    buttonContainer.style.marginBottom = '6px';

    const collapseButton = document.createElement('button');
    collapseButton.textContent = 'Hide List ▼';
    collapseButton.style.padding = '4px 8px';
    collapseButton.style.fontSize = '12px';
    collapseButton.style.cursor = 'pointer';
    collapseButton.style.background = '#f8f9fa';
    collapseButton.style.border = '1px solid #dee2e6';
    collapseButton.style.borderRadius = '4px';
    collapseButton.style.flex = '1';

    const showCheckedButton = document.createElement('button');
    showCheckedButton.textContent = 'Hide Unchecked ▼';
    showCheckedButton.style.padding = '4px 8px';
    showCheckedButton.style.fontSize = '12px';
    showCheckedButton.style.cursor = 'pointer';
    showCheckedButton.style.background = '#f8f9fa';
    showCheckedButton.style.border = '1px solid #dee2e6';
    showCheckedButton.style.borderRadius = '4px';
    showCheckedButton.style.flex = '1';

    const showDescButton = document.createElement('button');
    showDescButton.textContent = 'Hide Descriptions ▼';
    showDescButton.style.padding = '4px 8px';
    showDescButton.style.fontSize = '12px';
    showDescButton.style.cursor = 'pointer';
    showDescButton.style.background = '#f8f9fa';
    showDescButton.style.border = '1px solid #dee2e6';
    showDescButton.style.borderRadius = '4px';
    showDescButton.style.flex = '1';

    buttonContainer.appendChild(collapseButton);
    buttonContainer.appendChild(showCheckedButton);
    buttonContainer.appendChild(showDescButton);
    container.appendChild(buttonContainer);

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = `Filter ${label}...`;
    searchInput.style.marginBottom = '6px';
    searchInput.style.padding = '6px 10px';
    searchInput.style.border = '1px solid #ccc';
    searchInput.style.borderRadius = '4px';
    searchInput.style.fontSize = '13px';
    searchInput.style.width = '100%';
    searchInput.style.boxSizing = 'border-box';
    container.appendChild(searchInput);

    const tableWrapper = document.createElement('div');
    tableWrapper.style.maxHeight = '400px';
    tableWrapper.style.overflowY = 'auto';
    tableWrapper.style.border = '1px solid #e0e0e0';
    tableWrapper.style.borderRadius = '6px';
    tableWrapper.style.background = 'rgba(255, 255, 255, 0.95)';
    container.appendChild(tableWrapper);

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '13px';
    tableWrapper.appendChild(table);

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    const checkboxes = [];
    let hideUnchecked = initialSet.size > 0; // Start with unchecked hidden if there are selections
    let hideDescriptions = hideUnchecked ? true : false;

    function updateRowVisibility() {
        const filter = searchInput.value.toLowerCase();
        
        tbody.querySelectorAll('tr').forEach(row => {
            // Handle category headers
            const catHeader = row.querySelector('td[colspan="3"]');
            if (catHeader) {
                // Hide category headers when showing only checked items
                row.style.display = hideUnchecked ? 'none' : 'block';
                return;
            }

            const nameCell = row.querySelector('td:nth-child(2)');
            const noteCell = row.querySelector('td:nth-child(3)');
            if (!nameCell) return;

            // Handle description visibility
            if (noteCell) {
                noteCell.style.display = hideDescriptions ? 'none' : '';
            }

            // Adjust grid columns based on description visibility
            if (hideDescriptions) {
                row.style.gridTemplateColumns = '40px 1fr';
            } else {
                row.style.gridTemplateColumns = '40px 200px 1fr';
            }

            // Check if row matches search filter
            const textToCheck = nameCell.textContent + ' ' + (noteCell ? noteCell.textContent : '');
            const matchesSearch = !filter || textToCheck.toLowerCase().includes(filter);

            // Find the checkbox for this row
            const checkbox = row.querySelector('input[type="checkbox"]');
            const isChecked = checkbox ? checkbox.checked : false;

            // Show row if it matches search AND (not hiding unchecked OR is checked)
            const shouldShow = matchesSearch && (!hideUnchecked || isChecked);
            row.style.display = shouldShow ? '' : 'none';
        });
    }

    function renderItemRow(item, depth = 0) {
        const row = document.createElement('tr');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '40px 200px 1fr';
        row.style.alignItems = 'center';
        row.style.padding = '8px 0';
        row.style.borderBottom = '1px solid rgba(0, 0, 0, 0.08)';
        row.style.cursor = 'pointer';
        row.style.transition = 'background-color 0.2s ease';

        // Checkbox cell
        const cbCell = document.createElement('td');
        cbCell.style.display = 'flex';
        cbCell.style.justifyContent = 'center';
        cbCell.style.alignItems = 'center';
        cbCell.style.padding = '0 12px';
        cbCell.style.cursor = 'pointer';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.style.width = '18px';
        checkbox.style.height = '18px';
        checkbox.style.margin = '0';
        checkbox.style.cursor = 'pointer';
        checkbox.style.accentColor = '#3498db';

        const itemIdStr = item.id !== undefined && item.id !== null ? String(item.id) : null;
        const isChecked = (itemIdStr && initialSet.has(itemIdStr)) || initialSet.has(String(item.name));
        checkbox.checked = !!isChecked;

        // Update visibility when checkbox changes
        checkbox.addEventListener('change', updateRowVisibility);

        cbCell.appendChild(checkbox);
        row.appendChild(cbCell);

        // Name cell
        const nameCell = document.createElement('td');
        nameCell.style.fontWeight = '600';
        nameCell.style.padding = '0 8px';
        nameCell.style.cursor = 'pointer';

        let displayLabel = item.name;
        if (item.extensionTech) displayLabel += ' [Ext]';
        nameCell.textContent = displayLabel;
        row.appendChild(nameCell);

        // Note/devNote cell
        const noteCell = document.createElement('td');
        noteCell.style.color = '#666';
        noteCell.style.fontSize = '12px';
        noteCell.style.lineHeight = '1.4';
        noteCell.style.padding = '0 12px 0 8px';
        noteCell.style.cursor = 'pointer';
        noteCell.className = 'description-cell'; // For easier targeting
        
        const noteText = Array.isArray(item.devNote)
            ? item.devNote.join(' ')
            : item.devNote || item.note || '';
        noteCell.textContent = noteText;
        row.appendChild(noteCell);

        tbody.appendChild(row);

        checkboxes.push({ checkbox, item });

        // Add hover effect
        row.addEventListener('mouseenter', () => {
            if (label.toLowerCase() === 'tech') {
                row.style.backgroundColor = 'rgba(51, 153, 255, 0.12)';
            } else {
                row.style.backgroundColor = 'rgba(245, 66, 108, 0.12)';
            }
        });

        row.addEventListener('mouseleave', () => {
            row.style.backgroundColor = '';
        });

        // Make entire row clickable to toggle checkbox
        row.addEventListener('click', (e) => {
            // Only toggle if we didn't click directly on the checkbox
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                // Dispatch change event to trigger any listeners
                const changeEvent = new Event('change', { bubbles: true });
                checkbox.dispatchEvent(changeEvent);
            }
        });

        // Handle extension techs recursively
        (item.extensionTechs || []).forEach(ext => renderItemRow(ext, depth + 1));
    }

    function buildTable() {
        tbody.innerHTML = '';
        checkboxes.length = 0; // Clear the array

        if (!map || map.size === 0) {
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = 3;
            emptyCell.textContent = `(no ${label.toLowerCase()} available)`;
            emptyCell.style.fontStyle = 'italic';
            emptyCell.style.textAlign = 'center';
            emptyCell.style.padding = '16px';
            emptyCell.style.color = '#666';
            emptyRow.appendChild(emptyCell);
            tbody.appendChild(emptyRow);
            return;
        }

        for (const [categoryName, catObj] of map.entries()) {
            // Category header row
            const catRow = document.createElement('tr');
            catRow.style.display = 'block';
            catRow.style.width = '100%';
            catRow.className = 'category-header-row'; // For easier targeting
            
            const catCell = document.createElement('td');
            catCell.colSpan = 3;
            catCell.textContent = categoryName;
            catCell.style.fontWeight = 'bold';
            catCell.style.borderBottom = '2px solid #bbb';
            catCell.style.padding = '8px 12px';
            catCell.style.background = '#f0f2f5';
            catCell.style.cursor = 'default';
            catCell.style.display = 'block';
            catRow.appendChild(catCell);
            tbody.appendChild(catRow);

            // Add items for this category
            (catObj.items || []).forEach(item => renderItemRow(item));
        }

        // Apply initial visibility
        updateRowVisibility();
        
        // Update button text based on initial state
        showCheckedButton.textContent = hideUnchecked ? 'Show Unchecked ▶' : 'Hide Unchecked ▼';
        showDescButton.textContent = hideDescriptions ? 'Show Descriptions ▶' : 'Hide Descriptions ▼';
    }

    // Search functionality
    searchInput.addEventListener('input', updateRowVisibility);

    // Collapse functionality (hides entire list)
    collapseButton.addEventListener('click', () => {
        const isHidden = tableWrapper.style.display === 'none';
        tableWrapper.style.display = isHidden ? '' : 'none';
        searchInput.style.display = isHidden ? '' : 'none';
        collapseButton.textContent = isHidden ? 'Hide List ▼' : 'Show List ▶';
    });

    // Show checked only functionality
    showCheckedButton.addEventListener('click', () => {
        hideUnchecked = !hideUnchecked;
        showCheckedButton.textContent = hideUnchecked ? 'Show Unchecked ▶' : 'Hide Unchecked ▼';
        updateRowVisibility();
    });

    // Show/hide descriptions functionality
    showDescButton.addEventListener('click', () => {
        hideDescriptions = !hideDescriptions;
        showDescButton.textContent = hideDescriptions ? 'Show Descriptions ▶' : 'Hide Descriptions ▼';
        updateRowVisibility();
    });

    // Build initial table
    buildTable();

    // Rebuild when global data changes
    const unsubscribe = window.EditorGlobals.addListener(() => {
        // Get current selections before rebuilding
        const currentSelections = container.getSelectedValues();
        
        // Update the initial set with current selections
        initialSet.clear();
        currentSelections.forEach(sel => initialSet.add(String(sel)));
        
        // Rebuild the table
        buildTable();
    });

    // Store cleanup function
    container._destroy = unsubscribe;

    // Expose method to get selected values
    container.getSelectedValues = () => {
        return checkboxes.filter(cb => cb.checkbox.checked).map(cb => cb.item.name);
    };

    return container;
}

// =============================================================================
// UI Element Creation Helpers
// =============================================================================

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

	const checkboxContainer = document.createElement('div');
	checkboxContainer.className = 'improved-checkbox-container';
	listWrapper.appendChild(checkboxContainer);

	let checkboxes = [];
	let eventListenersAdded = false;

	function buildTable() {
		checkboxContainer.innerHTML = '';
		checkboxes = [];

		if (!items.length) {
			const emptyDiv = document.createElement('div');
			emptyDiv.textContent = `(no ${title.toLowerCase()} available)`;
			emptyDiv.style.fontStyle = 'italic';
			emptyDiv.style.textAlign = 'center';
			emptyDiv.style.padding = '12px';
			emptyDiv.style.color = '#666';
			checkboxContainer.appendChild(emptyDiv);

			container.getSelectedValues = () => [];
			return;
		}

		const selectedSet = new Set(selectedItems.map(String));

		items.forEach(item => {
			// Apply filter if specified
			if (filterBy && item.nodeType && item.nodeType !== filterBy) {
				return;
			}

			const row = document.createElement('div');
			row.className = 'improved-checkbox-row checkbox-row';

			const checkboxCell = document.createElement('div');
			checkboxCell.className = 'improved-checkbox-cell';

			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.className = 'improved-checkbox-input';

			const itemValue = typeof item === 'string' ? item : (item[valueProperty] || item[displayProperty]);
			checkbox.checked = selectedSet.has(String(itemValue));
			checkbox.dataset.itemValue = itemValue;
			checkboxCell.appendChild(checkbox);

			const labelCell = document.createElement('div');
			labelCell.className = 'improved-checkbox-label';
			const displayText = typeof item === 'string' ? item : (item.displayName || item[displayProperty] || itemValue);
			labelCell.textContent = displayText;

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
					const row = cb.checkbox.closest('.improved-checkbox-row');
					if (row) {
						row.style.opacity = cb.checkbox.disabled ? '0.5' : '1';
						row.style.cursor = cb.checkbox.disabled ? 'not-allowed' : 'pointer';
					}
				}
			});
		}

		function updateRowVisibility() {
			let anyVisible = false;
			checkboxContainer.querySelectorAll('.checkbox-row').forEach(row => {
				const checkbox = row.querySelector('input[type="checkbox"]');
				const hideUnchecked = toggleBtn && toggleBtn.dataset.hidden === 'true';

				if (hideUnchecked && !checkbox.checked) {
					row.style.display = 'none';
				} else {
					row.style.display = '';
					anyVisible = true;
				}
			});

			checkboxContainer.style.display = anyVisible ? 'block' : 'none';
			if (searchInput) {
				searchInput.style.display = anyVisible ? '' : 'none';
			}
		}

		// Add event listeners only once
		if (!eventListenersAdded) {
			searchInput.addEventListener('input', () => {
				const filter = searchInput.value.toLowerCase();
				checkboxContainer.querySelectorAll('.checkbox-row').forEach(row => {
					const labelText = row.querySelector('.improved-checkbox-label').textContent.toLowerCase();
					row.style.display = labelText.includes(filter) ? '' : 'none';
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

			eventListenersAdded = true;
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

/**
 * Normalizes a condition value for consistent internal handling
 * Converts plain strings to typed objects
 */
function normalizeConditionValue(value) {
	if (typeof value === 'string') {
		const type = ConditionEditor.detectStringType(value);
		return type ? { [type]: value } : value;
	}
	return value;
}
