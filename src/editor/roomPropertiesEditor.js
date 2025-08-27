/* =============================================================================
   Super Metroid: X-Fusion Room Properties Editor
   
   This module handles the room properties editor interface for the X-Fusion
   romhack, allowing users to edit obstacles, enemies, strategies, and notable
   features within Super Metroid rooms. It provides a drag-and-drop interface
   with auto-ID assignment and data validation.
   
   Dependencies:
   - Electron IPC for communication with main process
   - conditionEditor.js for strat condition editing
   - Various data files (conditionItems.js, conditionEvents.js)
   ============================================================================= */

   const { ipcRenderer } = require('electron');

   // ---- Module State --------------------------------
   let currentRoomData = null;
   let validRoomNodes = [];
   
   // Container references for easier access
   const containers = {
       obstacles: null,
       enemies: null,
       strats: null,
       notables: null
   };
   
   // Configuration for different editor types
   const EDITOR_CONFIG = {
       obstacles: {
           idPrefix: '',
           idStyle: 'letter', // A, B, C...
           emoji: '🪨',
           className: 'obstacle'
       },
       enemies: {
           idPrefix: 'e',
           idStyle: 'numeric', // e1, e2, e3...
           emoji: '👾',
           className: 'enemy'
       },
       strats: {
           idPrefix: '',
           idStyle: 'numeric', // 1, 2, 3...
           emoji: '📘',
           className: 'strat'
       },
       notables: {
           idPrefix: '',
           idStyle: 'numeric', // 1, 2, 3...
           emoji: '⭐',
           className: 'notable'
       }
   };
   
   // ---- Initialization --------------------------------
   window.addEventListener('DOMContentLoaded', initializeEditor);
   
   function initializeEditor() {
       // Cache container references
       containers.obstacles = document.getElementById('obstaclesContainer');
       containers.enemies = document.getElementById('enemiesContainer');
       containers.strats = document.getElementById('stratsContainer');
       containers.notables = document.getElementById('notablesContainer');
   
       // Set up IPC listeners
       setupIPCListeners();
       
       // Set up event handlers
       setupEventHandlers();
   }
   
   function setupIPCListeners() {
       ipcRenderer.on('init-room-properties-data', handleRoomDataReceived);
   }
   
   function setupEventHandlers() {
       // Save/close buttons
       document.getElementById('saveBtn').addEventListener('click', handleSave);
       document.getElementById('closeBtn').addEventListener('click', () => window.close());
       
       // Keyboard shortcuts
       document.addEventListener('keydown', handleKeydown);
       
       // Add buttons for each editor type
       const ADD_BTN_IDS = {
        obstacles: 'addObstacleBtn',
        enemies: 'addEnemyBtn',
        strats: 'addStratBtn',
        notables: 'addNotableBtn'
    };
    Object.keys(EDITOR_CONFIG).forEach(type => {
        const addBtn = document.getElementById(ADD_BTN_IDS[type]);
        if (addBtn) {
            addBtn.addEventListener('click', () => addNewEditor(type));
        }
    });
    
   }
   
   // ---- Data Handling --------------------------------
   function handleRoomDataReceived(event, data) {
       console.log('Room Properties Editor received data:', data);
       currentRoomData = data || {};
   
       // Prepare node list for dropdowns
       validRoomNodes = (currentRoomData.nodes || []).map(node => ({
           id: node.id,
           name: node.name || `Node ${node.id}`
       }));
   
       // Update header information
       updateHeaderInfo();
       
       // Populate editor containers
       populateEditors();
   }
   
   function updateHeaderInfo() {
       const elements = {
           sector: currentRoomData.area || 'Unknown Sector',
           region: currentRoomData.subarea || 'Unknown Region',
           roomName: currentRoomData.name || 'Unknown Room'
       };
   
       Object.entries(elements).forEach(([id, value]) => {
           const element = document.getElementById(id);
           if (element) element.textContent = value;
       });
   }
   
   function populateEditors() {
       // Clear existing content
       Object.values(containers).forEach(container => {
           if (container) container.innerHTML = '';
       });
   
       // Populate each editor type
       if (containers.obstacles) {
           (currentRoomData.obstacles || []).forEach(obstacle => {
               containers.obstacles.appendChild(createObstacleEditor(obstacle));
           });
       }
   
       if (containers.enemies) {
           (currentRoomData.enemies || []).forEach(enemy => {
               containers.enemies.appendChild(createEnemyEditor(enemy));
           });
       }
   
       if (containers.strats) {
           (currentRoomData.strats || []).forEach(strat => {
               containers.strats.appendChild(createStratEditor(strat));
           });
       }
   
       if (containers.notables) {
           (currentRoomData.notables || []).forEach(notable => {
               containers.notables.appendChild(createNotableEditor(notable));
           });
       }
   }
   
   // ---- Save/Load Logic --------------------------------
   function handleSave() {
       const data = currentRoomData || {};
   
       // Collect data from all containers with auto-assigned IDs
       const collectedData = {
           obstacles: collectAndAssignIDs(containers.obstacles, 'obstacles'),
           enemies: collectAndAssignIDs(containers.enemies, 'enemies'),
           strats: collectAndAssignIDs(containers.strats, 'strats'),
           notables: collectAndAssignIDs(containers.notables, 'notables')
       };
   
       const payload = {
           // Preserve room identification
           id: data.id,
           area: data.area,
           subarea: data.subarea,
           name: data.name,
           ...collectedData
       };
   
       console.log('Saving Room Properties data:', payload);
       ipcRenderer.send('save-room-properties-data', payload);
       window.close();
   }
   
   function collectAndAssignIDs(container, type) {
       if (!container) return [];
   
       const config = EDITOR_CONFIG[type];
       return Array.from(container.children)
           .map((element, index) => {
               if (typeof element.getValue !== 'function') return null;
               
               const value = element.getValue();
               if (!value) return null;
   
               // Assign ID based on configuration
               value.id = generateID(index, config);
               return value;
           })
           .filter(Boolean);
   }
   
   function generateID(index, config) {
       if (config.idStyle === 'letter') {
           return String.fromCharCode(65 + index); // A, B, C...
       } else if (config.idStyle === 'numeric') {
           const base = index + 1;
           return config.idPrefix ? `${config.idPrefix}${base}` : base.toString();
       }
       return (index + 1).toString();
   }
   
   // ---- Editor Creation Functions --------------------------------
   function createObstacleEditor(initialData = {}) {
       const data = normalizeObstacleData(initialData);
       const card = createEditorCard('Obstacle', data.id, EDITOR_CONFIG.obstacles);
   
       // Create form elements
       const nameInput = createInput('text', 'Obstacle name', data.name);
       const typeSelect = createObstacleTypeSelect(data.obstacleType);
       const noteArea = createTextarea('Note (optional)', data.note);
       const devNoteInput = createInput('text', 'Developer Note', data.devNote);

       // Assemble card content
       const content = createDiv([
           nameInput,
           typeSelect,
           noteArea,
           devNoteInput,
           createRemoveButton('Remove Obstacle', () => removeAndRenumber(card, containers.obstacles, 'obstacles'))
       ]);
   
       card.appendChild(content);
       makeCardDraggable(card, containers.obstacles, 'obstacles');
   
       // Expose getValue method
       card.getValue = () => {
           if (!nameInput.value.trim()) return null;
           
           return {
               name: nameInput.value.trim(),
               obstacleType: typeSelect.value,
               note: noteArea.value.trim(),
               nodes: getSelectedCheckboxValues(nodesList)
           };
       };
   
       return card;
   }
   
   function createEnemyEditor(initialData = {}) {
       const data = normalizeEnemyData(initialData);
       const card = createEditorCard('Enemy', data.id, EDITOR_CONFIG.enemies);
   
       // Create form elements
       const groupInput = createInput('text', 'Group Name (e.g., "Top Pirates")', data.groupName);
       const enemySelect = createEnemySelect(data.enemyName);
       const quantityInput = createInput('number', 'Quantity', data.quantity, { min: 1 });
       const homeNodesList = createNodeCheckboxList(data.homeNodes, 'Home Nodes');
       const betweenNodesList = createNodeCheckboxList(data.betweenNodes, 'Between Nodes');
       const spawnCondition = createConditionSection('Spawn Condition', data.spawnCondition);
       const stopSpawnCondition = createConditionSection('Stop Spawn Condition', data.stopSpawnCondition);
       const noteArea = createTextarea('Note (optional)', data.note);
       const devNoteInput = createInput('text', 'Developer Note', data.devNote);
       
       // Assemble card content
       const topRow = createDiv([enemySelect, quantityInput], 'enemy-top-row');
       const content = createDiv([
           groupInput,
           topRow,
           createLabel('Home Nodes:', homeNodesList),
           createLabel('Between Nodes:', betweenNodesList),
           spawnCondition,
           stopSpawnCondition,
           noteArea,
           devNoteInput,
           createRemoveButton('Remove Enemy', () => removeAndRenumber(card, containers.enemies, 'enemies'))
       ]);
   
       card.appendChild(content);
       makeCardDraggable(card, containers.enemies, 'enemies');
   
       card.getValue = () => {
           if (!groupInput.value.trim() && !enemySelect.value) return null;
           
           return {
               groupName: groupInput.value.trim(),
               enemyName: enemySelect.value,
               quantity: parseInt(quantityInput.value) || 1,
               homeNodes: getSelectedCheckboxValues(homeNodesList),
               betweenNodes: getSelectedCheckboxValues(betweenNodesList)
           };
       };
   
       return card;
   }
   
   function createStratEditor(initialData = {}) {
    const data = normalizeStratData(initialData);
    const card = createEditorCard('Strat', data.id, EDITOR_CONFIG.strats);

    // --- Core fields ---
    const nameInput = createInput('text', 'Strat Name', data.name);
    const devNoteInput = createInput('text', 'Dev Note', data.devNote);

    // --- Condition editors ---
    const conditionEditors = {
        entrance: createConditionSection('Entrance Condition', data.entranceCondition),
        exit: createConditionSection('Exit Condition', data.exitCondition),
        requires: createConditionSection('Requirements', data.requires)
    };

    // --- Node-based editors ---
    const clearsObstaclesList = createNodeCheckboxList(data.clearsObstacles, 'Clears Obstacles');
    const resetsObstaclesList = createNodeCheckboxList(data.resetsObstacles, 'Resets Obstacles');
    const unlocksEditor = createUnlocksDoorsEditor(data.unlocksDoors);

    // Filter nodes by type
    const itemNodes = validRoomNodes.filter(n => n.nodeType === "item");
    const collectsItemsList = createNodeCheckboxList(data.collectsItems, 'Collects Items', itemNodes);

    // --- Flags dropdown (from CONDITION_EVENTS) ---
    const setsFlagsSelect = createSelect(
        (window.CONDITION_EVENTS || []).map(flag => ({ value: flag, text: flag })),
        data.setsFlags,
        true
    );

    // --- Boolean checkboxes ---
    const boolOptions = [
        { label: 'Comes Through Toilet', key: 'comesThroughToilet' },
        { label: 'G-Mode Regain Mobility', key: 'gModeRegainMobility' },
        { label: 'Bypasses Door Shell', key: 'bypassesDoorShell' },
        { label: 'Wall Jump Avoid', key: 'wallJumpAvoid' },
        { label: 'Flash Suit Checked', key: 'flashSuitChecked' }
    ];
    const boolCheckboxes = {};
    boolOptions.forEach(opt => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = data[opt.key];
        boolCheckboxes[opt.key] = checkbox;

        const label = document.createElement('label');
        label.textContent = opt.label;
        label.style.display = 'block';
        label.prepend(checkbox);
        card.appendChild(label);
    });

    // --- Assemble ---
    const content = createDiv([
        nameInput,
        devNoteInput,
        ...Object.values(conditionEditors),
        createLabel('Clears Obstacles:', clearsObstaclesList),
        createLabel('Resets Obstacles:', resetsObstaclesList),
        unlocksEditor,
        createLabel('Collects Items:', collectsItemsList),
        createLabel('Sets Flags:', setsFlagsSelect),
        createRemoveButton('Remove Strat', () => removeAndRenumber(card, containers.strats, 'strats'))
    ]);
    card.appendChild(content);

    // --- Draggable ---
    makeCardDraggable(card, containers.strats, 'strats');

    // --- getValue ---
    card.getValue = () => ({
        name: nameInput.value.trim(),
        devNote: devNoteInput.value.trim(),
        entranceCondition: conditionEditors.entrance.getValue(),
        exitCondition: conditionEditors.exit.getValue(),
        requires: conditionEditors.requires.getValue(),
        clearsObstacles: getSelectedCheckboxValues(clearsObstaclesList),
        resetsObstacles: getSelectedCheckboxValues(resetsObstaclesList),
        unlocksDoors: unlocksEditor.getValue(),
        collectsItems: getSelectedCheckboxValues(collectsItemsList),
        setsFlags: Array.from(setsFlagsSelect.selectedOptions).map(opt => opt.value),
        ...Object.fromEntries(Object.entries(boolCheckboxes).map(([k, el]) => [k, el.checked]))
    });

    return card;
}

   
   function createNotableEditor(initialData = {}) {
       const data = normalizeNotableData(initialData);
       const card = createEditorCard('Notable', data.id, EDITOR_CONFIG.notables);
   
       // Create form elements
       const nameInput = createInput('text', 'Notable Name', data.name);
       const noteArea = createTextarea('Description (multi-line)', data.note);
   
       // Assemble card content
       const content = createDiv([
           nameInput,
           noteArea,
           createRemoveButton('Remove Notable', () => removeAndRenumber(card, containers.notables, 'notables'))
       ]);
   
       card.appendChild(content);
       makeCardDraggable(card, containers.notables, 'notables');
   
       card.getValue = () => {
           if (!nameInput.value.trim()) return null;
           
           const noteText = noteArea.value.trim();
           const noteLines = noteText.split('\n').map(line => line.trim()).filter(Boolean);
           
           return {
               name: nameInput.value.trim(),
               note: noteLines.length === 1 ? noteLines[0] : noteLines
           };
       };
   
       return card;
   }
   
   // ---- UI Creation Helpers --------------------------------
   function createEditorCard(title, id, config) {
       const card = document.createElement('div');
       card.className = `editor-card ${config.className}-card`;
       
       const header = document.createElement('div');
       header.className = 'editor-card-header';
       header.textContent = `${config.emoji} ${title} ${id != null ? `(ID: ${id})` : '(new)'}`;
       
       card.appendChild(header);
       return card;
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
   
   function createDiv(children = [], className = '') {
       const div = document.createElement('div');
       if (className) div.className = className;
       
       children.forEach(child => {
           if (child) div.appendChild(child);
       });
       
       return div;
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
   
   // ---- Specialized Creation Functions --------------------------------
   function createObstacleTypeSelect(selectedType = 'abstract') {
       const types = [
           { value: 'abstract', text: 'Abstract' },
           { value: 'enemies', text: 'Enemies' },
           { value: 'inanimate', text: 'Inanimate' }
       ];
       
       return createSelect(types, selectedType);
   }
   
   function createEnemySelect(selectedEnemy = '') {
       const enemies = window.ENEMY_LIST || [
           'Kihunter', 'Zoro', 'Yellow Space Pirate', 'Red Space Pirate',
           'Green Space Pirate', 'Silver Space Pirate', 'Metroid', 'Rinka'
       ];
       
       const options = enemies.map(enemy => ({ value: enemy, text: enemy }));
       return createSelect(options, selectedEnemy);
   }

   function createNodeCheckboxList(selectedNodes = [], title = '') {
    const container = document.createElement('div');
    container.className = 'node-checkbox-container';

    // Toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'node-toggle-btn';
    toggleBtn.textContent = '▼ Hide Unchecked Nodes';
    container.appendChild(toggleBtn);

    // Wrapper for search + table
    const listWrapper = document.createElement('div');
    listWrapper.className = 'node-list-wrapper';
    container.appendChild(listWrapper);

    // Search input
    const searchInput = createInput('text', 'Filter nodes...');
    searchInput.className = 'node-search-input';
    listWrapper.appendChild(searchInput);

    // Table
    const table = document.createElement('table');
    table.className = 'node-table';
    listWrapper.appendChild(table);

    // Header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Enabled', 'ID', 'Name'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    if (!validRoomNodes.length) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 3;
        emptyCell.textContent = '(no nodes available)';
        emptyCell.style.fontStyle = 'italic';
        emptyRow.appendChild(emptyCell);
        tbody.appendChild(emptyRow);
        return container;
    }

    const selectedSet = new Set(selectedNodes.map(String));

    validRoomNodes.forEach(node => {
        const row = document.createElement('tr');
        row.className = 'node-row';

        const checkboxCell = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = selectedSet.has(String(node.id));
        checkboxCell.appendChild(checkbox);

        const idCell = document.createElement('td');
        idCell.textContent = node.id;

        const nameCell = document.createElement('td');
        nameCell.textContent = node.name;

        row.appendChild(checkboxCell);
        row.appendChild(idCell);
        row.appendChild(nameCell);

        tbody.appendChild(row);

        // --- Watch checkbox change ---
        checkbox.addEventListener('change', updateRowVisibility);
    });

    // --- Helper to update row + table visibility ---
    function updateRowVisibility() {
        let anyVisible = false;

        tbody.querySelectorAll('tr.node-row').forEach(row => {
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (toggleBtn.dataset.hidden === 'true' && !checkbox.checked) {
                row.style.display = 'none';
            } else {
                row.style.display = '';
                anyVisible = true;
            }
        });

        // Hide table + search bar if nothing visible
        table.style.display = anyVisible ? 'table' : 'none';
        searchInput.style.display = (anyVisible && toggleBtn.dataset.hidden === 'true') ? '' : (anyVisible ? '' : 'none');
    }

    // Search filter
    searchInput.addEventListener('input', () => {
        const filter = searchInput.value.toLowerCase();
        tbody.querySelectorAll('tr.node-row').forEach(row => {
            const nameCell = row.querySelector('td:nth-child(3)');
            if (!nameCell) return;
            row.style.display = nameCell.textContent.toLowerCase().includes(filter) ? '' : 'none';
        });
    });

    // Toggle unchecked rows
    toggleBtn.addEventListener('click', () => {
        const currentlyHidden = toggleBtn.dataset.hidden === 'true';
        toggleBtn.dataset.hidden = currentlyHidden ? 'false' : 'true';
        toggleBtn.textContent = currentlyHidden ? '▼ Hide Unchecked Nodes' : '▶ Show All Nodes';
        updateRowVisibility();
    });

    toggleBtn.dataset.hidden = 'false';
    updateRowVisibility();

    return container;
}
   
   function createConditionSection(title, initialCondition) {
       const container = createDiv([]);
       const label = createLabel(`${title}:`, null);
       container.appendChild(label);
       
       const conditionDiv = createDiv([]);
       const conditionEditor = makeConditionEditor(conditionDiv, initialCondition);
       container.appendChild(conditionDiv);
       
       container.getValue = () => conditionEditor.getValue();
       
       return container;
   }
   
   function createUnlocksDoorsEditor(initialDoors = []) {
       const card = createEditorCard('Unlocks Doors', null, { className: 'unlocks-doors', emoji: '🔑' });
       const itemsContainer = createDiv([], 'door-entries');
   
       function addDoorEntry(entry = null) {
           const entryDiv = createDiv([], 'door-entry');
   
           // Door types (multiple selection)
           const typesSelect = createSelect([
               { value: 'super', text: 'Super Missiles' },
               { value: 'missiles', text: 'Missiles' },
               { value: 'powerbomb', text: 'Power Bombs' },
               { value: 'ammo', text: 'Ammo' }
           ], entry?.types || [], true);
   
           // Requirements (multiple selection)
           const requiresSelect = createSelect([
               { value: 'never', text: 'Never' },
               { value: 'canPrepareForNextRoom', text: 'Can Prepare for Next Room' },
               { value: 'SpaceJump', text: 'Space Jump' },
               { value: 'canWalljump', text: 'Can Walljump' }
           ], entry?.requires || [], true);
   
           const removeBtn = createRemoveButton('Remove Door Unlock', () => entryDiv.remove());
   
           entryDiv.appendChild(typesSelect);
           entryDiv.appendChild(requiresSelect);
           entryDiv.appendChild(removeBtn);
           itemsContainer.appendChild(entryDiv);
       }
   
       // Add existing doors
       initialDoors.forEach(door => addDoorEntry(door));
   
       const addBtn = document.createElement('button');
       addBtn.textContent = '+ Add Door Unlock';
       addBtn.className = 'add-btn';
       addBtn.addEventListener('click', () => addDoorEntry());
   
       const content = createDiv([itemsContainer, addBtn]);
       card.appendChild(content);
   
       card.getValue = () => {
           return Array.from(itemsContainer.children).map(entryDiv => {
               const selects = entryDiv.querySelectorAll('select');
               if (selects.length < 2) return null;
   
               const types = Array.from(selects[0].selectedOptions).map(opt => opt.value);
               const requires = Array.from(selects[1].selectedOptions).map(opt => opt.value);
   
               return types.length > 0 ? { types, requires } : null;
           }).filter(Boolean);
       };
   
       return card;
   }
   
   // ---- Data Normalization Functions --------------------------------
   function normalizeObstacleData(data) {
       return {
           name: data?.name || '',
           obstacleType: data?.obstacleType || 'abstract',
           note: data?.note || '',
           nodes: Array.isArray(data?.nodes) ? data.nodes.map(String) : [],
           id: data?.id
       };
   }
   
   function normalizeEnemyData(data) {
       return {
           groupName: data?.groupName || '',
           enemyName: data?.enemyName || '',
           quantity: data?.quantity ?? 1,
           homeNodes: Array.isArray(data?.homeNodes) ? data.homeNodes.map(String) : [],
           betweenNodes: Array.isArray(data?.betweenNodes) ? data.betweenNodes.map(String) : [],
           id: data?.id
       };
   }
   
   function normalizeStratData(data) {
    return {
        name: data?.name || '',
        devNote: data?.devNote || '',
        entranceCondition: data?.entranceCondition || null,
        exitCondition: data?.exitCondition || null,
        requires: data?.requires || null,
        clearsObstacles: Array.isArray(data?.clearsObstacles) ? data.clearsObstacles.map(String) : [],
        resetsObstacles: Array.isArray(data?.resetsObstacles) ? data.resetsObstacles.map(String) : [],
        comesThroughToilet: !!data?.comesThroughToilet,
        gModeRegainMobility: !!data?.gModeRegainMobility,
        bypassesDoorShell: !!data?.bypassesDoorShell,
        unlocksDoors: Array.isArray(data?.unlocksDoors) ? data.unlocksDoors : [],
        collectsItems: Array.isArray(data?.collectsItems) ? data.collectsItems.map(String) : [],
        setsFlags: Array.isArray(data?.setsFlags) ? data.setsFlags.map(String) : [],
        wallJumpAvoid: !!data?.wallJumpAvoid,
        flashSuitChecked: !!data?.flashSuitChecked,
        id: data?.id
    };
}
   
   function normalizeNotableData(data) {
       return {
           name: data?.name || '',
           note: data?.note || '',
           id: data?.id
       };
   }
   
   // ---- Utility Functions --------------------------------
   function getSelectedCheckboxValues(container) {
       return Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
           .map(checkbox => checkbox.value);
   }
   
   function addNewEditor(type) {
       const container = containers[type];
       if (!container) return;
   
       const editorFunctions = {
           obstacles: createObstacleEditor,
           enemies: createEnemyEditor,
           strats: createStratEditor,
           notables: createNotableEditor
       };
   
       const createFunction = editorFunctions[type];
       if (createFunction) {
           const newEditor = createFunction();
           container.appendChild(newEditor);
           renumberContainer(container, type);
       }
   }
   
   function removeAndRenumber(card, container, type) {
       card.remove();
       renumberContainer(container, type);
   }
   
   function renumberContainer(container, type) {
       if (!container || !EDITOR_CONFIG[type]) return;
   
       const config = EDITOR_CONFIG[type];
       Array.from(container.children).forEach((card, index) => {
           const newId = generateID(index, config);
           updateCardHeader(card, newId, config);
           card._assignedId = newId;
       });
   }
   
   function updateCardHeader(card, id, config) {
       const header = card.querySelector('.editor-card-header');
       if (!header) return;
   
       const titleMatch = header.textContent.match(/^(.*?)\s*\(.*?\)$/);
       const baseTitle = titleMatch ? titleMatch[1] : header.textContent;
       header.textContent = `${baseTitle} (ID: ${id})`;
   }
   
   // ---- Drag and Drop Functionality --------------------------------
   function makeCardDraggable(card, container, type) {
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
           
           const rect = card.getBoundingClientRect();
           dragState.isDragging = true;
           dragState.offsetY = event.clientY - rect.top;
   
           // Create and insert placeholder
           dragState.placeholder = createDragPlaceholder(rect.height);
           container.insertBefore(dragState.placeholder, card.nextSibling);
   
           // Style the dragged card
           card.classList.add('dragging');
           card.style.position = 'absolute';
           card.style.width = `${rect.width}px`;
           card.style.left = `${rect.left}px`;
           card.style.top = `${event.clientY - dragState.offsetY}px`;
           card.style.zIndex = '1000';
   
           // Attach move and end handlers
           document.addEventListener('mousemove', handleDragMove);
           document.addEventListener('mouseup', endDrag);
       }
   
       function handleDragMove(event) {
           if (!dragState.isDragging) return;
   
           // Update card position
           card.style.top = `${event.clientY - dragState.offsetY}px`;
   
           // Find insertion point
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
   
           // Reset card styling
           card.classList.remove('dragging');
           card.style.position = '';
           card.style.top = '';
           card.style.left = '';
           card.style.width = '';
           card.style.zIndex = '';
   
           // Insert card at placeholder position and remove placeholder
           container.insertBefore(card, dragState.placeholder);
           dragState.placeholder.remove();
   
           // Renumber after reordering
           renumberContainer(container, type);
   
           // Clean up event listeners
           document.removeEventListener('mousemove', handleDragMove);
           document.removeEventListener('mouseup', endDrag);
       }
   }
   
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
               return { offset, element: child };
           } else {
               return closest;
           }
       }, { offset: Number.NEGATIVE_INFINITY }).element;
   }
   
   // ---- Event Handlers --------------------------------
   function handleKeydown(event) {
       if (event.key === 'Escape') {
           window.close();
       }
   }
   
   // ---- Utility Functions --------------------------------
   function capitalize(str) {
       return str.charAt(0).toUpperCase() + str.slice(1);
   }