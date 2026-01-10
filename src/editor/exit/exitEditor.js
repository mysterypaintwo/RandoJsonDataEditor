/* =============================================================================
   Entrance and Exit Condition Editors
   
   Specialized editors for entrance/exit conditions that match the room schema.
   These handle the complex nested structure of cross-room transitions.
   ============================================================================= */

// =============================================================================
// Exit Condition Editor
// =============================================================================

class ExitConditionEditor {
	constructor(container, initialData = null) {
		this.container = container;
		this.initialData = initialData;
		this.createElement();
	}

	createElement() {
		this.root = document.createElement('div');
		this.root.className = 'exit-condition-editor';
		this.root.style.border = '1px solid #ddd';
		this.root.style.borderRadius = '6px';
		this.root.style.padding = '12px';
		this.root.style.backgroundColor = '#f9f9f9';

		// Type selector
		this.typeSelect = document.createElement('select');
		this.typeSelect.style.width = '100%';
		this.typeSelect.style.marginBottom = '12px';

		const emptyOption = document.createElement('option');
		emptyOption.value = '';
		emptyOption.textContent = '(no exit condition)';
		this.typeSelect.appendChild(emptyOption);

		// Add all exit condition types from schema
		const exitTypes = [{
				value: 'leaveNormally',
				label: 'Leave Normally'
			},
			{
				value: 'leaveWithRunway',
				label: 'Leave With Runway'
			},
			{
				value: 'leaveShinecharged',
				label: 'Leave Shinecharged'
			},
			{
				value: 'leaveWithTemporaryBlue',
				label: 'Leave With Temporary Blue'
			},
			{
				value: 'leaveWithSpark',
				label: 'Leave With Spark'
			},
			{
				value: 'leaveSpinning',
				label: 'Leave Spinning'
			},
			{
				value: 'leaveWithMockball',
				label: 'Leave With Mockball'
			},
			{
				value: 'leaveWithSpringBallBounce',
				label: 'Leave With Spring Ball Bounce'
			},
			{
				value: 'leaveSpaceJumping',
				label: 'Leave Space Jumping'
			},
			{
				value: 'leaveWithStoredFallSpeed',
				label: 'Leave With Stored Fall Speed'
			},
			{
				value: 'leaveWithDoorFrameBelow',
				label: 'Leave With Door Frame Below'
			},
			{
				value: 'leaveWithPlatformBelow',
				label: 'Leave With Platform Below'
			},
			{
				value: 'leaveWithGrappleJump',
				label: 'Leave With Grapple Jump'
			},
			{
				value: 'leaveWithSuperSink',
				label: 'Leave With Super Sink'
			}
		];

		exitTypes.forEach(type => {
			const option = document.createElement('option');
			option.value = type.value;
			option.textContent = type.label;
			this.typeSelect.appendChild(option);
		});

		// Content area for type-specific fields
		this.contentArea = document.createElement('div');
		this.contentArea.style.marginTop = '8px';

		this.root.appendChild(this.typeSelect);
		this.root.appendChild(this.contentArea);
		this.container.appendChild(this.root);

		// Set initial value
		if (this.initialData && typeof this.initialData === 'object') {
			const type = Object.keys(this.initialData)[0];
			if (type) {
				this.typeSelect.value = type;
			}
		}

		// Event handlers
		this.typeSelect.addEventListener('change', () => this.renderContent());
		this.renderContent();
	}

