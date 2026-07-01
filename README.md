# POE2 Checklist Overlay

Small Electron sample for an always-on-top checklist overlay.

## Run

Double-click:

```text
Start Overlay.bat
```

This project includes a portable Node.js runtime under `tools/`, so a system
Node.js install is not required for local use.

## Build for distribution

Double-click:

```text
Build Release.bat
```

The packaged files will be created in:

```text
release/
```

The build creates both an installer and a portable exe.

## Shortcuts

- `Ctrl+Shift+O`: show or hide the overlay
- `Ctrl+Shift+L`: lock or unlock the overlay

## Notes

- Use borderless fullscreen/windowed fullscreen in the game if the overlay is not visible.
- Locked mode passes mouse clicks through to the game.
- Edit mode lets you check, add, delete, and move the overlay window.
- Checklist data is saved in `data/checklist.json`.
- Rune logos are bundled from `assets/runes/*.webp`; each file name is used as the rune name.
