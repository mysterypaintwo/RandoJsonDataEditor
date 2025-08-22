const {
	ipcRenderer
} = require('electron');

let entranceEditor, exitEditor;

window.addEventListener('DOMContentLoaded', () => {
	ipcRenderer.on('init-door-data', (event, data) => {
		console.log('Door editor received data:', data);

		// Header info - use the correct property names
		document.getElementById('sector').innerText = data.sector || 'Unknown';
		document.getElementById('region').innerText = data.region || 'Unknown';
		document.getElementById('roomName').innerText = data.roomName || 'Unknown';
		document.getElementById('doorDir').innerText = data.dir || 'Unknown';

		// Door Type radios
		const doorTypes = [
			"HorizontalDoor", "VerticalDoor",
			"HorizontalMorphTunnel", "VerticalSandpit",
			"Elevator", "StoryMarker"
		];
		const doorTypeDiv = document.getElementById('doorType');
		doorTypeDiv.innerHTML = "";
		doorTypes.forEach(type => {
			const lbl = document.createElement('label');
			lbl.innerHTML = `<input type="radio" name="doorType" value="${type}"> ${type}`;
			doorTypeDiv.appendChild(lbl);
		});
		if (data.connection?.doorType) {
			const el = document.querySelector(`input[name="doorType"][value="${data.connection.doorType}"]`);
			if (el) el.checked = true;
		}

		// Direction radios
		const directions = [{
				value: "Bi-Directional",
				label: "Bi-Directional"
			},
			{
				value: "Forward",
				label: "Forward"
			}
		];
		const dirDiv = document.getElementById('directionType');
		dirDiv.innerHTML = "";
		directions.forEach(d => {
			const lbl = document.createElement('label');
			lbl.innerHTML = `<input type="radio" name="directionType" value="${d.value}"> ${d.label}`;
			dirDiv.appendChild(lbl);
		});
		if (data.connection?.directionType) {
			const el = document.querySelector(`input[name="directionType"][value="${data.connection.directionType}"]`);
			if (el) el.checked = true;
		} else {
			// Default to Bi-Directional if no existing connection
			const defaultEl = document.querySelector(`input[name="directionType"][value="Bi-Directional"]`);
			if (defaultEl) defaultEl.checked = true;
		}

		// Title
		document.getElementById('doorTitle').value = data.connection?.title || "";

		// Clear any existing condition editors
		document.getElementById('entranceCondition').innerHTML = "";
		document.getElementById('exitCondition').innerHTML = "";

		// Entrance/Exit Condition Editor
		entranceEditor = makeConditionEditor(
			document.getElementById('entranceCondition'),
			data.connection?.entranceCondition || null
		);
		exitEditor = makeConditionEditor(
			document.getElementById('exitCondition'),
			data.connection?.exitCondition || null
		);
	});

	// Save / Close
	document.getElementById('saveBtn').addEventListener('click', () => {
		const doorType = document.querySelector('input[name="doorType"]:checked')?.value || null;
		const directionType = document.querySelector('input[name="directionType"]:checked')?.value || "Bi-Directional";
		const title = document.getElementById('doorTitle').value || "";

		const payload = {
			dir: document.getElementById('doorDir').innerText,
			connection: {
				doorType,
				directionType,
				title,
				entranceCondition: entranceEditor.getValue(),
				exitCondition: exitEditor.getValue()
			}
		};

		console.log('Saving door data:', payload);
		ipcRenderer.send('save-door-data', payload);
		window.close();
	});

	// Close without saving
	document.getElementById('closeBtn').addEventListener('click', () => window.close());

	// Close on Escape
	document.addEventListener('keydown', e => {
		if (e.key === "Escape") window.close();
	});
});