	renderContent() {
		this.contentArea.innerHTML = '';
		const type = this.typeSelect.value;
		if (!type) return;

		const typeData = this.initialData?.[type] || {};

		switch (type) {
			case 'leaveNormally':
			case 'leaveShinecharged':
			case 'leaveWithSuperSink':
				this.renderEmptyObject();
				break;
			case 'leaveWithRunway':
				this.renderRunway(typeData);
				break;
			case 'leaveWithTemporaryBlue':
				this.renderDirection(typeData);
				break;
			case 'leaveWithSpark':
				this.renderSparkPosition(typeData);
				break;
			case 'leaveSpinning':
			case 'leaveWithMockball':
			case 'leaveWithSpringBallBounce':
			case 'leaveSpaceJumping':
				this.renderRemoteRunway(typeData);
				break;
			case 'leaveWithStoredFallSpeed':
				this.renderFallSpeed(typeData);
				break;
			case 'leaveWithDoorFrameBelow':
				this.renderDoorFrameHeight(typeData);
				break;
			case 'leaveWithPlatformBelow':
				this.renderPlatformBelow(typeData);
				break;
			case 'leaveWithGrappleJump':
				this.renderGrappleJumpPosition(typeData);
				break;
		}
	}

	renderEmptyObject() {
		const note = document.createElement('div');
		note.style.fontStyle = 'italic';
		note.style.color = '#666';
		note.textContent = 'No additional properties required';
		this.contentArea.appendChild(note);
	}

	renderRunway(data) {
		const length = this.createNumber('Length', data.length, 0, 45, 0.5);
		const openEnd = this.createNumber('Open Ends', data.openEnd, 0, 1, 1);
		const gentleUp = this.createNumber('Gentle Up Tiles (optional)', data.gentleUpTiles, 0, 45, 1);
		const gentleDown = this.createNumber('Gentle Down Tiles (optional)', data.gentleDownTiles, 0, 45, 1);
		const steepUp = this.createNumber('Steep Up Tiles (optional)', data.steepUpTiles, 0, 45, 1);
		const steepDown = this.createNumber('Steep Down Tiles (optional)', data.steepDownTiles, 0, 45, 1);
		const startingDown = this.createNumber('Starting Down Tiles (optional)', data.startingDownTiles, 0, 45, 1);
		const minSpeed = this.createText('Min Extra Run Speed (hex, optional)', data.minExtraRunSpeed);
		const heated = this.createCheckbox('Heated', data.heated);
		const cold = this.createCheckbox('Cold', data.cold);

		this.contentArea.appendChild(length);
		this.contentArea.appendChild(openEnd);
		this.contentArea.appendChild(gentleUp);
		this.contentArea.appendChild(gentleDown);
		this.contentArea.appendChild(steepUp);
		this.contentArea.appendChild(steepDown);
		this.contentArea.appendChild(startingDown);
		this.contentArea.appendChild(minSpeed);
		this.contentArea.appendChild(heated);
		this.contentArea.appendChild(cold);

		this.lengthInput = length.querySelector('input');
		this.openEndInput = openEnd.querySelector('input');
		this.gentleUpTilesInput = gentleUp.querySelector('input');
		this.gentleDownTilesInput = gentleDown.querySelector('input');
		this.steepUpTilesInput = steepUp.querySelector('input');
		this.steepDownTilesInput = steepDown.querySelector('input');
		this.startingDownTilesInput = startingDown.querySelector('input');
		this.minExtraRunSpeedInput = minSpeed.querySelector('input');
		this.heatedCheckbox = heated.querySelector('input');
		this.coldCheckbox = cold.querySelector('input');
	}

	renderDirection(data) {
		const direction = this.createSelect('Direction (optional)', [{
				value: '',
				label: '(any)'
			},
			{
				value: 'left',
				label: 'Left'
			},
			{
				value: 'right',
				label: 'Right'
			},
			{
				value: 'any',
				label: 'Any'
			}
		], data.direction || '');
		this.contentArea.appendChild(direction);
		this.directionSelect = direction.querySelector('select');
	}

	renderSparkPosition(data) {
		const position = this.createSelect('Position (optional)', [{
				value: '',
				label: '(any)'
			},
			{
				value: 'top',
				label: 'Top'
			},
			{
				value: 'bottom',
				label: 'Bottom'
			}
		], data.position || '');
		this.contentArea.appendChild(position);
		this.positionSelect = position.querySelector('select');
	}

