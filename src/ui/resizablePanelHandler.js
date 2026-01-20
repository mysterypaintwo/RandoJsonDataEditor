/**
 * Resizable Panel Handler - Manages resizing of the JSON editor panel
 * Preserves mouse coordinate calculations for canvas interactions
 */
export class ResizablePanelHandler {
    constructor(panelId, handleId, onResize) {
        this.panel = document.getElementById(panelId);
        this.handle = document.getElementById(handleId);
        this.onResize = onResize;
        this.isResizing = false;
        this.startY = 0;
        this.startHeight = 0;

        if (!this.panel || !this.handle) {
            console.error('Resizable panel elements not found');
            return;
        }

        this.setupResizing();
    }

    setupResizing() {
        this.handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.startResize(e);
        });

        // Use global document listeners for smooth dragging
        this.mouseMoveHandler = (e) => {
            if (this.isResizing) {
                this.resize(e);
            }
        };

        this.mouseUpHandler = () => {
            if (this.isResizing) {
                this.stopResize();
            }
        };

        document.addEventListener('mousemove', this.mouseMoveHandler);
        document.addEventListener('mouseup', this.mouseUpHandler);
    }

    startResize(e) {
        this.isResizing = true;
        this.startY = e.clientY;
        this.startHeight = this.panel.offsetHeight;

        this.handle.classList.add('resizing');
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    }

    resize(e) {
        const deltaY = e.clientY - this.startY;
        const newHeight = this.startHeight + deltaY;

        // Enforce min/max constraints
        const minHeight = 200;
        const maxHeight = window.innerHeight * 0.6; // 60vh

        const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

        this.panel.style.height = `${clampedHeight}px`;

        // Notify callback if provided
        if (this.onResize) {
            this.onResize(clampedHeight);
        }
    }

    stopResize() {
        this.isResizing = false;
        this.handle.classList.remove('resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }

    destroy() {
        document.removeEventListener('mousemove', this.mouseMoveHandler);
        document.removeEventListener('mouseup', this.mouseUpHandler);
    }
}