# Statistical Reporting Module — Technical Design

**Adaptive6 R&D Home Assignment**
**Author:** Eliran Azulay
**Date:** March 2026

---

## 1. Overview

The module reads an Apache Combined Log Format file and produces a statistical breakdown of HTTP requests by **Country**, **OS**, and **Browser**. Each dimension is reported as a percentage-sorted frequency table.

The design prioritises:

- **Extensibility** — adding a new dimension or output format touches exactly one file each.
- **Separation of concerns** — parsing, enrichment, aggregation, and formatting are fully decoupled.
- **Memory efficiency** — the log file is streamed line-by-line; it is never loaded in full.
- **Correctness** — all known Apache Combined Log Format edge cases are handled explicitly.

---

## 2. High-Level Architecture

```
┌─────────────┐     ParsedLogEntry[]    ┌───────────────────────┐     EnrichedLogEntry[]
│  Log Parser │ ───────────────────────▶│  Enrichment Pipeline  │ ──────────────────────▶┐
│  (stream)   │                         │  Enricher[]  reduce() │                         │
└─────────────┘                         └───────────────────────┘                         │
                                                   ▲                                       ▼
                                          ┌────────────────┐    ┌──────────────┐   DimensionResult[]
                                          │ GeoIpEnricher  │    │  Aggregator  │ ◀──────────────────┐
                                          │  UaEnricher    │    │  (pure fn)   │                    │
                                          │  + any new...  │    └──────────────┘                    │
                                          └────────────────┘           ▲                            │
                                                                        │ Dimension[]         ┌──────┘
                                                                 ┌──────────────┐    ┌────────────────┐
                                                                 │  Dimensions  │    │   Formatter    │
                                                                 │   Registry   │    │  text/json/csv │
                                                                 └──────────────┘    └────────────────┘
```

The `main()` function in `src/index.ts` wires the stages together in a linear pipeline:

```
Config → Parse → Enrich → Aggregate → Format → stdout
```

Each stage is independently testable and replaceable.

---

## 3. Component Breakdown

### 3.1 Configuration (`src/config/env.ts`)

Accepts input from **CLI flags** (`--log`, `--db`, `--format`) or **environment variables**
(`LOG_FILE`, `GEOIP_DB`, `OUTPUT_FORMAT`). CLI flags take precedence.

Validated with **Zod** — the process exits immediately with a human-readable error if
required config is missing or invalid. Relative paths are resolved to absolute paths at
startup so every downstream component works with stable paths.

| Flag | Env Var | Default |
|---|---|---|
| `--log <path>` | `LOG_FILE` | *(required)* |
| `--db <path>` | `GEOIP_DB` | `./data/GeoLite2-Country.mmdb` |
| `--format text\|json\|csv` | `OUTPUT_FORMAT` | `text` |

---

### 3.2 Log Parser (`src/parser/logParser.ts`)

Streams the log file line-by-line — the file is never fully buffered in memory, making
it safe for arbitrarily large logs. Each line is matched against the Apache Combined Log
Format structure, malformed lines are skipped, and a warning is emitted to stderr if the
skip rate exceeds 5%.

---

### 3.3 Enricher (`src/enricher/`)

Transforms `ParsedLogEntry[]` into `EnrichedLogEntry[]` by running each entry through
a registry of `Enricher` implementations. Each enricher returns a partial set of extra
fields; the pipeline merges all results via `reduce()`.

```typescript
interface Enricher {
  enrich(entry: ParsedLogEntry): EnrichmentResult; // Partial<{ country, os, browser }>
}
```

This mirrors the same strategy + registry pattern used by dimensions and formatters:
adding a new enrichment source means creating one new class and registering it — no
other files change.

**`GeoIpEnricher`:**

- Opened once via a static `create(dbPath)` factory (async init, sync lookups).
- The database reader is reused for all entries — creation is expensive, per-lookup cost is minimal.
- IPs not in the database (private ranges, unresolvable) fall back to `'Unknown'`.

**`UaEnricher`:**

