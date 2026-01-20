/* =============================================================================
   Super Metroid: X-Fusion Door Editor - Complete Implementation
   
   Comprehensive door node property editor with full schema support including:
   - Door environment physics with entrance conditions
   - Door locks with unlock conditions (using condition system)
   - Twin door addresses with room/door lookup
   - Utility functions (save/refill stations)
   - Use implicit flags for standard strat generation
   - Map tile associations (using TileMap editor)
   - Viewable nodes configuration
   - Read-only connection info display
   ============================================================================= */

const {
    ipcRenderer
} = require('electron');

// ============================================================================
// Module State
// ============================================================================

let doorData = null;
let doorNode = null;
let connectionInfo = null;
let tileMapEditor = null;
let allRoomsMetadata = [];

// Door subtype constants (color/lock type)
const DOOR_SUBTYPES = [{
        value: 'blue',
        label: 'Blue Door',
        description: 'No lock'
    },
    {
        value: 'red',
        label: 'Red Door',
        description: 'Requires Missiles'
    },
    {
        value: 'green',
        label: 'Green Door',
        description: 'Requires Super Missiles'
    },
    {
        value: 'yellow',
        label: 'Yellow Door',
        description: 'Requires Power Bombs'
    },
    {
        value: 'gray',
        label: 'Gray Door',
        description: 'Requires any ammo'
    },
    {
        value: 'eye',
        label: 'Eye Door',
        description: 'Shoots open'
    },
    {
        value: 'closedWall',
        label: 'Closed Wall',
        description: 'Hidden/closed passage'
    },
    {
        value: 'sandpit',
        label: 'Sandpit',
        description: 'Vertical morph passage'
    }
];

// Physics types for door environments
const PHYSICS_TYPES = [{
        value: 'air',
        label: 'Air',
        description: 'Normal physics'
    },
    {
        value: 'water',
        label: 'Water',
        description: 'Underwater physics'
    },
    {
        value: 'lava',
        label: 'Lava',
        description: 'Lava physics and damage'
    },
    {
        value: 'acid',
        label: 'Acid',
        description: 'Acid physics and damage'
    }
];

// Utility station types
const UTILITY_TYPES = [{
        value: 'save',
        label: '💾 Save Station'
    },
    {
        value: 'missile',
        label: '🚀 Missile Refill'
    },
    {
        value: 'super',
        label: '⚡ Super Missile Refill'
    },
    {
        value: 'powerbomb',
        label: '💣 Power Bomb Refill'
    },
    {
        value: 'energy',
        label: '❤️ Energy Refill'
    },
    {
        value: 'reserve',
        label: '🩹 Reserve Tank Refill'
    },
    {
        value: 'map',
        label: '🗺️ Map Station'
    }
];

// Use implicit flags
const IMPLICIT_FLAGS = [{
        key: 'useImplicitLeaveNormally',
        label: 'Leave Normally',
        description: 'Generate standard exit strat'
    },
    {
        key: 'useImplicitComeInNormally',
        label: 'Come In Normally',
        description: 'Generate standard entrance strat'
    },
    {
        key: 'useImplicitComeInWithMockball',
        label: 'Come In With Mockball',
        description: 'Generate mockball entrance strat'
    },
    {
        key: 'useImplicitCarryGModeBackThrough',
        label: 'Carry G-Mode Through',
        description: 'Generate G-mode carry strat'
    },
    {
        key: 'useImplicitCarryGModeMorphBackThrough',
        label: 'Carry G-Mode Morph Through',
        description: 'Generate G-mode morph carry strat'
    },
    {
        key: 'useImplicitComeInWithGrappleJump',
        label: 'Come In With Grapple Jump',
        description: 'Generate grapple jump entrance strat'
    },
    {
        key: 'useImplicitDoorUnlocks',
        label: 'Door Unlocks',
        description: 'Generate standard unlock strats',
        default: true
    }
];

// ============================================================================
// Initialization
// ============================================================================

window.addEventListener('DOMContentLoaded', initializeDoorEditor);

function initializeDoorEditor() {
    setupIPCListeners();
    setupEventHandlers();
    console.log('Door Editor initialized');
}

function setupIPCListeners() {
    ipcRenderer.on('init-door-data', handleDoorDataReceived);
    ipcRenderer.on('all-rooms-data', handleAllRoomsData);
}

