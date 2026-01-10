/* =============================================================================
   Editor Utilities - Shared Functions
   
   Common utility functions used across all editor types. Handles DOM creation,
   data manipulation, ID generation, and other shared operations.
   ============================================================================= */
// ---- DOM Creation Utilities --------------------------------
function createDiv(children = [], className = '') {
	const div = document.createElement('div');
	if (className) div.className = className;
	children.forEach(child => {
		if (child === 'hr') {
			const hr = document.createElement('hr');
			hr.style.margin = '12px 0';
			div.appendChild(hr);
		} else if (child) {
			div.appendChild(child);
		}
	});
	return div;
}

function createInput(type, placeholder, value = '', attributes = {}) {
	const input = document.createElement('input');
	input.type = type;
	input.placeholder = placeholder;
	input.value = value;
	input.className = 'editor-input';
	Object.entries(attributes).forEach(([key, val]) => {
		input.setAttribute(key, val);
	});
	return input;
}

function createTextarea(placeholder, value = '') {
	const textarea = document.createElement('textarea');
	textarea.placeholder = placeholder;
	textarea.value = Array.isArray(value) ? value.join('\n') : value;
	textarea.className = 'editor-textarea';
	return textarea;
}

function createSelect(options, selectedValue = '', multiple = false) {
	const select = document.createElement('select');
	if (multiple) select.multiple = true;
	options.forEach(option => {
		const opt = document.createElement('option');
		opt.value = option.value;
		opt.textContent = option.text;
		if (option.value === selectedValue || (Array.isArray(selectedValue) && selectedValue.includes(option.value))) {
			opt.selected = true;
		}
		select.appendChild(opt);
	});
	return select;
}

function createLabel(text, associatedElement) {
	const container = createDiv([]);
	const label = document.createElement('label');
	label.textContent = text;
	label.style.fontWeight = '600';
	label.style.marginTop = '8px';
	label.style.display = 'block';
	container.appendChild(label);
	if (associatedElement) container.appendChild(associatedElement);
	return container;
}

function createRemoveButton(text, onClick) {
	const button = document.createElement('button');
	button.textContent = `- ${text}`;
	button.className = 'remove-btn';
	button.style.marginTop = '8px';
	button.addEventListener('click', onClick);
	return button;
}

function createCheckbox(labelText, checked = false) {
	const wrapper = document.createElement('div');
	wrapper.className = 'editor-checkbox-wrapper';
	const checkbox = document.createElement('input');
	checkbox.type = 'checkbox';
	checkbox.className = 'editor-checkbox';
	checkbox.checked = checked;
	const label = document.createElement('label');
	label.className = 'editor-checkbox-label';
	label.appendChild(document.createTextNode(labelText));
	wrapper.appendChild(checkbox);
	wrapper.appendChild(label);
	wrapper.getValue = () => checkbox.checked;
	return wrapper;
}

function createCheckboxGrid(checkboxes) {
	const container = document.createElement('div');
	container.className = 'checkbox-grid';
	checkboxes.forEach(cb => container.appendChild(cb));
	return container;
}
// ---- ID Generation Utilities --------------------------------
const ID_GENERATORS = {
	letter: (index) => String.fromCharCode(65 + index), // A, B, C...
	numeric: (index, prefix = '') => {
		const base = index + 1;
		return prefix ? `${prefix}${base}` : base.toString();
	}
};

function generateID(index, config) {
	const {
		idStyle,
		idPrefix = ''
	} = config;
	return ID_GENERATORS[idStyle] ? ID_GENERATORS[idStyle](index, idPrefix) : (index + 1).toString();
}
// ---- Data Collection and Assignment --------------------------------
function collectAndAssignIDs(container, type, config) {
	if (!container) return [];

	return Array.from(container.children)
		.map((element, index) => {
			if (element.getValue) {
				const value = element.getValue();
				if (value) {
					const assignedId = generateID(index, config);
					// Parse ID as integer for numeric types, keep as string for letter types. Also consider prefix.
					if (config.idStyle === 'numeric' && !config.idPrefix) {
						value.id = Number(assignedId);
					}
					// Anything with a prefix or non-numeric style -> string
					else {
						value.id = assignedId;
					}

					return value;
				}
			}
			return null;
		})
		.filter(item => item !== null);
}
// ---- Drag and Drop Utilities --------------------------------
function createDragPlaceholder(height) {
	const placeholder = document.createElement('div');
	placeholder.className = 'card-placeholder';
	placeholder.style.height = `${height}px`;
	return placeholder;
}

