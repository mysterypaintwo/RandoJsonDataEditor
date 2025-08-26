// roomPropertiesEditor.js
const { ipcRenderer } = require('electron');

let entranceEditor = null;
let exitEditor = null;
let validRoomNodes = [];
let currentRoomData = null;

// ---- DOM ready + IPC init --------------------------------
window.addEventListener('DOMContentLoaded', () => {
    // containers - ensure these exist in your HTML
    const obstaclesContainer = document.getElementById('obstaclesContainer');
    const enemiesContainer = document.getElementById('enemiesContainer');
    const stratsContainer = document.getElementById('stratsContainer');
    const notablesContainer = document.getElementById('notablesContainer');

    // listen for room data from main
    ipcRenderer.on('init-room-properties-data', (event, data) => {
        console.log('Room Properties Editor received data:', data);
        currentRoomData = data || {};

        // prepare nodes list for checkboxes (id/name pairs)
        validRoomNodes = (currentRoomData.nodes || []).map(n => ({ id: n.id, name: n.name }));

        // Header info
        document.getElementById('sector').innerText = currentRoomData.area || 'Unknown';
        document.getElementById('region').innerText = currentRoomData.subarea || 'Unknown';
        document.getElementById('roomName').innerText = currentRoomData.name || 'Unknown';
        
        // Obstacles
        if (obstaclesContainer) {
            obstaclesContainer.innerHTML = "";
            (currentRoomData.obstacles || []).forEach(obs => {
                obstaclesContainer.appendChild(makeObstacleEditor(obs, validRoomNodes));
            });
        }

        // Enemies
        if (enemiesContainer) {
            enemiesContainer.innerHTML = "";
            (currentRoomData.enemies || []).forEach(e => {
                enemiesContainer.appendChild(makeEnemyEditor(e, validRoomNodes));
            });
        }

        // Strats
        if (stratsContainer) {
            stratsContainer.innerHTML = "";
            (currentRoomData.strats || []).forEach(s => {
                stratsContainer.appendChild(makeStratEditor(s, validRoomNodes));
            });
        }

        // Notables
        if (notablesContainer) {
            notablesContainer.innerHTML = "";
            (currentRoomData.strats || []).forEach(n => {
                notablesContainer.appendChild(makeNotableEditor(n, validRoomNodes));
            });
        }
    });

    // Save / Close
    document.getElementById('saveBtn').addEventListener('click', () => {
        const data = currentRoomData || {};

        // helper to map children -> values (only if getValue exists)
        const collect = (container) => {
            return Array.from(container.children)
                .map((c, idx) => {
                    if (typeof c.getValue === 'function') {
                        return c.getValue();
                    } else {
                        return null;
                    }
                })
                .filter(Boolean);
        };

        // Collect and assign automated IDs as requested
        const obstacles = collect(obstaclesContainer).map((val, idx) => {
            if (val) val.id = String.fromCharCode(65 + idx); // A, B, C...
            return val;
        });

        const enemies = collect(enemiesContainer).map((val, idx) => {
            if (val) val.id = `e${idx + 1}`;
            return val;
        });

        const notables = collect(notablesContainer).map((val, idx) => {
            if (val) val.id = idx + 1;
            return val;
        });

        const strats = collect(stratsContainer).map((val, idx) => {
            if (val) val.id = idx + 1;
            return val;
        });

        const payload = {
            // preserve identifying top-level fields where possible
            id: data.id,
            area: data.area,
            subarea: data.subarea,
            name: data.name,

            obstacles,
            enemies,
            notables,
            strats,

            entranceCondition: entranceEditor ? entranceEditor.getValue() : undefined,
            exitCondition: exitEditor ? exitEditor.getValue() : undefined
        };

        console.log('Saving Room Properties data:', payload);
        ipcRenderer.send('save-room-properties-data', payload);
        window.close();
    });

    // Close without saving
    document.getElementById('closeBtn').addEventListener('click', () => window.close());

    // keyboard: Escape closes
    document.addEventListener('keydown', e => {
        if (e.key === "Escape") window.close();
    });

    // Add buttons (use the outer validRoomNodes variable that will be populated on init)
    document.getElementById('addObstacleBtn').addEventListener('click', () => {
        const newCard = makeObstacleEditor(undefined, validRoomNodes);
        obstaclesContainer.appendChild(newCard);
        renumberContainer(obstaclesContainer);
    });
    
    document.getElementById('addEnemyBtn').addEventListener('click', () => {
        const newCard = makeEnemyEditor(undefined, validRoomNodes);
        enemiesContainer.appendChild(newCard);
        renumberContainer(enemiesContainer, { prefix: "e" }); 
    });
    
    document.getElementById('addStratBtn').addEventListener('click', () => {
        const newCard = makeStratEditor(undefined, validRoomNodes);
        stratsContainer.appendChild(newCard);
        renumberContainer(stratsContainer, { numeric: true });
    });

    document.getElementById('addNotableBtn').addEventListener('click', () => {
        const newCard = makeNotableEditor(undefined, validRoomNodes);
        notablesContainer.appendChild(newCard);
        renumberContainer(notablesContainer, { numeric: true });
    });
});

