# Graph Report - staywise  (2026-05-06)

## Corpus Check
- 71 files · ~39,795 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 264 nodes · 329 edges · 34 communities (31 shown, 3 thin omitted)
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1bf7c650`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]

## God Nodes (most connected - your core abstractions)
1. `getSessionOrUnauthorized()` - 68 edges
2. `hasPermission()` - 20 edges
3. `calculateNights()` - 10 edges
4. `formatDate()` - 7 edges
5. `POST()` - 5 edges
6. `load()` - 4 edges
7. `PUT()` - 4 edges
8. `POST()` - 4 edges
9. `handleDrop()` - 4 edges
10. `getResStatusBadge()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `getSessionOrUnauthorized()`  [INFERRED]
  app/api/reservations/route.ts → lib/session.ts
- `GET()` --calls--> `getSessionOrUnauthorized()`  [INFERRED]
  app/api/charge-codes/route.ts → lib/session.ts
- `POST()` --calls--> `getSessionOrUnauthorized()`  [INFERRED]
  app/api/charge-codes/route.ts → lib/session.ts
- `GET()` --calls--> `getSessionOrUnauthorized()`  [INFERRED]
  app/api/companies/route.ts → lib/session.ts
- `POST()` --calls--> `getSessionOrUnauthorized()`  [INFERRED]
  app/api/companies/route.ts → lib/session.ts

## Communities (34 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (29): buildDailyMap(), GET(), DELETE(), POST(), GET(), POST(), GET(), POST() (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.1
Nodes (4): formatCurrency(), formatDate(), getResStatusBadge(), getResStatusLabel()

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (8): folioBalance(), handleSettleFolio(), calculateNights(), generateReservationNumber(), maskPassport(), POST(), GET(), POST()

### Community 5 - "Community 5"
Cohesion: 0.18
Nodes (9): POST(), POST(), POST(), POST(), POST(), hasPermission(), requirePermission(), POST() (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.33
Nodes (5): flashError(), getSpan(), handleDrop(), hasDateConflict(), toDateStr()

### Community 10 - "Community 10"
Cohesion: 0.43
Nodes (5): handleMarkPaid(), handleSave(), load(), loadCredit(), toggleExpand()

### Community 12 - "Community 12"
Cohesion: 0.7
Nodes (4): handleAdd(), handleEdit(), handleToggle(), load()

### Community 13 - "Community 13"
Cohesion: 0.6
Nodes (3): applyPreset(), handleToggleCompare(), load()

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSessionOrUnauthorized()` connect `Community 0` to `Community 4`, `Community 5`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Why does `calculateNights()` connect `Community 4` to `Community 8`, `Community 1`, `Community 9`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **Why does `POST()` connect `Community 4` to `Community 0`, `Community 5`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Are the 37 inferred relationships involving `getSessionOrUnauthorized()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`getSessionOrUnauthorized()` has 37 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `hasPermission()` (e.g. with `POST()` and `POST()`) actually correct?**
  _`hasPermission()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `calculateNights()` (e.g. with `POST()` and `POST()`) actually correct?**
  _`calculateNights()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `POST()` (e.g. with `getSessionOrUnauthorized()` and `hasPermission()`) actually correct?**
  _`POST()` has 4 INFERRED edges - model-reasoned connections that need verification._