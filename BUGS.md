# Bug Sheet

This document tracks known functional issues, their status, and priority.

> Audit status: `npm run lint` passes cleanly, and `npm run build` completes successfully with no compile errors.

| ID | Status | Priority | Component | Description | Steps to Reproduce | Expected Behavior | Actual Behavior | Notes / Workaround |
|---|---|---|---|---|---|---|---|---|
| BUG-001 | Resolved | High | `page.js` | Pipeline mode selector does not support `local-simulation` | 1. Start the app with no websocket server running 2. Wait for local fallback 3. Observe the pipeline dropdown | The dropdown should show the active fallback mode and allow clear state feedback | The select value becomes unmatched because `sensing.mode` is `local-simulation` while options only include `simulation` and `real` | Add a dedicated `local-simulation` option or disable the dropdown during fallback |
| BUG-002 | Resolved | Medium | `page.js` | Mode switch dropdown is interactive during local fallback but has no effect | 1. Start app in local fallback 2. Open the pipeline mode dropdown 3. Choose a different mode | Toggling the dropdown should update the current mode or be disabled when unsupported | `sensing.changeMode` ignores mode changes when `mode === 'local-simulation'` and the UI still suggests it is configurable | Disable the dropdown or implement local fallback mode handling |
| BUG-003 | Resolved | Medium | `page.js` | Local MQTT panel state can desynchronize from analysis mqtt payload | 1. Toggle or edit MQTT settings 2. Force analysis state refresh 3. Observe control values | UI controls should remain in sync with the active MQTT configuration | Local component state may remain stale if `sensing.analysis?.mqtt` updates in place or missing fields are present | Ensure `useEffect` fully resynchronizes all MQTT fields and handle missing values gracefully |
| BUG-004 | Resolved | Low | `app/components/FloorplanView.js` | Floorplan generation assumes presence of calibrated nodes | 1. Call `Compute Walls from WiFi CSI` after clearing node list in future changes | The floorplan generator should handle empty node sets without failing | `generateFloorplanFromWiFi` will divide by zero if `nodes.length === 0` | Guard against empty `nodes` and provide fallback coordinates |
| BUG-005 | Resolved | Low | `app/page.js` | Connected network badge may show `undefined%` before telemetry is ready | 1. Load dashboard during local or real initialization 2. Watch connected network badge | Badge should display a meaningful placeholder until telemetry arrives | The component renders `sensing.telemetry?.signal` directly, which may be `undefined` | Use a fallback value like `N/A` or hide percentage until telemetry exists |

## Open Bugs

* None

## Resolved Bugs

* **BUG-001**: `page.js` pipeline selector does not include the `local-simulation` mode, causing a blank/mismatched select state after local fallback. (Resolved: Added dedicated option & auto-disabled dropdown during fallback mode)
* **BUG-002**: `page.js` mode switch is interactive during local fallback but `sensing.changeMode` ignores the update, producing a confusing disabled path. (Resolved: Disabled the dropdown when local fallback simulation is active)
* **BUG-003**: `MqttIntegratorPanel` local state sync logic is fragile and can desynchronize from `sensing.analysis.mqtt` when the MQTT payload updates or fields are missing. (Resolved: Switched to a robust `useEffect` hook tracking specific nested properties and handling default fallback values gracefully)
* **BUG-004**: `FloorplanView.generateFloorplanFromWiFi` assumes receiver nodes exist and may divide by zero if `nodes` is ever emptied. (Resolved: Added defensive check and default center fallbacks)
* **BUG-005**: The connected network badge can render `undefined%` when telemetry is not yet available. (Resolved: Added fallback to render `N/A` instead of `undefined%`)