function setupEventHandlers() {
    document.getElementById('saveBtn')?.addEventListener('click', handleSave);
    document.getElementById('closeBtn')?.addEventListener('click', handleClose);

    document.addEventListener('keydown', handleKeydown);
}

// ============================================================================
// Data Handling
// ============================================================================

function handleDoorDataReceived(event, data) {
    console.log('Door editor received data:', data);
    doorData = data || {};
    doorNode = doorData.doorNode || {};
    connectionInfo = doorData.connection || null;
    allRoomsMetadata = doorData.allRoomsMetadata;

    updateHeaderInfo();
    populateDoorProperties();
}

function handleAllRoomsData(event, rooms) {
    console.log('Received all rooms data:', rooms.length, 'rooms');
    allRoomsMetadata = rooms;

    // Refresh twin door addresses section if it's already populated
    const container = document.getElementById('twinDoorAddressesContainer');
    if (container && container.children.length > 0) {
        populateTwinDoorAddresses();
    }
}

function updateHeaderInfo() {
    // Build header info with proper formatting
    const area = doorData.sector || 'Unknown Area';
    const subarea = doorData.region || 'Unknown Subarea';
    const roomName = doorData.roomName || 'Unknown Room';

    // Get door info - handle both doorNode existing and being null
    let doorInfo = '🚪 Unknown Door';
    if (doorNode && doorNode.name) {
        // Use the full door name from the node
        const icon = doorNode.nodeSubType === 'passage' ? '🔵' : '🚪';
        doorInfo = `${icon} ${doorNode.name}`;
    } else if (doorData.dir) {
        // Fallback to direction if doorNode is null
        doorInfo = `🚪 ${doorData.dir} Door`;
    }

    // Build full path: Area / Subarea / Room / Door
    const fullPath = `🌍 ${area} / ${subarea} / ${roomName} / ${doorInfo}`;

    // Set the header text
    const headerElement = document.getElementById('doorDir');
    if (headerElement) {
        headerElement.textContent = fullPath;
    }

    // Hide the individual sector/region/roomName spans since we're using one combined display
    const hideElements = ['sector', 'region', 'roomName'];
    hideElements.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.parentElement) {
            el.parentElement.style.display = 'none';
        }
    });
}

// ============================================================================
// UI Population
// ============================================================================

function populateDoorProperties() {
    populateDoorSubType();
    populateDoorEnvironments();
    populateUtilitySection();
    populateImplicitFlags();
    populateTileMapSection();
    populateLocks();
    populateTwinDoorAddresses();
    populateViewableNodes();
    populateOtherProperties();
    populateConnectionInfo();
}

// ----------------------------------------------------------------------------
// Door Subtype (Color/Type)
// ----------------------------------------------------------------------------

function populateDoorSubType() {
    const container = document.getElementById('doorSubTypeContainer');
    if (!container) return;

    container.innerHTML = '';

    DOOR_SUBTYPES.forEach(subtype => {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '8px';
        label.style.padding = '6px';
        label.style.cursor = 'pointer';
        label.title = subtype.description;

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'doorSubType';
        radio.value = subtype.value;
        radio.checked = doorNode.nodeSubType === subtype.value;

        label.appendChild(radio);
        label.appendChild(document.createTextNode(subtype.label));
        container.appendChild(label);
    });
}

// ----------------------------------------------------------------------------
// Door Environments (Physics)
// ----------------------------------------------------------------------------

function populateDoorEnvironments() {
    const container = document.getElementById('doorEnvironmentsContainer');
    if (!container) return;

    container.innerHTML = '';

    const environments = doorNode.doorEnvironments || [{
        physics: 'air'
    }];

    environments.forEach((env, index) => {
        const envCard = createDoorEnvironmentCard(env, index);
        container.appendChild(envCard);
    });

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Add Environment';
    addBtn.className = 'add-btn';
    addBtn.style.fontSize = '12px';
    addBtn.onclick = () => {
        const currentCount = container.querySelectorAll('.environment-card').length;
        const envCard = createDoorEnvironmentCard({}, currentCount);
        container.insertBefore(envCard, addBtn);
    };
    container.appendChild(addBtn);
}

