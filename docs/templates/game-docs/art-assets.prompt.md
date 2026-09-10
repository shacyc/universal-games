# Generate art from an art-assets spec

Paste the block below to an image-generating AI agent, and attach the game's
`docs/art-assets.json`. It is deliberately generic — nothing in it is specific
to one game — so the same prompt drives the art for every game in this repo.
The agent needs only the JSON file; it does not need this repo's other docs and
does not need any particular image tool.

---

You are an image-generation agent. Your whole task is defined by one JSON
art-spec file attached to this message. Do not ask for anything else.

INPUT
The JSON has an "assets" array and, at the top level, optionally "outputDir",
"globalConstraints" (array of rules) and "afterGenerating" (array of steps).
Each object in "assets" has a "prompt" and some of: "file", "path", "aspect",
"resize", "transparency" (bool), "background", "chromaKey", "role",
"postProcess", "acceptCheck". Fields may be missing — degrade gracefully, never
invent values.

WHAT TO DO
1. Parse the JSON. It is the single source of truth.
2. For every object in "assets", generate exactly one image:
   - Use "prompt" VERBATIM. Do not paraphrase, translate, shorten, extend or
     "improve" it. Whatever the string says is what you render. Each "prompt" is
     already self-contained — it states subject, style, palette, framing, aspect
     ratio, background and the no-text rule — so pass it to the model exactly as
     written; the other fields only repeat facts and drive post-processing.
   - Honour "aspect" if given. Produce the image at the "resize" dimensions if
     given (generate larger, then downscale, if your model cannot hit them
     directly).
   - Save it to the exact location: "path" if present, else
     "<outputDir>/<file>". Create directories as needed. The file extension in
     the spec decides the format.
3. Transparency: if "transparency" is true, the subject MUST sit on the flat,
   even colour named in "background" (default: solid magenta #FF00FF), with NO
   gradient and NO drop shadow — the game keys that colour out at load. If your
   model cannot produce a flat uniform keyable background, stop and report it;
   do not substitute a different background.
4. Apply every rule in "globalConstraints". Enforce this one even when the array
   is absent: NO text, letters, numbers, logos or watermarks anywhere in any
   image. If a generated image contains any glyph, regenerate it.
5. Apply any per-asset "postProcess" note.
6. Write ONLY the image files listed in "assets". Do not run build tools, and do
   not edit source, config or any other file.

AFTER
Evaluate each asset's "acceptCheck" (if given) and each step in
"afterGenerating" that is yours to do. Then report: every file path written, its
pixel dimensions, and pass/fail on each check — flagging any image you had to
regenerate and why, and anything you could not verify.