	renderRemoteRunway(data) {
		const type = this.typeSelect.value;
		const runway = data.remoteRunway || data.runway || {};

		const label = document.createElement('div');
		label.textContent = 'Remote Runway:';
		label.style.fontWeight = 'bold';
		label.style.marginBottom = '8px';
		this.contentArea.appendChild(label);

		const length = this.createNumber('Length', runway.length, 0, 45, 0.5);
		const openEnd = this.createNumber('Open Ends', runway.openEnd, 0, 2, 1);

		this.contentArea.appendChild(length);
		this.contentArea.appendChild(openEnd);

		this.remoteRunwayLengthInput = length.querySelector('input');
		this.remoteRunwayOpenEndInput = openEnd.querySelector('input');

		// Add landing runway for mockball and spring ball bounce
		if (type === 'leaveWithMockball' || type === 'leaveWithSpringBallBounce') {
			const landingLabel = document.createElement('div');
			landingLabel.textContent = 'Landing Runway:';
			landingLabel.style.fontWeight = 'bold';
			landingLabel.style.marginTop = '12px';
			landingLabel.style.marginBottom = '8px';
			this.contentArea.appendChild(landingLabel);

			const landingRunway = data.landingRunway || {};
			const landingLength = this.createNumber('Length', landingRunway.length, 0, 45, 0.5);
			const landingOpenEnd = this.createNumber('Open Ends', landingRunway.openEnd, 0, 2, 1);

			this.contentArea.appendChild(landingLength);
			this.contentArea.appendChild(landingOpenEnd);

			this.landingRunwayLengthInput = landingLength.querySelector('input');
			this.landingRunwayOpenEndInput = landingOpenEnd.querySelector('input');
		}

		// Add movement type for spring ball bounce
		if (type === 'leaveWithSpringBallBounce') {
			const movement = this.createSelect('Movement Type', [{
					value: 'controlled',
					label: 'Controlled'
				},
				{
					value: 'uncontrolled',
					label: 'Uncontrolled'
				},
				{
					value: 'any',
					label: 'Any'
				}
			], data.movementType || 'any');
			this.contentArea.appendChild(movement);
			this.movementTypeSelect = movement.querySelector('select');
		}

		// Add optional speed fields
		const minSpeed = this.createText('Min Extra Run Speed (hex, optional)', data.minExtraRunSpeed);
		const maxSpeed = this.createText('Max Extra Run Speed (hex, optional)', data.maxExtraRunSpeed);
		const blue = this.createSelect('Blue Speed (optional)', [{
				value: '',
				label: '(any)'
			},
			{
				value: 'yes',
				label: 'Yes'
			},
			{
				value: 'no',
				label: 'No'
			},
			{
				value: 'any',
				label: 'Any'
			}
		], data.blue || '');

		this.contentArea.appendChild(minSpeed);
		this.contentArea.appendChild(maxSpeed);
		this.contentArea.appendChild(blue);

		this.minExtraRunSpeedInput = minSpeed.querySelector('input');
		this.maxExtraRunSpeedInput = maxSpeed.querySelector('input');
		this.blueSelect = blue.querySelector('select');
	}

	renderFallSpeed(data) {
		const fallSpeed = this.createNumber('Fall Speed in Tiles', data.fallSpeedInTiles, 0, 2, 1);
		this.contentArea.appendChild(fallSpeed);
		this.fallSpeedInTilesInput = fallSpeed.querySelector('input');
	}

	renderDoorFrameHeight(data) {
		const height = this.createNumber('Height', data.height, 0, 100, 0.5);
		this.contentArea.appendChild(height);
		this.heightInput = height.querySelector('input');
	}

