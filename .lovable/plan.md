

# Adding Topic Variety to AI Briefings

## Root Cause Analysis

Your AI briefings keep talking about training monotony for three interconnected reasons:

### 1. Monotony is the only metric flagged with a warning in the prompt

In `generate-yves-intelligence`, the Training Status section of the prompt context only shows a warning flag for metrics that are outside normal range. With your data:

- ACWR at ~1.05 shows "OPTIMAL" (no flag)
- Monotony at 2.5 shows "HIGH - needs variety" (always flagged)

Since monotony is capped at 2.5 and the warning threshold is 2.0, **every single day** the AI sees monotony as the only concerning metric. The AI naturally latches onto the one flagged issue.

### 2. The intelligence function has no memory of past briefings

The `generate-daily-briefing` function loads the last 7 past briefings to give the AI context, but the `generate-yves-intelligence` function (which powers the main dashboard) does **not** load any past briefings. So the AI has no idea it already talked about monotony yesterday, and the day before, and the day before that.

### 3. The prompt doesn't include enough "interesting" positive data

The prompt sends HRV, sleep, and readiness as raw numbers but without trend annotations or celebration prompts. Sleep score of 82 just appears as a number -- the AI doesn't know if that's your best this week or a decline. Monotony, by contrast, comes with a bright warning flag that screams "talk about me."

### 4. Old uncapped monotony data still in recovery_trends

The `recovery_trends` table still has uncapped monotony values (36.39) from Feb 1-4. These feed into the `RiskScoreCard` frontend and the reasoning engine, further amplifying monotony as the dominant topic.

---

## Proposed Changes

### Fix 1: Load past briefings in `generate-yves-intelligence`

Add a database query to load the last 3 briefings and include them in the prompt context. This gives the AI memory of what it already said.

### Fix 2: Add a "TOPIC VARIETY" instruction to the system prompt

Add an explicit instruction telling the AI to vary topics between briefings. Include the past briefing summaries so it knows what to avoid repeating.

### Fix 3: Rebalance the Training Status prompt context

Instead of only flagging monotony when it's high, include **all** key metrics with their status (positive or negative). This gives the AI multiple topics to discuss:

- ACWR: 1.05 (optimal -- acknowledge this!)
- Sleep trend: improving/declining/stable over 3 days
- HRV trend: direction over 3 days
- Readiness trend: direction over 3 days
- Monotony: elevated but stable (normalize it when it hasn't changed)

The key change: when monotony has been at the same level for 3+ days without change, present it as "stable" rather than "HIGH - needs variety" -- the AI already told the user about it.

### Fix 4: Fix stale uncapped recovery_trends data

The recovery_trends table still has monotony values of 36.39 from before the cap fix. Cap these defensively when reading them in the intelligence function, the same way the frontend already does.

---

## Technical Details

### File: `supabase/functions/generate-yves-intelligence/index.ts`

**Change 1 -- Load past briefings (around line 848)**

Add a query to load the last 3 daily briefings alongside the existing batch 3 queries:
```
supabase.from("daily_briefings")
  .select("date, content")
  .eq("user_id", userId)
  .eq("category", "unified")
  .order("date", { ascending: false })
  .limit(3)
```

**Change 2 -- Add topic variety instruction to the system prompt (around line 1214)**

Add a new section to the system prompt:
```
TOPIC VARIETY (MANDATORY):
Do NOT repeat the same primary topic as recent briefings.
If you discussed training monotony yesterday, lead with a different observation today
(sleep quality, HRV trends, readiness patterns, recovery wins, goal progress).
Monotony can be mentioned briefly as ongoing context, but should NOT be the headline
unless it has meaningfully changed.
```

Include past briefing summaries in the prompt context so the AI knows what was said before.

**Change 3 -- Rebalance Training Status section (lines 1112-1127)**

Replace the current logic that only flags monotony with a balanced presentation of all metrics:

- Add sleep trend (improving/declining/stable based on 3-day comparison)
- Add HRV trend direction
- Add readiness trend direction
- Change monotony presentation: if value hasn't changed in 3+ days, label it "stable (elevated)" instead of "HIGH - needs variety"
- Add positive flags (like "sleep improving" or "HRV above baseline") to give the AI positive topics

**Change 4 -- Defensive cap on recovery_trends monotony (around line 852)**

When extracting recovery trends data, cap any monotony values at 2.5 defensively:
```
const recoveryTrends = (recoveryTrendsResult.data || []).map(r => ({
  ...r,
  monotony: r.monotony !== null ? Math.min(r.monotony, 2.5) : null,
}));
```

---

## Expected Outcome

After these changes, your briefings will naturally rotate between topics:

- Day 1: "Your sleep quality has been trending up over the past 3 days..."
- Day 2: "Your HRV has been steady this week, which suggests good recovery..."
- Day 3: "Your readiness scores have been consistently strong..."
- Day 4: "Training variety remains something to keep in mind..." (monotony mentioned but not as the headline)

The AI will still mention monotony when relevant, but it won't be the dominant topic every single day.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-yves-intelligence/index.ts` | Load past briefings, add topic variety prompt instruction, rebalance training status context, defensive monotony cap on recovery_trends |

