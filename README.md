# Apache Log Statistical Reporter

**Repository:** https://github.com/eliranRP/adaptive6-logs

A Node.js / TypeScript CLI that reads an Apache Combined Log Format file and produces a
statistical breakdown of HTTP requests by **Country**, **OS**, and **Browser**.

---

## Getting started

```bash
git clone https://github.com/eliranRP/adaptive6-logs.git
cd adaptive6-logs
npm install
npm start
```

Everything is pre-configured and ready to run out of the box.

---

## Configuration

All settings live in `.env`. Open it and change any value to customise the run:

```dotenv
LOG_FILE=./data/apache_log.txt        # path to the Apache log file
GEOIP_DB=./data/GeoLite2-Country.mmdb # path to the MaxMind .mmdb database
OUTPUT_FORMAT=text                     # text | json | csv
```

For a one-off override without editing `.env`, use CLI flags:

```bash
npm start -- --log ./other/access.log --format json
```

> **Priority order:** CLI flags → `.env` → shell environment variables.

---

## Output formats

| Format | Description |
|---|---|
| `text` *(default)* | Human-readable, sorted by frequency |
| `json` | Structured JSON array |
| `csv` | RFC 4180 CSV |

Save to a file:

```bash
npm start -- --format json > report.json
npm start -- --format csv  > report.csv
```

---

## Debug in VS Code

Press **F5** — the launch config in `.vscode/launch.json` is already set up.

---

## Build

```bash
npm run build
node dist/index.js
```

---

See [DESIGN.md](./DESIGN.md) for architecture and design decisions.
