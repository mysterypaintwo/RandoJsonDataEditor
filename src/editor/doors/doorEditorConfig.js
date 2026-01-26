// Door subtype constants (color/lock type)
const DOOR_SUBTYPES = [{
        value: 'blue',
        label: 'Blue Door',
        description: 'No lock'
    },
    {
        value: 'red',
        label: 'Red Door',
        description: 'Requires Missiles'
    },
    {
        value: 'green',
        label: 'Green Door',
        description: 'Requires Super Missiles'
    },
    {
        value: 'yellow',
        label: 'Yellow Door',
        description: 'Requires Power Bombs'
    },
    {
        value: 'gray',
        label: 'Gray Door',
        description: 'Requires any ammo'
    },
    {
        value: 'eye',
        label: 'Eye Door',
        description: 'Shoots open'
    },
    {
        value: 'closedWall',
        label: 'Closed Wall',
        description: 'Hidden/closed passage'
    },
    {
        value: 'sandpit',
        label: 'Sandpit',
        description: 'Vertical morph passage'
    }
];

// Physics types for door environments
const PHYSICS_TYPES = [{
        value: 'air',
        label: 'Air',
        description: 'Normal physics'
    },
    {
        value: 'water',
        label: 'Water',
        description: 'Underwater physics'
    },
    {
        value: 'lowGrav',
        label: 'Low Gravity',
        description: 'Low Gravity physics'
    },
    {
        value: 'lava',
        label: 'Lava',
        description: 'Lava physics and damage'
    },
    {
        value: 'acid',
        label: 'Acid',
        description: 'Acid physics and damage'
    }
];

// Utility station types
const UTILITY_TYPES = [{
        value: 'save',
        label: '💾 Save Station'
    },
    {
        value: 'missile',
        label: '🚀 Missile Refill'
    },
    {
        value: 'super',
        label: '⚡ Super Missile Refill'
    },
    {
        value: 'powerbomb',
        label: '💣 Power Bomb Refill'
    },
    {
        value: 'energy',
        label: '❤️ Energy Refill'
    },
    {
        value: 'reserve',
        label: '🩹 Reserve Tank Refill'
    },
    {
        value: 'map',
        label: '🗺️ Map Station'
    }
];

// Use implicit flags
const IMPLICIT_FLAGS = [{
        key: 'useImplicitLeaveNormally',
        label: 'Leave Normally',
        description: 'Generate standard exit strat'
    },
    {
        key: 'useImplicitComeInNormally',
        label: 'Come In Normally',
        description: 'Generate standard entrance strat'
    },
    {
        key: 'useImplicitComeInWithMockball',
        label: 'Come In With Mockball',
        description: 'Generate mockball entrance strat'
    },
    {
        key: 'useImplicitCarryGModeBackThrough',
        label: 'Carry G-Mode Through',
        description: 'Generate G-mode carry strat'
    },
    {
        key: 'useImplicitCarryGModeMorphBackThrough',
        label: 'Carry G-Mode Morph Through',
        description: 'Generate G-mode morph carry strat'
    },
    {
        key: 'useImplicitComeInWithGrappleJump',
        label: 'Come In With Grapple Jump',
        description: 'Generate grapple jump entrance strat'
    },
    {
        key: 'useImplicitDoorUnlocks',
        label: 'Door Unlocks',
        description: 'Generate standard unlock strats',
        default: true
    }
];