function createDoorEnvironmentCard(env, index) {
    const card = document.createElement('div');
    card.className = 'environment-card';
    card.style.border = '1px solid #ddd';
    card.style.borderRadius = '8px';
    card.style.padding = '12px';
    card.style.marginBottom = '12px';
    card.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '12px';

    const title = document.createElement('strong');
    title.textContent = `Environment ${index + 1}`;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '× Remove';
    removeBtn.className = 'remove-btn';
    removeBtn.style.fontSize = '12px';
    removeBtn.onclick = () => {
        card.remove();
        // Renumber remaining cards
        const container = document.getElementById('doorEnvironmentsContainer');
        const cards = container.querySelectorAll('.environment-card');
        cards.forEach((c, i) => {
            c.querySelector('strong').textContent = `Environment ${i + 1}`;
        });
    };

    header.appendChild(title);
    header.appendChild(removeBtn);
    card.appendChild(header);

    // Physics type selector
    const physicsLabel = document.createElement('label');
    physicsLabel.textContent = 'Physics Type:';
    physicsLabel.style.display = 'block';
    physicsLabel.style.marginBottom = '4px';
    physicsLabel.style.fontWeight = '600';

    const physicsSelect = document.createElement('select');
    physicsSelect.style.width = '100%';
    physicsSelect.style.marginBottom = '12px';

    PHYSICS_TYPES.forEach(physics => {
        const option = document.createElement('option');
        option.value = physics.value;
        option.textContent = physics.label;
        option.title = physics.description;
        physicsSelect.appendChild(option);
    });
    physicsSelect.value = env.physics || 'air';

    card.appendChild(physicsLabel);
    card.appendChild(physicsSelect);

    // Entrance nodes (optional)
    const entranceLabel = document.createElement('label');
    entranceLabel.textContent = 'Entrance Nodes (optional):';
    entranceLabel.style.display = 'block';
    entranceLabel.style.marginBottom = '4px';
    entranceLabel.style.fontWeight = '600';
    entranceLabel.style.fontSize = '12px';

    const entranceHelp = document.createElement('div');
    entranceHelp.textContent = 'Leave empty for all nodes';
    entranceHelp.style.fontSize = '11px';
    entranceHelp.style.color = '#666';
    entranceHelp.style.fontStyle = 'italic';
    entranceHelp.style.marginBottom = '6px';

    const entranceInput = document.createElement('input');
    entranceInput.type = 'text';
    entranceInput.placeholder = 'Node IDs (e.g., 1,2,3)';
    entranceInput.style.width = '100%';
    if (env.entranceNodes) {
        entranceInput.value = env.entranceNodes.join(',');
    }

    card.appendChild(entranceLabel);
    card.appendChild(entranceHelp);
    card.appendChild(entranceInput);

    // Store references for getValue
    card.physicsSelect = physicsSelect;
    card.entranceInput = entranceInput;

    card.getValue = () => {
        const result = {
            physics: physicsSelect.value
        };

        const entranceNodes = entranceInput.value.trim();
        if (entranceNodes) {
            result.entranceNodes = entranceNodes.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
        }

        return result;
    };

    return card;
}

// ----------------------------------------------------------------------------
// Utility Stations
// ----------------------------------------------------------------------------

function populateUtilitySection() {
    const container = document.getElementById('utilityContainer');
    if (!container) return;

    container.innerHTML = '';

    const utilities = doorNode.utility || [];

    UTILITY_TYPES.forEach(utilType => {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '8px';
        label.style.padding = '4px';
        label.style.cursor = 'pointer';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = utilType.value;
        checkbox.checked = utilities.includes(utilType.value);

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(utilType.label));
        container.appendChild(label);
    });
}

// ----------------------------------------------------------------------------
// Implicit Flags
// ----------------------------------------------------------------------------

function populateImplicitFlags() {
    const container = document.getElementById('implicitFlagsContainer');
    if (!container) return;

    container.innerHTML = '';

    IMPLICIT_FLAGS.forEach(flag => {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '8px';
        label.style.padding = '4px';
        label.style.cursor = 'pointer';
        label.title = flag.description;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.key = flag.key;
        checkbox.checked = doorNode[flag.key] !== undefined ? doorNode[flag.key] : (flag.default || false);

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(flag.label));
        container.appendChild(label);
    });
}

// ----------------------------------------------------------------------------
// TileMap Editor
// ----------------------------------------------------------------------------

