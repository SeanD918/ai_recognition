---
name: Luminous Cybernetics
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0d1c2d'
  surface-container: '#122131'
  surface-container-high: '#1c2b3c'
  surface-container-highest: '#273647'
  on-surface: '#d4e4fa'
  on-surface-variant: '#c9c5cd'
  inverse-surface: '#d4e4fa'
  inverse-on-surface: '#233143'
  outline: '#928f97'
  outline-variant: '#47464c'
  surface-tint: '#c8c3df'
  primary: '#c8c3df'
  on-primary: '#302e44'
  primary-container: '#0d0b1f'
  on-primary-container: '#7c7891'
  inverse-primary: '#5f5c74'
  secondary: '#ddfcff'
  on-secondary: '#00363a'
  secondary-container: '#00f1fe'
  on-secondary-container: '#006a70'
  tertiary: '#fface8'
  on-tertiary: '#5e0053'
  tertiary-container: '#22001d'
  on-tertiary-container: '#df00c8'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e4dffc'
  primary-fixed-dim: '#c8c3df'
  on-primary-fixed: '#1b192e'
  on-primary-fixed-variant: '#47445b'
  secondary-fixed: '#74f5ff'
  secondary-fixed-dim: '#00dbe7'
  on-secondary-fixed: '#002022'
  on-secondary-fixed-variant: '#004f54'
  tertiary-fixed: '#ffd7f0'
  tertiary-fixed-dim: '#fface8'
  on-tertiary-fixed: '#3a0033'
  on-tertiary-fixed-variant: '#840076'
  background: '#051424'
  on-background: '#d4e4fa'
  surface-variant: '#273647'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 16px
  margin: 24px
---

## Brand & Style

The brand personality of this design system is rooted in the concept of "Luminous Privacy." It balances the cold, analytical precision of artificial intelligence with a vibrant, human-centric energy. The target audience includes tech-forward individuals and developers who value data security as much as cutting-edge aesthetics.

The visual style is a sophisticated blend of **Glassmorphism** and **High-Contrast Neon**. It utilizes deep, multi-layered backgrounds that suggest infinite depth, layered with translucent "glass" panels that house critical information. The interface should evoke the feeling of a secure, high-tech command center—professional, mysterious, and undeniably advanced. Every interaction should feel like a pulse of light through a fiber-optic network.

## Colors

The palette is anchored by a "Deep Space" navy, providing a low-light foundation that ensures privacy and reduces eye strain. This design system uses high-chroma accents to guide the user's eye through the AI's logic flow.

- **Primary (Deep Space):** The foundation for all backgrounds and deep UI layers.
- **Secondary (Neon Cyan):** Used for "Success" states, active scanning indicators, and primary action highlights. It represents the "Logic" of the AI.
- **Tertiary (Electric Pink):** Reserved for "Aura" accents, data points, and secondary highlights. It represents the "Energy" of the recognition process.
- **Surface Tints:** Deep purples (#1E1B4B) are used for card backgrounds to provide subtle separation from the primary base.
- **Functional Colors:** Use Cyan for security-positive actions and Pink for warnings or high-energy alerts.

## Typography

Typography in this design system is divided between technical precision and functional clarity. 

**Space Grotesk** is the primary typeface for all headlines and labels. Its geometric, slightly eccentric letterforms reinforce the futuristic, high-tech nature of the app. It should be used with tighter tracking in headlines and wider tracking in labels to mimic a digital readout.

**Inter** is utilized for all body copy and long-form data. It provides a grounded, professional contrast to the headlines, ensuring that complex privacy information and settings are easily legible.

Maintain high contrast between labels (Neon Cyan/Pink) and body text (Slate/White) to establish a clear information hierarchy.

## Layout & Spacing

This design system employs a **Fluid Grid** model with a strict 8px rhythmic scale. The layout should feel expansive yet contained, utilizing generous margins (24px) to create a sense of focused security.

Content should be organized into centered modules. In a mobile environment, use a single-column layout with 16px gutters between cards. On larger displays, elements should span a 12-column grid, but the maximum content width should be capped at 1200px to maintain the "cockpit" feel of a specialized tool.

Whitespace is not empty; it should often be occupied by subtle mesh gradients or scanning-line patterns to maintain the futuristic atmosphere without cluttering the functional UI.

## Elevation & Depth

Depth is conveyed through **Glassmorphism** and **Luminous Layers** rather than traditional shadows. 

1.  **The Void (Base):** The darkest layer, utilizing a deep indigo solid or very subtle radial gradient.
2.  **The Glass (Surface):** Translucent panels with a `backdrop-filter: blur(20px)` and a `20%` white opacity fill.
3.  **The Glow (Interaction):** Elevation is signified by light. When an element is active or "elevated," it gains an outer glow (box-shadow) using the Secondary or Tertiary neon colors with a high blur radius (20-40px) and low opacity (30%).
4.  **The Edge (Definition):** All glass containers must have a 1px solid border at 10% opacity (White or Cyan) to define the shape against the dark background.

Avoid drop shadows that use pure black; always tint shadows with the primary deep navy to maintain the "liquid" dark-mode feel.

## Shapes

The shape language of this design system is defined by "Technical Softness." Elements use a **Rounded** (Level 2) corner radius to feel modern and premium. 

- **Standard Buttons/Cards:** 16px (1rem) corner radius.
- **Input Fields:** 8px (0.5rem) corner radius for a more precise, utility-focused look.
- **Feature Highlights:** 24px (1.5rem) for large hero cards or biometric containers.

Icons should follow a "linear-duotone" style, using 2px stroke weights with rounded caps and joins, mirroring the radius of the containers they inhabit.

## Components

### Buttons
Primary buttons feature a vibrant Neon Cyan gradient fill with black text for maximum legibility. Secondary buttons use a "Ghost" style: a 1px Cyan border with a subtle backdrop blur. All buttons should have a `hover` state that increases the outer glow intensity.

### Chips & Tags
Used for gender attributes or confidence scores. These should be small, capsule-shaped (Pill-shaped) with a Tertiary Pink border and semi-transparent Pink fill.

### Input Fields
Inputs should be minimalist. A simple 1px bottom border that transitions to a full 1px box-glow when focused. Use `label-sm` typography above the field.

### Cards
Cards are the primary container. They should utilize the Glassmorphism style: blurred background, subtle border, and a faint radial gradient in the top-left corner to simulate a light source.

### Biometric Viewfinder
A signature component for AuraSense. A central square or circular frame with "corner brackets" that pulse in Neon Cyan. This frame should be overlaid with a very faint scanning line animation (horizontal light bar).

### Confidence Gauges
Progress bars and rings should use a "Glow-track" style. The background track is a dark navy, while the active progress is a glowing Neon Cyan or Pink gradient, ending in a bright white "spark" at the leading edge.