# Alpha League — Firestore Schema (v0)

## traders (doc id = uid)
- uid: string (== doc id)
- handle: string (unique)
- display_name: string
- bio: string
- role: "trader" | "admin"
- status: "active" | "suspended"
- kyc_verified: boolean
- created_at: timestamp
- pnl_30d, pnl_365d: number (optional aggregates)

## ideas
- trader_id: string (uid of owner)
- title: string
- thesis: string
- symbols: array<string>
- side: "long" | "short"
- entry: number
- tp: number
- sl: number
- risk: number (1–5)
- status: "draft" | "submitted" | "approved" | "rejected" | "archived"
- visibility: "public" | "private"
- tags: array<string>
- version: number
- created_at: timestamp
- updated_at: timestamp
- approved_by: string (uid, optional)
- approved_at: timestamp (optional)

## fills
- idea_id: string
- trader_id: string
- exchange: string
- side: "buy" | "sell"
- quantity: number
- price: number
- timestamp: timestamp
- txid: string (optional)

## prices
- symbol: string
- ts: timestamp
- open, high, low, close: number
- source: string

## metrics_daily
- key: string (e.g., "platform.activeTraders", "symbol.BTC.vol_30d")
- date: string (YYYY-MM-DD) or timestamp
- value: number
- extra: map (optional)

## allocations
- trader_id: string
- date: string (YYYY-MM-DD)
- nav: number
- cash: number
- positions: array<object> [{ symbol, weight, exposure }]

## audits
- entity: "idea" | "trader" | "rule" | "allocation"
- entity_id: string
- action: string (e.g., "create", "update.status.approved")
- actor_uid: string
- at: timestamp
- details: map