// -------------------------------
// Reusable helpers
// -------------------------------

// Scrollable checkbox list (onChange optional)
function makeScrollableCheckboxList(items = [], selectedItems = [], onChange = null) {
    const container = document.createElement("div");
    container.classList.add("scrollable-checkbox-list");    
    container.style.backgroundColor = "#f9f9f9";
    
    const selectedSet = new Set((selectedItems || []).map(String));

    if (!items || items.length === 0) {
        const none = document.createElement('div');
        none.style.fontStyle = 'italic';
        none.style.color = '#666';
        none.textContent = '(none)';
        container.appendChild(none);
        return container;
    }


    items.forEach(item => {
        const label = document.createElement("label");
        label.style.backgroundColor = "#fdfdfd";  // ensures visible background
        label.style.display = "flex";
        label.style.justifyContent = "space-between";
        label.style.alignItems = "center";
        label.style.marginBottom = "4px";
        label.style.fontSize = "13px";

        const left = document.createElement('div');
        left.style.display = 'flex';
        left.style.alignItems = 'center';
        left.style.gap = '8px';

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = String(item.id);
        if (selectedSet.has(String(item.id))) cb.checked = true;

        // only attach change listener if callback provided
        if (typeof onChange === 'function') {
            cb.addEventListener("change", () => onChange(cb.value, cb.checked));
        }

        const nameSpan = document.createElement('span');
        nameSpan.textContent = item.name || '';

        left.appendChild(cb);
        left.appendChild(nameSpan);

        const idSpan = document.createElement('span');
        idSpan.style.color = '#666';
        idSpan.style.fontSize = '12px';
        idSpan.textContent = `ID: ${item.id}`;

        label.appendChild(left);
        label.appendChild(idSpan);

        container.appendChild(label);
    });

    return container;
}

// Card wrapper: shows ID only if present; else "new"
function makeCard(title, id, bodyContent) {
    const typeMap = { Enemy: 'enemy', Obstacle: 'obstacle', Strat: 'strat', Notable: 'notable', 'Unlocks Doors': 'unlocks-doors' };
    const emojiMap = { enemy: "👾", obstacle: "🪨", strat: "📘", notable: "⭐", 'unlocks-doors': "🔑" };

    const type = typeMap[title] || title.toLowerCase().replace(/\s+/g, '-');
    const emoji = emojiMap[type] || "";

    const container = document.createElement('div');
    container.className = `editor-card ${type}-card`;

    // Ensure background applied
    container.style.backgroundColor = getComputedStyle(container).backgroundColor || "#fff";

    const header = document.createElement('div');
    header.className = 'editor-card-header';
    header.textContent = `${emoji} ${title} ${id != null ? `(ID: ${id})` : "(new)"}`;
    container.appendChild(header);

    function appendBody(el) {
        if (!el) return;
        if (el.tagName === "BUTTON") {
            const txt = el.textContent.toLowerCase();
            if (txt.includes("add")) el.classList.add("add-btn");
            if (txt.includes("remove")) el.classList.add("remove-btn");
        }
        // Force body children background
        if (el.tagName !== "BUTTON" && el.style) {
            el.style.backgroundColor = "#fff";
        }
        container.appendChild(el);
    }

    if (Array.isArray(bodyContent)) bodyContent.forEach(appendBody);
    else appendBody(bodyContent);

    return container;
}

