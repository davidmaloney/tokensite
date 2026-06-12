SHILLit — Solana Crypto Landing Pages

https://shillit.fun

SHILLit is a Solana-powered platform that lets token creators launch professional crypto landing pages in seconds. Connect your wallet, choose a template, pay in SOL, and your page is live at yourtoken.shillit.fun.

No accounts. No email. No passwords. Just your wallet.

Built for Crypto’s Pace

Most token launches need a landing page for days or weeks — not years. The hype window is short. The launch phase is intense. After that, projects either grow into something bigger or move on.

SHILLit is designed around this reality. Pay for exactly what you need, leave when you are done. No long term commitments. No wasted money. No abandoned pages clogging up the internet.

When a page expires it is permanently deleted — all data, images and configuration removed completely. This keeps the platform clean, fast and optimised for active projects. Slugs can be reused for future launches.

For projects that do grow — the yearly plan at $39 keeps costs minimal while the project finds its feet.

How It Works

1.	Connect your Solana wallet — Phantom, Solflare or Backpack
2.	Choose your slug — becomes yourtoken.shillit.fun
3.	Add your token details — project name and description, contract address with one-click copy button, buy links for Raydium, Jupiter and Pump.fun, tokenomics including supply, tax, liquidity, launch date and network, social links for Twitter, Telegram, Discord and more, avatar and banner images
4.	Pick a template — 4 designs available
5.	Pay $4.99/month or $39/year in SOL
6.	Page is live instantly

Pricing

Top up Monthly — $4.99 — 30 days
Yearly — $39 — 365 days — save 35%

Pricing is converted to SOL at the current market rate at time of payment. The exact SOL amount is shown before confirmation. Pages are permanently deleted on expiry — top up before expiry to keep live.

Payments

All payments are processed on Solana mainnet using standard SystemProgram.transfer — a clean, transparent SOL transfer from the user wallet directly to the treasury wallet.

No tokens. No smart contracts. No programs. Just a direct SOL transfer.

Every payment is verified on-chain before the page is activated. The transaction hash is captured, verified against the treasury wallet and expected amount, and only then is the page activated. All transactions are publicly visible on Solana Explorer.

USD pricing is converted server-side using the live CoinGecko rate so users always pay a fair and accurate amount.

Templates

Four templates included:

Dark Crypto — black background, purple and green neon
Clean Launch — white minimal DeFi style
Neon Degen — pure black with hot pink and electric cyan
Midnight Blue — deep navy with electric blue accents

All templates are fully responsive — optimised for mobile and desktop. All include contract address display, buy buttons, tokenomics panel, social links, banner and avatar support. Optional extras include live price ticker, DexScreener chart embed, countdown timer, about and team section, and visual roadmap with milestone tracking.

Technical Architecture

Frontend — React and Vite, built to static files, served via Docker

Backend — Node.js and Express, multi-process via PM2 using all CPU cores

Database — SQLite with WAL mode and serialized write queue for safe concurrent access

Caching — In-memory page cache with 60 second TTL, auto-invalidated on any page update, activation or deletion. Handles viral traffic spikes without database pressure.

Blockchain — Solana Web3.js for transaction building and verification. Helius RPC for reliable on-chain data.

Infrastructure — VPS with Docker and Docker Compose. Nginx Proxy Manager for subdomain routing. Cloudflare DNS with wildcard A record for subdomains. SSL via Cloudflare Full mode.

Jobs — Expiry job runs every 30 minutes, pages deleted immediately on expiry. Cleanup job runs every 6 hours, unpaid pages deleted after 1 hour.

Security

SHILLit is built with security as a priority at every layer of the stack.

Network and Infrastructure
Cloudflare in front of all traffic — WAF, DDoS protection, Bot Fight Mode and TLS 1.2 minimum all active. UFW firewall on the VPS with only ports 22, 80 and 443 open. All other ports including backend service ports are blocked at the OS level. Always HTTPS enforced — all HTTP traffic automatically redirected to HTTPS.

Application Security
Rate limiting on all payment and admin endpoints. URL validation on all user-submitted links — only legitimate URLs accepted. Reserved slug system with an extensive blocklist preventing impersonation of known brands, exchanges, wallets, influencers and platform pages. On-chain transaction verification before any page activation. Transaction replay protection — each transaction hash can only be used once. Unpaid pages automatically deleted after one hour.

Data and Privacy
No personal data stored — wallet addresses only. No emails, no names, no tracking. All page data permanently and irreversibly deleted on expiry. Environment variables stored only on the server, never in source control.

Monitoring
Automated uptime monitoring with instant email alerts if any service goes down.

Payment Safety
All payments are plain SOL transfers — no token approvals, no smart contract interactions, no program calls. Users always see the exact SOL amount before confirming. Every transaction is publicly verifiable on Solana Explorer.

Setup for Developers

Requirements:
VPS with Docker and Docker Compose
Cloudflare DNS with wildcard A record pointing *.shillit.fun to VPS IP
Nginx Proxy Manager for routing

Environment variables needed on the server in a .env file:
DOMAIN=shillit.fun
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
TREASURY_WALLET=YOUR_SOLANA_WALLET_ADDRESS
OWNER_ACCESS_CODE=YOUR_SECRET_CODE
NODE_ENV=production
MOCK_MODE=false

Deploy commands:
git pull
docker compose up -d –build

Community and Support

Telegram Chat: https://t.me/shillitchat
Terms and Privacy: https://t.me/shillitPolicies
Email: support@shillit.fun
GitHub: https://github.com/davidmaloney/tokensite
Report a page: https://report.shillit.fun


