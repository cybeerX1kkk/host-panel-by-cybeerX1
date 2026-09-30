# Nayupi — Discord bot + anime dashboard
## Discord setup
1. discord.com/developers → New Application → Bot → copy TOKEN. Enable **Server Members Intent**.
2. OAuth2 → copy CLIENT_ID + CLIENT_SECRET. Add redirect: `https://YOUR-APP.up.railway.app/callback`
## Deploy
1. Push to GitHub. 2. railway.app → New Project → Deploy from GitHub.
3. Variables: DISCORD_TOKEN, CLIENT_ID, CLIENT_SECRET, BASE_URL, SESSION_SECRET.
4. Settings → Networking → Generate Domain (then put it in BASE_URL).
5. (Optional) Add a Volume at /data and set DATA_PATH=/data/data.json so settings survive redeploys.
