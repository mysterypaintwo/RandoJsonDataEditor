/* =============================================================================
   Strat Preset Loader - Loads strat presets from .stratPreset files
   ============================================================================= */

/**
 * Load all preset files from a directory
 * @param {string} presetsDirectory - Path to presets directory
 * @returns {Promise<Array>} Array of preset objects with {name, data}
 */
async function loadStratPresets(presetsDirectory) {
    const presets = [];
    
    try {
        const fs = require('fs').promises;
        const path = require('path');
        
        // Check if directory exists
        try {
            await fs.access(presetsDirectory);
        } catch {
            console.warn(`Presets directory not found: ${presetsDirectory}`);
            return presets;
        }
        
        const files = await fs.readdir(presetsDirectory);
        
        for (const file of files) {
            if (file.endsWith('.stratPreset')) {
                try {
                    const filePath = path.join(presetsDirectory, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    const presetData = JSON.parse(content);
                    
                    presets.push({
                        name: presetData.name || file.replace('.stratPreset', ''),
                        data: presetData,
                        filename: file
                    });
                } catch (error) {
                    console.warn(`Failed to load preset ${file}:`, error.message);
                }
            }
        }
        
        console.log(`Loaded ${presets.length} strat presets`);
        
    } catch (error) {
        console.error('Failed to load presets:', error);
    }
    
    return presets;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadStratPresets };
}