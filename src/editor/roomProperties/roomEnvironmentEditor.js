/* =============================================================================
   Room Environment Editor
   
   Editor for room-level environment properties (heated, cold, entranceNodes).
   Uses a simple list-based approach since most rooms have 1-2 environments.
   ============================================================================= */

class RoomEnvironmentEditor extends BaseEditor {
	constructor(initialData = {}) {
		const config = {
			type: 'roomEnvironment',
			className: 'room-environment',
			emoji: '🌡️',
			defaultName: 'Room Environment',
			idStyle: 'none' // No IDs for environments
		};
		super(initialData, config);
	}

	normalizeData(data) {
		return {
			heated: data.heated || false,
			cold: data.cold || false,
			entranceNodes: data.entranceNodes || null,
			note: data.note || '',
			devNote: data.devNote || ''
		};
	}

	populateFields() {
		// Create form layout
		const formGrid = document.createElement('div');
		formGrid.style.display = 'grid';
		formGrid.style.gridTemplateColumns = '1fr 1fr';
		formGrid.style.gap = '12px';
		formGrid.style.marginBottom = '12px';

		// Heated checkbox
		const heatedContainer = document.createElement('div');
		const heatedLabel = document.createElement('label');
		heatedLabel.style.display = 'flex';
		heatedLabel.style.alignItems = 'center';
		heatedLabel.style.gap = '8px';
		heatedLabel.style.cursor = 'pointer';

		this.heatedCheckbox = document.createElement('input');
		this.heatedCheckbox.type = 'checkbox';
		this.heatedCheckbox.checked = this.initialData.heated;
		this.heatedCheckbox.style.width = '18px';
		this.heatedCheckbox.style.height = '18px';
		this.heatedCheckbox.style.cursor = 'pointer';

		const heatedText = document.createElement('span');
		heatedText.textContent = '🔥 Heated';
		heatedText.style.fontWeight = '600';

		heatedLabel.appendChild(this.heatedCheckbox);
		heatedLabel.appendChild(heatedText);
		heatedContainer.appendChild(heatedLabel);

		// Cold checkbox
		const coldContainer = document.createElement('div');
		const coldLabel = document.createElement('label');
		coldLabel.style.display = 'flex';
		coldLabel.style.alignItems = 'center';
		coldLabel.style.gap = '8px';
		coldLabel.style.cursor = 'pointer';

		this.coldCheckbox = document.createElement('input');
		this.coldCheckbox.type = 'checkbox';
		this.coldCheckbox.checked = this.initialData.cold;
		this.coldCheckbox.style.width = '18px';
		this.coldCheckbox.style.height = '18px';
		this.coldCheckbox.style.cursor = 'pointer';

		const coldText = document.createElement('span');
		coldText.textContent = '❄️ Cold';
		coldText.style.fontWeight = '600';

		coldLabel.appendChild(this.coldCheckbox);
		coldLabel.appendChild(coldText);
		coldContainer.appendChild(coldLabel);

		formGrid.appendChild(heatedContainer);
		formGrid.appendChild(coldContainer);

		// Entrance Nodes selector
		const entranceNodesLabel = document.createElement('label');
		entranceNodesLabel.textContent = 'Entrance Nodes (leave empty if always active):';
		entranceNodesLabel.style.fontWeight = '600';
		entranceNodesLabel.style.marginBottom = '6px';
		entranceNodesLabel.style.display = 'block';

		const entranceNodesDesc = document.createElement('div');
		entranceNodesDesc.textContent = 'This environment is active when entering from these nodes.';
		entranceNodesDesc.style.fontSize = '12px';
		entranceNodesDesc.style.color = '#666';
		entranceNodesDesc.style.marginBottom = '8px';

		this.entranceNodesCheckboxList = createNodeCheckboxList(
			this.initialData.entranceNodes || [],
			'Entrance Nodes',
			Infinity,
			'All'
		);

		// Notes section
		const notesContainer = document.createElement('div');
		notesContainer.style.marginTop = '12px';

		const noteLabel = document.createElement('label');
		noteLabel.textContent = 'Note:';
		noteLabel.style.fontWeight = '600';
		noteLabel.style.display = 'block';
		noteLabel.style.marginBottom = '4px';

		this.noteTextarea = document.createElement('textarea');
		this.noteTextarea.rows = 2;
		this.noteTextarea.placeholder = 'Optional note...';
		this.noteTextarea.value = this.initialData.note || '';
		this.noteTextarea.style.width = '100%';
		this.noteTextarea.style.boxSizing = 'border-box';

		const devNoteLabel = document.createElement('label');
		devNoteLabel.textContent = 'Dev Note:';
		devNoteLabel.style.fontWeight = '600';
		devNoteLabel.style.display = 'block';
		devNoteLabel.style.marginTop = '8px';
		devNoteLabel.style.marginBottom = '4px';

		this.devNoteTextarea = document.createElement('textarea');
		this.devNoteTextarea.rows = 2;
		this.devNoteTextarea.placeholder = 'Optional dev note...';
		this.devNoteTextarea.value = this.initialData.devNote || '';
		this.devNoteTextarea.style.width = '100%';
		this.devNoteTextarea.style.boxSizing = 'border-box';

		notesContainer.appendChild(noteLabel);
		notesContainer.appendChild(this.noteTextarea);
		notesContainer.appendChild(devNoteLabel);
		notesContainer.appendChild(this.devNoteTextarea);

		// Remove button
		const removeBtn = this.createRemoveButton('Remove Environment');
		removeBtn.style.marginTop = '12px';

		// Append everything
		this.contentArea.appendChild(formGrid);
		this.contentArea.appendChild(entranceNodesLabel);
		this.contentArea.appendChild(entranceNodesDesc);
		this.contentArea.appendChild(this.entranceNodesCheckboxList);
		this.contentArea.appendChild(notesContainer);
		this.contentArea.appendChild(removeBtn);
	}

	getTitleFromData() {
		const parts = [];
		if (this.heatedCheckbox && this.heatedCheckbox.checked) parts.push('Heated');
		if (this.coldCheckbox && this.coldCheckbox.checked) parts.push('Cold');
		
		if (parts.length === 0) {
			return 'Normal Environment';
		}
		
		return parts.join(' + ');
	}

	setupTitleUpdates() {
		// Update title when checkboxes change
		if (this.heatedCheckbox) {
			this.heatedCheckbox.addEventListener('change', () => this.updateTitle());
		}
		if (this.coldCheckbox) {
			this.coldCheckbox.addEventListener('change', () => this.updateTitle());
		}
	}

	getValue() {
		const entranceNodes = this.entranceNodesCheckboxList.getSelectedValues();
		const note = this.noteTextarea.value.trim();
		const devNote = this.devNoteTextarea.value.trim();

		const result = {
			heated: this.heatedCheckbox.checked,
			cold: this.coldCheckbox.checked
		};

		// Only include entranceNodes if nodes are selected
		if (entranceNodes.length > 0) {
			result.entranceNodes = entranceNodes.map(id => parseInt(id));
		}

		// Only include notes if not empty
		if (note) result.note = note;
		if (devNote) result.devNote = devNote;

		return result;
	}
}