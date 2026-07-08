# Writing Better Sprite Prompts for CircleLimit Studio

Most sprite-sheet prompts are written for one job: make a nice animation strip.
CircleLimit Studio asks more of a sheet than that. Every frame you generate will
be sliced, background-keyed, re-centered, scaled, rotated, mirrored, repeated
dozens to thousands of times, and compressed toward the boundary of a Poincaré
disk. A sheet that looks great in a preview grid can turn into mush the moment
it hits the tessellation.

The fix is to prompt for the *pipeline*, not just the art. Here's the golden
rule, then the practices that follow from it.

> **A CircleLimit sprite sheet is not just an animation strip. It is a motion
> motif that will be sliced, re-centered, scaled, rotated, mirrored, repeated,
> compressed toward the disk boundary, and mapped across rings. Prompt for
> clean isolated frames, strong silhouette readability, consistent scale, and
> one coherent motion idea per sheet.**

In short: one clean motion idea, one row, one subject per frame, consistent
scale, true transparent alpha, no baked background, readable at tiny sizes.
The geometry intentionally shrinks motifs toward the circle edge (`1 − r²`),
so silhouette comes first and detail second — overly detailed sprites become
visual noise fast.

## 1. State the sheet contract before the art direction

The importer's defaults assume a 1-row × 8-column sheet with transparent
background keying, auto-centering, and smart slicing. Open every prompt with
the production format so the model can't improvise the layout:

```text
Create one horizontal sprite sheet, 1 row x 8 columns, with 8 evenly spaced frames.
Each frame contains one isolated European starling.
The final image must be a true transparent PNG with alpha.
No visible grid. No checkerboard. No background. No labels. No frame numbers.
```

For 12-frame LOD sheets, say `1 row x 12 columns, with 12 evenly spaced
frames` and import with `columns: 12`.

## 2. One motion family per sheet

Don't ask for "idle, launch, flight, landing, flocking" in one giant sheet.
The frame-mapping logic assumes each sheet is a single coherent sequence:
Sequential Ring, Zoetrope Ring, and Onion Skin use frame order around the
ring, while Radial Timeline, Spiral Motion, Symmetry Echo, and Frame Interlock
reinterpret that same order spatially. A grab-bag sheet maps to nonsense in
every mode.

Structure a library as one family per sheet:

```text
starling_idle_8x1
starling_prelaunch_8x1
starling_takeoff_push_8x1
starling_upstroke_8x1
starling_downstroke_8x1
starling_glide_8x1
starling_banking_turn_8x1
starling_landing_brake_8x1
starling_settle_8x1
starling_flock_lod_12x1
```

## 3. Make frame order explicit

Image models get creative in the dumbest ways. Give them the exact frame list:

```text
8 frames, left to right:
1. relaxed rest
2. head turn slightly left
3. head turn slightly right
4. alert upright posture
5. small body lean forward
6. small body lean back
7. tiny feather ruffle
8. return to relaxed rest
```

Compare that to "make a bird idle animation sprite sheet" — which is how you
get one bird, four vibes, two mystery crows, and a tragic blob named Gerald.

## 4. Prompt for pose changes, not position changes

The slicer auto-centers each frame by its alpha bounding box, re-centering
content into a square cell with a shared group scale. That kills jitter from
drifting subjects — but it also means a takeoff sheet where the bird travels
upward across its cells loses that positional motion on import. Motion must
live in the *pose*.

Add to every prompt:

```text
Show motion through pose changes, not by moving the subject far across the frame.
Keep the body center visually consistent from frame to frame.
```

For grounded frames (landing, perching):

```text
Feet should align to the same invisible baseline in grounded frames.
```

For flight frames:

```text
Keep the body center aligned across frames; wings may extend but the torso anchor stays consistent.
```

## 5. Give every frame breathing room

Smart slicing segments the sheet into connected components and assigns each
component to a cell by centroid, so a wingtip crossing a grid line stays
attached to its own bird. But if sprites *touch each other*, segmentation
degenerates and the importer falls back to plain grid slicing — which will
happily cut that shared wingtip in half.

```text
Leave generous empty padding around each frame.
No overlapping between neighboring frames.
No wings, tails, beaks, feet, feathers, or motion trails touching another frame.
```

This matters double for flock sheets, where multiple birds inside one frame
can accidentally connect to the next cluster over.

## 6. No visible perch unless the perch is the artwork

A perch line becomes a repeated line artifact inside the disk. That looks cool
exactly once; then your circle is full of telephone wires. Bird bureaucracy.

```text
Perched on an invisible wire.
No visible perch. No visible wire. Feet aligned to a consistent invisible baseline.
```

