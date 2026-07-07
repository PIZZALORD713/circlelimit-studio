const REFERENCES: { label: string; href: string }[] = [
  {
    label: "National Gallery of Art — Circle Limit III",
    href: "https://www.nga.gov/artworks/61280-circle-limit-iii",
  },
  {
    label: "Escher in Het Paleis — Circle Limit IV: Heaven and Hell",
    href: "https://www.escherinhetpaleis.nl/en/about-escher/escher-today/circle-limit-iv-heaven-and-hell",
  },
  {
    label: "Wolfram MathWorld — Poincaré Hyperbolic Disk",
    href: "https://mathworld.wolfram.com/PoincareHyperbolicDisk.html",
  },
  {
    label: "Douglas Dunham — An Algorithm to Generate Repeating Hyperbolic Patterns",
    href: "https://www.d.umn.edu/~ddunham/",
  },
  {
    label: "Malin Christersson — Interactive Hyperbolic Tiling in the Poincaré Disc",
    href: "https://www.malinc.se/noneuclidean/en/poincaretiling.php",
  },
];

export function AboutPage({ onOpenStudio }: { onOpenStudio: () => void }) {
  return (
    <main className="about-page">
      <section className="about-hero">
        <h2>Infinity, inscribed in a circle.</h2>
        <p>
          CircleLimit Studio is a creative instrument for composing original circular
          tessellations in the visual language of hyperbolic geometry — the language
          M.C. Escher explored in his <em>Circle Limit</em> woodcuts: interlocking
          figures that repeat, mirror, and shrink toward the boundary of a perfect
          circle, approaching infinity at its edge.
        </p>
        <button className="primary" onClick={onOpenStudio}>
          Open the studio
        </button>
      </section>

      <section className="about-section">
        <h3>Three ways in</h3>
        <p>
          <strong>Prompt.</strong> Describe a motif — “black ink ravens flying in a
          spiral” — and a local motif grammar draws procedural vector creatures
          (fish, birds, butterflies, bats, angels, flowers, masks, shards) in a
          woodcut-inspired style, deterministically from a seed.
        </p>
        <p>
          <strong>Image.</strong> Upload any image and it becomes a repeating motif,
          with silhouette thresholding, posterization, and outlining.
        </p>
        <p>
          <strong>Motion.</strong> Upload a sprite sheet and its frames are
          segmented, normalized, and mapped into the disk — as a static motion map
          or a living, animated tessellation: sequential rings, radial timelines,
          spirals, symmetry echoes, onion-skin manuscripts, and zoetrope rings.
          Export as looping GIF, video, or PNG.
        </p>
      </section>

      <section className="about-section">
        <h3>The geometry</h3>
        <p>
          The composition lives in a Poincaré-disk-inspired mapping: rings sit at
          equal hyperbolic steps (<code>r = tanh(h / 2)</code>) and motifs scale with{" "}
          <code>1 − r²</code>, so the pattern compresses toward the boundary without
          ever reaching it. A Möbius-transformation lens —{" "}
          <code>f(z) = (z + a) / (1 + āz)</code>, a true isometry of the hyperbolic
          plane — lets you inflate one region of the disk while the rest recedes,
          the characteristic bulge of Escher’s circle prints. Everything is
          deterministic per seed and rendered live on canvas.
        </p>
      </section>

      <section className="about-section">
        <h3>Originality &amp; respect</h3>
        <p>
          This tool uses only the <em>mathematical principles</em> of hyperbolic
          tessellation. No M.C. Escher artwork is bundled, traced, scraped, or
          reproduced — his works remain under copyright, managed by the M.C. Escher
          Company. Everything you make here is an original work built from your own
          prompts, images, and motion.
        </p>
        <p>
          All processing happens in your browser. Uploaded images and sprite sheets
          never leave your machine.
        </p>
      </section>

      <section className="about-section">
        <h3>Further reading</h3>
        <ul className="about-refs">
          {REFERENCES.map((r) => (
            <li key={r.href}>
              <a href={r.href} target="_blank" rel="noreferrer">
                {r.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <footer className="about-footer">
        <p>
          Built with React, TypeScript, and Canvas.{" "}
          <a
            href="https://github.com/PIZZALORD713/circlelimit-studio"
            target="_blank"
            rel="noreferrer"
          >
            Source on GitHub
          </a>
        </p>
      </footer>
    </main>
  );
}
