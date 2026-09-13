# Peer Connect
A WebRTC client for video calling.

## Setup

### Client

```bash
pnpm install
pnpm run dev
```

> **Note**: It will only work if the app is running on `localhost` or on a `https` url.

### Server

```bash
cd server/
pnpm install
pnpm start
```

Expose the port and use the url inside `.env` file's `VITE_SIGNALING_SERVER_URL` field.