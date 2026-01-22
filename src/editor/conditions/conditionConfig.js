/* =============================================================================
   Condition Configuration Constants
   
   Central configuration for all condition types, resources, and display settings.
   ============================================================================= */

// Enhanced configuration for all condition types
const CONDITION_CONFIG = {
	types: {
		'': {
			label: '(no condition)',
			icon: '•',
			color: '#f5f5f5',
			description: 'No condition required'
		},
		'and': {
			label: 'All of these must be true',
			icon: '∧',
			color: '#a0c4e8',
			description: 'Logical AND - all sub-conditions must be satisfied'
		},
		'or': {
			label: 'Any of these can be true',
			icon: '∨',
			color: '#fff1b8',
			description: 'Logical OR - at least one sub-condition must be satisfied'
		},
		'not': {
			label: 'This must NOT be true',
			icon: '¬',
			color: '#f0a0a0',
			description: 'Logical NOT - this condition must not be satisfied'
		},
		'item': {
			label: 'Must have specific item',
			icon: '🎒',
			color: '#d4b3ff',
			description: 'Requires a specific item or upgrade'
		},
		'tech': {
			label: 'Must perform technique',
			icon: '📘',
			color: '#a0c4e8',
			description: 'Requires execution of specific Tech Logical Requirement(s)'
		},
		'helper': {
			label: 'Helper logical requirement',
			icon: '📘',
			color: '#ebabb0',
			description: 'Requires execution of specific Helper Logical Requirement(s)'
		},
		'event': {
			label: 'Game event must have occurred',
			icon: '⚡',
			color: '#ffb3c4',
			description: 'Requires a specific game event to have occurred'
		},
		'free': {
			label: 'Always true',
			icon: '♾️',
			color: '#a4d8a2',
			description: 'This condition is always satisfied'
		},
		'never': {
			label: 'Never true',
			icon: '🚫',
			color: '#e69a9a',
			description: 'This condition can never be satisfied'
		},

		// Ammo Management
		'ammo': {
			label: 'Must spend ammunition',
			icon: '💥',
			color: '#ffcc99',
			description: 'Must spend specific amount of ammo'
		},
		'ammoDrain': {
			label: 'Ammo drained if available',
			icon: '💧',
			color: '#ccddff',
			description: 'Ammo is drained if available'
		},
		'enemyKill': {
			label: 'Must kill specified enemies',
			icon: '⚔️',
			color: '#ff9999',
			description: 'Must kill specified enemies'
		},
		'refill': {
			label: 'Refill resources to full',
			icon: '🔋',
			color: '#99ff99',
			description: 'Fully refills specified resources'
		},
		'partialRefill': {
			label: 'Partial resource refill',
			icon: '🔋',
			color: '#ccffcc',
			description: 'Partially refills a resource to a limit'
		},

		// Health Management
		'shinespark': {
			label: 'Energy cost of shinespark',
			icon: '⚡',
			color: '#ffff99',
			description: 'Energy cost for shinesparking'
		},
		'acidFrames': {
			label: 'Time in acid pool',
			icon: '🟢',
			color: '#99ff99',
			description: 'Time spent in acid'
		},
		'gravitylessAcidFrames': {
			label: 'Acid without Gravity Suit',
			icon: '🟢',
			color: '#66ff66',
			description: 'Acid damage without Gravity Suit'
		},
		'electricityFrames': {
			label: 'Draygon turret electricity',
			icon: '⚡',
			color: '#ffff66',
			description: 'Electricity damage from Draygon turret'
		},
		'enemyDamage': {
			label: 'Intentional enemy damage',
			icon: '💥',
			color: '#ffaa99',
			description: 'Intentional damage from enemy'
		},
		'resourceAtMost': {
			label: 'Resource capped at amount',
			icon: '🔒',
			color: '#ffccff',
			description: 'Resource reduced to maximum value'
		},
		'autoReserveTrigger': {
			label: 'Trigger auto-reserve tanks',
			icon: '🩹',
			color: '#ff99cc',
			description: 'Trigger auto-reserves'
		},
		'cycleFrames': {
			label: 'Time for farming cycle',
			icon: '🔄',
			color: '#ccccff',
			description: 'Time for farming cycle'
		},
		'simpleCycleFrames': {
			label: 'Simple cycle time',
			icon: '🔄',
			color: '#ddddff',
			description: 'Simple cycle time (no leniency)'
		},
		'heatFrames': {
			label: 'Time in heated room',
			icon: '🔥',
			color: '#ff6666',
			description: 'Time spent in heated room'
		},
		'simpleHeatFrames': {
			label: 'Simple heat room time',
			icon: '🔥',
			color: '#ff9999',
			description: 'Simple heat time (no leniency)'
		},
		'heatFramesWithEnergyDrops': {
			label: 'Heat damage with energy drops',
			icon: '🔥',
			color: '#ff99aa',
			description: 'Heat damage with energy drops'
		},
		'coldFrames': {
			label: 'Time in cold room',
			icon: '❄️',
			color: '#66ccff',
			description: 'Time spent in cold room'
		},
		'simpleColdFrames': {
			label: 'Simple cold room time',
			icon: '❄️',
			color: '#99ddff',
			description: 'Simple cold time (no leniency)'
		},
		'coldFramesWithEnergyDrops': {
			label: 'Cold damage with energy drops',
			icon: '❄️',
			color: '#99ccff',
			description: 'Cold damage with energy drops'
		},
		'lavaFramesWithEnergyDrops': {
			label: 'Lava damage with energy drops',
			icon: '🌋',
			color: '#ff6600',
			description: 'Lava damage with energy drops'
		},
		'gravitylessHeatFrames': {
			label: 'Heat without Gravity Suit',
			icon: '🔥',
			color: '#ff3333',
			description: 'Heat damage without Gravity Suit'
		},
		'shineChargeFrames': {
			label: 'Shinecharge timer frames',
			icon: '⚡',
			color: '#ffffaa',
			description: 'Frames of shinecharge remaining'
		},
		'hibashiHits': {
			label: 'Norfair flame pillar hits',
			icon: '🔥',
			color: '#ff8800',
			description: 'Norfair flame pillar hits'
		},
		'lavaFrames': {
			label: 'Time in lava pool',
			icon: '🌋',
			color: '#ff4400',
			description: 'Time spent in lava'
		},
		'gravitylessLavaFrames': {
			label: 'Lava without Gravity Suit',
			icon: '🌋',
			color: '#ff2200',
			description: 'Lava damage without Gravity Suit'
		},
		'samusEaterFrames': {
			label: 'Samus Eater capture damage',
			icon: '👹',
			color: '#cc6699',
			description: 'Damage from Samus Eater'
		},
		'metroidFrames': {
			label: 'Metroid energy drain',
			icon: '👽',
			color: '#9966cc',
			description: 'Energy drained by Metroid'
		},
		'spikeHits': {
			label: 'Spike damage hits',
			icon: '📌',
			color: '#999999',
			description: 'Damage from spikes'
		},
		'thornHits': {
			label: 'Thorn damage hits',
			icon: '🌿',
			color: '#669966',
			description: 'Damage from thorns'
		},
		'electricityHits': {
			label: 'Electricity damage hits',
			icon: '⚡',
			color: '#6666ff',
			description: 'Electricity damage'
		},

		// Resource Management
		'resourceCapacity': {
			label: 'Minimum resource capacity',
			icon: '📊',
			color: '#99ccff',
			description: 'Must have minimum capacity'
		},
		'resourceMaxCapacity': {
			label: 'Maximum resource capacity',
			icon: '📊',
			color: '#cc99ff',
			description: 'Must not exceed capacity'
		},
		'resourceAvailable': {
			label: 'Resource amount available',
			icon: '📈',
			color: '#99ffcc',
			description: 'Must have minimum amount'
		},
		'resourceConsumed': {
			label: 'Resource amount consumed',
			icon: '📉',
			color: '#ffcc99',
			description: 'Must spend resource amount'
		},
		'resourceMissingAtMost': {
			label: 'Nearly full resource',
			icon: '📊',
			color: '#ccffcc',
			description: 'Missing at most X from full'
		},

		// Momentum-Based
		'canShineCharge': {
			label: 'Can charge shinespark',
			icon: '🏃',
			color: '#ffff99',
			description: 'Can charge shinespark'
		},
		'getBlueSpeed': {
			label: 'Can gain blue speed',
			icon: '💨',
			color: '#99ccff',
			description: 'Can gain blue speed'
		},
		'speedBall': {
			label: 'Can perform speedball',
			icon: '⚽',
			color: '#ffcc99',
			description: 'Can perform speedball'
		},

		// Lock/Obstacle Related
		'doorUnlockedAtNode': {
			label: 'Door must be unlocked',
			icon: '🚪',
			color: '#cccc99',
			description: 'Door must be unlocked'
		},
		'obstaclesCleared': {
			label: 'Obstacles must be cleared',
			icon: '✅',
			color: '#99ff99',
			description: 'Obstacles must be cleared'
		},
		'obstaclesNotCleared': {
			label: 'Obstacles must NOT be cleared',
			icon: '❌',
			color: '#ff9999',
			description: 'Obstacles must not be cleared'
		},
		'resetRoom': {
			label: 'Room must be reset',
			icon: '🔄',
			color: '#cccccc',
			description: 'Room must be reset'
		},
		'itemNotCollectedAtNode': {
			label: 'Item must NOT be collected',
			icon: '📦',
			color: '#ffcccc',
			description: 'Item must not be collected'
		},
		'itemCollectedAtNode': {
			label: 'Item must be collected',
			icon: '📦',
			color: '#ccffcc',
			description: 'Item must be collected'
		},

		// Flash Suit
		'gainFlashSuit': {
			label: 'Gain flash suit state',
			icon: '⚡',
			color: '#ffffcc',
			description: 'Gains a flash suit'
		},
		'useFlashSuit': {
			label: 'Use flash suit state',
			icon: '⚡',
			color: '#ffff99',
			description: 'Uses flash suit'
		},
		'noFlashSuit': {
			label: 'Must not have flash suit',
			icon: '🚫',
			color: '#ffcccc',
			description: 'Must not have flash suit'
		},

		// Special Requirements
		'notable': {
			label: 'Notable strat required',
			icon: '⭐',
			color: '#ffddaa',
			description: 'Requires notable strat'
		},
		'disableEquipment': {
			label: 'Must disable equipment',
			icon: '🔧',
			color: '#ccaaff',
			description: 'Must disable equipment'
		},
		'ridleyKill': {
			label: 'Must kill Ridley boss',
			icon: '🐲',
			color: '#ff6666',
			description: 'Must kill Ridley'
		}
	},
	indentSize: 15,
	maxDepth: 10
};

