import type { ReactNode } from "react";

const MASTER_TEMPLATE = `[OUTPUT CONTRACT]
Create one horizontal sprite sheet, 1 row x 8 columns, with 8 evenly spaced frames.
Each frame contains one isolated [SUBJECT].
The sequence reads left to right. The subject faces right.
The final image must be a true transparent PNG with alpha.
No visible grid. No checkerboard. No background. No labels. No frame numbers.

[MOTION BEATS]
8 frames, left to right:
1. [pose]
2. [pose]
...

[STYLE]
[Your art direction — medium, palette, level of detail.]
One coherent style across every frame.

[LAYOUT]
One isolated subject per frame. Consistent scale. Consistent body anchor point.
Generous padding around each frame. No overlap between neighboring frames.
Clean silhouette readability at small size.

[BACKGROUND / TECHNICAL]
True transparent alpha background. No checkerboard, paper texture, or shadows.
No labels, text, frame numbers, grid, or border.

[NEGATIVE STYLE]
Avoid painterly blur, decorative background, collage, mixed subjects,
and extra subjects unless this is specifically a flock sheet.`;

const IMPORT_SETTINGS = `{
  "rows": 1,
  "columns": 8,
  "transparentBackground": true,
  "keyTolerance": 60,
  "autoCenter": true,
  "smartSlice": true,
  "placementMode": "zoetrope-ring"
}`;

const PRACTICES: { title: string; body: ReactNode }[] = [
  {
    title: "State the sheet contract first",
    body: (
      <>
        Open every prompt with the production format before any art direction. The
        importer defaults to a <code>1 × 8</code> grid with transparent keying, so
        say exactly that: <em>"one horizontal sprite sheet, 1 row × 8 columns, 8
        evenly spaced frames, true transparent PNG, no grid, no background."</em>
      </>
    ),
  },
  {
    title: "One motion idea per sheet",
    body: (
      <>
        Don't cram idle, launch, flight, and landing into one strip. Every
        placement mode reads the frames as a single coherent sequence, so a
        grab-bag sheet maps to noise. Make a separate sheet per action.
      </>
    ),
  },
  {
    title: "Spell out every frame",
    body: (
      <>
        Image models improvise in the dumbest ways. Give them a numbered list —
        <em>"1. relaxed rest, 2. head turn left, 3. …"</em> — instead of "make an
        idle animation." Explicit beats guesswork every time.
      </>
    ),
  },
  {
    title: "Animate the pose, not the position",
    body: (
      <>
        The slicer auto-centers each frame by its alpha bounds, so a subject that
        physically travels across its cells loses that motion on import. Ask for
        motion through <em>pose changes</em>, with the body center held consistent
        frame to frame.
      </>
    ),
  },
  {
    title: "Give every frame breathing room",
    body: (
      <>
        Smart slicing segments the sheet by connected pixels. If subjects touch
        across cell lines, segmentation fails and it falls back to a hard grid cut.
        Ask for generous padding and no overlap between neighbors.
      </>
    ),
  },
  {
    title: "Insist on true alpha",
    body: (
      <>
        The importer keys out a solid background by sampling the corner color, so a
        baked checkerboard leaves garbage pixels. Demand a real transparent alpha
        channel — or, as a fallback, one perfectly flat keyable color with no
        texture, shadows, or gradients.
      </>
    ),
  },
  {
    title: "Silhouette first, detail second",
    body: (
      <>
        The disk shrinks motifs toward its boundary, so fine interior detail turns
        to mush at high placement counts. Build a detailed hero sheet <em>and</em> a
        clean low-detail silhouette version for dense flock and tessellation work.
      </>
    ),
  },
];

