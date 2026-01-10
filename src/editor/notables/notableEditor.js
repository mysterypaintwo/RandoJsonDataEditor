/* =============================================================================
   Notable Editor
   
   Editor for notable strats (text-described difficult tricks). These are
   flagged as {notable: "Notable Name"} in JSON output for condition references.
   ============================================================================= */
class NotableEditor extends BaseEditor {
	static notableListeners = new Set();
	// Static methods for notable data management (similar to obstacles)
	static onNotablesChanged(listener) {
		NotableEditor.notableListeners.add(listener);
		listener(NotableEditor.getNotableSnapshot());
		return () => NotableEditor.notableListeners.delete(listener);
	}
	static getNotableSnapshot() {
		return Array.from(document.querySelectorAll('.notable-card'))
			.map(card => ({
				uid: card._uid,
				id: card._assignedId,
				name: card._nameInput?.value?.trim() || ''
			}))
			.filter(x => x.uid);
	}
	static broadcastNotablesChanged() {
		const snap = NotableEditor.getNotableSnapshot();
		NotableEditor.notableListeners.forEach(fn => fn(snap));
	}
	constructor(initialData = {}) {
		const config = {
			type: 'notables',
			className: 'notable',
			emoji: '⭐',
			defaultName: 'Notable',
			idStyle: 'numeric', // 1, 2, 3...
			idPrefix: ''
		};
		super(initialData, config);
		// Store reference to name input for external access
		this.root._nameInput = this.nameInput;
	}
	normalizeData(data) {
		return {
			name: normalizeStringField(data, 'name'),
			note: data?.note || '',
			id: data?.id
		};
	}
	populateFields() {
		this.nameInput = createInput('text', 'Notable Name', this.initialData.name);
		this.noteArea = createTextarea('Description (multi-line)', this.initialData.note);
		const content = createDiv([
			this.nameInput,
			this.noteArea,
			this.createRemoveButton('Remove Notable')
		]);
		this.contentArea.appendChild(content);
	}
	setupTitleUpdates() {
		this.nameInput.addEventListener('input', () => {
			this.updateTitle(this.nameInput.value.trim());
			NotableEditor.broadcastNotablesChanged();
		});
	}
	getTitleFromData() {
		return this.nameInput?.value?.trim() || '';
	}
	getValue() {
		if (!this.nameInput.value.trim()) return null;

		const result = {
			name: this.nameInput.value.trim()
		};

		const noteText = this.noteArea.value.trim();
		if (noteText) {
			// Schema allows note to be string or array of strings
			const noteLines = noteText.split('\n').map(line => line.trim()).filter(Boolean);
			if (noteLines.length > 0) {
				result.note = noteLines.length === 1 ? noteLines[0] : noteLines;
			}
		}

		// Wall jump avoid flag - only include if true
		if (this.wallJumpAvoid && this.wallJumpAvoid.getValue()) {
			result.wallJumpAvoid = true;
		}

		// ID will be assigned as integer by collectAndAssignIDs
		return cleanObject(result);
	}
	remove() {
		super.remove();
		NotableEditor.broadcastNotablesChanged();
	}
}