Only bake in a visible wire for a deliberate "telephone-wire manuscript" piece.

## 7. True alpha, never a fake checkerboard

The importer can key out a solid background by sampling the corner color and
removing pixels within a tolerance of it. A baked checkerboard is not one
color, so keying leaves garbage pixels behind.

```text
True transparent alpha background.
Do not draw a checkerboard.
Do not show a transparency preview grid.
Do not use a white paper background.
```

Fallback, for models that can't do alpha:

```text
If true transparency is not possible, use a perfectly flat pure white
background with no texture, no shadows, and no gradients.
```

Prefer real alpha whenever the artwork has pale interior detail — aggressive
white keying will eat pale feather speckles along with the background.

## 8. Build two tiers: Detail and LOD

The quality system scales placement counts from Draft (500) up to Poster
(9000). A hero motif and a 5000-copy flock speck have opposite needs, so
generate both tiers of every important sheet.

**Detail sheets** — large center motifs, hero shots, exports, low-density work:

```text
Monochrome scientific ink engraving, realistic starling anatomy, subtle pale
speckling, elegant field-guide detail.
```

**LOD silhouette sheets** — dense flock and tessellation work where 50–500+
copies appear:

```text
Black ink silhouette only, minimal interior detail, highly readable at small
size, realistic starling proportions.
```

## The master prompt template

```text
[OUTPUT CONTRACT]
Create one horizontal sprite sheet, 1 row x [FRAME_COUNT] columns, with
[FRAME_COUNT] evenly spaced frames.
Each frame contains [SUBJECT].
The sequence reads left to right.
The subject faces right.
The sprite is intended for circular tessellation and repeated motion mapping.

[MOTION BEATS]
[FRAME_COUNT] frames, left to right:
1. [pose]
2. [pose]
...

[STYLE]
[Detail or LOD style block for the subject.]

[LAYOUT]
One isolated subject per frame.
Consistent scale.
Consistent body anchor point.
Generous padding around each frame.
No overlap between neighboring frames.
No wings, tails, beaks, feet, or feathers touching another frame.
Clean silhouette readability at small size.

[BACKGROUND / TECHNICAL]
True transparent alpha background.
No checkerboard. No paper texture. No shadows.
No labels. No text. No frame numbers. No visible grid. No border.

[NEGATIVE STYLE]
Avoid painterly blur, avoid decorative background, avoid collage, avoid mixed
species, avoid extra subjects unless this is specifically a flock sheet.
```

## Target a placement mode

Each sheet should be generated with a destination mode in mind:

- **Zoetrope Ring / Sequential Ring** — smooth looping cycles.
  *"First and last frames should connect cleanly as a loop. The motion should
  read clearly when frames are arranged around a circle."*
- **Radial Timeline** — transformation over time, mapped center-to-edge.
  *"The sequence should progress from calm / small / early motion to
  energetic / expanded / late motion."*
- **Spiral Motion** — directional action.
  *"The motion should feel like it flows forward, with each pose naturally
  leading into the next."*
- **Onion Skin Manuscript** — earlier frames are layered underneath at fading
  opacity, so interior clutter compounds.
  *"The silhouette should remain readable when multiple faded earlier frames
  are layered underneath."*

## Import settings to pair with these prompts

For most generated sheets (via the UI or a `window.circleLimit` patch):

```json
{
  "inputMode": "spritesheet",
  "rows": 1,
  "columns": 8,
  "margin": 0,
  "gap": 0,
  "startFrame": 0,
  "endFrame": -1,
  "frameSkip": 0,
  "transparentBackground": true,
  "keyTolerance": 60,
  "autoCenter": true,
  "smartSlice": true,
  "placementMode": "zoetrope-ring",
  "fps": 10,
  "loop": true,
  "pingPong": false,
  "direction": 1,
  "frameScale": 1.35,
  "frameRotation": 0
}
```

For 12-frame LOD sheets, change `"columns": 12`.

## Pre-import checklist

A sheet is CircleLimit-ready when:

1. The frame count is unambiguous — 8 frames means 8 clear cells, not 7.5
   birds and a wing fossil.
2. The subject is isolated in every frame.
3. No frame touches another frame.
4. The background is real alpha or one perfectly flat keyable color.
5. There is no baked checkerboard.
6. The silhouette still reads at thumbnail size.
7. The first and last frame loop cleanly for ring modes.
8. The subject faces right unless there's a specific reason not to.
9. Detailed sheets have a matching simplified LOD version.
10. The sheet contains one motion family only.

Everything else is just telling the model, "please don't invent a bird tax
document in frame 6."