	renderPlatformBelow(data) {
		const height = this.createNumber('Height', data.height, 0, 100, 0.5);
		const leftPos = this.createNumber('Left Position', data.leftPosition, -100, 100, 0.5);
		const rightPos = this.createNumber('Right Position', data.rightPosition, -100, 100, 0.5);

		this.contentArea.appendChild(height);
		this.contentArea.appendChild(leftPos);
		this.contentArea.appendChild(rightPos);

		this.heightInput = height.querySelector('input');
		this.leftPositionInput = leftPos.querySelector('input');
		this.rightPositionInput = rightPos.querySelector('input');
	}

	renderGrappleJumpPosition(data) {
		const position = this.createSelect('Position', [{
				value: 'left',
				label: 'Left'
			},
			{
				value: 'right',
				label: 'Right'
			},
			{
				value: 'any',
				label: 'Any'
			}
		], data.position || 'any');
		this.contentArea.appendChild(position);
		this.positionSelect = position.querySelector('select');
	}

	// Helper methods
	createSelect(label, options, value) {
		const wrapper = document.createElement('div');
		wrapper.style.marginBottom = '8px';

		const labelEl = document.createElement('label');
		labelEl.textContent = label + ':';
		labelEl.style.display = 'block';
		labelEl.style.marginBottom = '4px';
		labelEl.style.fontWeight = '600';

		const select = document.createElement('select');
		select.style.width = '100%';

		options.forEach(opt => {
			const option = document.createElement('option');
			option.value = opt.value;
			option.textContent = opt.label;
			if (opt.value === value) option.selected = true;
			select.appendChild(option);
		});

		wrapper.appendChild(labelEl);
		wrapper.appendChild(select);
		return wrapper;
	}

	createNumber(label, value, min, max, step) {
		const wrapper = document.createElement('div');
		wrapper.style.marginBottom = '8px';

		const labelEl = document.createElement('label');
		labelEl.textContent = label + ':';
		labelEl.style.display = 'block';
		labelEl.style.marginBottom = '4px';
		labelEl.style.fontWeight = '600';

		const input = document.createElement('input');
		input.type = 'number';
		input.min = min;
		input.max = max;
		input.step = step;
		input.style.width = '100%';
		if (value !== undefined && value !== null) input.value = value;

		wrapper.appendChild(labelEl);
		wrapper.appendChild(input);
		return wrapper;
	}

	createText(label, value, placeholder = '') {
		const wrapper = document.createElement('div');
		wrapper.style.marginBottom = '8px';

		const labelEl = document.createElement('label');
		labelEl.textContent = label + ':';
		labelEl.style.display = 'block';
		labelEl.style.marginBottom = '4px';
		labelEl.style.fontWeight = '600';

		const input = document.createElement('input');
		input.type = 'text';
		input.style.width = '100%';
		input.placeholder = placeholder;
		if (value) input.value = value;

		wrapper.appendChild(labelEl);
		wrapper.appendChild(input);
		return wrapper;
	}

	createCheckbox(label, checked) {
		const wrapper = document.createElement('div');
		wrapper.style.marginBottom = '8px';
		wrapper.style.display = 'flex';
		wrapper.style.alignItems = 'center';
		wrapper.style.gap = '8px';

		const input = document.createElement('input');
		input.type = 'checkbox';
		input.checked = !!checked;

		const labelEl = document.createElement('label');
		labelEl.textContent = label;
		labelEl.style.fontWeight = '600';
		labelEl.style.cursor = 'pointer';

		wrapper.appendChild(input);
		wrapper.appendChild(labelEl);

		// Make label clickable
		labelEl.addEventListener('click', () => {
			input.checked = !input.checked;
		});

		return wrapper;
	}