// -------------------------------
// Enemy Editor
// -------------------------------
function makeEnemyEditor(initial = {}, nodes = []) {
    // normalize initial
    const init = {
        groupName: initial?.groupName || "",
        enemyName: initial?.enemyName || "",
        quantity: initial?.quantity ?? 1,
        homeNodes: (initial?.homeNodes || []).map(String),
        betweenNodes: (initial?.betweenNodes || []).map(String),
        id: initial?.id ?? null
    };

    // inputs
    const groupInput = document.createElement('input');
    groupInput.type = 'text';
    groupInput.placeholder = "Group Name (e.g. 'Top Pirates')";
    groupInput.value = init.groupName;
    groupInput.classList.add("editor-input");
    groupInput.style.width = "80%";

    // enemy picker (use global list if provided; fallback to examples)
    const enemyList = window.ENEMY_LIST || ["Kihunter", "Zoro", "Yellow Space Pirate", "Red Space Pirate"];
    const enemySelect = document.createElement('select');
    enemySelect.style.display = 'inline-block';
    enemySelect.style.marginRight = '8px';
    enemyList.forEach(nm => {
        const opt = document.createElement('option');
        opt.value = nm;
        opt.innerText = nm;
        if (nm === init.enemyName) opt.selected = true;
        enemySelect.appendChild(opt);
    });

    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.min = 1;
    qtyInput.value = init.quantity;
    qtyInput.classList.add("editor-input");

    // scrollable Home & Between lists (no onChange necessary; we'll read them in getValue)
    const homeList = makeScrollableCheckboxList(nodes, init.homeNodes);
    const betweenList = makeScrollableCheckboxList(nodes, init.betweenNodes);

    // remove button (we'll attach event after card created)
    const removeBtn = document.createElement('button');
    removeBtn.innerText = '- Remove Enemy';
    removeBtn.classList.add('remove-btn');
    removeBtn.style.marginTop = '6px';    

    // assemble body
    const topRow = document.createElement('div');
    topRow.appendChild(enemySelect);
    topRow.appendChild(qtyInput);

    const body = document.createElement('div');
    body.appendChild(groupInput);
    body.appendChild(topRow);

    const homeHeading = document.createElement('div');
    homeHeading.style.fontWeight = '600';
    homeHeading.style.marginTop = '8px';
    homeHeading.textContent = 'Home Nodes';
    body.appendChild(homeHeading);
    body.appendChild(homeList);

    const betweenHeading = document.createElement('div');
    betweenHeading.style.fontWeight = '600';
    betweenHeading.style.marginTop = '6px';
    betweenHeading.textContent = 'Between Nodes';
    body.appendChild(betweenHeading);
    body.appendChild(betweenList);

    body.appendChild(removeBtn);

    const card = makeCard('Enemy', init.id, body);
    makeCardDraggable(card);

    // attach remove action now that card exists
    removeBtn.addEventListener('click', () => {
        card.remove();
        renumberContainer(enemiesContainer, { prefix: "e" });  // auto-update IDs after removal
    });
    
    // expose getValue for save logic
    card.getValue = function () {
        const selectedHome = Array.from(homeList.querySelectorAll('input[type=checkbox]'))
            .filter(cb => cb.checked).map(cb => cb.value);

        const selectedBetween = Array.from(betweenList.querySelectorAll('input[type=checkbox]'))
            .filter(cb => cb.checked).map(cb => cb.value);

        // don't return empty placeholder items
        if (!groupInput.value && !enemySelect.value) return null;

        return {
            groupName: groupInput.value,
            enemyName: enemySelect.value,
            quantity: parseInt(qtyInput.value) || 1,
            homeNodes: selectedHome,
            betweenNodes: selectedBetween,
            // id is set during Save payload assignment
        };
    };

    return card;
}


