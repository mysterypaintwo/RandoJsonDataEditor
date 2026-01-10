/* =============================================================================
   Entrance Condition Editor

   Specialized editor for entrance conditions that match the room schema.
   Handles the complex nested structure of cross-room transitions.
   ============================================================================= */

class EntranceConditionEditor {
    constructor(container, initialData = null) {
        this.container = container;
        this.initialData = initialData;
        this.validationErrors = [];
        this.createElement();
    }

    createElement() {
        this.root = document.createElement('div');
        this.root.className = 'condition-editor-root entrance-condition';

        this.typeSelect = document.createElement('select');
        this.typeSelect.className = 'condition-type-select';

        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '(no entrance condition)';
        this.typeSelect.appendChild(emptyOption);

        const entranceTypes = [
            { value: 'comeInNormally', label: 'Come In Normally', desc: 'Standard entry through door' },
            { value: 'comeInRunning', label: 'Come In Running', desc: 'Running with specified speed' },
            { value: 'comeInJumping', label: 'Come In Jumping', desc: 'Jumping through with momentum' },
            { value: 'comeInSpaceJumping', label: 'Come In Space Jumping', desc: 'Space jump through bottom' },
            { value: 'comeInBlueSpaceJumping', label: 'Come In Blue Space Jumping', desc: 'Blue speed + space jump' },
            { value: 'comeInShinecharging', label: 'Come In Shinecharging', desc: 'Complete shinecharge in this room' },
            { value: 'comeInGettingBlueSpeed', label: 'Come In Getting Blue Speed', desc: 'Finish gaining blue speed' },
            { value: 'comeInShinecharged', label: 'Come In Shinecharged', desc: 'Already shinecharged' },
            { value: 'comeInShinechargedJumping', label: 'Come In Shinecharged Jumping', desc: 'Shinecharged jump from air room' },
            { value: 'comeInWithSpark', label: 'Come In With Spark', desc: 'Shinesparking through door' },
            { value: 'comeInStutterShinecharging', label: 'Come In Stutter Shinecharging', desc: 'After stuttering in previous room' },
            { value: 'comeInWithBombBoost', label: 'Come In With Bomb Boost', desc: 'Horizontal bomb boost' },
            { value: 'comeInWithDoorStuckSetup', label: 'Come In With Door Stuck Setup', desc: 'Setup for door stuck (X-ray climb)' },
            { value: 'comeInSpeedballing', label: 'Come In Speedballing', desc: 'In speedball or transitioning to it' },
            { value: 'comeInWithTemporaryBlue', label: 'Come In With Temporary Blue', desc: 'Jumping with temporary blue' },
            { value: 'comeInSpinning', label: 'Come In Spinning', desc: 'Spin jump with specified speed' },
            { value: 'comeInBlueSpinning', label: 'Come In Blue Spinning', desc: 'Spin jump with blue speed' },
            { value: 'comeInWithMockball', label: 'Come In With Mockball', desc: 'Mockball entry' },
            { value: 'comeInWithSpringBallBounce', label: 'Come In With Spring Ball Bounce', desc: 'Spring ball bounce in doorway' },
            { value: 'comeInWithBlueSpringBallBounce', label: 'Come In With Blue Spring Ball Bounce', desc: 'Blue spring ball bounce' },
            { value: 'comeInWithStoredFallSpeed', label: 'Come In With Stored Fall Speed', desc: 'High fall speed for moonfall clip' },
            { value: 'comeInWithWallJumpBelow', label: 'Come In With Wall Jump Below', desc: 'Wall jump in door frame' },
            { value: 'comeInWithSpaceJumpBelow', label: 'Come In With Space Jump Below', desc: 'Space jump in door frame' },
            { value: 'comeInWithPlatformBelow', label: 'Come In With Platform Below', desc: 'Jump from platform below' },
            { value: 'comeInWithGrappleJump', label: 'Come In With Grapple Jump', desc: 'Vertical grapple jump' },
            { value: 'comeInWithSuperSink', label: 'Come In With Super Sink', desc: 'Morphed with super sink fall speed' }
        ];

        entranceTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.value;
            option.textContent = type.label;
            option.title = type.desc;
            this.typeSelect.appendChild(option);
        });

        this.contentArea = document.createElement('div');
        this.contentArea.className = 'condition-content-area';

        this.root.appendChild(this.typeSelect);
        this.root.appendChild(this.contentArea);
        this.container.appendChild(this.root);

        if (this.initialData && typeof this.initialData === 'object') {
            const type = Object.keys(this.initialData).find(k => k !== 'comesThroughToilet' && k !== 'devNote');
            if (type) this.typeSelect.value = type;
        }

        this.typeSelect.addEventListener('change', () => this.renderContent());
        this.renderContent();
    }

    renderContent() {
        this.contentArea.innerHTML = '';
        this.validationErrors = [];
        const type = this.typeSelect.value;
        if (!type) return;

        const typeData = this.initialData?.[type] || {};

        switch (type) {
            case 'comeInNormally':
            case 'comeInShinecharged':
            case 'comeInShinechargedJumping':
            case 'comeInWithBombBoost':
            case 'comeInWithDoorStuckSetup':
            case 'comeInWithSuperSink':
                this.renderEmpty();
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

        if (type && type !== 'comeInNormally') {
            this.renderComesThroughToilet();
        }
    }

    renderEmpty() {
        const note = document.createElement('div');
        note.className = 'empty-condition-note';
        note.textContent = '✓ No additional properties required';
        this.contentArea.appendChild(note);
    }

    createField(label, input, tooltip = null) {
        const wrapper = document.createElement('div');
        wrapper.className = 'field-wrapper';

        const labelEl = document.createElement('label');
        labelEl.className = 'field-label';
        labelEl.textContent = label;
        
        if (tooltip) {
            labelEl.title = tooltip;
            labelEl.style.cursor = 'help';
            labelEl.innerHTML += ' <span class="tooltip-icon">?</span>';
        }

        wrapper.appendChild(labelEl);
        wrapper.appendChild(input);
        return wrapper;
    }

    createSelect(label, options, value, tooltip = null) {
        const select = document.createElement('select');
        select.className = 'field-input';
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            if (opt.value === value) option.selected = true;
            select.appendChild(option);
        });
        return this.createField(label, select, tooltip);
    }

    createNumber(label, value, min, max, step, tooltip = null) {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'field-input';
        input.min = min;
        input.max = max;
        input.step = step;
        if (value !== undefined && value !== null) input.value = value;
        input.placeholder = tooltip || `${min}-${max}`;

        input.addEventListener('blur', () => {
            const validation = ValidationUtils.validateNumber(input.value, min, max, label);
            if (!validation.valid) {
                ValidationUtils.showFieldError(input, validation.message);
            } else {
                ValidationUtils.clearFieldError(input);
            }
        });

        return this.createField(label, input, tooltip);
    }

    createText(label, value, placeholder = '', tooltip = null, validator = null) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'field-input';
        input.placeholder = placeholder;
        if (value) input.value = value;

        if (validator) {
            input.addEventListener('blur', () => {
                const validation = validator(input.value);
                if (!validation.valid) {
                    ValidationUtils.showFieldError(input, validation.message);
                } else {
                    ValidationUtils.clearFieldError(input);
                }
            });
        }

        return this.createField(label, input, tooltip);
    }

    renderSpeedBoosterMinMaxTiles(data) {
        const speedBooster = this.createSelect('Speed Booster', [
            { value: 'true', label: 'Required' },
            { value: 'false', label: 'Not Equipped' },
            { value: 'any', label: 'Any' }
        ], data.speedBooster !== undefined ? String(data.speedBooster) : 'any', 'Whether Speed Booster must be equipped');

        const minTiles = this.createNumber('Min Tiles', data.minTiles, 0, 45, 0.5, 'Minimum runway length in tiles');
        const maxTiles = this.createNumber('Max Tiles (optional)', data.maxTiles, 0, 45, 0.5, 'Maximum runway length (leave empty for no limit)');

        this.contentArea.appendChild(speedBooster);
        this.contentArea.appendChild(minTiles);
        this.contentArea.appendChild(maxTiles);

        this.speedBoosterSelect = speedBooster.querySelector('select');
        this.minTilesInput = minTiles.querySelector('input');
        this.maxTilesInput = maxTiles.querySelector('input');
    }

    renderExtraRunSpeed(data) {
        const minSpeed = this.createText('Min Extra Run Speed', data.minExtraRunSpeed, '$4.0', 
            'Minimum extra run speed in hex format (e.g., $4.0)', ValidationUtils.validateHexSpeed);
        const maxSpeed = this.createText('Max Extra Run Speed (optional)', data.maxExtraRunSpeed, '$F.8',
            'Maximum extra run speed in hex format (e.g., $F.8)', ValidationUtils.validateHexSpeed);

        this.contentArea.appendChild(minSpeed);
        this.contentArea.appendChild(maxSpeed);

        this.minExtraRunSpeedInput = minSpeed.querySelector('input');
        this.maxExtraRunSpeedInput = maxSpeed.querySelector('input');
    }

    renderRunway(data, includeSpeed = false) {
        const fields = [
            this.createNumber('Runway Length', data.length, 0, 45, 0.5, 'Available runway in tiles'),
            this.createNumber('Open Ends', data.openEnd, 0, 1, 1, '0 = both walls, 1 = one open end'),
            this.createNumber('Gentle Up Tiles (optional)', data.gentleUpTiles, 0, 45, 1, 'Tiles that slope up gently (½ tile)'),
            this.createNumber('Gentle Down Tiles (optional)', data.gentleDownTiles, 0, 45, 1, 'Tiles that slope down gently (½ tile)'),
            this.createNumber('Steep Up Tiles (optional)', data.steepUpTiles, 0, 45, 1, 'Tiles that slope up steeply (1 tile)'),
            this.createNumber('Steep Down Tiles (optional)', data.steepDownTiles, 0, 45, 1, 'Tiles that slope down steeply (1 tile)')
        ];

        fields.forEach(f => this.contentArea.appendChild(f));

        this.lengthInput = fields[0].querySelector('input');
        this.openEndInput = fields[1].querySelector('input');
        this.gentleUpTilesInput = fields[2].querySelector('input');
        this.gentleDownTilesInput = fields[3].querySelector('input');
        this.steepUpTilesInput = fields[4].querySelector('input');
        this.steepDownTilesInput = fields[5].querySelector('input');

        if (includeSpeed) {
            const minSpeed = this.createText('Min Extra Run Speed (optional)', data.minExtraRunSpeed, '$4.0',
                'Minimum speed in hex', ValidationUtils.validateHexSpeed);
            const maxSpeed = this.createText('Max Extra Run Speed (optional)', data.maxExtraRunSpeed, '$F.8',
                'Maximum speed in hex', ValidationUtils.validateHexSpeed);
            this.contentArea.appendChild(minSpeed);
            this.contentArea.appendChild(maxSpeed);
            this.minExtraRunSpeedInput = minSpeed.querySelector('input');
            this.maxExtraRunSpeedInput = maxSpeed.querySelector('input');
        }
    }

    renderSparkPosition(data) {
        const position = this.createSelect('Position (optional)', [
            { value: '', label: '(any)' },
            { value: 'top', label: 'Top' },
            { value: 'bottom', label: 'Bottom' }
        ], data.position || '', 'Required position in doorway');
        this.contentArea.appendChild(position);
        this.positionSelect = position.querySelector('select');
    }

    renderMinTiles(data) {
        const minTiles = this.createNumber('Min Tiles', data.minTiles, 0, 45, 0.5, 'Minimum effective runway tiles in other room');
        this.contentArea.appendChild(minTiles);
        this.minTilesInput = minTiles.querySelector('input');
    }

    renderSpeedballing(data) {
        const runway = data.runway || {};
        const length = this.createNumber('Runway Length', runway.length, 0, 45, 0.5, 'Runway in current room');
        const openEnd = this.createNumber('Open Ends', runway.openEnd, 0, 2, 1, 'Number of open ends');
        const minSpeed = this.createText('Min Extra Run Speed (optional)', data.minExtraRunSpeed, '$4.0', 'Min speed in hex', ValidationUtils.validateHexSpeed);
        const maxSpeed = this.createText('Max Extra Run Speed (optional)', data.maxExtraRunSpeed, '$F.8', 'Max speed in hex', ValidationUtils.validateHexSpeed);

        [length, openEnd, minSpeed, maxSpeed].forEach(f => this.contentArea.appendChild(f));

        this.runwayLengthInput = length.querySelector('input');
        this.runwayOpenEndInput = openEnd.querySelector('input');
        this.minExtraRunSpeedInput = minSpeed.querySelector('input');
        this.maxExtraRunSpeedInput = maxSpeed.querySelector('input');
    }

    renderDirection(data) {
        const direction = this.createSelect('Direction (optional)', [
            { value: '', label: '(any)' },
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
            { value: 'any', label: 'Any' }
        ], data.direction || '', 'Direction Samus faces through transition (vertical only)');
        this.contentArea.appendChild(direction);
        this.directionSelect = direction.querySelector('select');
    }

    renderSpinning(data) {
        const speedBooster = this.createSelect('Speed Booster', [
            { value: 'true', label: 'Required' },
            { value: 'false', label: 'Not Equipped' },
            { value: 'any', label: 'Any' }
        ], data.speedBooster !== undefined ? String(data.speedBooster) : 'any');

        const unusable = this.createNumber('Unusable Tiles', data.unusableTiles, 0, 45, 0.5, 'Tiles before door unusable for gaining speed');
        const minSpeed = this.createText('Min Extra Run Speed (optional)', data.minExtraRunSpeed, '$4.0', 'Min speed in hex', ValidationUtils.validateHexSpeed);
        const maxSpeed = this.createText('Max Extra Run Speed (optional)', data.maxExtraRunSpeed, '$F.8', 'Max speed in hex', ValidationUtils.validateHexSpeed);

        [speedBooster, unusable, minSpeed, maxSpeed].forEach(f => this.contentArea.appendChild(f));

        this.speedBoosterSelect = speedBooster.querySelector('select');
        this.unusableTilesInput = unusable.querySelector('input');
        this.minExtraRunSpeedInput = minSpeed.querySelector('input');
        this.maxExtraRunSpeedInput = maxSpeed.querySelector('input');
    }

    renderBlueSpinning(data) {
        const unusable = this.createNumber('Unusable Tiles', data.unusableTiles, 0, 45, 0.5, 'Tiles before door unusable for gaining blue speed');
        const minSpeed = this.createText('Min Extra Run Speed (optional)', data.minExtraRunSpeed, '$4.0', 'Min speed in hex', ValidationUtils.validateHexSpeed);
        const maxSpeed = this.createText('Max Extra Run Speed (optional)', data.maxExtraRunSpeed, '$F.8', 'Max speed in hex', ValidationUtils.validateHexSpeed);

        [unusable, minSpeed, maxSpeed].forEach(f => this.contentArea.appendChild(f));

        this.unusableTilesInput = unusable.querySelector('input');
        this.minExtraRunSpeedInput = minSpeed.querySelector('input');
        this.maxExtraRunSpeedInput = maxSpeed.querySelector('input');
    }

    renderMockball(data) {
        const speedBooster = this.createSelect('Speed Booster', [
            { value: 'true', label: 'Required' },
            { value: 'false', label: 'Not Equipped' },
            { value: 'any', label: 'Any' }
        ], data.speedBooster !== undefined ? String(data.speedBooster) : 'any');

        const adjacent = this.createNumber('Adjacent Min Tiles (optional)', data.adjacentMinTiles, 0, 45, 0.5, 'Runway in front of door for mockball setup');

        [speedBooster, adjacent].forEach(f => this.contentArea.appendChild(f));

        this.speedBoosterSelect = speedBooster.querySelector('select');
        this.adjacentMinTilesInput = adjacent.querySelector('input');
    }

    renderSpringBallBounce(data) {
        const speedBooster = this.createSelect('Speed Booster', [
            { value: 'true', label: 'Required' },
            { value: 'false', label: 'Not Equipped' },
            { value: 'any', label: 'Any' }
        ], data.speedBooster !== undefined ? String(data.speedBooster) : 'any');

        const movement = this.createSelect('Movement Type', [
            { value: 'controlled', label: 'Controlled' },
            { value: 'uncontrolled', label: 'Uncontrolled' },
            { value: 'any', label: 'Any' }
        ], data.movementType || 'any', 'Type of spring ball bounce');

        const adjacent = this.createNumber('Adjacent Min Tiles (optional)', data.adjacentMinTiles, 0, 45, 0.5, 'Runway for bounce setup');

        [speedBooster, movement, adjacent].forEach(f => this.contentArea.appendChild(f));

        this.speedBoosterSelect = speedBooster.querySelector('select');
        this.movementTypeSelect = movement.querySelector('select');
        this.adjacentMinTilesInput = adjacent.querySelector('input');
    }

    renderBlueSpringBallBounce(data) {
        const movement = this.createSelect('Movement Type', [
            { value: 'controlled', label: 'Controlled' },
            { value: 'uncontrolled', label: 'Uncontrolled' },
            { value: 'any', label: 'Any' }
        ], data.movementType || 'any');

        const minSpeed = this.createText('Min Extra Run Speed (optional)', data.minExtraRunSpeed, '$4.0', 'Min speed in hex', ValidationUtils.validateHexSpeed);
        const maxSpeed = this.createText('Max Extra Run Speed (optional)', data.maxExtraRunSpeed, '$F.8', 'Max speed in hex', ValidationUtils.validateHexSpeed);
        const minLanding = this.createNumber('Min Landing Tiles (optional)', data.minLandingTiles, 0, 45, 0.5, 'Minimum landing runway length');

        [movement, minSpeed, maxSpeed, minLanding].forEach(f => this.contentArea.appendChild(f));

        this.movementTypeSelect = movement.querySelector('select');
        this.minExtraRunSpeedInput = minSpeed.querySelector('input');
        this.maxExtraRunSpeedInput = maxSpeed.querySelector('input');
        this.minLandingTilesInput = minLanding.querySelector('input');
    }

    renderFallSpeed(data) {
        const fallSpeed = this.createNumber('Fall Speed in Tiles', data.fallSpeedInTiles, 0, 2, 1, 'Tiles that will clip through on next moonfall');
        this.contentArea.appendChild(fallSpeed);
        this.fallSpeedInTilesInput = fallSpeed.querySelector('input');
    }

    renderMinHeight(data) {
        const minHeight = this.createNumber('Min Height (optional)', data.minHeight, 0, 100, 0.5, 'Minimum height of door frame');
        this.contentArea.appendChild(minHeight);
        this.minHeightInput = minHeight.querySelector('input');
    }

    renderPlatformBelow(data) {
        const fields = [
            this.createNumber('Min Height (optional)', data.minHeight, 0, 100, 0.5, 'Minimum platform height'),
            this.createNumber('Max Height (optional)', data.maxHeight, 0, 100, 0.5, 'Maximum platform height'),
            this.createNumber('Max Left Position (optional)', data.maxLeftPosition, -100, 100, 0.5, 'Platform left edge position'),
            this.createNumber('Min Right Position (optional)', data.minRightPosition, -100, 100, 0.5, 'Platform right edge position')
        ];

        fields.forEach(f => this.contentArea.appendChild(f));

        this.minHeightInput = fields[0].querySelector('input');
        this.maxHeightInput = fields[1].querySelector('input');
        this.maxLeftPositionInput = fields[2].querySelector('input');
        this.minRightPositionInput = fields[3].querySelector('input');
    }

    renderGrappleJumpPosition(data) {
        const position = this.createSelect('Position', [
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
            { value: 'any', label: 'Any' }
        ], data.position || 'any', 'Horizontal position in doorway when exiting');
        this.contentArea.appendChild(position);
        this.positionSelect = position.querySelector('select');
    }

    renderComesThroughToilet() {
        const divider = document.createElement('div');
        divider.className = 'field-divider';

        const toilet = this.createSelect('Comes Through Toilet', [
            { value: 'no', label: 'No' },
            { value: 'yes', label: 'Yes' },
            { value: 'any', label: 'Any' }
        ], this.initialData?.comesThroughToilet || 'no', 'Whether toilet passage is between rooms');

        divider.appendChild(toilet);
        this.contentArea.appendChild(divider);
        this.comesThroughToiletSelect = toilet.querySelector('select');
    }

    validate() {
        // Validate all hex speed fields
        const hexFields = [
            this.minExtraRunSpeedInput,
            this.maxExtraRunSpeedInput
        ].filter(Boolean);

        let isValid = true;
        hexFields.forEach(input => {
            if (input && input.value) {
                const validation = ValidationUtils.validateHexSpeed(input.value);
                if (!validation.valid) {
                    ValidationUtils.showFieldError(input, validation.message);
                    isValid = false;
                } else {
                    ValidationUtils.clearFieldError(input);
                }
            }
        });

        return isValid;
    }

    getValue() {
        if (!this.validate()) {
            return null;
        }

        const type = this.typeSelect.value;
        if (!type) return null;

        const result = {};

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
        return { minTiles: parseFloat(this.minTilesInput.value) };
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
        return { fallSpeedInTiles: parseInt(this.fallSpeedInTilesInput.value) };
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
        return { position: this.positionSelect.value };
    }

    remove() {
        this.root.remove();
    }
}