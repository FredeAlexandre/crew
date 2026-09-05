# Security

Crew is a live table: hidden hands, session cookies, and a production Worker.

Report vulnerabilities privately through
[GitHub security advisories](https://github.com/FredeAlexandre/crew/security/advisories/new).
Do not open a public issue for anything that could take over a table, an
account, or the deployed Worker.

This repository should never contain Cloudflare tokens or production
`BETTER_AUTH_SECRET` values. Those live in GitHub Actions secrets and in
local `.env` files that Git ignores.
