/* =============================================================================
   Obstacle Editor
   
   Editor for room obstacles. Supports drag/drop, real-time title updates,
   and provides data to other editors via observer pattern.
   ============================================================================= */
   class ObstacleEditor extends BaseEditor {
	static obstacleListeners = new Set();
	static uidCounter = 0;
	// Static methods for obstacle data management
	static onObstaclesChanged(listener) {
		ObstacleEditor.obstacleListeners.add(listener);
		// Send current snapshot immediately
		listener(ObstacleEditor.getObstacleSnapshot());
		return () => ObstacleEditor.obstacleListeners.delete(listener);
	}
	static getObstacleSnapshot() {
		return Array.from(document.querySelectorAll('.obstacle-card'))
			.map(card => ({
				uid: card._uid,
				id: card._assignedId,
				name: card._nameInput?.value?.trim() || ''
			}))
			.filter(x => x.uid);
	}
	static broadcastObstaclesChanged() {
		const snap = ObstacleEditor.getObstacleSnapshot();
		ObstacleEditor.obstacleListeners.forEach(fn => fn(snap));
	}
	constructor(initialData = {}) {
		const config = {
			type: 'obstacles',
			className: 'obstacle',
			emoji: '🪨',
			defaultName: 'Obstacle',
			idStyle: 'letter', // A, B, C...
			idPrefix: ''
		};
		super(initialData, config);
		// Store reference to name input for external access
		this.root._nameInput = this.nameInput;
	}
	normalizeData(data) {
		return {
			name: normalizeStringField(data, 'name'),
			obstacleType: normalizeStringField(data, 'obstacleType', 'abstract'),
			note: normalizeStringField(data, 'note'),
			devNote: normalizeStringField(data, 'devNote'),
			id: data?.id
		};
	}
	populateFields() {
		this.nameInput = createInput('text', 'Obstacle name', this.initialData.name);
		this.typeSelect = this.createObstacleTypeSelect(this.initialData.obstacleType);
		this.noteArea = createTextarea('Note (optional)', this.initialData.note);
		this.devNoteInput = createInput('text', 'Developer Note', this.initialData.devNote);
		const content = createDiv([
			this.nameInput,
			this.typeSelect,
			this.noteArea,
			this.devNoteInput,
			this.createRemoveButton('Remove Obstacle')
		]);
		this.contentArea.appendChild(content);
	}
	setupTitleUpdates() {
		this.nameInput.addEventListener('input', () => {
			this.updateTitle(this.nameInput.value.trim());
			ObstacleEditor.broadcastObstaclesChanged();
		});
	}
	getTitleFromData() {
		return this.nameInput?.value?.trim() || '';
	}
	createObstacleTypeSelect(selectedType) {
		const types = [{
				value: 'abstract',
				text: 'Abstract (e.g. "At the Power Bomb Item While in Artificial Morph")'
			},
			{
				value: 'enemies',
				text: 'Enemies (e.g. "Sidehopper trio")'
			},
			{
				value: 'inanimate',
				text: 'Inanimate (e.g. "Power Bomb Blocks")'
			}
		];
		return createSelect(types, selectedType);
	}
	getValue() {
		if (!this.nameInput.value.trim()) return null;
		
		const result = {
			name: this.nameInput.value.trim(),
			obstacleType: this.typeSelect.value || 'abstract'
		};

		// Only include optional fields if they have values
		const note = this.noteArea.value.trim();
		if (note) result.note = note;

		const devNote = this.devNoteInput.value.trim();
		if (devNote) result.devNote = devNote;

		return cleanObject(result);
	}
	remove() {
		super.remove();
		ObstacleEditor.broadcastObstaclesChanged();
	}
}