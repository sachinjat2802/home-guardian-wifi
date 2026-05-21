# TODO

- [x] Identify where mock/simulation exists in backend and frontend
- [ ] Backend: remove all mock/simulation telemetry/CSI/entity/vitals generation; only real hardware
- [ ] Backend: when capture fails -> hardware-missing; clear outputs and broadcast only hardware_status (no init loops with synthetic data)
- [ ] Frontend: remove local simulation fallback entirely; never auto-generate mock telemetry
- [ ] Frontend: on hardware-missing -> show empty defaults (no telemetry/spectrum/entities/vitals) and log alert
- [ ] Smoke test: start app with no hardware / netsh failure -> verify empty state + hardware-missing mode + no sim loops
