# Racing Mini-Game — Implementation Plan

Browser-based 3D car racing game for kids. Playable and good-looking fast; realism from
lighting/materials/model quality, not geometry complexity. Rapier physics from day one.

## Tech Stack (per project instructions — prompt's raw-three.js ideas mapped to r3f equivalents)

| Concern         | Choice                                 | Notes                                                                  |
| --------------- | -------------------------------------- | ---------------------------------------------------------------------- |
| Build/app       | Vite + React 18 + TS (strict)          | Single project                                                         |
| 3D layer        | @react-three/fiber + @react-three/drei | `useGLTF` instead of raw GLTFLoader; `<Environment>` for HDRI          |
| Physics         | @react-three/rapier                    | RigidBody car + colliders for track/coins. Arcade-tuned, not sim-grade |
| State           | Zustand                                | laps, times, score, race status. Nothing per-frame in React state      |
| HUD/menus       | Tailwind DOM overlays                  | on top of canvas                                                       |
| Post-processing | @react-three/postprocessing            | Bloom + ACES tone mapping; feature-flagged, off if fps drops           |
| Perf monitoring | r3f-perf (dev only)                    | 60fps on integrated GPU is the bar                                     |
| Tests           | Vitest + RTL                           | logic in `systems/` is plain TS → easy to test                         |