function populateTileMapSection() {
    const container = document.getElementById('tileMapContainer');
    if (!container) return;

    container.innerHTML = '';

    if (tileMapEditor) {
        tileMapEditor.remove();
    }

    tileMapEditor = new TileMapEditor({
        width: 4,
        height: 4,
        initialData: doorNode.mapTileMask || [],
        cellSize: 25,
        onChange: (newMask) => {
            console.log('TileMap updated:', newMask);
        },
        // Use the same color scheme as room editor
        colors: {
            0: '#bdc3c7', // Not in room - gray
            1: '#3498db', // In room - blue
            2: '#2ecc71' // Part of node - green
        }
    });

    tileMapEditor.attachTo(container);
}

// ----------------------------------------------------------------------------
// Door Locks
// ----------------------------------------------------------------------------

function populateLocks() {
    const container = document.getElementById('locksContainer');
    if (!container) return;

    container.innerHTML = '';

    const locks = doorNode.locks || [];

    locks.forEach((lock, index) => {
        const lockCard = createLockCard(lock, index);
        container.appendChild(lockCard);
    });

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Add Lock';
    addBtn.className = 'add-btn';
    addBtn.onclick = () => {
        const currentCount = container.querySelectorAll('.lock-card').length;
        const lockCard = createLockCard({}, currentCount);
        container.insertBefore(lockCard, addBtn);
    };
    container.appendChild(addBtn);
}

function createLockCard(lock, index) {
    const card = document.createElement('div');
    card.className = 'lock-card';
    card.style.border = '2px solid #f39c12';
    card.style.borderRadius = '8px';
    card.style.padding = '12px';
    card.style.marginBottom = '12px';
    card.style.backgroundColor = '#fef5e7';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '12px';

    const title = document.createElement('strong');
    title.textContent = `🔒 Lock ${index + 1}`;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '× Remove';
    removeBtn.className = 'remove-btn';
    removeBtn.onclick = () => {
        card.remove();
        // Renumber remaining cards
        const container = document.getElementById('locksContainer');
        const cards = container.querySelectorAll('.lock-card');
        cards.forEach((c, i) => {
            c.querySelector('strong').textContent = `🔒 Lock ${i + 1}`;
        });
    };

    header.appendChild(title);
    header.appendChild(removeBtn);
    card.appendChild(header);

    // Lock name
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Lock name (e.g., "Red Door Lock", "Boss Gate")';
    nameInput.value = lock.name || '';
    nameInput.style.width = '100%';
    nameInput.style.marginBottom = '8px';
    card.appendChild(nameInput);

    // Lock type
    const typeLabel = document.createElement('label');
    typeLabel.textContent = 'Lock Type:';
    typeLabel.style.display = 'block';
    typeLabel.style.marginBottom = '4px';
    typeLabel.style.fontWeight = '600';

    const typeSelect = document.createElement('select');
    typeSelect.style.width = '100%';
    typeSelect.style.marginBottom = '12px';

    const lockTypes = ['bossFight', 'coloredDoor', 'cutscene', 'escapeFunnel', 'gameFlag', 'killEnemies', 'permanent'];
    lockTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeSelect.appendChild(option);
    });
    typeSelect.value = lock.lockType || 'coloredDoor';

    card.appendChild(typeLabel);
    card.appendChild(typeSelect);

    // Lock condition
    const lockCondLabel = document.createElement('label');
    lockCondLabel.textContent = 'Lock Condition (when is it locked):';
    lockCondLabel.style.display = 'block';
    lockCondLabel.style.marginBottom = '4px';
    lockCondLabel.style.fontWeight = '600';

    const lockCondContainer = document.createElement('div');
    lockCondContainer.style.marginBottom = '12px';
    const lockCondEditor = makeConditionEditor(lockCondContainer, lock.lock, 0, true);

    card.appendChild(lockCondLabel);
    card.appendChild(lockCondContainer);

    // Unlock strats
    const unlockLabel = document.createElement('label');
    unlockLabel.textContent = 'Unlock Strats:';
    unlockLabel.style.display = 'block';
    unlockLabel.style.marginBottom = '8px';
    unlockLabel.style.fontWeight = '600';

    const unlockContainer = document.createElement('div');
    unlockContainer.style.border = '1px solid #ddd';
    unlockContainer.style.borderRadius = '6px';
    unlockContainer.style.padding = '8px';
    unlockContainer.style.backgroundColor = 'white';
    unlockContainer.innerHTML = '<em>Unlock strats would be defined here (similar to room properties strats)</em>';

    card.appendChild(unlockLabel);
    card.appendChild(unlockContainer);

    // Store references
    card.nameInput = nameInput;
    card.typeSelect = typeSelect;
    card.lockCondEditor = lockCondEditor;
    card.unlockContainer = unlockContainer;

    card.getValue = () => {
        const result = {
            name: nameInput.value.trim() || `Lock ${index + 1}`,
            lockType: typeSelect.value,
            unlockStrats: [] // TODO: Implement unlock strats
        };

        const lockCond = lockCondEditor.getValue();
        if (lockCond) {
            result.lock = lockCond;
        }

        return result;
    };

    return card;
}

