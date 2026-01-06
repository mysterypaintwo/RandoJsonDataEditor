/* =============================================================================
   Node Editor
   
   Editor for renaming nodes in the room. Handles all node types.
   ============================================================================= */
class JunctionNodeEditor extends BaseEditor {
	constructor(initialData = {}) {
		const config = {
			type: 'nodes',
			className: 'node',
			emoji: '🔀',
			defaultName: 'Node',
			idStyle: 'numeric',
			idPrefix: ''
		};
		super(initialData, config);
	}

	normalizeData(data) {
		return {
			id: data?.id,
			name: normalizeStringField(data, 'name'),
			nodeType: normalizeStringField(data, 'nodeType', 'junction'),
			nodeSubType: normalizeStringField(data, 'nodeSubType', 'visible'),
			// Preserve all other node properties
			...data
		};
	}
    
    populateFields() {
        this.nameInput = createInput('text', 'Node Name', this.initialData.name);
        
        // Color picker
        const colorContainer = document.createElement('div');
        colorContainer.style.display = 'flex';
        colorContainer.style.gap = '8px';
        colorContainer.style.alignItems = 'center';
        colorContainer.style.marginTop = '8px';
        
        const colorLabel = document.createElement('label');
        colorLabel.textContent = 'Color:';
        colorLabel.style.fontSize = '14px';
        
        this.colorInput = document.createElement('input');
        this.colorInput.type = 'color';
        this.colorInput.value = this.initialData.color || '#0000FF';
        this.colorInput.style.width = '60px';
        this.colorInput.style.height = '30px';
        
        colorContainer.appendChild(colorLabel);
        colorContainer.appendChild(this.colorInput);
        
        const typeLabel = document.createElement('div');
        typeLabel.textContent = `Type: ${this.initialData.nodeType} (${this.initialData.nodeSubType})`;
        typeLabel.style.fontSize = '12px';
        typeLabel.style.color = '#666';
        typeLabel.style.marginTop = '4px';
        
        const content = createDiv([
            this.nameInput,
            colorContainer,
            typeLabel
        ]);
        this.contentArea.appendChild(content);
        
        // Ensure title reflects initial name
        this.updateTitle(this.initialData.name || '');
    }

	setupTitleUpdates() {
		this.nameInput.addEventListener('input', () => {
			this.updateTitle(this.nameInput.value.trim());
		});
	}

	getTitleFromData() {
		return this.nameInput?.value?.trim() || '';
	}

    getValue() {
        // Return the complete node data with updated name and color
        return {
            ...this.initialData,
            name: this.nameInput.value.trim(),
            color: this.colorInput.value
        };
    }
}