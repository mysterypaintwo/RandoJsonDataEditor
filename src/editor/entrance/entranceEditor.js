/* =============================================================================
   Exit Condition Editor

   Specialized editor for exit conditions that match the room schema.
   Handles the complex nested structure of cross-room transitions.
   ============================================================================= */

class EntranceConditionEditor {
	constructor(container, initialData = null) {
		this.container = container;
		this.initialData = initialData;
		this.createElement();
	}

	createElement() {
		this.root = document.createElement('div');
		this.root.className = 'entrance-condition-editor';
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
		emptyOption.textContent = '(no entrance condition)';
		this.typeSelect.appendChild(emptyOption);

		// Add all entrance condition types from schema
		const entranceTypes = [{
				value: 'comeInNormally',
				label: 'Come In Normally'
			},
			{
				value: 'comeInRunning',
				label: 'Come In Running'
			},
			{
				value: 'comeInJumping',
				label: 'Come In Jumping'
			},
			{
				value: 'comeInSpaceJumping',
				label: 'Come In Space Jumping'
			},
			{
				value: 'comeInBlueSpaceJumping',
				label: 'Come In Blue Space Jumping'
			},
			{
				value: 'comeInShinecharging',
				label: 'Come In Shinecharging'
			},
			{
				value: 'comeInGettingBlueSpeed',
				label: 'Come In Getting Blue Speed'
			},
			{
				value: 'comeInShinecharged',
				label: 'Come In Shinecharged'
			},
			{
				value: 'comeInShinechargedJumping',
				label: 'Come In Shinecharged Jumping'
			},
			{
				value: 'comeInWithSpark',
				label: 'Come In With Spark'
			},
			{
				value: 'comeInStutterShinecharging',
				label: 'Come In Stutter Shinecharging'
			},
			{
				value: 'comeInWithBombBoost',
				label: 'Come In With Bomb Boost'
			},
			{
				value: 'comeInWithDoorStuckSetup',
				label: 'Come In With Door Stuck Setup'
			},
			{
				value: 'comeInSpeedballing',
				label: 'Come In Speedballing'
			},
			{
				value: 'comeInWithTemporaryBlue',
				label: 'Come In With Temporary Blue'
			},
			{
				value: 'comeInSpinning',
				label: 'Come In Spinning'
			},
			{
				value: 'comeInBlueSpinning',
				label: 'Come In Blue Spinning'
			},
			{
				value: 'comeInWithMockball',
				label: 'Come In With Mockball'
			},
			{
				value: 'comeInWithSpringBallBounce',
				label: 'Come In With Spring Ball Bounce'
			},
			{
				value: 'comeInWithBlueSpringBallBounce',
				label: 'Come In With Blue Spring Ball Bounce'
			},
			{
				value: 'comeInWithStoredFallSpeed',
				label: 'Come In With Stored Fall Speed'
			},
			{
				value: 'comeInWithWallJumpBelow',
				label: 'Come In With Wall Jump Below'
			},
			{
				value: 'comeInWithSpaceJumpBelow',
				label: 'Come In With Space Jump Below'
			},
			{
				value: 'comeInWithPlatformBelow',
				label: 'Come In With Platform Below'
			},
			{
				value: 'comeInWithGrappleJump',
				label: 'Come In With Grapple Jump'
			},
			{
				value: 'comeInWithSuperSink',
				label: 'Come In With Super Sink'
			}
		];

		entranceTypes.forEach(type => {
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
			const type = Object.keys(this.initialData).find(k => k !== 'comesThroughToilet' && k !== 'devNote');
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

		// Render type-specific fields
		switch (type) {
			case 'comeInNormally':
			case 'comeInShinecharged':
			case 'comeInShinechargedJumping':
			case 'comeInWithBombBoost':
			case 'comeInWithDoorStuckSetup':
			case 'comeInWithSuperSink':
				this.renderEmptyObject();
				break;
			case 'comeInRunning':
			case 'comeInJumping':
			case 'comeInSpaceJumping':
				this.renderSpeedBoosterMinMaxTiles(typeData);
				break;
			case 'comeInBlueSpaceJumping':
				this.renderExtraRunSpeed(typeData);
				break;
			case 'comeInShinecharging':
			case 'comeInGettingBlueSpeed':
				this.renderRunway(typeData, type === 'comeInGettingBlueSpeed');
				break;
			case 'comeInWithSpark':
				this.renderSparkPosition(typeData);
				break;
			case 'comeInStutterShinecharging':
				this.renderMinTiles(typeData);
				break;
			case 'comeInSpeedballing':
				this.renderSpeedballing(typeData);
				break;
			case 'comeInWithTemporaryBlue':
				this.renderDirection(typeData);
				break;
			case 'comeInSpinning':
				this.renderSpinning(typeData);
				break;
			case 'comeInBlueSpinning':
				this.renderBlueSpinning(typeData);
				break;
			case 'comeInWithMockball':
				this.renderMockball(typeData);
				break;
			case 'comeInWithSpringBallBounce':
				this.renderSpringBallBounce(typeData);
				break;
			case 'comeInWithBlueSpringBallBounce':
				this.renderBlueSpringBallBounce(typeData);
				break;
			case 'comeInWithStoredFallSpeed':
				this.renderFallSpeed(typeData);
				break;
			case 'comeInWithWallJumpBelow':
			case 'comeInWithSpaceJumpBelow':
				this.renderMinHeight(typeData);
				break;
			case 'comeInWithPlatformBelow':
				this.renderPlatformBelow(typeData);
				break;
			case 'comeInWithGrappleJump':
				this.renderGrappleJumpPosition(typeData);
				break;
		}

		// Add comesThroughToilet for vertical transitions
		if (type && type !== 'comeInNormally') {
			this.renderComesThroughToilet();
		}
	}

	renderEmptyObject() {
		const note = document.createElement('div');
		note.style.fontStyle = 'italic';
		note.style.color = '#666';
		note.textContent = 'No additional properties required';
		this.contentArea.appendChild(note);
	}

	renderSpeedBoosterMinMaxTiles(data) {
		const speedBoosterSelect = this.createSelect('Speed Booster', [{
				value: 'true',
				label: 'Required'
			},
			{
				value: 'false',
				label: 'Not equipped'
			},
			{
				value: 'any',
				label: 'Any'
			}
		], data.speedBooster !== undefined ? String(data.speedBooster) : 'any');

		const minTiles = this.createNumber('Min Tiles', data.minTiles, 0, 45, 0.5);
		const maxTiles = this.createNumber('Max Tiles (optional)', data.maxTiles, 0, 45, 0.5);

		this.contentArea.appendChild(speedBoosterSelect);
		this.contentArea.appendChild(minTiles);
		this.contentArea.appendChild(maxTiles);

		this.speedBoosterSelect = speedBoosterSelect.querySelector('select');
		this.minTilesInput = minTiles.querySelector('input');
		this.maxTilesInput = maxTiles.querySelector('input');
	}

	renderExtraRunSpeed(data) {
		const minSpeed = this.createText('Min Extra Run Speed (hex)', data.minExtraRunSpeed, '$0.0');
		const maxSpeed = this.createText('Max Extra Run Speed (hex, optional)', data.maxExtraRunSpeed, '$F.F');
		this.contentArea.appendChild(minSpeed);
		this.contentArea.appendChild(maxSpeed);
		this.minExtraRunSpeedInput = minSpeed.querySelector('input');
		this.maxExtraRunSpeedInput = maxSpeed.querySelector('input');
	}

	renderRunway(data, includeSpeed = false) {
		const length = this.createNumber('Length', data.length, 0, 45, 0.5);
		const openEnd = this.createNumber('Open Ends', data.openEnd, 0, 1, 1);
		const gentleUp = this.createNumber('Gentle Up Tiles (optional)', data.gentleUpTiles, 0, 45, 1);
		const gentleDown = this.createNumber('Gentle Down Tiles (optional)', data.gentleDownTiles, 0, 45, 1);
		const steepUp = this.createNumber('Steep Up Tiles (optional)', data.steepUpTiles, 0, 45, 1);
		const steepDown = this.createNumber('Steep Down Tiles (optional)', data.steepDownTiles, 0, 45, 1);

		this.contentArea.appendChild(length);
		this.contentArea.appendChild(openEnd);
		this.contentArea.appendChild(gentleUp);
		this.contentArea.appendChild(gentleDown);
		this.contentArea.appendChild(steepUp);
		this.contentArea.appendChild(steepDown);

		this.lengthInput = length.querySelector('input');
		this.openEndInput = openEnd.querySelector('input');
		this.gentleUpTilesInput = gentleUp.querySelector('input');
		this.gentleDownTilesInput = gentleDown.querySelector('input');
		this.steepUpTilesInput = steepUp.querySelector('input');
		this.steepDownTilesInput = steepDown.querySelector('input');

		if (includeSpeed) {
			const minSpeed = this.createText('Min Extra Run Speed (hex, optional)', data.minExtraRunSpeed);
			const maxSpeed = this.createText('Max Extra Run Speed (hex, optional)', data.maxExtraRunSpeed);
			this.contentArea.appendChild(minSpeed);
			this.contentArea.appendChild(maxSpeed);
			this.minExtraRunSpeedInput = minSpeed.querySelector('input');
			this.maxExtraRunSpeedInput = maxSpeed.querySelector('input');
		}
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

	renderMinTiles(data) {
		const minTiles = this.createNumber('Min Tiles', data.minTiles, 0, 45, 0.5);
		this.contentArea.appendChild(minTiles);
		this.minTilesInput = minTiles.querySelector('input');
	}

	renderSpeedballing(data) {
		const runway = data.runway || {};
		const length = this.createNumber('Runway Length', runway.length, 0, 45, 0.5);
		const openEnd = this.createNumber('Runway Open Ends', runway.openEnd, 0, 2, 1);
		const minSpeed = this.createText('Min Extra Run Speed (hex, optional)', data.minExtraRunSpeed);
		const maxSpeed = this.createText('Max Extra Run Speed (hex, optional)', data.maxExtraRunSpeed);

		this.contentArea.appendChild(length);
		this.contentArea.appendChild(openEnd);
		this.contentArea.appendChild(minSpeed);
		this.contentArea.appendChild(maxSpeed);

		this.runwayLengthInput = length.querySelector('input');
		this.runwayOpenEndInput = openEnd.querySelector('input');
		this.minExtraRunSpeedInput = minSpeed.querySelector('input');
		this.maxExtraRunSpeedInput = maxSpeed.querySelector('input');
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

	renderSpinning(data) {
		const speedBooster = this.createSelect('Speed Booster', [{
				value: 'true',
				label: 'Required'
			},
			{
				value: 'false',
				label: 'Not equipped'
			},
			{
				value: 'any',
				label: 'Any'
			}
		], data.speedBooster !== undefined ? String(data.speedBooster) : 'any');

		const unusable = this.createNumber('Unusable Tiles', data.unusableTiles, 0, 45, 0.5);
		const minSpeed = this.createText('Min Extra Run Speed (hex, optional)', data.minExtraRunSpeed);
		const maxSpeed = this.createText('Max Extra Run Speed (hex, optional)', data.maxExtraRunSpeed);

		this.contentArea.appendChild(speedBooster);
		this.contentArea.appendChild(unusable);
		this.contentArea.appendChild(minSpeed);
		this.contentArea.appendChild(maxSpeed);

		this.speedBoosterSelect = speedBooster.querySelector('select');
		this.unusableTilesInput = unusable.querySelector('input');
		this.minExtraRunSpeedInput = minSpeed.querySelector('input');
		this.maxExtraRunSpeedInput = maxSpeed.querySelector('input');
	}

	renderBlueSpinning(data) {
		const unusable = this.createNumber('Unusable Tiles', data.unusableTiles, 0, 45, 0.5);
		const minSpeed = this.createText('Min Extra Run Speed (hex, optional)', data.minExtraRunSpeed);
		const maxSpeed = this.createText('Max Extra Run Speed (hex, optional)', data.maxExtraRunSpeed);

		this.contentArea.appendChild(unusable);
		this.contentArea.appendChild(minSpeed);
		this.contentArea.appendChild(maxSpeed);

		this.unusableTilesInput = unusable.querySelector('input');
		this.minExtraRunSpeedInput = minSpeed.querySelector('input');
		this.maxExtraRunSpeedInput = maxSpeed.querySelector('input');
	}

	renderMockball(data) {
		const speedBooster = this.createSelect('Speed Booster', [{
				value: 'true',
				label: 'Required'
			},
			{
				value: 'false',
				label: 'Not equipped'
			},
			{
				value: 'any',
				label: 'Any'
			}
		], data.speedBooster !== undefined ? String(data.speedBooster) : 'any');

		const adjacent = this.createNumber('Adjacent Min Tiles (optional)', data.adjacentMinTiles, 0, 45, 0.5);

		this.contentArea.appendChild(speedBooster);
		this.contentArea.appendChild(adjacent);

		this.speedBoosterSelect = speedBooster.querySelector('select');
		this.adjacentMinTilesInput = adjacent.querySelector('input');
	}

	renderSpringBallBounce(data) {
		const speedBooster = this.createSelect('Speed Booster', [{
				value: 'true',
				label: 'Required'
			},
			{
				value: 'false',
				label: 'Not equipped'
			},
			{
				value: 'any',
				label: 'Any'
			}
		], data.speedBooster !== undefined ? String(data.speedBooster) : 'any');

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

		const adjacent = this.createNumber('Adjacent Min Tiles (optional)', data.adjacentMinTiles, 0, 45, 0.5);

		this.contentArea.appendChild(speedBooster);
		this.contentArea.appendChild(movement);
		this.contentArea.appendChild(adjacent);

		this.speedBoosterSelect = speedBooster.querySelector('select');
		this.movementTypeSelect = movement.querySelector('select');
		this.adjacentMinTilesInput = adjacent.querySelector('input');
	}

	renderBlueSpringBallBounce(data) {
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

		const minSpeed = this.createText('Min Extra Run Speed (hex, optional)', data.minExtraRunSpeed);
		const maxSpeed = this.createText('Max Extra Run Speed (hex, optional)', data.maxExtraRunSpeed);
		const minLanding = this.createNumber('Min Landing Tiles (optional)', data.minLandingTiles, 0, 45, 0.5);

		this.contentArea.appendChild(movement);
		this.contentArea.appendChild(minSpeed);
		this.contentArea.appendChild(maxSpeed);
		this.contentArea.appendChild(minLanding);

		this.movementTypeSelect = movement.querySelector('select');
		this.minExtraRunSpeedInput = minSpeed.querySelector('input');
		this.maxExtraRunSpeedInput = maxSpeed.querySelector('input');
		this.minLandingTilesInput = minLanding.querySelector('input');
	}

	renderFallSpeed(data) {
		const fallSpeed = this.createNumber('Fall Speed in Tiles', data.fallSpeedInTiles, 0, 2, 1);
		this.contentArea.appendChild(fallSpeed);
		this.fallSpeedInTilesInput = fallSpeed.querySelector('input');
	}

	renderMinHeight(data) {
		const minHeight = this.createNumber('Min Height (optional)', data.minHeight, 0, 100, 0.5);
		this.contentArea.appendChild(minHeight);
		this.minHeightInput = minHeight.querySelector('input');
	}

	renderPlatformBelow(data) {
		const minHeight = this.createNumber('Min Height (optional)', data.minHeight, 0, 100, 0.5);
		const maxHeight = this.createNumber('Max Height (optional)', data.maxHeight, 0, 100, 0.5);
		const maxLeft = this.createNumber('Max Left Position (optional)', data.maxLeftPosition, -100, 100, 0.5);
		const minRight = this.createNumber('Min Right Position (optional)', data.minRightPosition, -100, 100, 0.5);

		this.contentArea.appendChild(minHeight);
		this.contentArea.appendChild(maxHeight);
		this.contentArea.appendChild(maxLeft);
		this.contentArea.appendChild(minRight);

		this.minHeightInput = minHeight.querySelector('input');
		this.maxHeightInput = maxHeight.querySelector('input');
		this.maxLeftPositionInput = maxLeft.querySelector('input');
		this.minRightPositionInput = minRight.querySelector('input');
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

	renderComesThroughToilet() {
		const divider = document.createElement('div');
		divider.style.marginTop = '12px';
		divider.style.borderTop = '1px solid #ddd';
		divider.style.paddingTop = '8px';

		const toilet = this.createSelect('Comes Through Toilet', [{
				value: 'no',
				label: 'No'
			},
			{
				value: 'yes',
				label: 'Yes'
			},
			{
				value: 'any',
				label: 'Any'
			}
		], this.initialData?.comesThroughToilet || 'no');

		divider.appendChild(toilet);
		this.contentArea.appendChild(divider);
		this.comesThroughToiletSelect = toilet.querySelector('select');
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

	getValue() {
		const type = this.typeSelect.value;
		if (!type) return null;

		const result = {};

		// Build type-specific object
		switch (type) {
			case 'comeInNormally':
			case 'comeInShinecharged':
			case 'comeInShinechargedJumping':
			case 'comeInWithBombBoost':
			case 'comeInWithDoorStuckSetup':
			case 'comeInWithSuperSink':
				result[type] = {};
				break;

			case 'comeInRunning':
			case 'comeInJumping':
			case 'comeInSpaceJumping':
				result[type] = this.getSpeedBoosterMinMaxTiles();
				break;

			case 'comeInBlueSpaceJumping':
				result[type] = this.getExtraRunSpeed();
				break;

			case 'comeInShinecharging':
			case 'comeInGettingBlueSpeed':
				result[type] = this.getRunway(type === 'comeInGettingBlueSpeed');
				break;

			case 'comeInWithSpark':
				result[type] = this.getSparkPosition();
				break;

			case 'comeInStutterShinecharging':
				result[type] = this.getMinTiles();
				break;

			case 'comeInSpeedballing':
				result[type] = this.getSpeedballing();
				break;

			case 'comeInWithTemporaryBlue':
				result[type] = this.getDirection();
				break;

			case 'comeInSpinning':
				result[type] = this.getSpinning();
				break;

			case 'comeInBlueSpinning':
				result[type] = this.getBlueSpinning();
				break;

			case 'comeInWithMockball':
				result[type] = this.getMockball();
				break;

			case 'comeInWithSpringBallBounce':
				result[type] = this.getSpringBallBounce();
				break;

			case 'comeInWithBlueSpringBallBounce':
				result[type] = this.getBlueSpringBallBounce();
				break;

			case 'comeInWithStoredFallSpeed':
				result[type] = this.getFallSpeed();
				break;

			case 'comeInWithWallJumpBelow':
			case 'comeInWithSpaceJumpBelow':
				result[type] = this.getMinHeight();
				break;

			case 'comeInWithPlatformBelow':
				result[type] = this.getPlatformBelow();
				break;

			case 'comeInWithGrappleJump':
				result[type] = this.getGrappleJumpPosition();
				break;
		}

		// Add comesThroughToilet if present
		if (this.comesThroughToiletSelect && this.comesThroughToiletSelect.value !== 'no') {
			result.comesThroughToilet = this.comesThroughToiletSelect.value;
		}

		return result;
	}

	// getValue helper methods
	getSpeedBoosterMinMaxTiles() {
		const obj = {
			speedBooster: this.speedBoosterSelect.value === 'any' ? 'any' : (this.speedBoosterSelect.value === 'true'),
			minTiles: parseFloat(this.minTilesInput.value)
		};
		const maxTiles = parseFloat(this.maxTilesInput.value);
		if (maxTiles) obj.maxTiles = maxTiles;
		return obj;
	}

	getExtraRunSpeed() {
		const obj = {};
		if (this.minExtraRunSpeedInput.value) obj.minExtraRunSpeed = this.minExtraRunSpeedInput.value;
		if (this.maxExtraRunSpeedInput.value) obj.maxExtraRunSpeed = this.maxExtraRunSpeedInput.value;
		return obj;
	}

	getRunway(includeSpeed) {
		const obj = {
			length: parseFloat(this.lengthInput.value),
			openEnd: parseInt(this.openEndInput.value)
		};
		if (this.gentleUpTilesInput.value) obj.gentleUpTiles = parseInt(this.gentleUpTilesInput.value);
		if (this.gentleDownTilesInput.value) obj.gentleDownTiles = parseInt(this.gentleDownTilesInput.value);
		if (this.steepUpTilesInput.value) obj.steepUpTiles = parseInt(this.steepUpTilesInput.value);
		if (this.steepDownTilesInput.value) obj.steepDownTiles = parseInt(this.steepDownTilesInput.value);
		if (includeSpeed) {
			if (this.minExtraRunSpeedInput?.value) obj.minExtraRunSpeed = this.minExtraRunSpeedInput.value;
			if (this.maxExtraRunSpeedInput?.value) obj.maxExtraRunSpeed = this.maxExtraRunSpeedInput.value;
		}
		return obj;
	}

	getSparkPosition() {
		const obj = {};
		if (this.positionSelect.value) obj.position = this.positionSelect.value;
		return obj;
	}

	getMinTiles() {
		return {
			minTiles: parseFloat(this.minTilesInput.value)
		};
	}

	getSpeedballing() {
		const obj = {
			runway: {
				length: parseFloat(this.runwayLengthInput.value),
				openEnd: parseInt(this.runwayOpenEndInput.value)
			}
		};
		if (this.minExtraRunSpeedInput.value) obj.minExtraRunSpeed = this.minExtraRunSpeedInput.value;
		if (this.maxExtraRunSpeedInput.value) obj.maxExtraRunSpeed = this.maxExtraRunSpeedInput.value;
		return obj;
	}

	getDirection() {
		const obj = {};
		if (this.directionSelect.value) obj.direction = this.directionSelect.value;
		return obj;
	}

	getSpinning() {
		const obj = {
			speedBooster: this.speedBoosterSelect.value === 'any' ? 'any' : (this.speedBoosterSelect.value === 'true'),
			unusableTiles: parseFloat(this.unusableTilesInput.value)
		};
		if (this.minExtraRunSpeedInput.value) obj.minExtraRunSpeed = this.minExtraRunSpeedInput.value;
		if (this.maxExtraRunSpeedInput.value) obj.maxExtraRunSpeed = this.maxExtraRunSpeedInput.value;
		return obj;
	}

	getBlueSpinning() {
		const obj = {
			unusableTiles: parseFloat(this.unusableTilesInput.value)
		};
		if (this.minExtraRunSpeedInput.value) obj.minExtraRunSpeed = this.minExtraRunSpeedInput.value;
		if (this.maxExtraRunSpeedInput.value) obj.maxExtraRunSpeed = this.maxExtraRunSpeedInput.value;
		return obj;
	}

	getMockball() {
		const obj = {
			speedBooster: this.speedBoosterSelect.value === 'any' ? 'any' : (this.speedBoosterSelect.value === 'true')
		};
		if (this.adjacentMinTilesInput.value) obj.adjacentMinTiles = parseFloat(this.adjacentMinTilesInput.value);
		return obj;
	}

	getSpringBallBounce() {
		const obj = {
			speedBooster: this.speedBoosterSelect.value === 'any' ? 'any' : (this.speedBoosterSelect.value === 'true'),
			movementType: this.movementTypeSelect.value
		};
		if (this.adjacentMinTilesInput.value) obj.adjacentMinTiles = parseFloat(this.adjacentMinTilesInput.value);
		return obj;
	}

	getBlueSpringBallBounce() {
		const obj = {
			movementType: this.movementTypeSelect.value
		};
		if (this.minExtraRunSpeedInput.value) obj.minExtraRunSpeed = this.minExtraRunSpeedInput.value;
		if (this.maxExtraRunSpeedInput.value) obj.maxExtraRunSpeed = this.maxExtraRunSpeedInput.value;
		if (this.minLandingTilesInput.value) obj.minLandingTiles = parseFloat(this.minLandingTilesInput.value);
		return obj;
	}

	getFallSpeed() {
		return {
			fallSpeedInTiles: parseInt(this.fallSpeedInTilesInput.value)
		};
	}

	getMinHeight() {
		const obj = {};
		if (this.minHeightInput.value) obj.minHeight = parseFloat(this.minHeightInput.value);
		return obj;
	}

	getPlatformBelow() {
		const obj = {};
		if (this.minHeightInput.value) obj.minHeight = parseFloat(this.minHeightInput.value);
		if (this.maxHeightInput.value) obj.maxHeight = parseFloat(this.maxHeightInput.value);
		if (this.maxLeftPositionInput.value) obj.maxLeftPosition = parseFloat(this.maxLeftPositionInput.value);
		if (this.minRightPositionInput.value) obj.minRightPosition = parseFloat(this.minRightPositionInput.value);
		return obj;
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