// ----------------------------------------------------------------------------
// Twin Door Addresses
// ----------------------------------------------------------------------------

function populateTwinDoorAddresses() {
    const container = document.getElementById('twinDoorAddressesContainer');
    if (!container) return;

    container.innerHTML = '';

    const twinAddresses = doorNode.twinDoorAddresses || [];

    twinAddresses.forEach((twin, index) => {
        const twinEntry = createTwinDoorEntry(twin);
        container.appendChild(twinEntry);
    });

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Add Twin Door';
    addBtn.className = 'add-btn';
    addBtn.style.fontSize = '12px';
    addBtn.onclick = () => {
        const twinEntry = createTwinDoorEntry({});
        container.insertBefore(twinEntry, addBtn);
    };
    container.appendChild(addBtn);
}

function createTwinDoorEntry(twin) {
    const entry = document.createElement('div');
    entry.style.display = 'flex';
    entry.style.gap = '8px';
    entry.style.marginBottom = '8px';
    entry.style.alignItems = 'center';
    entry.style.flexWrap = 'wrap';

    // Room selector with search/filter
    const roomSelect = document.createElement('select');
    roomSelect.style.flex = '2';
    roomSelect.style.minWidth = '200px';

    const roomEmpty = document.createElement('option');
    roomEmpty.value = '';
    roomEmpty.textContent = '(select target room)';
    roomSelect.appendChild(roomEmpty);

    // Populate with all rooms
    allRoomsMetadata.forEach(room => {
        const option = document.createElement('option');
        option.value = room.address;
        option.dataset.roomData = JSON.stringify(room);
        option.textContent = `${room.name} - (${room.area}/${room.subarea})`;
        roomSelect.appendChild(option);
    });

    // Door selector (populated when room is selected)
    const doorSelect = document.createElement('select');
    doorSelect.style.flex = '1';
    doorSelect.style.minWidth = '150px';
    doorSelect.disabled = true;

    const doorEmpty = document.createElement('option');
    doorEmpty.value = '';
    doorEmpty.textContent = '(select door)';
    doorSelect.appendChild(doorEmpty);

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.className = 'remove-btn';
    removeBtn.style.fontSize = '12px';
    removeBtn.style.width = '28px';
    removeBtn.onclick = () => entry.remove();

    // When room is selected, populate doors
    roomSelect.addEventListener('change', () => {
        doorSelect.innerHTML = '';
        doorSelect.appendChild(doorEmpty.cloneNode(true));

        if (!roomSelect.value) {
            doorSelect.disabled = true;
            return;
        }

        const roomData = JSON.parse(roomSelect.selectedOptions[0].dataset.roomData);
        const doors = roomData.doors || [];

        if (doors.length === 0) {
            doorSelect.disabled = true;
            const noDoors = document.createElement('option');
            noDoors.textContent = '(no doors in room)';
            doorSelect.appendChild(noDoors);
            return;
        }

        doorSelect.disabled = false;
        doors.forEach(door => {
            const option = document.createElement('option');
            option.value = door.address;
            option.textContent = door.name;
            doorSelect.appendChild(option);
        });
    });

    // Set initial values if provided
    if (twin.roomAddress) {
        roomSelect.value = twin.roomAddress;
        roomSelect.dispatchEvent(new Event('change'));
        setTimeout(() => {
            if (twin.doorAddress) {
                doorSelect.value = twin.doorAddress;
            }
        }, 0);
    }

    entry.appendChild(roomSelect);
    entry.appendChild(doorSelect);
    entry.appendChild(removeBtn);

    entry.getValue = () => {
        const room = roomSelect.value.trim();
        const door = doorSelect.value.trim();
        return (room && door) ? {
            roomAddress: room,
            doorAddress: door
        } : null;
    };

    return entry;
}

