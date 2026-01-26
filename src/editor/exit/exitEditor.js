/* =============================================================================
   Exit Condition Editor

   Specialized editor for exit conditions that match the room schema.
   Handles the complex nested structure of cross-room transitions.
   ============================================================================= */

class ExitConditionEditor {
    constructor(container, initialData = null) {
        this.container = container;
        this.initialData = initialData;
        this.validationErrors = [];
        this.createElement();
    }

    createElement() {
        this.root = document.createElement('div');
        this.root.className = 'condition-editor-root exit-condition';

        this.typeSelect = document.createElement('select');
        this.typeSelect.className = 'condition-type-select';

        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '(no exit condition)';
        this.typeSelect.appendChild(emptyOption);

        const exitTypes = [
            { value: 'leaveNormally', label: 'Leave Normally', desc: 'Standard exit through door' },
            { value: 'leaveWithRunway', label: 'Leave With Runway', desc: 'Exit with runway available' },
            { value: 'leaveShinecharged', label: 'Leave Shinecharged', desc: 'Exit with shinecharge' },
            { value: 'leaveWithTemporaryBlue', label: 'Leave With Temporary Blue', desc: 'Jump through with temporary blue' },
            { value: 'leaveWithSpark', label: 'Leave With Spark', desc: 'Shinespark through door' },
            { value: 'leaveSpinning', label: 'Leave Spinning', desc: 'Spin jump from remote runway' },
            { value: 'leaveWithMockball', label: 'Leave With Mockball', desc: 'Exit with mockball' },
            { value: 'leaveWithSpringBallBounce', label: 'Leave With Spring Ball Bounce', desc: 'Spring ball bounce exit' },
            { value: 'leaveSpaceJumping', label: 'Leave Space Jumping', desc: 'Space jump from remote runway' },
            { value: 'leaveWithStoredFallSpeed', label: 'Leave With Stored Fall Speed', desc: 'High fall speed stored' },
            { value: 'leaveWithDoorFrameBelow', label: 'Leave With Door Frame Below', desc: 'Door frame available below' },
            { value: 'leaveWithPlatformBelow', label: 'Leave With Platform Below', desc: 'Platform below for jumping' },
            { value: 'leaveWithGrappleJump', label: 'Leave With Grapple Jump', desc: 'Vertical grapple jump' },
            { value: 'leaveWithSuperSink', label: 'Leave With Super Sink', desc: 'Morphed with super sink' }
        ];

        exitTypes.forEach(type => {
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
            const type = Object.keys(this.initialData)[0];
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
            case 'leaveNormally':
            case 'leaveShinecharged':
            case 'leaveWithSuperSink':
                this.renderEmpty();
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

    createCheckbox(label, checked, tooltip = null) {
        const wrapper = document.createElement('div');
        wrapper.className = 'field-wrapper checkbox-field';

        const checkboxContainer = document.createElement('label');
        checkboxContainer.style.display = 'flex';
        checkboxContainer.style.alignItems = 'center';
        checkboxContainer.style.gap = '8px';
        checkboxContainer.style.cursor = 'pointer';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!checked;
        input.style.width = '20px';
        input.style.height = '20px';

        const labelEl = document.createElement('span');
        labelEl.textContent = label;
        if (tooltip) labelEl.title = tooltip;

        checkboxContainer.appendChild(input);
        checkboxContainer.appendChild(labelEl);
        wrapper.appendChild(checkboxContainer);

        return wrapper;
    }

    renderRunway(data) {
        const fields = [
            this.createNumber('Runway Length', data.length, 0, 45, 0.5, 'Available runway in tiles'),
            this.createNumber('Open Ends', data.openEnd, 0, 1, 1, '0 = both walls, 1 = one open end'),
            this.createNumber('Gentle Up Tiles (optional)', data.gentleUpTiles, 0, 45, 1, 'Tiles sloping up gently (½ tile)'),
            this.createNumber('Gentle Down Tiles (optional)', data.gentleDownTiles, 0, 45, 1, 'Tiles sloping down gently (½ tile)'),
            this.createNumber('Steep Up Tiles (optional)', data.steepUpTiles, 0, 45, 1, 'Tiles sloping up steeply (1 tile)'),
            this.createNumber('Steep Down Tiles (optional)', data.steepDownTiles, 0, 45, 1, 'Tiles sloping down steeply (1 tile)'),
            this.createNumber('Starting Down Tiles (optional)', data.startingDownTiles, 0, 45, 1, 'Downward slope at start (prevents stutter)'),
            this.createText('Min Extra Run Speed (optional)', data.minExtraRunSpeed, '$4.0', 'Minimum speed in hex', ValidationUtils.validateHexSpeed),
            this.createCheckbox('Heated', data.heated, 'Runway is in heated environment'),
            this.createCheckbox('Cold', data.cold, 'Runway is in cold environment')
        ];

        fields.forEach(f => this.contentArea.appendChild(f));

        this.lengthInput = fields[0].querySelector('input');
        this.openEndInput = fields[1].querySelector('input');
        this.gentleUpTilesInput = fields[2].querySelector('input');
        this.gentleDownTilesInput = fields[3].querySelector('input');
        this.steepUpTilesInput = fields[4].querySelector('input');
        this.steepDownTilesInput = fields[5].querySelector('input');
        this.startingDownTilesInput = fields[6].querySelector('input');
        this.minExtraRunSpeedInput = fields[7].querySelector('input');
        this.heatedCheckbox = fields[8].querySelector('input');
        this.coldCheckbox = fields[9].querySelector('input');
    }

    renderDirection(data) {
        const direction = this.createSelect('Direction (optional)', [
            { value: '', label: '(any)' },
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
            { value: 'any', label: 'Any' }
        ], data.direction || '', 'Direction facing through transition');
        this.contentArea.appendChild(direction);
        this.directionSelect = direction.querySelector('select');
    }

    renderSparkPosition(data) {
        const position = this.createSelect('Position (optional)', [
            { value: '', label: '(any)' },
            { value: 'top', label: 'Top' },
            { value: 'bottom', label: 'Bottom' }
        ], data.position || '', 'Position in doorway while exiting');
        this.contentArea.appendChild(position);
        this.positionSelect = position.querySelector('select');
    }

    renderRemoteRunway(data) {
        const type = this.typeSelect.value;
        const runway = data.remoteRunway || data.runway || {};
        
        const label = document.createElement('div');
        label.className = 'section-label';
        label.textContent = 'Remote Runway:';
        this.contentArea.appendChild(label);

        const length = this.createNumber('Length', runway.length, 0, 45, 0.5, 'Runway length for momentum');
        const openEnd = this.createNumber('Open Ends', runway.openEnd, 0, 2, 1, 'Number of open ends');
        
        this.contentArea.appendChild(length);
        this.contentArea.appendChild(openEnd);

        this.remoteRunwayLengthInput = length.querySelector('input');
        this.remoteRunwayOpenEndInput = openEnd.querySelector('input');

        // Landing runway for mockball and spring ball bounce
        if (type === 'leaveWithMockball' || type === 'leaveWithSpringBallBounce') {
            const landingLabel = document.createElement('div');
            landingLabel.className = 'section-label';
            landingLabel.textContent = 'Landing Runway:';
            this.contentArea.appendChild(landingLabel);

            const landingRunway = data.landingRunway || {};
            const landingLength = this.createNumber('Length', landingRunway.length, 0, 45, 0.5, 'Landing runway length');
            const landingOpenEnd = this.createNumber('Open Ends', landingRunway.openEnd, 0, 2, 1, 'Landing runway open ends');

            this.contentArea.appendChild(landingLength);
            this.contentArea.appendChild(landingOpenEnd);

            this.landingRunwayLengthInput = landingLength.querySelector('input');
            this.landingRunwayOpenEndInput = landingOpenEnd.querySelector('input');
        }

        // Movement type for spring ball bounce
        if (type === 'leaveWithSpringBallBounce') {
            const movement = this.createSelect('Movement Type', [
                { value: 'controlled', label: 'Controlled' },
                { value: 'uncontrolled', label: 'Uncontrolled' },
                { value: 'any', label: 'Any' }
            ], data.movementType || 'any', 'Type of spring ball bounce');
            this.contentArea.appendChild(movement);
            this.movementTypeSelect = movement.querySelector('select');
        }

        // Optional speed fields
        const minSpeed = this.createText('Min Extra Run Speed (optional)', data.minExtraRunSpeed, '$4.0', 'Min speed in hex', ValidationUtils.validateHexSpeed);
        const maxSpeed = this.createText('Max Extra Run Speed (optional)', data.maxExtraRunSpeed, '$F.8', 'Max speed in hex', ValidationUtils.validateHexSpeed);
        const blue = this.createSelect('Blue Speed (optional)', [
            { value: '', label: '(any)' },
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
            { value: 'any', label: 'Any' }
        ], data.blue || '', 'Blue speed requirement');

        this.contentArea.appendChild(minSpeed);
        this.contentArea.appendChild(maxSpeed);
        this.contentArea.appendChild(blue);

        this.minExtraRunSpeedInput = minSpeed.querySelector('input');
        this.maxExtraRunSpeedInput = maxSpeed.querySelector('input');
        this.blueSelect = blue.querySelector('select');
    }

    renderFallSpeed(data) {
        const fallSpeed = this.createNumber('Fall Speed in Tiles', data.fallSpeedInTiles, 0, 2, 1, 'Tiles that will clip through');
        this.contentArea.appendChild(fallSpeed);
        this.fallSpeedInTilesInput = fallSpeed.querySelector('input');
    }

    renderDoorFrameHeight(data) {
        const height = this.createNumber('Height', data.height, 0, 100, 0.5, 'Usable door frame height');
        this.contentArea.appendChild(height);
        this.heightInput = height.querySelector('input');
    }

    renderPlatformBelow(data) {
        const fields = [
            this.createNumber('Height', data.height, 0, 100, 0.5, 'Platform height below door'),
            this.createNumber('Left Position', data.leftPosition, -100, 100, 0.5, 'Left edge position'),
            this.createNumber('Right Position', data.rightPosition, -100, 100, 0.5, 'Right edge position')
        ];

        fields.forEach(f => this.contentArea.appendChild(f));

        this.heightInput = fields[0].querySelector('input');
        this.leftPositionInput = fields[1].querySelector('input');
        this.rightPositionInput = fields[2].querySelector('input');
    }

    renderGrappleJumpPosition(data) {
        const position = this.createSelect('Position', [
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
            { value: 'any', label: 'Any' }
        ], data.position || 'any', 'Horizontal position when exiting');
        this.contentArea.appendChild(position);
        this.positionSelect = position.querySelector('select');
    }

    validate() {
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

    getRunway() {
        const obj = {
            length: parseFloat(this.lengthInput.value) || 0,
            openEnd: parseInt(this.openEndInput.value) || 0
        };
        const gentleUp = parseInt(this.gentleUpTilesInput.value);
        const gentleDown = parseInt(this.gentleDownTilesInput.value);
        const steepUp = parseInt(this.steepUpTilesInput.value);
        const steepDown = parseInt(this.steepDownTilesInput.value);
        const startingDown = parseInt(this.startingDownTilesInput.value);
        
        if (gentleUp > 0) obj.gentleUpTiles = gentleUp;
        if (gentleDown > 0) obj.gentleDownTiles = gentleDown;
        if (steepUp > 0) obj.steepUpTiles = steepUp;
        if (steepDown > 0) obj.steepDownTiles = steepDown;
        if (startingDown > 0) obj.startingDownTiles = startingDown;
        if (this.minExtraRunSpeedInput?.value) obj.minExtraRunSpeed = this.minExtraRunSpeedInput.value;
        if (this.heatedCheckbox?.checked) obj.heated = true;
        if (this.coldCheckbox?.checked) obj.cold = true;
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
        return { fallSpeedInTiles: parseInt(this.fallSpeedInTilesInput.value) };
    }

    getDoorFrameHeight() {
        return { height: parseFloat(this.heightInput.value) };
    }

    getPlatformBelow() {
        return {
            height: parseFloat(this.heightInput.value),
            leftPosition: parseFloat(this.leftPositionInput.value),
            rightPosition: parseFloat(this.rightPositionInput.value)
        };
    }

    getGrappleJumpPosition() {
        return { position: this.positionSelect.value };
    }

    remove() {
        this.root.remove();
    }
}
