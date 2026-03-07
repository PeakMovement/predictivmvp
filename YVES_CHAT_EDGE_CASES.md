# Yves Chat — Edge Case Test Matrix

Task 7: Run 20+ test conversations and fix generic/broken responses.

## Test Categories

### 1. Vague Questions (5 tests)
| # | Query | Expected Behavior | ✓ |
|---|-------|-------------------|---|
| 1 | "Am I overtraining?" | ONE clarifying question (exhausted vs motivated? symptoms? training volume?) — NOT generic advice |
| 2 | "What should I do today?" | ONE clarifying question — NOT a generic to-do list |
| 3 | "Is this normal?" | Ask what "this" refers to — NOT assume |
| 4 | "How am I doing?" | ONE clarifying question — NOT generic "you're doing great" |
| 5 | "Should I train?" | ONE clarifying question — NOT yes/no without context |

### 2. Injury Flags (4 tests)
| # | Query | Expected Behavior | ✓ |
|---|-------|-------------------|---|
| 6 | "I have a sore knee, should I run today?" | Default to caution; suggest alternatives; never push through pain |
| 7 | "Can I do leg day with my back injury?" | Reference injury profile if present; err on side of caution |
| 8 | "My shoulder hurts but my readiness is 90" | Symptoms override metrics — prioritize safety |
| 9 | "When can I return to full training?" | Reference injury profile phase; advise practitioner check-in |

### 3. Overtraining (3 tests)
| # | Query | Expected Behavior | ✓ |
|---|-------|-------------------|---|
| 10 | "My ACWR has been high for a week — is that bad?" | Hard truth protocol; cite numbers; clear path forward |
| 11 | "I feel exhausted but my numbers look fine" | Acknowledge subjective fatigue; suggest recovery |
| 12 | "I've trained 10 days straight, should I rest?" | Recommend rest; cite accumulated load if data exists |

### 4. Pre-Competition (3 tests)
| # | Query | Expected Behavior | ✓ |
|---|-------|-------------------|---|
| 13 | "I have a race in 5 days — what should I do?" | Reference event context; taper advice; no hard sessions |
| 14 | "Race week — can I do one more hard session?" | Advise against; prioritize freshness |
| 15 | "How do I taper for my marathon?" | Structured taper guidance; reference their event date |

### 5. Return-to-Sport (3 tests)
| # | Query | Expected Behavior | ✓ |
|---|-------|-------------------|---|
| 16 | "Am I ready to run again?" (with RTS profile) | Reference phase, milestones, load restrictions |
| 17 | "Can I add plyometrics?" (post-ACL) | Check load restrictions; never violate |
| 18 | "My physio cleared me — what next?" | Gradual progression; reference baseline building |

### 6. No Data Yet (4 tests)
| # | Query | Expected Behavior | ✓ |
|---|-------|-------------------|---|
| 19 | "How should I adjust my training?" (no wearable) | Honest: connect device; offer general principles only |
| 20 | "Am I recovering well?" (no data) | Cannot answer from data; suggest connecting Oura/Garmin |
| 21 | "What does my sleep data say?" (no data) | Clear: no data yet; guide to Settings > Connect |
| 22 | "Is my HRV good?" (no data) | Cannot compare; need baseline; connect device |

### 7. Conflicting Signals (4 tests)
| # | Query | Expected Behavior | ✓ |
|---|-------|-------------------|---|
| 23 | High readiness + high ACWR | Acknowledge conflict; symptoms/metrics rule; caution |
| 24 | Good sleep + low HRV | Explain possible causes; suggest lighter day |
| 25 | Low strain + high fatigue symptoms | Symptoms override — recommend recovery |
| 26 | Optimal metrics + user reports "something's off" | Believe the user; investigate; don't dismiss |

---

## How to Run Tests

1. **Manual**: Use Yves chat in the app; log each query and response.
2. **Test accounts**: Use demo user (rich data) and new user (no data) for coverage.
3. **Pass criteria**: Response matches "Expected Behavior" — no generic filler, appropriate to context.

## Prompt Updates (yves-chat/index.ts)

Protocols added/strengthened:
- `NO_DATA_PROTOCOL` — when hasWearableData is false
- `CONFLICTING_SIGNALS_PROTOCOL` — expanded
- `PRE_COMPETITION_PROTOCOL` — when event within 14 days
- `INJURY_FLAG_IN_QUESTION` — explicit handling
- Vague Question Protocol — strengthened
