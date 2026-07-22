# Skroll site

Public landing + **admin moderation** for Skroll (Solana Seeker).

## Pages

| Path | Purpose |
|---|---|
| `/` | Product landing |
| `/admin.html` | Admin panel — connect allowlisted wallet, manage reports |

## Admin

1. Your wallet must be listed in Worker `ADMIN_WALLETS` (`workers/r2-upload/wrangler.toml`).
2. Open `/admin.html` and connect Seed Vault / Phantom / Solflare.
3. Sign the challenge, then hide / restore / delete clips.

## Local preview

```bash
cd site
python3 -m http.server 8080
# http://localhost:8080/admin.html
```
