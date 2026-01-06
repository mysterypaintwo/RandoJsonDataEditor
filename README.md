# RandoJsonDataVisualEditor

RandoJsonDataVisualEditor is a JSON editor designed for randomizers and other logic modifications, primarily for [**Super Metroid: X-Fusion**](https://metroidconstruction.com/hack.php?id=837). (Might support more in the future!?).

This tool allows us to visually place and manipulate nodes on the map, making editing room connections, items, and other gameplay logic straightforward.

This project is heavily inspired by [sm-json-data](https://github.com/vg-json-data/sm-json-data).

---

## Features / Controls

- **Left-click + drag**: Place a node/region
- **1 / 2 / 3 / 4**: Switch between modes:
  - 1 → Draw Nodes
  - 2 → Select Nodes
  - 3 → Move Nodes
  - 4 → Resize Nodes
- **Double Left-click (In Select/Move mode)**: Rename junction nodes
- **Delete key**: Delete a node from the logic editor
- **Scroll (by itself)**: Scroll vertically on the map
- **Shift and Scroll**: Scroll horizontally
- **CTRL and Scroll**: Zoom in/out
- **CTRL and + / -**: Zoom in/out
- **Left-click (On Cardinal Buttons)**: Navigate between doors
- **Right-click (On Cardinal Buttons)**: Edit door connection properties
- **Left-click (On Sector Buttons)**: Navigate between sectors

---

## Contributing to the project
1. Clone the [mxf-json-data repository](https://github.com/vg-json-data/mxf-json-data). I highly recommend using [Github Desktop](https://desktop.github.com/download/) if you've never used git before.
2. Download the [RandoJsonDataEditor](https://github.com/mysterypaintwo/RandoJsonDataEditor/releases/new)
3. Run the editor and click "Set Working Directory" at the top-left.
4. Refer to [the documentation](https://github.com/vg-json-data/mxf-json-data/tree/main/documentation) for formatting expectations when contributing.
5. When your edits are done, [create a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request) for your changes back to the main repository.

## Installation

1. Clone this repository:

```bash
git clone https://github.com/mysterypaintwo/RandoJsonDataEditor.git
cd RandoJsonDataEditor
```

2. Install dependencies:

```bash
npm install
```

3. Run the app:

```bash
npm start
```

# Running from source

```bash
# Install dependencies
npm install
npm start
```

# Build portable Windows executable

To build a portable Windows version of RandoJsonDataVisualEditor:

```bash
# Install dependencies
npm install

# Build the project (Unfortunately, this only works on each separate OS.)
npm run build-win
npm run build-linux
npm run build-mac
```

- The output will be placed in the `/dist/` folder.
- The executable is fully portable and does not require installation.
- All resources are packaged using asar for compact distribution.

## Debugging

**RandoJsonDataVisualEditor** includes VS Code debug configurations for both main and renderer processes.

### Main process
Use the **Electron: Main** configuration to launch and debug the Electron main process.

### Renderer process
Use the **Electron: Renderer** configuration to attach to the Electron renderer (Chromium) process.

Notes:
- Ensure the renderer is listening on `port 9223` for debugging if attaching manually.
- Use breakpoints in `renderer.js` or `preload.js` to inspect UI logic.

## Dependencies

- [Electron](https://www.electronjs.org/) ^39.2.7
- [Electron Builder](https://www.electron.build/) ^24.13.3

No additional dependencies are required.

---

## Credits

- **Metaquarius** – For developing the awesome game and providing images of every room.
- **InsaneFirebat** – For creating the practice ROM, sharing internal game data, and performing useful reverse-engineering research.
- **Super Metroid Map Randomizer Team** - For creating the foundation that inspired this project

---

## License

This project is licensed under the **GNU GPLv3**. See the [LICENSE](LICENSE) file for details.
