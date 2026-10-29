# win98-run

**Live: https://win98run.app**

A Windows 98-style desktop simulation in the browser. Inspired by win32.run,
OpenLair XP, and Quenq's Reborn XP. This is a simulation, not an emulator:
it cannot run `.exe` files. Not affiliated with Microsoft.

## Run

```powershell
npm start
```

Open http://localhost:9898/

No build step and no dependencies. Requires Node 18+.

## What is included (MVP)

- BIOS + Windows 98-style boot sequence (click to skip)
- Draggable, resizable, minimizable, maximizable windows with taskbar buttons
- Start menu, system tray clock, desktop right-click menu, Shut Down / Restart
- Apps: My Computer / Explorer, Notepad, Paint, Minesweeper, Calculator,
  Internet Explorer (offline start page), Display Properties, System Properties
- Persistent virtual files: Notepad documents and wallpaper choice survive reload
- Drag real `.txt` / `.md` files onto the desktop to open them in Notepad;
  drop an image to use it as wallpaper
- **Run your own DOS games/apps** (js-dos / DOSBox): open **DOS Programs**,
  or Start → Run Program…, or drag a file onto the desktop. Provide a `.zip`
  containing a DOS `.EXE`/`.COM`/`.BAT`, a `.jsdos` bundle, or a single DOS
  executable. Bundles are stored in IndexedDB in your browser (nothing is
  uploaded) and listed in DOS Programs for next time. js-dos persists local
  file changes/saves per program. Windows `.EXE` files do not run in DOS mode.
  DOS import and playback load JSZip and the js-dos runtime from CDNs, so
  they need an internet connection. A streamed Digger demo is included under
  DOS Programs to smoke-test the runtime.

## Ideas borrowed from the reference sites

- win32.run: fully client-side session, virtual file system, recreated apps
- OpenLair XP (xp.openlair.com): boot sequence and sign-in style entry flow
- Quenq Reborn XP (quenq.com/apps/reborn-xp): persistent IndexedDB-style file
  system, themes via Display Properties, drag-and-drop file import

## Next steps

- Windows programs: Boxedwine for standalone Win32 `.exe` files, then v86
  with a user-provided Windows 98 disk image (`.img`)
- IndexedDB file system with folders, rename/delete, and file picker dialogs
- More apps: Media Player, Solitaire, WordPad, MS-DOS Prompt, Help
- Sounds, multiple wallpapers/themes (98SE / 2000 / ME skins on the same engine)
- Mobile touch layout
