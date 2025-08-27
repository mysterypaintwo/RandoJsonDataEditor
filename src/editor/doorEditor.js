/* =============================================================================
   Super Metroid: X-Fusion Door Editor
   
   This module handles the door editor interface for the X-Fusion romhack,
   allowing users to configure door properties, types, directions, and
   entrance/exit conditions for transitions between rooms in Super Metroid.
   
   Features:
   - Door type selection (Horizontal/Vertical doors, tunnels, elevators)
   - Direction configuration (Bi-directional vs Forward only)
   - Condition system for entrance and exit requirements
   - Integration with the broader room/node system
   
   Dependencies:
   - Electron IPC for communication with main process
   - conditionEditor.js for entrance/exit condition editing
   - Various condition data files (doorConditions.js, conditionItems.js, etc.)
   ============================================================================= */

   const { ipcRenderer } = require('electron');

   // ---- Module State --------------------------------
   let doorData = null;
   let conditionEditors = {
	   entrance: null,
	   exit: null
   };
   
   // Door configuration constants
   const DOOR_TYPES = [
	   { value: 'HorizontalDoor', label: 'Horizontal Door', description: 'Standard left/right door' },
	   { value: 'VerticalDoor', label: 'Vertical Door', description: 'Standard up/down door' },
	   { value: 'HorizontalMorphTunnel', label: 'Horizontal Morph Tunnel', description: 'Morph ball passage' },
	   { value: 'VerticalSandpit', label: 'Vertical Sandpit', description: 'Vertical morph ball passage' },
	   { value: 'Elevator', label: 'Elevator', description: 'Area transition elevator' },
	   { value: 'StoryMarker', label: 'Story Marker', description: 'Cutscene or story trigger' }
   ];
   
   const DIRECTION_TYPES = [
	   { value: 'Bi-Directional', label: 'Bi-Directional', description: 'Can traverse both ways' },
	   { value: 'Forward', label: 'Forward Only', description: 'One-way passage' }
   ];
   
   // ---- Initialization --------------------------------
   window.addEventListener('DOMContentLoaded', initializeDoorEditor);
   
   function initializeDoorEditor() {
	   setupIPCListeners();
	   setupEventHandlers();
	   console.log('Door Editor initialized');
   }
   
   function setupIPCListeners() {
	   ipcRenderer.on('init-door-data', handleDoorDataReceived);
   }
   
   function setupEventHandlers() {
	   // Save and close buttons
	   document.getElementById('saveBtn')?.addEventListener('click', handleSave);
	   document.getElementById('closeBtn')?.addEventListener('click', handleClose);
	   
	   // Keyboard shortcuts
	   document.addEventListener('keydown', handleKeydown);
   }
   
   // ---- Data Handling --------------------------------
   function handleDoorDataReceived(event, data) {
	   console.log('Door editor received data:', data);
	   doorData = data || {};
	   
	   updateHeaderInfo(doorData);
	   populateDoorTypeOptions(doorData.connection?.doorType);
	   populateDirectionOptions(doorData.connection?.directionType);
	   populateTitleField(doorData.connection?.title);
	   initializeConditionEditors(doorData.connection);
   }
   
   function updateHeaderInfo(data) {
	   const headerElements = {
		   sector: data.sector || 'Unknown Sector',
		   region: data.region || 'Unknown Region', 
		   roomName: data.roomName || 'Unknown Room',
		   doorDir: data.dir || 'Unknown Direction'
	   };
   
	   Object.entries(headerElements).forEach(([elementId, value]) => {
		   const element = document.getElementById(elementId);
		   if (element) {
			   element.textContent = value;
		   }
	   });
   }
   
   function populateDoorTypeOptions(selectedType = null) {
	   const container = document.getElementById('doorType');
	   if (!container) return;
   
	   container.innerHTML = '';
	   
	   DOOR_TYPES.forEach(doorType => {
		   const radioOption = createRadioOption(
			   'doorType', 
			   doorType.value, 
			   doorType.label, 
			   selectedType === doorType.value
		   );
		   
		   // Add tooltip with description
		   radioOption.title = doorType.description;
		   container.appendChild(radioOption);
	   });
   }
   
   function populateDirectionOptions(selectedDirection = null) {
	   const container = document.getElementById('directionType');
	   if (!container) return;
   
	   container.innerHTML = '';
	   
	   // Default to Bi-Directional if no selection
	   const defaultDirection = selectedDirection || 'Bi-Directional';
	   
	   DIRECTION_TYPES.forEach(direction => {
		   const radioOption = createRadioOption(
			   'directionType',
			   direction.value,
			   direction.label,
			   direction.value === defaultDirection
		   );
		   
		   radioOption.title = direction.description;
		   container.appendChild(radioOption);
	   });
   }
   
   function populateTitleField(title = '') {
	   const titleField = document.getElementById('doorTitle');
	   if (titleField) {
		   titleField.value = title;
	   }
   }
   
   function initializeConditionEditors(connectionData = {}) {
	   // Clear existing condition editors
	   clearConditionEditors();
	   
	   // Initialize entrance condition editor
	   const entranceContainer = document.getElementById('entranceCondition');
	   if (entranceContainer) {
		   entranceContainer.innerHTML = '';
		   conditionEditors.entrance = makeConditionEditor(
			   entranceContainer, 
			   connectionData.entranceCondition || null,
			   0,
			   true
		   );
	   }
	   
	   // Initialize exit condition editor  
	   const exitContainer = document.getElementById('exitCondition');
	   if (exitContainer) {
		   exitContainer.innerHTML = '';
		   conditionEditors.exit = makeConditionEditor(
			   exitContainer,
			   connectionData.exitCondition || null,
			   0,
			   true
		   );
	   }
   }
   
   function clearConditionEditors() {
	   conditionEditors.entrance = null;
	   conditionEditors.exit = null;
   }
   
   // ---- UI Creation Helpers --------------------------------
   function createRadioOption(name, value, label, isChecked = false) {
	   const labelElement = document.createElement('label');
	   labelElement.innerHTML = `
		   <input type="radio" name="${name}" value="${value}" ${isChecked ? 'checked' : ''}> 
		   ${label}
	   `;
	   
	   // Prevent line breaks for cleaner layout
	   labelElement.style.whiteSpace = 'nowrap';
	   labelElement.style.margin = '0';
	   labelElement.style.cursor = 'pointer';
	   
	   return labelElement;
   }
   
   // ---- Save/Load Operations --------------------------------
   function handleSave() {
	   try {
		   const doorTypeElement = document.querySelector('input[name="doorType"]:checked');
		   const directionTypeElement = document.querySelector('input[name="directionType"]:checked');
		   const titleElement = document.getElementById('doorTitle');
		   
		   // Validate required fields
		   if (!doorTypeElement) {
			   showValidationError('Please select a door type');
			   return;
		   }
		   
		   if (!directionTypeElement) {
			   showValidationError('Please select a direction type');
			   return;
		   }
		   
		   // Collect condition data
		   const entranceCondition = conditionEditors.entrance?.getValue() || null;
		   const exitCondition = conditionEditors.exit?.getValue() || null;
		   
		   // Build save payload
		   const payload = {
			   dir: doorData?.dir || document.getElementById('doorDir')?.textContent,
			   connection: {
				   doorType: doorTypeElement.value,
				   directionType: directionTypeElement.value,
				   title: titleElement?.value?.trim() || '',
				   entranceCondition: entranceCondition,
				   exitCondition: exitCondition
			   }
		   };
		   
		   console.log('Saving door data:', payload);
		   ipcRenderer.send('save-door-data', payload);
		   
		   // Close window after successful save
		   window.close();
		   
	   } catch (error) {
		   console.error('Error saving door data:', error);
		   showValidationError('Failed to save door data. Please check the console for details.');
	   }
   }
   
   function handleClose() {
	   // Check if there are unsaved changes
	   if (hasUnsavedChanges()) {
		   const confirmClose = confirm('You have unsaved changes. Are you sure you want to close?');
		   if (!confirmClose) return;
	   }
	   
	   window.close();
   }
   
   function hasUnsavedChanges() {
	   // Simple check - in a more complex implementation, you might compare
	   // current form state with the original doorData
	   const doorTypeElement = document.querySelector('input[name="doorType"]:checked');
	   const titleElement = document.getElementById('doorTitle');
	   
	   return doorTypeElement?.value !== doorData?.connection?.doorType ||
			  titleElement?.value !== (doorData?.connection?.title || '');
   }
   
   // ---- Error Handling --------------------------------
   function showValidationError(message) {
	   // Create or update error message display
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
		   
		   // Insert at the top of the form
		   const form = document.getElementById('form');
		   if (form) {
			   form.insertBefore(errorElement, form.firstChild);
		   }
	   }
	   
	   errorElement.textContent = message;
	   
	   // Auto-hide after 5 seconds
	   setTimeout(() => {
		   if (errorElement && errorElement.parentNode) {
			   errorElement.parentNode.removeChild(errorElement);
		   }
	   }, 5000);
   }
   
   // ---- Event Handlers --------------------------------
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
   
   // ---- Utility Functions --------------------------------
   function debugLogCurrentState() {
	   console.log('Current door editor state:', {
		   doorData,
		   selectedDoorType: document.querySelector('input[name="doorType"]:checked')?.value,
		   selectedDirection: document.querySelector('input[name="directionType"]:checked')?.value,
		   title: document.getElementById('doorTitle')?.value,
		   entranceCondition: conditionEditors.entrance?.getValue(),
		   exitCondition: conditionEditors.exit?.getValue()
	   });
   }
   
   // Expose debug function globally for development
   window.debugDoorEditor = debugLogCurrentState;