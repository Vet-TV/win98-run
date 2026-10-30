# Local relay — internet through your own PC

The browser cannot open raw network sockets, so the virtual machine's
ethernet traffic needs a small bridge. This relay is that bridge: the VM
connects to it over a local WebSocket (Wisp protocol), and the relay opens
real TCP/UDP connections from **your PC**, so the guest uses your internet
connection and can reach your LAN like your PC can.

## Run it

```powershell
cd relay
npm install
npm start
```

It listens on `wisp://127.0.0.1:12345` (localhost only — not exposed to your
network or the internet).

Then in win98-run:

1. Open **Win98 Image (v86)**.
2. Set **Network** to **Internet via my own PC relay**.
3. Boot your image. Network changes only apply at boot.

Stop the relay with Ctrl+C when you are done. Closing it disconnects the
guest's network.

## No relay?

Choose **Internet via public relay** instead. Traffic then goes through the
public Wisp relay at `wisp.mercurywork.shop`. Guests are isolated from each
other with Wisp, but a third party carries your traffic — fine for general
browsing, not for signing into important accounts inside Windows XP.

Plus subscribers can instead choose **Internet via private relay**: our own
hosted copy of this server at `wss://relay.win98run.app`, gated by
short-lived signed tokens (see DEPLOY.md). Setting `RELAY_SECRET` switches
this server into that hosted mode; without it, it stays a local-only relay.

## Notes

- XP Setup: networking components install by default with DHCP. If you add
  the card after installing Windows, use Add Hardware / let Plug and Play
  find the NE2000-compatible adapter.
- v86 software in this folder is used under its own licences; Wisp server
  code is from the Mercury Workshop wisp-js project.
