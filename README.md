# win98-run

**Live: https://win98run.app**

![Digger running inside the Windows 98 desktop](assets/screenshot.png)

## What is this?

win98-run is Windows 98 in your browser — a boot sequence, desktop, Start
menu, taskbar, and working windows — with two real engines inside it:

1. **A DOS emulator (js-dos / DOSBox).** Bring your own DOS games and apps:
   drop in a `.zip`, a `.jsdos` bundle, or a single DOS `.EXE`, `.COM`, or
   `.BAT`, and it runs in a window on the desktop.
2. **A real x86 PC emulator (v86).** Import your own bootable Windows disk
   image (`.img`), or install Windows from your own installer ISO onto a
   blank virtual disk — verified to reach Windows XP Setup with a
   user-provided XP SP3 ISO. Snapshot the whole machine with **Save State**
   and resume exactly where you left off, even mid-install.

Your files live in your browser (IndexedDB) and are never uploaded unless
you choose to: an optional free account adds cloud sync for your saved
machine states, and **Plus** ($6/mo or $60/yr) expands that to multiple
states and 25 GB. The local experience is free forever, with no account.

No Windows images, game library, or Microsoft software is included or
distributed — you bring your own software, like bringing your own discs to
a PC. A streamed Digger demo and a FreeDOS floppy are built in so you can
try both engines instantly.

![Demo: Digger running in win98-run](assets/demo.gif)

Inspired by win32.run, OpenLair XP, and Quenq's Reborn XP. Standalone
Windows `.EXE` files do not run yet (DOS executables do, and full Windows
runs inside the v86 PC from your own image). Not affiliated with Microsoft.

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
- DOS Programs library: search, rename, export (`.jsdos` backup), delete, and
  per-program settings — DOSBox or DOSBox-X backend and CPU cycles — plus a
  fullscreen button in the player window.
- **A real x86 PC (v86)**: import a bootable `.img`, install from your own
  ISO, guest profiles for 98/ME/2000/XP, virtual NE2000 networking, pointer
  lock, screenshots saved to your PC, and whole-machine Save State / resume.
- **Optional account & cloud sync** (Supabase): sign in to back up saved
  machine states and resume them on another browser or device.
- **Plus** ($6/mo or $60/yr via Stripe): multiple cloud states (25 GB) and
  the private relay. Free accounts get 1 cloud state up to 5 GB; guests and
  local use are unlimited and free.

## Ideas borrowed from the reference sites

- win32.run: fully client-side session, virtual file system, recreated apps
- OpenLair XP (xp.openlair.com): boot sequence and sign-in style entry flow
- Quenq Reborn XP (quenq.com/apps/reborn-xp): persistent IndexedDB-style file
  system, themes via Display Properties, drag-and-drop file import

## v86 spike (experimental)

**Win98 Image (v86)** on the desktop / Start menu runs a real x86 PC emulator
([v86](https://github.com/copy/v86)) in a window. Import your own bootable
Windows disk image (`.img`, optionally with an `.iso` CD attached) —
the image is stored only in your browser and never uploaded. We do not
supply a Windows image. **Install Windows from ISO** creates a blank virtual
hard disk (4/8/12 GB), boots an installer CD image, and runs Setup — verified
to reach Windows XP Setup with a user-provided XP SP3 ISO. Press
**Save State** in the player to snapshot the whole machine (disk included)
into your browser; it resumes automatically on the next boot. Small images mount as a floppy, larger ones as a
hard disk. Guest profiles set the RAM: Windows 98/ME 128 MB, Windows 2000
256 MB, Windows XP 512 MB, Vista 1 GB (experimental), or pick RAM manually.
A bundled FreeDOS floppy (see
`assets/FREEDOS-NOTICE.txt`) tests the engine.

Networking: the guest can have a virtual NE2000 ethernet card (DHCP) via a
Wisp relay — the public relay, our hosted private relay for Plus users
(gated by short-lived signed tokens, see `relay/DEPLOY.md`), or a local
relay in the `relay/` folder that routes traffic through your own PC's
connection (`cd relay; npm install; npm start`, then choose
"my own PC relay").

Findings: the emulator starts in ~1s and a DOS floppy reaches its prompt in
seconds at a smooth UI rate. Whole-machine save states (IndexedDB locally,
optional cloud sync) resume even mid-install. Windows 98 itself is untested
here because it needs a user-prepared image (see v86's Windows 9x guide).
Known gaps: no 3D acceleration, sound is best-effort, XP is slow (it is a
Pentium-era PC in JavaScript), and large images take significant browser
storage.

## Next steps

- Private relay hosting rollout (code shipped; server provisioning next)
- Boxedwine for standalone Win32 `.exe` files
- More apps: Media Player, Solitaire, WordPad, MS-DOS Prompt, Help
- Sounds, multiple wallpapers/themes (98SE / 2000 / ME skins on the same engine)
- Mobile touch layout
