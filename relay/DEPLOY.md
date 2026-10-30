# Hosted private relay (Phase D) — Hetzner VPS setup

The Plus private relay is this same `server.mjs` running on a small VPS.
With `RELAY_SECRET` set it requires a short-lived token on every connection;
tokens are minted only for active Plus subscribers by `/api/relay-access`.

Public address: **wss://relay.win98run.app** (Caddy terminates TLS and
proxies to the relay on 127.0.0.1:12345).

## 1. Create the server

- Hetzner Cloud → new project → Add Server:
  - Image: **Ubuntu 24.04**
  - Type: **CX22** (or cheapest x86) — the relay is tiny
  - Location: closest to most users
  - SSH key: add your public key (on your PC: `ssh-keygen -t ed25519` if you
    have none; paste the `.pub` file's contents)
- Note the server's IPv4 address.

## 2. DNS

In Vercel (win98-run project → Settings → Domains → win98run.app → DNS
records) add:

- Type **A**, Name **relay**, Value **<server IPv4>**

Wait a few minutes for it to resolve (`nslookup relay.win98run.app`).

## 3. Install (SSH into the server as root)

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs git
# Caddy (official repo):
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy

git clone https://github.com/Vet-TV/win98-run.git /opt/win98-run
cd /opt/win98-run/relay && npm install
```

Generate the shared secret and **keep it** (you'll paste the same value into
Vercel in step 5 — never into chat or git):

```bash
openssl rand -hex 32
```

## 4. Service + TLS proxy

`/etc/systemd/system/win98-relay.service`:

```ini
[Unit]
Description=win98-run private relay (Plus)
After=network.target

[Service]
WorkingDirectory=/opt/win98-run/relay
ExecStart=/usr/bin/node /opt/win98-run/relay/server.mjs
Environment=PORT=12345
Environment=RELAY_SECRET=<paste the secret from step 3>
Restart=always
User=root

[Install]
WantedBy=multi-user.target
```

`/etc/caddy/Caddyfile`:

```
relay.win98run.app {
    reverse_proxy 127.0.0.1:12345
}
```

```bash
ufw allow OpenSSH && ufw allow 80 && ufw allow 443
ufw deny out 25   # block outbound SMTP so the relay can't be abused for spam
ufw --force enable
systemctl daemon-reload
systemctl enable --now win98-relay caddy
systemctl status win98-relay caddy
curl https://relay.win98run.app/healthz   # expect: ok
```

## 5. Connect the website

Vercel → win98-run → Settings → Environment Variables (Production):

- `RELAY_URL` = `wss://relay.win98run.app`
- `RELAY_SECRET` = the same secret from step 3

Redeploy. Then the end-to-end check: sign in with a **Plus** account →
Win98 Image → Network: **Internet via private relay (Plus)** → boot.
On the server, `journalctl -u win98-relay -f` should show
`Plus VM connected (user …)`. A Free account must get a Plus-required
message instead.

## Updating

```bash
cd /opt/win98-run && git pull
cd relay && npm install
systemctl restart win98-relay
```

## Notes

- Tokens expire after 6 hours; reopening the VM mints a fresh one. Long VM
  sessions keep their existing connection — only new connections need one.
- The relay can reach the whole internet from the VPS IP. It is gated to
  paying subscribers and short-lived tokens, but watch Hetzner's abuse
  notices; the SMTP block above removes the most common abuse vector.
