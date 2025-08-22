/**
 * Main Application - Entry point and orchestration of all components
 * Coordinates the state manager, UI manager, room manager, renderer, and interaction handler
 */

// ===== CONFIG =====
const Config = {
	enableValidation: false, // toggle AJV validation
	gameType: 'XFusion', // 'XFusion' or 'SuperMetroid'
};

const SchemaPrefix = {
	XFusion: 'mxf',
	SuperMetroid: 'm3'
};

import state from './state.js';
import {
	CanvasRenderer
} from './canvasRenderer.js';
import {
	InteractionHandler
} from './interactionHandler.js';
import {
	UIManager
} from './uiManager.js';
import {
	RoomManager
} from './roomManager.js';

class RandoJsonDataEditor {
	constructor() {
		// Get DOM elements
		this.canvas = document.getElementById("roomCanvas");
		this.mapContainer = document.getElementById("map-container");

		// Initialize managers
		this.uiManager = new UIManager(state);
		this.renderer = new CanvasRenderer(this.canvas, this.mapContainer);
		this.roomManager = new RoomManager(state, this.renderer, this.uiManager, Config);
		this.interactionHandler = new InteractionHandler(
			this.canvas,
			this.mapContainer,
			state,
			this.renderer,
			this.uiManager
		);

		this.setupEventListeners();
		this.initializeCanvas();
		this.initializeDoorButtons();
	}

	/**
	 * Set up all application event listeners
	 */
	setupEventListeners() {
		// Working directory selection
		document.getElementById('setDirBtn').addEventListener('click', async () => {
			await this.selectWorkingDirectory();
		});

		// Tool mode buttons
		['draw', 'select', 'move', 'resize'].forEach(mode => {
			const button = document.getElementById(`${mode}ModeBtn`);
			if (button) {
				button.addEventListener('click', () => {
					this.setToolMode(mode);
				});
			}
		});

		// Sector navigation buttons
		document.querySelectorAll('.sector-btn').forEach(btn => {
			btn.addEventListener('click', async () => {
				const sector = btn.dataset.sector;
				await this.roomManager.navigateToArea(sector);
			});
		});

		// Save button
		document.getElementById('saveBtn').addEventListener('click', () => {
			this.roomManager.saveCurrentRoom();
		});

		// JSON editor live sync
		this.uiManager.setupJsonEditor((parsedData) => {
			state.currentRoomData = parsedData;
			state.nodes = parsedData.nodes ? [...parsedData.nodes] : [];
			this.renderer.redraw(
				state.currentRoomImage,
				state.nodes,
				state.selectedNode,
				state.currentRect,
				state.scale
			);
		});

		// Door editor updates
		window.api.onUpdateDoorData((payload) => {
			this.handleDoorUpdate(payload);
		});
	}

	/**
	 * Initialize canvas with default size
	 */
	initializeCanvas() {
		this.canvas.width = 640;
		this.canvas.height = 360;
		this.uiManager.updateActiveTool('selectModeBtn'); // Default to select mode
	}

	/**
	 * Handle working directory selection
	 */
	async selectWorkingDirectory() {
		const selectedDir = await window.api.selectWorkingDirectory();
		if (selectedDir) {
			state.setWorkingDir(selectedDir);
			this.uiManager.updateWorkingDirectory(selectedDir);
		}
	}

	/**
	 * Set the current tool mode
	 * @param {string} mode - The tool mode to set
	 */
	setToolMode(mode) {
		state.setMode(mode);
		this.uiManager.updateActiveTool(`${mode}ModeBtn`);

		// Redraw to update visual selection states
		this.renderer.redraw(
			state.currentRoomImage,
			state.nodes,
			state.selectedNode,
			state.currentRect,
			state.scale
		);
	}

	/**
	 * Initialize door buttons on app startup
	 */
	initializeDoorButtons() {
		console.log('Initializing door buttons...');
		// Set up initial door button states (all inactive)
		document.querySelectorAll('.door-btn').forEach(btn => {
			btn.classList.remove('active');
			btn._doorConnection = null;

			// Add click handler for navigation
			btn.addEventListener('click', () => {
				console.log(`Door button clicked: ${btn.dataset.dir}, active: ${btn.classList.contains('active')}, connection:`, btn._doorConnection);
				// Only navigate if there's an active connection
				if (btn.classList.contains('active') && btn._doorConnection) {
					this.roomManager.navigateThroughDoor(btn._doorConnection);
				}
			});

			// Add right-click handler for door editor
			btn.addEventListener('contextmenu', (e) => {
				e.preventDefault();
				console.log(`Door button right-clicked: ${btn.dataset.dir}`);

				if (state.currentRoomData) {
					const direction = btn.dataset.dir;
					const connection = btn._doorConnection || null;
					this.roomManager.openDoorEditor(direction, connection, state.currentRoomData);
				}
			});
		});
		console.log('Door buttons initialized');
	}
}

// Initialize the application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
	new RandoJsonDataEditor();
});