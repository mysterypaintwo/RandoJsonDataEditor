/* =============================================================================
   Strat Filter Component
   Advanced filtering for strats by name and link connections
   ============================================================================= */

export class StratFilter {
	constructor(section, headerElement) {
		this.section = section;
		this.headerElement = headerElement;
		this.filters = {
			nameWhitelist: [],
			nameBlacklist: [],
			fromNodeWhitelist: [],
			fromNodeBlacklist: [],
			toNodeWhitelist: [],
			toNodeBlacklist: []
		};
		this.createElement();
	}

	createElement() {
		this.root = document.createElement('div');
		this.root.className = 'strat-filter-panel';
		this.root.style.cssText = `
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border: 2px solid #dee2e6;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        `;

		// Header with toggle
		const header = document.createElement('div');
		header.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            user-select: none;
            margin-bottom: 12px;
        `;

		this.toggleIcon = document.createElement('span');
		this.toggleIcon.textContent = '▼';
		this.toggleIcon.style.fontSize = '14px';

		const title = document.createElement('strong');
		title.textContent = '🔍 Filter Strats';
		title.style.fontSize = '16px';

		const clearBtn = document.createElement('button');
		clearBtn.textContent = 'Clear All Filters';
		clearBtn.className = 'secondary-btn';
		clearBtn.style.cssText = `
            margin-left: auto;
            padding: 6px 12px;
            font-size: 12px;
        `;
		clearBtn.onclick = () => this.clearAllFilters();

		header.appendChild(this.toggleIcon);
		header.appendChild(title);
		header.appendChild(clearBtn);

		const container = this.section.querySelector('#stratsContainer');
		if (container) {
			this.section.insertBefore(this.root, container);
		}

		this.content = document.createElement('div');
		this.content.style.display = 'grid';
		this.content.style.gridTemplateColumns = '1fr 1fr';
		this.content.style.gap = '12px';

		// Name filters
		this.content.appendChild(this.createFilterSection(
			'Name Contains (show only)',
			'nameWhitelist',
			'Enter strat names to show...'
		));

		this.content.appendChild(this.createFilterSection(
			'Name Contains (hide)',
			'nameBlacklist',
			'Enter strat names to hide...'
		));

		// From node filters
		this.content.appendChild(this.createFilterSection(
			'From Node (show only)',
			'fromNodeWhitelist',
			'Enter node IDs (e.g., 1,2,3)...'
		));

		this.content.appendChild(this.createFilterSection(
			'From Node (hide)',
			'fromNodeBlacklist',
			'Enter node IDs (e.g., 4,5,6)...'
		));

		// To node filters
		this.content.appendChild(this.createFilterSection(
			'To Node (show only)',
			'toNodeWhitelist',
			'Enter node IDs (e.g., 1,2,3)...'
		));

		this.content.appendChild(this.createFilterSection(
			'To Node (hide)',
			'toNodeBlacklist',
			'Enter node IDs (e.g., 4,5,6)...'
		));

		header.onclick = () => this.toggle();

		this.root.appendChild(header);
		this.root.appendChild(this.content);
		this.container.insertBefore(this.root, this.container.firstChild);

		// Start collapsed
		this.isExpanded = true;
		this.toggle();
	}

	createFilterSection(label, filterKey, placeholder) {
		const section = document.createElement('div');
		section.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 6px;
        `;

		const labelEl = document.createElement('label');
		labelEl.textContent = label;
		labelEl.style.cssText = `
            font-weight: 600;
            font-size: 13px;
            color: #495057;
        `;

		const input = document.createElement('input');
		input.type = 'text';
		input.placeholder = placeholder;
		input.style.cssText = `
            padding: 8px 12px;
            border: 2px solid #ced4da;
            border-radius: 4px;
            font-size: 13px;
        `;

		input.addEventListener('input', (e) => {
			const value = e.target.value.trim();

			if (filterKey.includes('Node')) {
				// Parse node IDs
				this.filters[filterKey] = value
					.split(',')
					.map(s => parseInt(s.trim()))
					.filter(n => !isNaN(n));
			} else {
				// Parse name fragments (split by comma)
				this.filters[filterKey] = value
					.split(',')
					.map(s => s.trim().toLowerCase())
					.filter(s => s.length > 0);
			}

			this.applyFilters();
		});

		section.appendChild(labelEl);
		section.appendChild(input);
		return section;
	}

	toggle() {
		this.isExpanded = !this.isExpanded;
		this.content.style.display = this.isExpanded ? 'grid' : 'none';
		this.toggleIcon.textContent = this.isExpanded ? '▼' : '▶';
	}

	clearAllFilters() {
		this.filters = {
			nameWhitelist: [],
			nameBlacklist: [],
			fromNodeWhitelist: [],
			fromNodeBlacklist: [],
			toNodeWhitelist: [],
			toNodeBlacklist: []
		};

		// Clear all inputs
		this.content.querySelectorAll('input').forEach(input => {
			input.value = '';
		});

		this.applyFilters();
	}

	applyFilters() {
		const stratsContainer = document.getElementById('stratsContainer');
		if (!stratsContainer) return;

		const stratCards = stratsContainer.querySelectorAll('.strat-card');
		let visibleCount = 0;
		let hiddenCount = 0;

		stratCards.forEach(card => {
			const shouldShow = this.shouldShowStrat(card);
			card.style.display = shouldShow ? '' : 'none';

			if (shouldShow) visibleCount++;
			else hiddenCount++;
		});

		// Update title with count
		const stratSection = document.querySelector('section h3');
		if (stratSection && stratSection.textContent.includes('📘 Strats')) {
			const baseText = '📘 Strats';
			stratSection.textContent = `${baseText} (${visibleCount} visible, ${hiddenCount} hidden)`;
		}
	}

	shouldShowStrat(card) {
		// Get strat data from the card
		const nameEl = card.querySelector('input[placeholder*="Strat Name"]');
		const stratName = nameEl ? nameEl.value.toLowerCase() : '';

		const fromSelect = card.querySelector('select:nth-of-type(1)');
		const toSelect = card.querySelector('select:nth-of-type(2)');
		const fromNode = fromSelect ? parseInt(fromSelect.value) : null;
		const toNode = toSelect ? parseInt(toSelect.value) : null;

		// Apply name whitelist
		if (this.filters.nameWhitelist.length > 0) {
			const matchesWhitelist = this.filters.nameWhitelist.some(term =>
				stratName.includes(term)
			);
			if (!matchesWhitelist) return false;
		}

		// Apply name blacklist
		if (this.filters.nameBlacklist.length > 0) {
			const matchesBlacklist = this.filters.nameBlacklist.some(term =>
				stratName.includes(term)
			);
			if (matchesBlacklist) return false;
		}

		// Apply from node whitelist
		if (this.filters.fromNodeWhitelist.length > 0 && fromNode !== null) {
			if (!this.filters.fromNodeWhitelist.includes(fromNode)) {
				return false;
			}
		}

		// Apply from node blacklist
		if (this.filters.fromNodeBlacklist.length > 0 && fromNode !== null) {
			if (this.filters.fromNodeBlacklist.includes(fromNode)) {
				return false;
			}
		}

		// Apply to node whitelist
		if (this.filters.toNodeWhitelist.length > 0 && toNode !== null) {
			if (!this.filters.toNodeWhitelist.includes(toNode)) {
				return false;
			}
		}

		// Apply to node blacklist
		if (this.filters.toNodeBlacklist.length > 0 && toNode !== null) {
			if (this.filters.toNodeBlacklist.includes(toNode)) {
				return false;
			}
		}

		return true;
	}

	remove() {
		this.root.remove();
	}
}