const PLACEMENT_MODES: { name: string; when: string; ask: string }[] = [
  {
    name: "Sequential Ring / Zoetrope Ring",
    when: "smooth looping cycles",
    ask: "First and last frames should connect cleanly as a loop; the motion should read clearly when frames are arranged around a circle.",
  },
  {
    name: "Radial Timeline",
    when: "transformation over time, mapped center-to-edge",
    ask: "The sequence should progress from calm / small / early motion to energetic / expanded / late motion.",
  },
  {
    name: "Spiral Motion",
    when: "directional action",
    ask: "The motion should flow forward, with each pose naturally leading into the next.",
  },
  {
    name: "Onion Skin Manuscript",
    when: "clean silhouettes, since earlier frames layer underneath at fading opacity",
    ask: "The silhouette should stay readable when faded earlier frames are layered beneath it.",
  },
];

export function PromptGuidePage({ onOpenStudio }: { onOpenStudio: () => void }) {
  return (
    <main className="about-page">
      <section className="about-hero">
        <h2>Prompt your own sprite sheets.</h2>
        <p>
          Bring your own subject and your own image generator — Midjourney, DALL·E,
          Stable Diffusion, Nano Banana, whatever you like. The trick is that a
          CircleLimit sheet isn't just an animation strip. Every frame you generate
          gets sliced, re-centered, scaled, rotated, mirrored, repeated dozens to
          thousands of times, and compressed toward the boundary of the disk. Prompt
          for that pipeline and your tessellations come out clean.
        </p>
        <button className="primary" onClick={onOpenStudio}>
          Open the studio
        </button>
      </section>

      <section className="about-section">
        <h3>The golden rule</h3>
        <p>
          One clean motion idea, one row, one subject per frame, consistent scale,
          true transparent alpha, no baked background, readable at tiny sizes.
          Silhouette comes first and detail second — the geometry intentionally
          shrinks forms toward the circle edge, so overly busy sprites become visual
          noise fast.
        </p>
      </section>

      <section className="about-section">
        <h3>Seven practices</h3>
        <ol className="guide-practices">
          {PRACTICES.map((p) => (
            <li key={p.title}>
              <strong>{p.title}.</strong> {p.body}
            </li>
          ))}
        </ol>
      </section>

      <section className="about-section">
        <h3>A prompt template that works</h3>
        <p>
          Fill in the brackets and paste this into your image generator. The
          structure — contract, beats, style, layout, technical, negatives — is what
          keeps the model from inventing a mystery bird in frame six.
        </p>
        <pre className="guide-code">{MASTER_TEMPLATE}</pre>
      </section>

      <section className="about-section">
        <h3>Import settings to pair with it</h3>
        <p>
          When your sheet comes back, these are the settings that match the template
          above. Everything else can stay at its default.
        </p>
        <pre className="guide-code">{IMPORT_SETTINGS}</pre>
      </section>

      <section className="about-section">
        <h3>Aim at a placement mode</h3>
        <p>
          Each sheet maps into the disk through one of the studio's motion modes, and
          each mode wants a slightly different sequence. Generate with a destination
          in mind and add its line to your prompt.
        </p>
        <ul className="guide-practices">
          {PLACEMENT_MODES.map((m) => (
            <li key={m.name}>
              <strong>{m.name}</strong> — {m.when}. <em>"{m.ask}"</em>
            </li>
          ))}
        </ul>
      </section>

      <section className="about-section">
        <h3>Before you import</h3>
        <p>A sheet is ready when:</p>
        <ul className="about-refs">
          <li>the frame count is unambiguous — 8 frames means 8 clear cells;</li>
          <li>the subject is isolated and no frame touches another;</li>
          <li>the background is real alpha or one perfectly flat keyable color;</li>
          <li>the silhouette still reads at thumbnail size;</li>
          <li>the first and last frame loop cleanly for ring modes;</li>
          <li>the sheet contains one motion family only.</li>
        </ul>
      </section>

      <footer className="about-footer">
        <button className="primary" onClick={onOpenStudio}>
          Back to the studio
        </button>
      </footer>
    </main>
  );
}
