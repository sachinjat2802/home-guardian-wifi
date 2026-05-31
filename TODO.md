# TODO

- [x] Identify where mock/simulation exists in backend and frontend
- [x] Backend: remove all mock/simulation telemetry/CSI/entity/vitals generation; only real hardware
- [x] Backend: when capture fails -> hardware-missing; clear outputs and broadcast only hardware_status (no init loops with synthetic data)
- [x] Frontend: remove local simulation fallback entirely; never auto-generate mock telemetry
- [x] Frontend: on hardware-missing -> show empty defaults (no telemetry/spectrum/entities/vitals) and log alert
- [x] Smoke test: start app with no hardware / netsh failure -> verify empty state + hardware-missing mode + no sim loops