	getValue() {
		const type = this.typeSelect.value;
		if (!type) return null;

		const result = {};

		switch (type) {
			case 'leaveNormally':
			case 'leaveShinecharged':
			case 'leaveWithSuperSink':
				result[type] = {};
				break;
			case 'leaveWithRunway':
				result[type] = this.getRunway();
				break;
			case 'leaveWithTemporaryBlue':
				result[type] = this.getDirection();
				break;
			case 'leaveWithSpark':
				result[type] = this.getSparkPosition();
				break;
			case 'leaveSpinning':
			case 'leaveWithMockball':
			case 'leaveWithSpringBallBounce':
			case 'leaveSpaceJumping':
				result[type] = this.getRemoteRunway();
				break;
			case 'leaveWithStoredFallSpeed':
				result[type] = this.getFallSpeed();
				break;
			case 'leaveWithDoorFrameBelow':
				result[type] = this.getDoorFrameHeight();
				break;
			case 'leaveWithPlatformBelow':
				result[type] = this.getPlatformBelow();
				break;
			case 'leaveWithGrappleJump':
				result[type] = this.getGrappleJumpPosition();
				break;
		}

		return result;
	}

	// getValue helper methods
	getRunway() {
		const obj = {
			length: parseFloat(this.lengthInput.value),
			openEnd: parseInt(this.openEndInput.value)
		};
		if (this.gentleUpTilesInput.value) obj.gentleUpTiles = parseInt(this.gentleUpTilesInput.value);
		if (this.gentleDownTilesInput.value) obj.gentleDownTiles = parseInt(this.gentleDownTilesInput.value);
		if (this.steepUpTilesInput.value) obj.steepUpTiles = parseInt(this.steepUpTilesInput.value);
		if (this.steepDownTilesInput.value) obj.steepDownTiles = parseInt(this.steepDownTilesInput.value);
		if (this.startingDownTilesInput.value) obj.startingDownTiles = parseInt(this.startingDownTilesInput.value);
		if (this.minExtraRunSpeedInput.value) obj.minExtraRunSpeed = this.minExtraRunSpeedInput.value;
		if (this.heatedCheckbox.checked) obj.heated = true;
		if (this.coldCheckbox.checked) obj.cold = true;
		return obj;
	}

	getDirection() {
		const obj = {};
		if (this.directionSelect.value) obj.direction = this.directionSelect.value;
		return obj;
	}

	getSparkPosition() {
		const obj = {};
		if (this.positionSelect.value) obj.position = this.positionSelect.value;
		return obj;
	}

	getRemoteRunway() {
		const type = this.typeSelect.value;
		const obj = {
			remoteRunway: {
				length: parseFloat(this.remoteRunwayLengthInput.value),
				openEnd: parseInt(this.remoteRunwayOpenEndInput.value)
			}
		};

		if (type === 'leaveWithMockball' || type === 'leaveWithSpringBallBounce') {
			obj.landingRunway = {
				length: parseFloat(this.landingRunwayLengthInput.value),
				openEnd: parseInt(this.landingRunwayOpenEndInput.value)
			};
		}

		if (type === 'leaveWithSpringBallBounce') {
			obj.movementType = this.movementTypeSelect.value;
		}

		if (this.minExtraRunSpeedInput.value) obj.minExtraRunSpeed = this.minExtraRunSpeedInput.value;
		if (this.maxExtraRunSpeedInput.value) obj.maxExtraRunSpeed = this.maxExtraRunSpeedInput.value;
		if (this.blueSelect.value) obj.blue = this.blueSelect.value;

		return obj;
	}

	getFallSpeed() {
		return {
			fallSpeedInTiles: parseInt(this.fallSpeedInTilesInput.value)
		};
	}

	getDoorFrameHeight() {
		return {
			height: parseFloat(this.heightInput.value)
		};
	}

	getPlatformBelow() {
		return {
			height: parseFloat(this.heightInput.value),
			leftPosition: parseFloat(this.leftPositionInput.value),
			rightPosition: parseFloat(this.rightPositionInput.value)
		};
	}

	getGrappleJumpPosition() {
		return {
			position: this.positionSelect.value
		};
	}

	remove() {
		this.root.remove();
	}
}