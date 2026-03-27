```markdown
# Design System Specification: The Command Interface

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Architect"**

This design system is engineered to move beyond the "SaaS template" fatigue. It is a high-density, authoritative environment designed for the African EdTech context—where precision meets power. We are blending the raw, data-heavy urgency of a **Bloomberg Terminal** with the sophisticated, layered polish of **Modern Editorial Design**.

The interface must feel like a mission control center. We break the "flat web" look by using intentional depth, high-contrast typography scales, and a "Glass-on-Steel" aesthetic. We don't just show data; we command it. The layout utilizes the 12-column grid but punctuates it with asymmetrical data clusters and overlapping surfaces to ensure the UI feels custom-built and premium.

---

## 2. Color & Surface Architecture

The palette is anchored in deep, "ink" neutrals and vibrant, electric accents. The goal is "High-Performance Dark Mode."

### Neutral Foundations
- **Background (`#0c0e12`):** The absolute base. Deep, void-like, providing maximum contrast for data.
- **Surface (`#111318`):** The primary container color.
- **Surface Tiers (The Layering Principle):**
    - `surface_container_lowest`: Use for recessed areas or background-level utility bars.
    - `surface_container_low`: The standard card background.
    - `surface_container_high`: For active states or "popped" modules.

### The "No-Line" Rule
Traditional 1px solid borders for sectioning are strictly prohibited. Boundaries must be defined by:
1.  **Background Shifts:** Place a `surface_container_low` card on the `#0c0e12` background.
2.  **Tonal Transitions:** Use vertical white space (`spacing.8` or `spacing.10`) to separate sections rather than lines.

### Glass & Gradient Rule
To provide "visual soul," primary CTAs and high-level headers should utilize **Signature Textures**:
- **Gradient:** Linear transition from `primary` (`#a8a4ff`) to `primary_dim` (`#675df9`) at 135°.
- **Glassmorphism:** For floating modals or navigation overlays, use `surface_container_high` at 70% opacity with a `backdrop-blur-sm` (4px–8px).

---

## 3. Typography: The Technical Editorial

We utilize a dual-typeface system to balance technical precision with modern authority.

| Category | Typeface | Scale | Character |
| :--- | :--- | :--- | :--- |
| **Display** | Space Grotesk | `3.5rem` / `2.75rem` | High-impact, geometric, commanding. |
| **Headline** | Space Grotesk | `2rem` / `1.5rem` | Section anchors. Bold and technical. |
| **Title** | Inter | `1.375rem` / `1rem` | Component headers. Semi-bold (600). |
| **Body** | Inter | `1rem` / `0.875rem` | High readability, tightened tracking (-0.01em). |
| **Label** | Inter | `0.75rem` / `0.6875rem` | Uppercase, mono-spaced feel for data labels. |

**Editorial Contrast:** Always pair a `display-lg` metric (e.g., Total Students) with a `label-sm` descriptor to create the "Bloomberg" density.

---

## 4. Elevation & Depth: Tonal Layering

We do not use structural lines; we use **Light and Density**.

- **The Stacking Principle:** Treat the UI as physical layers.
    - *Layer 0:* `surface` (The Floor)
    - *Layer 1:* `surface_container_low` (The Workspace)
    - *Layer 2:* `surface_container_high` (The Active Tool)
- **Ambient Shadows:** Shadows are reserved for "floating" elements only. Use a 24px blur, 0px offset, and 6% opacity of `on_surface`. It should feel like a soft glow, not a drop shadow.
- **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline_variant` at 15% opacity. Never use 100% opaque lines.
- **Roundedness:** Use `xl` (1.5rem / 24px) for all primary containers to soften the technical edge and create a premium, modern feel.

---

## 5. Components

### Buttons & CTAs
- **Primary:** Gradient-filled (`primary` to `primary_dim`). Rounded-lg. No border.
- **Secondary:** `surface_container_highest` background with `on_surface` text.
- **Tertiary:** Ghost style. No background, `primary` text.

### Data Chips
- **Status:** Backgrounds must be 10% opacity of the status color (`success`, `warning`, `error`). Text is 100% opacity. 
- **Style:** Small caps, bold, `label-sm`.

### Input Fields
- **Default State:** `surface_container_low` background. A subtle `ghost border` (10% opacity).
- **Focus State:** Border transitions to `primary` at 40% opacity with a subtle outer glow (2px blur).
- **Labeling:** Floating labels using `label-md` to save vertical space in high-density views.

### Cards & Lists
- **Forbid Dividers:** Use `spacing.4` gaps between list items instead of lines.
- **Micro-Interactions:** On hover, a card should shift from `surface_container_low` to `surface_container_high` and scale by 1.01x.

### Special Component: The Metric "Node"
For the African EdTech context, data is king. Create "Nodes"—cards containing a `display-sm` value, a `label-sm` category, and a sparkline using `secondary` (`#6bff8f`). These should be arranged in an asymmetrical masonry grid at the top of the dashboard.

---

## 6. Do's and Don'ts

### Do
- **Do** prioritize density. Use `spacing.3` and `spacing.4` for internal card padding to keep data visible.
- **Do** use `primary` sparingly. It is an "electric" highlight, not a paint bucket.
- **Do** use `backdrop-blur` on navigation sidebars to allow the deep background colors to bleed through.

### Don't
- **Don't use pure white (#FFFFFF).** Always use `on_surface` (`#f6f6fc`) to prevent eye strain.
- **Don't use 1px solid dividers.** Use tonal shifts or whitespace.
- **Don't use standard "Drop Shadows."** Use tonal layering or the specified "Ambient Shadow."
- **Don't center-align everything.** Keep data left-aligned or right-aligned (for numerals) to maintain a structured, technical grid.

---
**Director’s Note:** This system is about "Restrained Power." Every pixel should feel intentional. If an element doesn't serve a data-driven or navigational purpose, remove it. Let the typography and the depth of the dark surfaces do the talking.```