// -------------------------------
// Obstacle Editor
// -------------------------------
function makeObstacleEditor(initial = {}, nodes = []) {
    const init = {
        name: initial?.name || "",
        obstacleType: initial?.obstacleType || "abstract",
        note: initial?.note || "",
        nodes: (initial?.nodes || []).map(String),
        id: initial?.id ?? null
    };

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Obstacle name';
    nameInput.value = init.name;
    nameInput.classList.add("editor-input");


    const typeSelect = document.createElement('select');
    const obstacleTypes = ['abstract', 'environment', 'timed', 'physical'];
    obstacleTypes.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.innerText = t.charAt(0).toUpperCase() + t.slice(1);
        if (t === init.obstacleType) opt.selected = true;
        typeSelect.appendChild(opt);
    });
    typeSelect.style.marginBottom = '6px';

    const noteArea = document.createElement('textarea');
    noteArea.placeholder = 'Note (optional)';
    noteArea.value = Array.isArray(init.note) ? init.note.join("\n") : init.note;
    noteArea.classList.add("editor-textarea");

    // nodes picker
    const nodeList = makeScrollableCheckboxList(nodes, init.nodes);

    const removeBtn = document.createElement('button');
    removeBtn.innerText = '- Remove Obstacle';
    removeBtn.classList.add('remove-btn');

    const body = document.createElement('div');
    body.appendChild(nameInput);
    body.appendChild(typeSelect);
    body.appendChild(nodeList);
    body.appendChild(noteArea);
    body.appendChild(removeBtn);

    const card = makeCard('Obstacle', init.id, body);
makeCardDraggable(card);
    
    removeBtn.addEventListener('click', () => {
        card.remove();
        renumberContainer(obstaclesContainer); // reassign IDs to fill gaps
    });
    
    card.getValue = function () {
        const selectedNodes = Array.from(nodeList.querySelectorAll('input[type=checkbox]'))
            .filter(cb => cb.checked).map(cb => cb.value);
    
        if (!nameInput.value) return null;
        return {
            id: card._id,            // use the persistent card._id
            name: nameInput.value,
            obstacleType: typeSelect.value,
            note: noteArea.value,
            nodes: selectedNodes
        };
    };    

    return card;
}


