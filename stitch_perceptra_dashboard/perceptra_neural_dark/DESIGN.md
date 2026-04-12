# Design System Specification: The Predictive Pulse

## 1. Overview & Creative North Star
This design system is built to reflect the sophisticated nature of real-time Behavioral Machine Learning. Our Creative North Star is **"The Neural Ethereal."** We are moving away from the rigid, boxy constraints of traditional SaaS dashboards toward a high-end editorial experience that feels fluid, intelligent, and deeply layered.

The interface should feel like a living organism—data doesn’t just sit on a page; it breathes through the UI. We achieve this by breaking the "template" look with intentional asymmetry, overlapping containers, and a typography scale that favors dramatic contrast. This is not just a tool; it is a premium command center for human behavior analysis.

---

## 2. Colors & Surface Philosophy
The palette is rooted in the depths of night, using light and transparency to guide the user’s eye rather than structural lines.

### The Color Logic
- **Primary (`primary` #83faa5):** Use for high-action states and "success" signals. It represents the "pulse" of the machine learning engine.
- **Secondary (`secondary_container` #2c3ea3):** Our Indigo anchor. Use this for deep-focus areas and analytical depth.
- **Surface (`surface` #0b1326):** The canvas. Everything emerges from this deep navy void.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections. Boundaries must be established through:
1.  **Background Shifts:** Place a `surface_container_low` (#131b2e) card on a `surface` (#0b1326) background.
2.  **Tonal Transitions:** Use soft gradients to imply the end of one content area and the beginning of another.
3.  **Negative Space:** Use the spacing scale to create "islands" of information that feel connected by logic, not by fences.

### The Glass & Gradient Rule
For floating elements—such as modals, hovering tooltips, or primary navigation—use a semi-transparent `surface_variant` with a 24px–40px backdrop blur. 
- **Signature Gradient:** CTAs should utilize a linear gradient from `primary` (#83faa5) to `primary_container` (#66dd8b) at a 135-degree angle. This provides a "soul" to the action that a flat color cannot replicate.

---

## 3. Typography: Technical Editorial
We utilize a dual-font approach to balance human readability with machine-precision aesthetics.

- **The Brand Voice (Inter):** Used for all `display`, `headline`, and `body` roles. Inter provides a neutral, highly legible foundation that allows the data to remain the hero. Use `display-lg` (3.5rem) for high-impact data points to create a sense of scale and authority.
- **The Data Voice (Space Grotesk):** Specifically reserved for `label-md` and `label-sm`. The geometric nature of Space Grotesk lends a "coded" feel to metadata, timestamps, and micro-copy, reinforcing the tech-focused nature of the platform.

**Hierarchy Strategy:** Ensure a dramatic jump between `headline-lg` and `body-md`. High contrast in size communicates importance faster than color ever could.

---

## 4. Elevation & Depth: Tonal Layering
In this design system, height is an illusion created through light and transparency, not shadows alone.

### The Layering Principle
Treat the UI as stacked sheets of frosted glass. 
- **Base Level:** `surface` (#0b1326).
- **Raised Level:** `surface_container` (#171f33).
- **Interaction Level:** `surface_container_highest` (#2d3449).

### Ambient Shadows
For floating elements, shadows must be "Ambient." Use the `on_surface` color as the shadow base at 5% opacity, with a blur value of 40px–60px. This mimics the way a soft light source would interact with a matte screen, avoiding the muddy "drop shadow" look common in lower-end systems.

### The "Ghost Border" Fallback
If containment is absolutely required for accessibility, use a **Ghost Border**: a 1px stroke using the `outline_variant` token at **15% opacity**. This provides a hint of structure without interrupting the visual flow.

---

## 5. Components

### Buttons: The Kinetic Glow
- **Primary:** Gradient fill (`primary` to `primary_container`) with a 0.75rem (`xl`) corner radius. Apply a 10px outer glow using the `primary` color at 20% opacity.
- **Secondary:** Transparent fill with a `Ghost Border`. Text in `primary_fixed`.
- **States:** On hover, the glow intensity increases, and the button scales to 102% to feel responsive and tactile.

### Cards: Glassmorphic Vessels
- **Construction:** Use `surface_container_low` at 80% opacity with a `backdrop-blur`. 
- **Edges:** A 1px top-to-bottom linear gradient stroke (Top: `outline` at 20%, Bottom: `outline` at 5%).
- **Spacing:** Minimum padding of 2rem to maintain the editorial feel. Never cramp the data.

### Input Fields: Minimalist Precision
- **Style:** Underline only or Ghost Border. Use `surface_container_highest` for the active field background to create a "recessed" look.
- **Focus State:** The label shifts to `secondary` (Indigo) and a subtle 2px glow appears at the base of the input.

### Chips: Data Tags
- **Design:** Pill-shaped (`full` roundedness). Use `surface_container_high` with `label-sm` (Space Grotesk). No borders.

### The "No-Divider" List
- Lists must never use horizontal lines. Use a `surface_container_lowest` background for every second item (zebra striping) or simply increase vertical white space to 1.5rem between items to allow the eye to track naturally.

---

## 6. Do's and Don'ts

### Do
- **Do** overlap elements. A card slightly overhanging a background container creates high-end depth.
- **Do** use `primary` sparingly. It is a "glimmer" in the dark, not a paint bucket.
- **Do** lean into asymmetry. Off-center headlines provide a sophisticated, editorial feel.

### Don't
- **Don't** use 100% white for text. Use `on_surface` (#dbe2fd) to reduce eye strain and maintain the "tech" atmosphere.
- **Don't** use sharp 90-degree corners. Always adhere to the Roundedness Scale (default `xl` for large containers).
- **Don't** use traditional "Material" drop shadows. If it looks like a "box-shadow: 0 4px 4px," it's wrong. Think "Atmospheric Glow."