- Resolves `os` and `browser` from the User-Agent string.
- Mobile app UAs (e.g. `Instagram 3.0.4 Android`) are reported as-is.
- Empty UA strings fall back to `'Unknown'`.

---

### 3.4 Dimensions (`src/dimensions/`)

Each dimension implements the `Dimension` interface:

```typescript
interface Dimension {
  readonly label: string;
  extract(entry: EnrichedLogEntry): string | null;
}
```

`extract` returns the string value for the entry, or `null` to exclude the entry from
that dimension's counts.

The three built-in dimensions are registered in a single array in
`src/dimensions/index.ts`:

```typescript
export const DIMENSIONS: readonly Dimension[] = [
  countryDimension,
  osDimension,
  browserDimension,
];
```

**To add a new dimension** (e.g. HTTP Status Code, Device Type): create one new file
implementing `Dimension`, append it to this array. No other files change.

---

### 3.5 Aggregator (`src/aggregator/aggregator.ts`)

A **pure function** — no I/O, no side effects, deterministic output given the same inputs.

For each dimension it:

1. Iterates all enriched entries once using a `Map<string, number>` for O(n) counting.
2. Sorts the map entries descending by count.
3. Converts raw counts to `FrequencyEntry` objects with `percentage` rounded to 2 decimal
   places.

Returns a `DimensionResult[]` — one entry per dimension.

---

### 3.6 Formatters (`src/formatters/`)

Each formatter implements the `ReportFormatter` interface:

```typescript
interface ReportFormatter {
  readonly format: OutputFormat;
  render(results: DimensionResult[]): string;
}
```

Three built-in formatters:

| Format | Class | Description |
|---|---|---|
| `text` | `TextFormatter` | Human-readable aligned columns (matches sample output) |
| `json` | `JsonFormatter` | Structured JSON array of dimension results |
| `csv` | `CsvFormatter` | RFC 4180 compliant, one row per dimension/value pair |

A factory function in `src/formatters/index.ts` maps the `OutputFormat` string to the
correct instance. **To add a new format**: implement `ReportFormatter`, extend the
`OutputFormat` union type, add one `case` to the factory switch. No other files change.

---

## 4. Key Abstractions and Interfaces

All shared types live in a single file (`src/types/index.ts`), giving a flat, easy-to-navigate type graph:

```
src/types/index.ts
├── ParsedLogEntry        — raw fields extracted from a log line
├── EnrichedLogEntry      — ParsedLogEntry + country / os / browser
├── EnrichmentResult      — Partial<Omit<EnrichedLogEntry, keyof ParsedLogEntry>>
├── FrequencyEntry        — { value, count, percentage }
├── DimensionResult       — { label, entries: FrequencyEntry[] }
├── Enricher              — strategy interface for an enrichment source
├── Dimension             — strategy interface for a report axis
├── ReportFormatter       — strategy interface for an output format
└── OutputFormat          — 'text' | 'json' | 'csv'
```

The three strategy interfaces (`Enricher`, `Dimension`, `ReportFormatter`) are the
extension points of the system. Everything else is a data-transfer type.

---

## 5. Extensibility

| Change | Files to touch |
|---|---|
| Add a new enrichment source (e.g. ASN lookup, referrer) | `src/enricher/<new>.ts` + one line in `src/enricher/index.ts` |
| Add a new dimension (e.g. Device Type, HTTP Status) | `src/dimensions/<new>.ts` + one line in `src/dimensions/index.ts` |
| Add a new output format (e.g. HTML, NDJSON) | `src/formatters/<new>.ts` + one case in `src/formatters/index.ts` + extend `OutputFormat` union |
| Swap the GeoIP provider | `src/enricher/geoIpEnricher.ts` only |
| Swap the UA parser | `src/enricher/uaEnricher.ts` only |
| Support a different log format (NGINX, W3C) | `src/parser/logParser.ts` only |
| Add a new config option | `src/config/env.ts` only |

This follows the **Open/Closed Principle**: the core pipeline is closed for modification
but open for extension via the three strategy interfaces (`Enricher`, `Dimension`,
`ReportFormatter`).

---

## 6. Technology Choices and Rationale

