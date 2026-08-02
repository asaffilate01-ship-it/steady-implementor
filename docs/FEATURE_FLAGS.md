# Feature flags

The client build supports three progressive rollout switches:

| Variable                       | Default | Controls                                 |
| ------------------------------ | ------- | ---------------------------------------- |
| `VITE_FEATURE_SMART_MAP`       | `false` | Prototype map canvas and map/list switch |
| `VITE_FEATURE_FLEET_WORKSPACE` | `true`  | Business Fleet navigation exposure       |
| `VITE_FEATURE_TICKET_SCANNER`  | `false` | Camera/ticket-scan entry point           |

These are build-time UX switches. They do not replace server authentication, database row-level security, organisation membership checks or payment authorisation. Rebuild and redeploy after changing one.

Use a flag to limit blast radius during a staged rollout, define the success/error metrics before enabling it, and remove the flag after the rollout is stable. Never use a `VITE_` flag to carry a secret.

The production release gate requires the smart-map and ticket-scanner flags to remain off. Enable them only in a later release that replaces the abstract map with a contracted geocoding/map integration and connects scanned ticket references to an operator settlement API.
