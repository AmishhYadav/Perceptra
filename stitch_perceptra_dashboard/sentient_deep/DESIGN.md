# Design System Specification: Behavioral Intelligence Interface

## 1. Overview & Creative North Star: "The Observational Lens"

The Creative North Star for this design system is **"The Observational Lens."** Unlike standard SaaS dashboards that feel like static spreadsheets, this system is designed to feel like a living, breathing entity—a high-fidelity window into complex human behavior and machine learning patterns.

We move beyond the "template" look by rejecting rigid, boxy structures in favor of **intentional layering and tonal depth**. The interface should feel like a multi-layered glass console in a high-end command center. By utilizing Inter’s tabular capabilities and high-contrast typography scales, we treat data as an editorial element—functional, yet beautiful.

---

## 2. Colors: Depth and Luminosity

The palette is rooted in deep oceanic tones, punctuated by high-vibrancy "functional neon" highlights that guide the eye to behavioral anomalies and ML insights.

### Surface Hierarchy & Nesting
To achieve a "state-of-the-art" feel, we rely on **Tonal Layering** rather than borders.
- **Base Layer:** `surface` (#0b1326) – The infinite dark void of the application.
- **Sectioning:** `surface-container-low` (#131b2e) – Used for large architectural regions (sidebars, secondary panels).
- **Interactive Units:** `surface-container-highest` (#2d3449) – Reserved for cards, modules, and primary interaction zones.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections. Boundaries must be defined solely through background shifts. If you need to separate a list of behavioral events, use `surface-container` against a `surface-container-low` background. 

### The "Glass & Gradient" Rule
Floating panels, such as modals or hover-state details, must utilize **Glassmorphism**.
- **Fill:** `surface-variant` (#2d3449) at 60% opacity.
- **Effect:** `backdrop-blur` (12px to 20px).
- **Signature Texture:** Primary actions should use a subtle linear gradient from `primary` (#66dd8b) to `primary-container` (#006933) at a 135-degree angle to provide a "machined" metallic luster.

---

## 3. Typography: Tabular Precision

We use **Inter** exclusively. Its clean, geometric construction fits the AI aesthetic, while its tabular numeric features are essential for behavioral data streams.

- **Display (Large/Medium):** Used for "The Big Why"—high-level behavioral clusters. Set with `-0.02em` letter spacing for an authoritative, editorial feel.
- **Headline & Title:** Used for module headers. Use `headline-sm` for most card titles to maintain a sophisticated, understated hierarchy.
- **Body & Label:** Use `body-md` for general insights. For data tables or ML confidence scores, utilize Inter’s **tabular num** OpenType feature to ensure digits align perfectly for scanability.
- **The "Data-First" Hierarchy:** To emphasize AI intelligence, labels (`label-md`) should often use `on-surface-variant` (#c5c5d4) in all-caps with `0.05em` tracking to differentiate metadata from primary user content.

---

## 4. Elevation & Depth: Tonal Stacking

Traditional shadows are too heavy for a modern tech aesthetic. We achieve lift through light, not shadow.

- **The Layering Principle:** Stack `surface-container-lowest` cards on top of a `surface-container-low` background. This creates a "recessed" look for data inputs and a "raised" look for insights.
- **Ambient Glows:** For floating elements, use a "Tinted Shadow." Instead of black, use `surface-container-lowest` at 40% opacity with a 40px blur. This creates an "atmospheric" lift.
- **The "Ghost Border" Fallback:** If accessibility requires a border, use `outline-variant` (#454652) at **15% opacity**. It should be felt, not seen.
- **Glassmorphism Depth:** When using glass panels, apply a 0.5px "Inner Glow" using `outline` (#8f909e) at 20% opacity on the top and left edges to simulate the catch-light on a sheet of glass.

---

## 5. Components: The Behavioral Kit

### Buttons
- **Primary:** Gradient fill (`primary` to `primary-container`), white text (`on-primary`), `rounded-md`. No border.
- **Secondary:** Transparent fill with the "Ghost Border." Text in `primary`.
- **Tertiary:** No background, `label-md` styling. Used for low-priority actions like "Cancel" or "View Docs."

### Input Fields
- **State:** Resting inputs use `surface-container-highest` with no border. 
- **Focus:** Transition the background to `surface-bright` and add a 1px glow using `primary`.
- **Error:** Use `error` (#ffb4ab) only for the helper text and a subtle under-line, avoiding a full red box which breaks the dark-mode immersion.

### Behavioral Chips
- **Status:** Use `tertiary` (Indigo) for neutral behavioral patterns, `secondary` (Amber) for "At-Risk" patterns, and `primary` (Emerald) for "Positive" correlations.
- **Style:** Semi-transparent backgrounds (10% opacity of the token color) with high-contrast text.

### Cards & Data Lists
- **Rule:** Forbid divider lines. Use `1.5rem` (24px) of vertical white space to separate entries. 
- **The "Insight" Card:** A glassmorphic panel with a `primary` left-accent bar (4px width) to denote machine-learned recommendations.

---

## 6. Do’s and Don’ts

### Do
- **Do** use tabular numbers for all ML confidence intervals and timestamps.
- **Do** use the `secondary` (Amber) color sparingly—only for behavioral triggers requiring immediate attention.
- **Do** lean into asymmetry. A 3-column layout where the center column is wider feels more "analytical" than a standard grid.

### Don’t
- **Don't** use 100% white (#FFFFFF). Always use `on-surface` (#dae2fd) for text to reduce eye strain in dark environments.
- **Don't** use heavy drop shadows. They muddy the slate-navy backgrounds. Use tonal shifts.
- **Don't** use standard 1px dividers. If you must separate content, use a 1px gap that reveals the `background` color between two `surface-container` elements.

### Accessibility Note
Ensure that all `on-surface-variant` text on `surface-container` backgrounds maintains a contrast ratio of at least 4.5:1. When using glassmorphism, ensure the backdrop-blur is sufficient to keep text legible over fluctuating background data.