| Technology | Choice | Rationale |
|---|---|---|
| Language | **TypeScript** | Static typing enforces the strategy interfaces at compile time; catches missing `extract` implementations and wrong return types before runtime |
| Log parsing | **Node.js `readline` + hand-written regex** | Zero extra dependencies; streams naturally; the Apache Combined Log Format is well-specified so a hand-written regex is fully auditable and handles all documented edge cases |
| Config validation | **Zod** | Schema-first validation with typed output; actionable error messages on misconfiguration |
| Runtime | **ts-node** (dev) / compiled JS (prod) | Fast iteration during development; `tsc` output for production use |

---

## 7. Data Flow (Sequence)

```
main()
  │
  ├─ loadConfig()                    → Config
  │
  ├─ parseLogFile(path)              → ParsedLogEntry[]   (streamed, line-by-line)
  │
  ├─ enrichEntries(entries, dbPath)
  │     ├─ createEnrichers(dbPath)   → Enricher[]         (init once)
  │     │     ├─ GeoIpEnricher.create(dbPath)
  │     │     └─ new UaEnricher()
  │     └─ entries.map → enrichers.reduce(enrich)         (per entry)
  │                                  → EnrichedLogEntry[]
  │
  ├─ aggregate(enriched, DIMENSIONS)
  │     └─ for each Dimension:
  │           extract() → count → sort → percentage
  │                                  → DimensionResult[]
  │
  └─ getFormatter(format).render(results)
        └─ formatted string → process.stdout
```

---

## 8. Trade-offs and Assumptions

### Assumptions

- The log file is in **Apache Combined Log Format**
  (`%h %l %u %t "%r" %>s %b "%{Referer}i" "%{User-Agent}i"`). Other formats
  (e.g. W3C, NGINX default) are not supported without a parser change.
- The GeoIP database file is present on disk at the configured path before the program runs.
- Percentages are calculated over **all successfully parsed entries**, not the raw line
  count. Malformed lines are excluded from both numerator and denominator.
- Mobile app UAs (Instagram, Facebook, etc.) are treated as a valid browser value — they
  represent real clients that made real requests to the server.
- Private / reserved IPs (127.x, 10.x, 192.168.x) are not in the GeoIP database and
  resolve to `'Unknown'`.

### Trade-offs

| Decision | Trade-off |
|---|---|
| Stream parsing — never buffer the full file | Slightly more complex async code; gain: constant memory regardless of file size |
| Single synchronous enrichment pass | Simpler code; all lookups are in-process with no I/O latency to amortise with batching |
| Pure aggregator function | Easier to unit test in isolation; trade-off is that intermediate counts are not accessible for incremental / streaming aggregation |
| Mobile app UAs reported as-is | Accurate for general log analysis; a classification layer could be added as a post-`extract` filter without changing the core design |
| No worker-thread concurrency in enrichment | Worker threads could parallelise CPU-bound parsing for very large files; the added complexity is not warranted at 10 k lines |

---

## 9. Project Structure

```
src/
├── index.ts                   — entry point / pipeline wiring
├── types/
│   └── index.ts               — all shared interfaces and types
├── config/
│   └── env.ts                 — CLI + env var config with Zod validation
├── parser/
│   └── logParser.ts           — streaming Apache Combined Log Format parser
├── enricher/
│   ├── index.ts               — enricher registry  ← add new enrichers here
│   ├── logEnricher.ts         — pipeline: reduce over Enricher[]
│   ├── geoIpEnricher.ts       — GeoIP → country
│   └── uaEnricher.ts          — UA string → os + browser
├── aggregator/
│   └── aggregator.ts          — pure frequency aggregation function
├── dimensions/
│   ├── index.ts               — dimension registry  ← add new dimensions here
│   ├── countryDimension.ts
│   ├── osDimension.ts
│   └── browserDimension.ts
└── formatters/
    ├── index.ts               — formatter factory   ← add new formats here
    ├── textFormatter.ts
    ├── jsonFormatter.ts
    └── csvFormatter.ts

data/
├── apache_log.txt             — input log file (10 k lines)
└── GeoLite2-Country.mmdb      — GeoIP binary database
```