// ----------------------------------------------------------------------------
// Viewable Nodes
// ----------------------------------------------------------------------------

function populateViewableNodes() {
    const container = document.getElementById('viewableNodesContainer');
    if (!container) return;

    container.innerHTML = '';
    container.innerHTML = '<em>Viewable nodes configuration coming soon...</em>';

    // TODO: Implement viewable nodes with strats
}

// ----------------------------------------------------------------------------
// Other Properties
// ----------------------------------------------------------------------------

function populateOtherProperties() {
    const container = document.getElementById('otherPropertiesContainer');
    if (!container) return;

    container.innerHTML = '';

    // isDoorImmediatelyClosed
    const immediateLabel = document.createElement('label');
    immediateLabel.style.display = 'flex';
    immediateLabel.style.alignItems = 'flex-start';
    immediateLabel.style.gap = '12px';
    immediateLabel.style.padding = '12px';
    immediateLabel.style.cursor = 'pointer';
    immediateLabel.style.backgroundColor = 'rgba(52, 152, 219, 0.05)';
    immediateLabel.style.border = '1px solid rgba(52, 152, 219, 0.2)';
    immediateLabel.style.borderRadius = '6px';

    const immediateCheckbox = document.createElement('input');
    immediateCheckbox.type = 'checkbox';
    immediateCheckbox.id = 'isDoorImmediatelyClosed';
    immediateCheckbox.checked = doorNode.isDoorImmediatelyClosed || false;
    immediateCheckbox.style.marginTop = '2px';

    const textContainer = document.createElement('div');
    textContainer.style.flex = '1';

    const labelText = document.createElement('div');
    labelText.style.fontWeight = '600';
    labelText.style.marginBottom = '4px';
    labelText.textContent = 'Instant Door Close (No Animation)';

    const helpText = document.createElement('div');
    helpText.style.fontSize = '12px';
    helpText.style.color = '#555';
    helpText.style.lineHeight = '1.4';
    helpText.innerHTML = `
        <strong>What it means:</strong> Door closes instantly with no animation when entering room.<br>
        <strong>Why it matters:</strong> Affects shinespark timing, blue speed tech, and enemy spawn frames.<br>
        <strong>When to enable:</strong> Only enable if this specific door has instant-close behavior in-game.
    `;

    const tooltip = document.createElement('div');
    tooltip.style.fontSize = '11px';
    tooltip.style.color = '#999';
    tooltip.style.fontStyle = 'italic';
    tooltip.style.marginTop = '6px';
    tooltip.textContent = 'Technical: Some doors skip the closing animation (normally ~60 frames). This flag indicates that behavior for frame-perfect routing.';

    textContainer.appendChild(labelText);
    textContainer.appendChild(helpText);
    textContainer.appendChild(tooltip);

    immediateLabel.appendChild(immediateCheckbox);
    immediateLabel.appendChild(textContainer);

    // Make the whole label clickable except the text
    immediateLabel.onclick = (e) => {
        if (e.target !== immediateCheckbox) {
            immediateCheckbox.checked = !immediateCheckbox.checked;
        }
    };

    container.appendChild(immediateLabel);
}

// ----------------------------------------------------------------------------
// Connection Info (Read-Only)
// ----------------------------------------------------------------------------

function populateConnectionInfo() {
    const container = document.getElementById('connectionInfoContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!connectionInfo) {
        container.innerHTML = '<em style="color: #999;">No connection information available</em>';
        return;
    }

    const infoCard = document.createElement('div');
    infoCard.style.backgroundColor = '#f8f9fa';
    infoCard.style.border = '1px solid #dee2e6';
    infoCard.style.borderRadius = '6px';
    infoCard.style.padding = '12px';

    const subareaDisplay =
        connectionInfo.targetSubarea +
        (connectionInfo.targetSubroom != null ?
            ` (${connectionInfo.targetSubroom})` :
            '');

    const infoItems = [{
            label: 'Target Room',
            value: connectionInfo.targetRoom
        },
        {
            label: 'Target Area',
            value: connectionInfo.targetArea
        },
        {
            label: 'Target Subarea',
            value: subareaDisplay
        },
        {
            label: 'Connection Type',
            value: connectionInfo.connectionType
        },
        {
            label: 'Direction',
            value: connectionInfo.direction
        }
    ];

    infoItems.forEach(item => {
        const row = document.createElement('div');
        row.style.marginBottom = '6px';

        const label = document.createElement('strong');
        label.textContent = item.label + ': ';
        label.style.marginRight = '8px';

        const value = document.createElement('span');
        value.textContent = item.value || '(none)';
        value.style.color = item.value ? '#000' : '#999';

        row.appendChild(label);
        row.appendChild(value);
        infoCard.appendChild(row);
    });

    container.appendChild(infoCard);
}

