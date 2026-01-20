/**
 * Main Application - Entry point and orchestration of all components
 * Coordinates the state manager, UI manager, room manager, renderer, and interaction handler
 */
// ===== CONFIG =====
const Config = {
    enableValidation: false,
    gameType: 'XFusion',
};

import state from './core/state.js';
import {
    CanvasRenderer
} from './ui/canvasRenderer.js';
import {
    InteractionHandler
} from './core/interactionHandler.js';
import {
    UIManager
} from './ui/uiManager.js';
import {
    RoomManager
} from './core/roomManager.js';
import {
    GoToRoomHandler
} from './ui/goToRoomHandler.js';
import {
    ResizablePanelHandler
} from './ui/resizablePanelHandler.js';

class RandoJsonDataEditor {
    constructor() {
        this.canvas = document.getElementById("roomCanvas");
        this.mapContainer = document.getElementById("map-container");

        // Initialize managers
        this.uiManager = new UIManager(state);
        this.renderer = new CanvasRenderer(this.canvas, this.mapContainer);
        this.roomManager = new RoomManager(state, this.renderer, this.uiManager, Config);

        // Store room manager in state for access by UI manager
        state.roomManager = this.roomManager;

        this.interactionHandler = new InteractionHandler(
            this.canvas,
            this.mapContainer,
            state,
            this.renderer,
            this.uiManager
        );

        // Initialize Go To Room handler
        this.goToRoomHandler = new GoToRoomHandler(state, this.roomManager, this.uiManager);

        // Initialize resizable JSON panel
        this.resizablePanelHandler = new ResizablePanelHandler(
            'json-editor',
            'jsonResizeHandle',
            (newHeight) => {
                // Optional: Handle resize events if needed
                // The canvas coordinates remain correct because they're based on canvas.getBoundingClientRect()
            }
        );

        this.setupEventListeners();
        this.initCanvas();
        this.initRoomPropertiesButton();
    }

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

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts if user is typing in an input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                // Allow Ctrl+S even in textarea (JSON editor)
                if (e.ctrlKey && e.key === 's') {
                    e.preventDefault();
                    this.roomManager.saveCurrentRoom();
                }
                return;
            }

            // Ctrl+S: Save
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.roomManager.saveCurrentRoom();
            }

            // Ctrl+P: Room Properties
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                this.openRoomProperties();
            }
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

        // Door Editor updates
        window.api.onUpdateDoorNode((payload) => {
            this.roomManager.handleDoorNodeUpdate(payload);
        });

        // Room Properties Editor updates
        window.api.onUpdateRoomProperties((payload) => {
            this.roomManager.handleRoomPropertiesUpdate(payload);
        });
    }

    initCanvas() {
        this.canvas.width = 640;
        this.canvas.height = 360;
        this.uiManager.updateActiveTool('selectModeBtn');
    }

    async selectWorkingDirectory() {
        const selectedDir = await window.api.selectWorkingDirectory();
        if (selectedDir) {
            await state.setWorkingDir(selectedDir);
            this.uiManager.updateWorkingDirectory(selectedDir);
            // Refresh the Go To Room cache
            this.goToRoomHandler.refreshCache();
        }
    }

    setToolMode(mode) {
        state.setMode(mode);
        this.uiManager.updateActiveTool(`${mode}ModeBtn`);
        this.renderer.redraw(
            state.currentRoomImage,
            state.nodes,
            state.selectedNode,
            state.currentRect,
            state.scale
        );
    }

    initRoomPropertiesButton() {
        const rpBtn = document.getElementById('roomPropertiesBtn');
        if (!rpBtn) return;

        rpBtn.addEventListener('click', () => {
            this.openRoomProperties();
        });
    }

    openRoomProperties() {
        if (!state.currentRoomPath || !state.currentRoomData) {
            this.uiManager.showAlert('No room data to edit properties!');
            return;
        }

        window.api.openRoomPropertiesEditor(
            state.currentRoomData,
            state.getEnemyList(),
            state.getItemList(),
            state.getEventList(),
            state.getWeaponList(),
            state.getTechMap(),
            state.getHelperMap()
        );
    }
}

// Initialize the application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    new RandoJsonDataEditor();
});