function makeConditionEditor(container, initial, indentLevel = 0) {
	const TYPE_LABELS = {
		"": "(none)",
		"and": "All of these must be true",
		"or": "Any of these can be true",
		"item": "Requires item",
		"event": "Triggered by event",
		"environment": "Environment condition"
	};

	const TYPE_COLORS = {
		"and": "#cce5ff",
		"or": "#fff0cc",
		"item": "#e6ffe6",
		"event": "#ffe6f0",
		"environment": "#f0f0f0",
		"": "#f8f8f8"
	};

	const TYPE_ICONS = {
		"and": "∧",
		"or": "∨",
		"item": "🎒",
		"event": "⚡",
		"environment": "🌿",
		"": "•"
	};

	const root = document.createElement('div');
	root.classList.add('condition-block', 'editor-card'); // add editor-card base
	// optionally add type-specific class for obstacle/strat
	if (initial?.typeClass) {
		root.classList.add(initial.typeClass);
	}
	root.style.marginLeft = `${indentLevel * 15}px`;
	root.style.padding = '4px 6px';
	root.style.borderRadius = '4px';
	

	// Type dropdown with icon
	const typeContainer = document.createElement('div');
	typeContainer.style.display = 'flex';
	typeContainer.style.alignItems = 'center';

	const iconSpan = document.createElement('span');
	iconSpan.innerText = TYPE_ICONS[""];
	iconSpan.style.marginRight = "6px";
	typeContainer.appendChild(iconSpan);

	const typeSelect = document.createElement('select');
	Object.keys(TYPE_LABELS).forEach(t => {
		const opt = document.createElement('option');
		opt.value = t;
		opt.innerText = TYPE_LABELS[t];
		if (initial && Object.keys(initial)[0] === t) opt.selected = true;
		typeSelect.appendChild(opt);
	});
	typeContainer.appendChild(typeSelect);

	// Remove button
	const removeBtn = document.createElement('button');
	removeBtn.innerText = "Remove";
	removeBtn.style.marginLeft = "8px";
	removeBtn.onclick = () => root.remove();
	typeContainer.appendChild(removeBtn);

	root.appendChild(typeContainer);

	// Children container
	const childrenDiv = document.createElement('div');
	childrenDiv.classList.add('children');
	root.appendChild(childrenDiv);

	function updateStyles() {
		const selected = typeSelect.value;
		root.style.backgroundColor = TYPE_COLORS[selected] || "#f8f8f8";
		iconSpan.innerText = TYPE_ICONS[selected] || "•";
	}

	function renderChildren() {
		childrenDiv.innerHTML = "";
		updateStyles();

		const selected = typeSelect.value;

		if (selected === "and" || selected === "or") {
			// Collapsible toggle
			const toggleBtn = document.createElement('button');
			toggleBtn.innerText = "▼";
			toggleBtn.style.marginRight = "6px";
			toggleBtn.onclick = () => {
				childrenDiv.style.display = childrenDiv.style.display === "none" ? "block" : "none";
				toggleBtn.innerText = childrenDiv.style.display === "none" ? "▶" : "▼";
			};
			root.insertBefore(toggleBtn, typeContainer);

			const arr = (initial && initial[selected]) || [];
			arr.forEach(child => {
				const childContainer = document.createElement('div');
				makeConditionEditor(childContainer, child, indentLevel + 1);
				childrenDiv.appendChild(childContainer);
			});

			const addBtn = document.createElement('button');
			addBtn.innerText = selected === "and" ? "+ Add Sub-condition" : "+ Add Option";
			addBtn.style.marginTop = "4px";
			addBtn.onclick = () => {
				const childContainer = document.createElement('div');
				makeConditionEditor(childContainer, null, indentLevel + 1);
				childrenDiv.insertBefore(childContainer, addBtn);
			};
			childrenDiv.appendChild(addBtn);

		} else if (selected === "item" || selected === "event") {
			const sel = document.createElement('select');
			sel.style.marginLeft = "25px"; // deeper indent
			sel.style.backgroundColor = TYPE_COLORS[selected];
			sel.innerHTML = `<option value="">(none)</option>`;
			const list = selected === "item" ? (window.CONDITION_ITEMS || []) : (window.CONDITION_EVENTS || []);
			list.sort().forEach(i => {
				const opt = document.createElement('option');
				opt.value = i;
				opt.innerText = i;
				if (initial && initial[selected] === i) opt.selected = true;
				sel.appendChild(opt);
			});
			childrenDiv.appendChild(sel);

		} else if (selected === "environment") {
			const input = document.createElement('input');
			input.type = "text";
			input.value = (initial && initial[selected]) || "";
			input.placeholder = "Enter environment tag";
			input.style.marginLeft = "25px";
			input.style.backgroundColor = TYPE_COLORS[selected];
			childrenDiv.appendChild(input);
		}
	}

	typeSelect.addEventListener('change', () => {
		initial = null;
		renderChildren();
	});

	renderChildren();
	container.appendChild(root);

	root.getValue = function() {
		const type = typeSelect.value;
		if (!type) return null;

		if (type === "and" || type === "or") {
			const arr = [];
			childrenDiv.querySelectorAll('.condition-block').forEach(cb => {
				const val = cb.getValue();
				if (val) arr.push(val);
			});
			return {
				[type]: arr
			};
		} else if (type === "item" || type === "event") {
			const sel = childrenDiv.querySelector('select');
			return sel.value ? {
				[type]: sel.value
			} : null;
		} else {
			const input = childrenDiv.querySelector('input');
			return {
				[type]: input.value
			};
		}
	};

	return root;
}