
## UX Changes: Remove Polar & Update Health Page Heading

### What Is Being Changed

Two distinct updates across the codebase:

1. **Remove all Polar references** from the UI (Settings page connected devices section, imports, state, and any other visible mention)
2. **Update the Health page header** from "Ōura Ring Metrics" to "Health Metrics" with a dynamic subtext listing connected devices

---

### Files to Change

#### 1. `src/pages/Settings.tsx`

**Imports (lines 33–35):** Remove the three Polar-related imports:
```typescript
// REMOVE:
import { ConnectPolarButton } from "@/components/ConnectPolarButton";
import { PolarSyncButton } from "@/components/PolarSyncButton";
```

**State (lines 65–66):** Remove the Polar connection state variable:
```typescript
// REMOVE:
const [isPolarConnected, setIsPolarConnected] = useState(false);
```

**useEffect (line 135):** Remove the call to `checkPolarConnection()` inside the effect.

**`checkPolarConnection` function (lines 164–181):** Remove the entire function.

**Polar device card in the Connected Devices section (lines 763–812):** Remove the entire Polar device card block (the `<div>` wrapping the blue Polar entry with `ConnectPolarButton` and `PolarSyncButton`).

---

#### 2. `src/pages/Health.tsx`

**Header text (lines 141–144):** Update from:
```tsx
<h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Ōura Ring Metrics</h1>
<p className="text-sm md:text-base text-muted-foreground mb-4">
  Real time health and wellness data from your Ōura Ring
</p>
```
To:
```tsx
<h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Health Metrics</h1>
<p className="text-sm md:text-base text-muted-foreground mb-4">
  Based on your data from Ōura Ring & Garmin
</p>
```

The subtext "Based on your data from Ōura Ring & Garmin" reflects the two devices currently supported. Since `OuraSyncStatus` is already displayed directly below this header and dynamically shows which devices are connected (Oura, Garmin, or both), the static subtext will accurately describe the data sources.

---

#### 3. `src/components/EmptyStates.tsx` (minor cleanup)

**Line 139:** Update the description from:
```
"Connect your Oura Ring, Polar, or Fitbit device to start tracking your health metrics."
```
To:
```
"Connect your Ōura Ring or Garmin device to start tracking your health metrics."
```

---

### What Is NOT Changed

- `src/pages/auth/polar.tsx` — The OAuth callback route is kept in place. Existing connected Polar users should still be able to complete their auth flow. Only the visible UI surface (Settings device card) is removed.
- `src/App.tsx` — The `PolarCallback` route handler and lazy import remain intact for the same reason.
- The `ConnectPolarButton.tsx` and `PolarSyncButton.tsx` component files remain in the codebase but are no longer imported in Settings.

---

### Technical Details

| Location | Change | Lines |
|---|---|---|
| `Settings.tsx` imports | Remove ConnectPolarButton + PolarSyncButton imports | 33–35 |
| `Settings.tsx` state | Remove `isPolarConnected` state | 65–66 |
| `Settings.tsx` useEffect | Remove `checkPolarConnection()` call | 135 |
| `Settings.tsx` function | Remove entire `checkPolarConnection` function | 164–181 |
| `Settings.tsx` UI | Remove Polar device card from Connected Devices section | 763–812 |
| `Health.tsx` header | Change h1 text + subtext paragraph | 141–144 |
| `EmptyStates.tsx` | Remove "Polar" from no-device description | 139 |