// ----------------------
// Strategies (Strats) - uses existing condition editors + unlocks editor
// ----------------------
function makeStratEditor(initial = {}, nodes = []) {
    const init = {
        name: initial?.name || "",
        devNote: initial?.devNote || "",
        entranceCondition: initial?.entranceCondition || null,
        exitCondition: initial?.exitCondition || null,
        requires: initial?.requires || null,
        unlocksDoors: initial?.unlocksDoors || [],
        id: initial?.id ?? null
    };

    const nameInput = document.createElement('input');
    nameInput.placeholder = "Strat Name";
    nameInput.value = init.name;
    nameInput.style.display = 'block';
    nameInput.style.marginBottom = '6px';

    const devNoteInput = document.createElement('input');
    devNoteInput.placeholder = "Dev Note";
    devNoteInput.value = init.devNote;
    devNoteInput.classList.add("editor-input");

    // Requires
    const requiresDiv = document.createElement('div');
    const requiresLabel = document.createElement('label');
    requiresLabel.innerText = "Requires:";
    requiresDiv.appendChild(requiresLabel);
    const requiresEditor = makeConditionEditor(requiresDiv, init.requires);

    // Entrance Condition
    const entranceDiv = document.createElement('div');
    const entranceLabel = document.createElement('label');
    entranceLabel.innerText = "Entrance Condition:";
    entranceDiv.appendChild(entranceLabel);
    const entranceEditorLocal = makeConditionEditor(entranceDiv, init.entranceCondition);

    // Exit Condition
    const exitDiv = document.createElement('div');
    const exitLabel = document.createElement('label');
    exitLabel.innerText = "Exit Condition:";
    exitDiv.appendChild(exitLabel);
    const exitEditorLocal = makeConditionEditor(exitDiv, init.exitCondition);

    // UnlocksDoors editor
    const unlocksEditor = makeUnlocksDoorsEditor(init.unlocksDoors);
    
    const removeBtn = document.createElement('button');
    removeBtn.innerText = '- Remove Strat';
    removeBtn.classList.add('remove-btn');
    removeBtn.style.marginTop = '6px';

    const body = document.createElement('div');
    body.appendChild(nameInput);
    body.appendChild(devNoteInput);
    body.appendChild(entranceDiv);
    body.appendChild(exitDiv);
    body.appendChild(requiresDiv);
    body.appendChild(unlocksEditor);
    body.appendChild(removeBtn);

    const card = makeCard('Strat', init.id, body);
    makeCardDraggable(card);
    
    // attach remove action now that card exists
    removeBtn.addEventListener('click', () => {
        card.remove();
        renumberContainer(stratsContainer, { numeric: true }); // auto-update IDs after removal
    });

    card.getValue = function () {
        return {
            name: nameInput.value,
            devNote: devNoteInput.value,
            entranceCondition: entranceEditorLocal.getValue(),
            exitCondition: exitEditorLocal.getValue(),
            requires: requiresEditor.getValue(),
            unlocksDoors: unlocksEditor.getValue()
        };
    };

    return card;
}


// ----------------------
// UnlocksDoors Editor  (keeps select-multiple behavior)
function makeUnlocksDoorsEditor(initial) {
    const init = Array.isArray(initial) ? initial : [];
    const itemsContainer = document.createElement('div');

    function addEntry(entry = null) {
        const entryDiv = document.createElement('div');
        entryDiv.classList.add("door-entry");

        // Types (multiple)
        const typesSelect = document.createElement('select');
        typesSelect.multiple = true;
        const typeOptions = ['super', 'missiles', 'powerbomb', 'ammo'];
        typeOptions.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.innerText = t;
            if (entry?.types?.includes(t)) opt.selected = true;
            typesSelect.appendChild(opt);
        });

        // Requires (multiple)
        const requiresSelect = document.createElement('select');
        requiresSelect.multiple = true;
        const requireOptions = ['never', 'canPrepareForNextRoom', 'SpaceJump', 'canWalljump'];
        requireOptions.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.innerText = r;
            if (entry?.requires?.includes(r)) opt.selected = true;
            requiresSelect.appendChild(opt);
        });

        const removeBtn = document.createElement('button');
        removeBtn.innerText = '- Remove Unlock Door';
        removeBtn.classList.add('remove-btn');
        removeBtn.addEventListener('click', () => entryDiv.remove());

        entryDiv.appendChild(typesSelect);
        entryDiv.appendChild(requiresSelect);
        entryDiv.appendChild(removeBtn);

        itemsContainer.appendChild(entryDiv);
    }

    (init || []).forEach(e => addEntry(e));

    const addBtn = document.createElement('button');
    addBtn.innerText = '+ Add Door Unlock';
    addBtn.classList.add('add-btn');
    addBtn.addEventListener('click', () => addEntry());

    const wrapper = document.createElement('div');
    wrapper.appendChild(itemsContainer);
    wrapper.appendChild(addBtn);

    // wrap into a card
    const card = makeCard('Unlocks Doors', null, wrapper);
    makeCardDraggable(card);
    
    card.getValue = function () {
        return Array.from(itemsContainer.children).map(div => {
            const selects = div.querySelectorAll('select');
            const types = Array.from(selects[0].selectedOptions).map(o => o.value);
            const requires = Array.from(selects[1].selectedOptions).map(o => o.value);
            return { types, requires };
        }).filter(e => e.types.length > 0);
    };

    return card;
}