// Resource type options
const RESOURCE_TYPES = [
	'Missile', 'Super', 'Ice Missile', 'Diffusion', 'PowerBomb', 'RegularEnergy', 'ReserveEnergy', 'Energy'
];

const AMMO_TYPES = [
	'Missile', 'Super', 'Ice Missile', 'Diffusion', 'PowerBomb'
];

// Placeholder text for different condition types
const CONDITION_PLACEHOLDERS = {
	acidFrames: 'Frames in acid',
	gravitylessAcidFrames: 'Frames in acid (no gravity)',
	electricityFrames: 'Frames of electricity',
	shineChargeFrames: 'Shinecharge frames (0-180)',
	coldFrames: 'Cold damage frames',
	cycleFrames: 'Cycle time frames',
	simpleCycleFrames: 'Simple cycle frames',
	heatFrames: 'Heat damage frames',
	simpleHeatFrames: 'Simple heat frames',
	simpleColdFrames: 'Simple cold frames',
	gravitylessHeatFrames: 'Heat frames (no gravity)',
	hibashiHits: 'Number of hibashi hits',
	lavaFrames: 'Frames in lava',
	gravitylessLavaFrames: 'Lava frames (no gravity)',
	samusEaterFrames: 'Samus eater frames',
	metroidFrames: 'Metroid drain frames',
	spikeHits: 'Number of spike hits',
	thornHits: 'Number of thorn hits',
	electricityHits: 'Number of electricity hits'
};