function getDragAfterElement(container, y) {
	const draggableElements = Array.from(container.children)
		.filter(child => !child.classList.contains('card-placeholder') && !child.classList.contains('dragging'));
	return draggableElements.reduce((closest, child) => {
		const box = child.getBoundingClientRect();
		const offset = y - box.top - box.height / 2;
		if (offset < 0 && offset > closest.offset) {
			return {
				offset,
				element: child
			};
		} else {
			return closest;
		}
	}, {
		offset: Number.NEGATIVE_INFINITY
	}).element;
}

function makeCardDraggable(card, container, type, renumberCallback) {
	const header = card.querySelector('.editor-card-header');
	if (!header) return;
	let dragState = {
		isDragging: false,
		placeholder: null,
		startY: 0,
		offsetY: 0
	};
	header.addEventListener('mousedown', startDrag);

	function startDrag(event) {
		event.preventDefault();
		// Collapse card during drag
		if (card.collapse) card.collapse();
		const rect = card.getBoundingClientRect();
		dragState.isDragging = true;
		dragState.offsetY = event.clientY - rect.top;
		dragState.placeholder = createDragPlaceholder(rect.height);
		container.insertBefore(dragState.placeholder, card.nextSibling);
		card.classList.add('dragging');
		card.style.position = 'absolute';
		card.style.width = `${rect.width}px`;
		card.style.left = `${rect.left}px`;
		card.style.top = `${event.clientY - dragState.offsetY}px`;
		card.style.zIndex = '1000';
		document.addEventListener('mousemove', handleDragMove);
		document.addEventListener('mouseup', endDrag);
	}

	function handleDragMove(event) {
		if (!dragState.isDragging) return;
		card.style.top = `${event.clientY - dragState.offsetY}px`;
		const afterElement = getDragAfterElement(container, event.clientY);
		if (afterElement) {
			container.insertBefore(dragState.placeholder, afterElement);
		} else {
			container.appendChild(dragState.placeholder);
		}
	}

	function endDrag() {
		if (!dragState.isDragging) return;
		dragState.isDragging = false;
		card.classList.remove('dragging');
		card.style.position = '';
		card.style.top = '';
		card.style.left = '';
		card.style.width = '';
		card.style.zIndex = '';
		container.insertBefore(card, dragState.placeholder);
		dragState.placeholder.remove();
		// Expand card after drag
		if (card.expand) card.expand();
		// Trigger renumbering
		if (renumberCallback) renumberCallback();
		document.removeEventListener('mousemove', handleDragMove);
		document.removeEventListener('mouseup', endDrag);
	}
}
// ---- Card Management --------------------------------
function updateCardHeader(card, title, id, config) {
	const header = card.querySelector('.editor-card-header');
	if (!header) return;
	const displayTitle = title || config.defaultName || 'Unnamed';
	header.textContent = `${config.emoji} ${displayTitle} ${id != null ? `(ID: ${id})` : ''}`;
}
// ---- Data Normalization Utilities --------------------------------
function normalizeArrayField(data, field) {
	return Array.isArray(data?.[field]) ? data[field].map(String) : [];
}

function normalizeStringField(data, field, defaultValue = '') {
	return data?.[field] || defaultValue;
}

function normalizeBooleanField(data, field, defaultValue = false) {
	return !!data?.[field] || defaultValue;
}

function normalizeNumberField(data, field, defaultValue = 1) {
	return data?.[field] ?? defaultValue;
}
// ---- Export utilities --------------------------------
if (typeof module !== 'undefined' && module.exports) {
	module.exports = {
		createDiv,
		createInput,
		createTextarea,
		createSelect,
		createLabel,
		createRemoveButton,
		createCheckbox,
		createCheckboxGrid,
		generateID,
		collectAndAssignIDs,
		makeCardDraggable,
		updateCardHeader,
		normalizeArrayField,
		normalizeStringField,
		normalizeBooleanField,
		normalizeNumberField
	};
}