// ----------------------
// Notable Editor
// ----------------------
function makeNotableEditor(initial = {}) {
    const init = {
        name: initial?.name || "",
        note: initial?.note || "",
        id: initial?.id ?? null
    };

    const nameInput = document.createElement('input');
    nameInput.placeholder = 'Name';
    nameInput.value = init.name;
    nameInput.style.display = 'block';
    nameInput.style.marginBottom = '6px';
    nameInput.style.width = '100%';

    const noteArea = document.createElement('textarea');
    noteArea.placeholder = 'Note (multi-line)';
    noteArea.value = Array.isArray(init.note) ? init.note.join('\n') : init.note;
    noteArea.classList.add("editor-textarea");

    const removeBtn = document.createElement('button');
    removeBtn.innerText = '- Remove Notable';
    removeBtn.classList.add('remove-btn');
    removeBtn.style.marginTop = '6px';
    
    const body = document.createElement('div');
    body.appendChild(nameInput);
    body.appendChild(noteArea);
    body.appendChild(removeBtn);

    const card = makeCard('Notable', init.id, body);
    makeCardDraggable(card);
    

    // attach remove action now that card exists
    removeBtn.addEventListener('click', () => {
        card.remove();
        renumberContainer(notablesContainer, { numeric: true }); // auto-update IDs after removal
    });

    card.getValue = function () {
        if (!nameInput.value) return null;
        const noteVal = noteArea.value.split('\n').map(l => l.trim()).filter(Boolean);
        return {
            name: nameInput.value,
            note: noteVal.length === 1 ? noteVal[0] : noteVal
        };
    };

    return card;
}

function renumberContainer(container, options = {}) {
    const { prefix = '', startCharCode = 65, numeric = false } = options;

    Array.from(container.children).forEach((card, idx) => {
        let id;
        if (numeric) {
            // simple 1, 2, 3...
            id = (idx + 1).toString();
        } else if (prefix) {
            id = `${prefix}${idx + 1}`;
        } else {
            id = String.fromCharCode(startCharCode + idx); // A, B, C...
        }

        const header = card.querySelector('div:first-child');
        if (header) {
            header.textContent = header.textContent.replace(/\((ID: .*?|new)\)/, `(ID: ${id})`);
        }

        card._id = id;
    });
}


function makeCardDraggable(card) {
    const header = card.querySelector('.editor-card-header');
    let isDragging = false, startY, placeholder, parent, offsetY;

    header.addEventListener('mousedown', e => {
        e.preventDefault();
        parent = card.parentNode;
        isDragging = true;

        const rect = card.getBoundingClientRect();
        offsetY = e.clientY - rect.top;

        placeholder = document.createElement('div');
        placeholder.style.height = `${rect.height}px`;
        placeholder.className = 'card-placeholder';
        parent.insertBefore(placeholder, card.nextSibling);

        card.classList.add('dragging');
        card.style.position = 'absolute';
        card.style.width = `${rect.width}px`;
        card.style.left = `${rect.left}px`;
        card.style.top = `${e.clientY - offsetY}px`;

        const onMouseMove = (e) => {
            if (!isDragging) return;
            card.style.top = `${e.clientY - offsetY}px`;

            const next = placeholder.nextElementSibling;
            const prev = placeholder.previousElementSibling;
            if (next && e.clientY > next.getBoundingClientRect().top + next.offsetHeight/2) {
                parent.insertBefore(placeholder, next.nextSibling);
            }
            if (prev && e.clientY < prev.getBoundingClientRect().top + prev.offsetHeight/2) {
                parent.insertBefore(placeholder, prev);
            }
        };

        const onMouseUp = () => {
            isDragging = false;
            card.classList.remove('dragging');
            card.style.position = '';
            card.style.top = '';
            card.style.left = '';
            card.style.width = '';
            parent.insertBefore(card, placeholder);
            placeholder.remove();
            renumberContainer(parent);

            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}
