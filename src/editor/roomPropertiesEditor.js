const {
	ipcRenderer
} = require('electron');

let entranceEditor, exitEditor;

window.addEventListener('DOMContentLoaded', () => {
	ipcRenderer.on('init-room-properties-data', (event, data) => {
		console.log('Room Properties Editor received data:', data);

		// Header info - use the correct property names
		document.getElementById('sector').innerText = data.area || 'Unknown';
		document.getElementById('region').innerText = data.subarea || 'Unknown';
		document.getElementById('roomName').innerText = data.name || 'Unknown';

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
		
		const payload = {
			
		};

		console.log('Saving Room Properties data:', payload);
		ipcRenderer.send('save-room-properties-data', payload);
		window.close();
	});

	// Close without saving
	document.getElementById('closeBtn').addEventListener('click', () => window.close());

	// Close on Escape
	document.addEventListener('keydown', e => {
		if (e.key === "Escape") window.close();
	});
});