# Enemy sprite assets

The user supplied `ヴァーダント・リレー敵機設計図.png` as the design reference and selected **2.5D appearance fidelity** instead of the procedural 3D models. These project-local PNG atlases were created with the built-in ImageGen tool. No paid Higgsfield 3D generation was submitted.

Each atlas has four facing directions and three attack poses. `game/sprite-manifest.js` records the alpha bounds of every frame; the PNGs are copied without pixel edits. The renderer crops through texture coordinates, shares the source pixels between actors, anchors each frame at the feet and crossfades between poses. The existing world, collision, combat timing, damage and save data remain 3D simulation data.

| Asset | Reference | Pose rows |
| --- | --- | --- |
| `scout.png` | Top-left Skitter | Neutral, raised blade legs, forward/down slash |
| `armor.png` | Top-right Drill Beetle | Neutral, braced drilling windup, drilling lunge |
| `artillery.png` | Bottom-left Siege Walker | Neutral, elevated aiming barrel, firing recoil |
| `guardian.png` | Bottom-right Core Guardian | Neutral, both fists overhead, ground slam |

## Final generation prompt set

The shared specification was a genuinely transparent sprite atlas with exactly 12 full-body robots in four columns by three rows, equal scale, consistent foot anchors, camera elevation 30 degrees, no labels, grid lines, base, ground, shadows or backdrop, and complete silhouettes inside each frame. The four columns face down-left, down-right, up-right and up-left on screen. Preserve intricate machinery, chipped rust-orange armor, exposed hydraulic joints, steel edges and moss from the supplied reference; avoid primitive boxes, low-poly toys and cartoons.

- **Skitter:** preserve four spindly razor blade legs, pointed overlapping triangular armor, narrow dark chassis and a single glowing red camera eye. Neutral row: low spider stance. Windup row: two front blades raised high. Strike row: front blades sweep forward and down with body leaning.
- **Drill Beetle:** preserve massive convex segmented carapace, four short powerful outward-bent hydraulic legs and huge conical spiral steel drill. Neutral row: drill idle. Windup row: body lowered, front legs braced and amber heat at drill rim. Strike row: forward lunge, lowered extended drill and red-orange hot rim.
- **Siege Walker:** preserve tall digitigrade hydraulic legs, circular exposed joints, long angular artillery cannon torso, antenna and red muzzle lens. Neutral row: level cannon. Windup row: cannon tilted up approximately 25 degrees and knees braced. Strike row: firing recoil, compressed legs and small attached muzzle flash.
- **Core Guardian:** preserve gorilla-like proportions, recessed head, layered curved shoulders, segmented fists, complex exposed joints, broad feet and molten orange chest reactor with armored rim and bars. Neutral row: fists down. Windup row: both fists overhead and brighter core. Strike row: fists at ground, lowered torso and braced legs; no ground or shockwave baked into the sprite.

## Limits

The enemies are camera-facing 2.5D sprites with four discrete directions and three attack key poses. They are not freely rotatable 3D meshes or skeletal animations. Pose blending, movement bob, charge lean, projectiles and shockwave effects run in the existing renderer. Texture files are served from this repository only. If an atlas fails to load, the game shows a network error before starting and does not write to the existing save.
