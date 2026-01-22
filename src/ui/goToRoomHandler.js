/**
 * Go To Room Handler - Manages room navigation modal
 */
export class GoToRoomHandler {
    constructor(state, roomManager, uiManager) {
        this.state = state;
        this.roomManager = roomManager;
        this.uiManager = uiManager;
        this.roomsCache = null; // Cache the rooms list

        this.setupModal();
        this.setupKeyboardShortcut();
    }

	setupModal() {
		const modal = document.getElementById('gotoModal');
		const btn = document.getElementById('gotoRoomBtn');
		const cancelBtn = document.getElementById('gotoCancelBtn');
		const searchInput = document.getElementById('gotoSearchInput');

		if (!modal || !btn || !cancelBtn || !searchInput) {
			console.error('Go To Room modal elements not found');
			return;
		}

		// Open modal
		btn.addEventListener('click', () => this.openModal());

		// Close modal
		cancelBtn.addEventListener('click', () => this.closeModal());

		// Close on background click
		modal.addEventListener('click', (e) => {
			if (e.target === modal) {
				this.closeModal();
			}
		});

		// Search functionality
		searchInput.addEventListener('input', (e) => {
			this.populateRoomList(e.target.value);
		});

		// Enter key to select first result
		searchInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				const firstRoom = document.querySelector('.room-list-item');
				if (firstRoom) {
					firstRoom.click();
				}
			}
			// Don't propagate other keys to prevent shortcuts
			e.stopPropagation();
		});
	}
	
	setupKeyboardShortcut() {
		document.addEventListener('keydown', (e) => {
			// Check if modal is open
			const modal = document.getElementById('gotoModal');
			const isModalOpen = modal && modal.style.display === 'flex';
			
			if (isModalOpen) {
				// Only allow Escape to close modal
				if (e.key === 'Escape') {
					e.preventDefault();
					e.stopPropagation();
					this.closeModal();
				}
				// Block all other shortcuts while modal is open
				return;
			}
			
			// Ctrl+G to open modal (only when closed)
			if (e.ctrlKey && e.key === 'g') {
				e.preventDefault();
				this.openModal();
			}
		});
	}
	
    openModal() {
        if (!this.state.workingDir) {
            this.uiManager.showAlert('Set working directory first!');
            return;
        }

        const modal = document.getElementById('gotoModal');
        const searchInput = document.getElementById('gotoSearchInput');

        if (!modal || !searchInput) return;

        // Cache rooms list on first open
        if (!this.roomsCache) {
            this.roomsCache = this.state.getAllRooms();
        }

        modal.style.display = 'flex';
        searchInput.value = '';
        searchInput.focus();
        this.populateRoomList('');
    }

    closeModal() {
        const modal = document.getElementById('gotoModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    populateRoomList(searchTerm) {
        const roomList = document.getElementById('gotoRoomList');
        if (!roomList) return;

        roomList.innerHTML = '';

        if (!this.roomsCache) {
            this.roomsCache = this.state.getAllRooms();
        }

        const filteredRooms = searchTerm ?
            this.roomsCache.filter(room =>
                room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                room.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
                room.subarea.toLowerCase().includes(searchTerm.toLowerCase())
            ) :
            this.roomsCache;

        if (filteredRooms.length === 0) {
            roomList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No rooms found</div>';
            return;
        }

        // Limit to first 100 results for performance
        const displayRooms = filteredRooms.slice(0, 100);

        displayRooms.forEach(room => {
            const item = document.createElement('div');
            item.className = 'room-list-item';

            const nameDiv = document.createElement('div');
            nameDiv.className = 'room-name';
            nameDiv.textContent = room.name;

            const metaDiv = document.createElement('div');
            metaDiv.className = 'room-meta';
            metaDiv.textContent = `${room.area} / ${room.subarea}`;

            item.appendChild(nameDiv);
            item.appendChild(metaDiv);

            item.addEventListener('click', async () => {
                this.closeModal();
                await this.roomManager.loadRoom(room.area, room.subarea, room.name);
            });

            roomList.appendChild(item);
        });

        // Show count if filtered
        if (filteredRooms.length > 100) {
            const moreDiv = document.createElement('div');
            moreDiv.style.cssText = 'padding: 8px; text-align: center; color: #666; font-size: 11px; border-top: 1px solid #ddd;';
            moreDiv.textContent = `Showing 100 of ${filteredRooms.length} results. Refine your search.`;
            roomList.appendChild(moreDiv);
        }
    }

    // Refresh the rooms cache when working directory changes
    refreshCache() {
        this.roomsCache = null;
    }
}