// ============================================================================
// Save/Load Operations
// ============================================================================

function handleSave() {
    try {
        const updatedNode = collectDoorNodeData();

        const payload = {
            nodeId: doorNode.id,
            updatedNode: updatedNode
        };

        console.log('Saving door node data:', payload);
        ipcRenderer.send('save-door-data', payload);
        window.close();
    } catch (error) {
        console.error('Error saving door data:', error);
        showValidationError('Failed to save door data: ' + error.message);
    }
}

function collectDoorNodeData() {
    const result = {
        id: doorNode.id,
        name: doorNode.name,
        nodeType: 'door',
        nodeSubType: document.querySelector('input[name="doorSubType"]:checked')?.value || 'blue',
        nodeAddress: doorNode.nodeAddress || '0x0',
        doorOrientation: doorNode.doorOrientation
    };

    // Door environments
    const environmentCards = Array.from(document.querySelectorAll('#doorEnvironmentsContainer .environment-card'));
    if (environmentCards.length > 0) {
        result.doorEnvironments = environmentCards
            .map(card => card.getValue ? card.getValue() : null)
            .filter(env => env !== null);
    }

    // Utility
    const utilityChecked = Array.from(document.querySelectorAll('#utilityContainer input:checked'))
        .map(cb => cb.value);
    if (utilityChecked.length > 0) {
        result.utility = utilityChecked;
    }

    // Implicit flags
    const implicitFlags = Array.from(document.querySelectorAll('#implicitFlagsContainer input[type="checkbox"]'));
    implicitFlags.forEach(checkbox => {
        const key = checkbox.dataset.key;
        result[key] = checkbox.checked;
    });

    // Map tile mask
    if (tileMapEditor) {
        const tileMask = tileMapEditor.getValue();
        if (tileMask) {
            result.mapTileMask = tileMask;
        }
    }

    // Locks
    const lockCards = Array.from(document.querySelectorAll('#locksContainer .lock-card'));
    if (lockCards.length > 0) {
        result.locks = lockCards
            .map(card => card.getValue ? card.getValue() : null)
            .filter(lock => lock !== null);
    }

    // Twin door addresses
    const twinEntries = Array.from(document.querySelectorAll('#twinDoorAddressesContainer > div'))
        .filter(el => el.getValue);
    const twinAddresses = twinEntries
        .map(entry => entry.getValue())
        .filter(twin => twin !== null);
    if (twinAddresses.length > 0) {
        result.twinDoorAddresses = twinAddresses;
    }

    // Other properties
    const immediateCheckbox = document.getElementById('isDoorImmediatelyClosed');
    if (immediateCheckbox?.checked) {
        result.isDoorImmediatelyClosed = true;
    }

    return result;
}

function handleClose() {
    if (hasUnsavedChanges()) {
        const confirmClose = confirm('You have unsaved changes. Are you sure you want to close?');
        if (!confirmClose) return;
    }
    window.close();
}

function hasUnsavedChanges() {
    // Simple check - could be more sophisticated
    return true; // For now, always ask
}

// ============================================================================
// Error Handling
// ============================================================================

function showValidationError(message) {
    let errorElement = document.getElementById('validationError');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = 'validationError';
        errorElement.style.cssText = `
            background: #fee;
            color: #c33;
            padding: 10px;
            margin: 10px 0;
            border: 1px solid #fcc;
            border-radius: 4px;
            font-size: 14px;
        `;
        const form = document.getElementById('form');
        if (form) {
            form.insertBefore(errorElement, form.firstChild);
        }
    }
    errorElement.textContent = message;

    setTimeout(() => {
        if (errorElement && errorElement.parentNode) {
            errorElement.parentNode.removeChild(errorElement);
        }
    }, 5000);
}

// ============================================================================
// Event Handlers
// ============================================================================

function handleKeydown(event) {
    switch (event.key) {
        case 'Escape':
            handleClose();
            break;
        case 's':
        case 'S':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                handleSave();
            }
            break;
    }
}