New dependencies beyond the instruction defaults (calling them out per workflow rule #5):
`@react-three/postprocessing` (bloom/tonemap), `r3f-perf` (dev perf HUD). Both standard for this stack.

## Design Decisions

### Physics: Rapier, tuned arcade

- Car = dynamic `RigidBody` (or rapier's raycast vehicle if wheel behavior warrants it —
  start with a single-body approach: apply forward force + steering torque, high angular
  damping, clamped max speed). Forgiving handling > realism.
- Track boundary: **no hard walls that stop the car dead**. Off-track = high-friction
  ground sensor zone that slows the car (kid-safety rule: no punishing failure states).
  Outer barriers exist visually and as soft colliders far out; falling off the world →
  auto-respawn at last waypoint.
- Coins = sensor colliders (`onIntersectionEnter`), no physical response.

### Config-driven content (swappability requirement)

```ts
// src/game/config.ts
export interface CarConfig  { modelPath: string | null; scale: number; ... physics tuning }
export interface TrackConfig {
  waypoints: [x, z][];        // oval centerline — track mesh, checkpoints,
  width: number;              // and off-track detection all derive from this
  coinSlots: number[];        // waypoint indices where coins spawn (5–8)
  ...
}
```

- Track mesh is **generated** from waypoints (extruded ribbon along a Catmull-Rom curve
  through the waypoint loop) — swapping layouts = swapping the waypoint array.
- Car model loads via registry (`game/assets/`); `modelPath: null` or load failure →
  procedural box-car fallback (Suspense + error boundary around `useGLTF`).
- Lap detection: ordered checkpoint gates derived from waypoints; lap counts only when
  all gates passed in order (prevents cutting/reverse-line cheese).

### Visuals

- HDRI: drei `<Environment>` with a bundled small .hdr (or drei preset) → PBR reflections on car paint.
- Directional light w/ shadow map (2048, tight frustum on play area) + soft ambient.
- Asphalt: tiled PBR texture (color+normal+roughness) on generated track ribbon; curbs as
  red/white striped edge strips; trees + barriers as low-poly `InstancedMesh` scattered from config.
- Renderer: ACES filmic tone mapping, sRGB output. Bloom via postprocessing, behind a
  `quality` flag with a cheap fallback.

### Architecture (per project structure — no god components)

```
src/game/
  config.ts               # CarConfig, TrackConfig, active configs
  components/  Car.tsx (render-only), Track.tsx, Scenery.tsx, ChaseCamera.tsx,
               Lights.tsx, Coins.tsx, Environment.tsx
  systems/     vehicle.ts (force/steer math, pure TS), raceRules.ts (checkpoints,
               laps, timing — pure TS), trackGeometry.ts (waypoints → curve/mesh/
               gates — pure TS), respawn.ts
  hooks/       useVehicleController.ts (input+physics per frame),
               useKeyboardControls / drei's, useChaseCamera.ts
  state/       raceStore.ts (zustand: status, lap, times, score),
               settingsStore.ts (quality flags)
  assets/      registry.ts + preload
src/ui/        HUD.tsx (lap, current/best time, coins), Menu.tsx, PauseScreen.tsx
public/models/ car.glb (user-sourced, draco)   public/textures/  public/hdri/
```

- Vehicle, camera, input: independent modules (gamepad later = new input source only).
- Per-frame data flows through refs/rapier state; zustand updated only on discrete events
  (lap complete, coin collected). HUD timer reads a start timestamp and ticks itself.

## Checkpoints (each = small conventional commits, lint+typecheck+tests green)

**CP0 — Scaffold** ✦ Vite+React+TS strict, ESLint/Prettier, Tailwind, Vitest, deps,
folder structure, empty canvas with `<Perf/>`. _Verify: dev server renders, 60fps empty._

**CP1 — Ground, lights, box-car placeholder** ✦ Physics world, ground collider, shadows,
box-car RigidBody that drops and rests. _Verify: car rests on ground, shadow visible._

**CP2 — Drivable car + chase camera** ✦ Arrow-key input, vehicle controller (accel/
brake/steer, damping, speed clamp), lerped chase camera. The "is it fun" checkpoint —
expect tuning iteration here. _Verify: log speed values; drive around; camera follows smoothly._

**CP3 — Generated oval track** ✦ trackGeometry from waypoint config, asphalt+curbs,
off-track slow zone, respawn. Unit tests: curve closure, gate placement, off-track
detection math. _Verify: tests + drive the track, confirm off-track slowdown._

**CP4 — Race rules: laps + timing** ✦ Checkpoint gates, lap counter, current/best lap in
zustand, HUD overlay. Unit tests: ordered-gate lap logic (incl. reverse/skip cases).
_Verify: tests + manual lap drive increments counter._

**CP5 — Coins + score** ✦ Sensor coins from config slots, spin animation, collect →
store, HUD score, all-collected feedback. Unit test: score/collection state.
_Verify: drive through coin, count increments, coin despawns._

**CP6 — Visual polish** ✦ Real .glb car (Draco) w/ fallback path kept, HDRI env,
instanced trees/barriers, bloom+tonemap behind quality flag. _Verify: fps ≥60 with
r3f-perf on integrated GPU; toggle quality flag; delete car.glb → fallback renders._

**CP7 — Game shell + hardening** ✦ Start menu, pause, race reset, asset preload screen,
final perf pass (draw calls, no per-frame allocations, frustum check). _Verify: full
play session start→3 laps→reset without console errors or GC stutter._

Playable target: end of CP4. Good-looking target: end of CP6.

## Performance Guardrails (checked at every checkpoint)

- Reused Vector3/Quaternion refs in all `useFrame` callbacks — no per-frame allocation.
- InstancedMesh for trees/barriers/coins; single material per instance group.
- One shadow-casting light; tight shadow camera bounds.
- Draco-compress car model; keep total model budget < ~5MB.
- Bloom is the first thing cut if fps < 60.

## Risks / Watch Items

- **Rapier car tuning** is the biggest schedule risk — CP2 gets extra iteration budget.
  If a dynamic body won't feel good, fall back to kinematic body + rapier sensors
  (flagging now per "ask before major changes": that would stay within rapier, no new lib).
- Sketchfab models vary wildly in scale/origin/materials — `CarConfig.scale` +
  `offset`/`rotation` fields exist for this; document the normalization step.
- Bloom on integrated GPUs can be costly — hence the quality flag from the start.

## Out of Scope (for now)

Sound, AI opponents, multiplayer/LAN (per instructions: not until single-player is fun
and stable), mobile/touch controls, track editor.
