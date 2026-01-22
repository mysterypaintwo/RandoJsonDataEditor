/**
 * Resizable Panel Handler - DISABLED to prevent interaction conflicts
 * The JSON panel is now fixed-height to avoid canvas coordinate issues
 */
export class ResizablePanelHandler {
    constructor(panelId, handleId, onResize) {
        this.panel = document.getElementById(panelId);
        this.handle = document.getElementById(handleId);

        if (!this.panel || !this.handle) {
            console.warn('Resizable panel elements not found');
            return;
        }

        // Hide the resize handle since resizing is disabled
        this.handle.style.display = 'none';
        
        // Set a fixed height for the JSON editor
        this.panel.style.height = '300px';
        
        console.log('JSON panel resizing is disabled to prevent canvas interaction conflicts');
    }

    // Stub methods for compatibility
    destroy() {
        // No-op
    }
}