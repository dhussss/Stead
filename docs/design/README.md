# Design reference

The accepted Home design is **Home v3**, chosen with Dan on 5 October 2026. The live canvas is the
Claude artifact "Second Brain Home Directions"; these files are copies of its source so the build
can read them.

| File | What it is |
|---|---|
| `home-v3.dc.html` | **The target.** Home v3: Arc-style tinted frame, collapsible sidebar (nav, ⌘K search/ask bar, life map with tier slider, pinned areas, theme picker), main column (greeting, capture with "Saves as" chips, Needs you, Today, Next 7 days) and side column (This week rings, To reflect on, Trends vs goals). Ask Claude pill opens a panel led by "N changes to reconcile". |
| `themes.dc.html` | The six themes (tint, main, light, accent with soft and ink shades) and the area colour sets. The **Blend** set is in use. Already encoded in `apps/web/src/app/themes.css`. |
| `phone-early.dc.html` | An early phone layout (direction A). Use only for its phone proportions; the content follows Home v3. |

## How to read the .dc.html files

They're mockups, not app code. Markup sits inside `<x-dc>`; `{{name}}` placeholders and
`<sc-for list=… as=…>` loops are filled from the object returned by `renderVals()` in the
`<script type="text/x-dc">` block at the bottom, which also holds the sample data and the theme
table. Inline styles carry the real spacing, radii, type sizes and colours: copy those values, not
the templating. They won't render on their own (the runtime isn't included).

## Things decided after the mockup

- Areas are now Uni, Career, Faith, Health, Personal, People (Family is a sub-area of People). The
  rings are Family, Faith, Uni and Health. Mockup labels saying "Body" mean Health.
- Area icons: heart (Family), cross (Faith), mortarboard (Uni), dumbbell (Health).
- Calendar shows 7 days. Today sits above Next 7 days.
- Urgency colour only once a task is within 7 days; overdue flashes (see `packages/core/src/urgency.ts`).
