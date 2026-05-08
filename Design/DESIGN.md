---
name: Kinetic Dark Health
colors:
  surface: '#121413'
  surface-dim: '#121413'
  surface-bright: '#383a38'
  surface-container-lowest: '#0d0f0e'
  surface-container-low: '#1a1c1b'
  surface-container: '#1e201f'
  surface-container-high: '#292b2a'
  surface-container-highest: '#333534'
  on-surface: '#e2e3e1'
  on-surface-variant: '#c1c9c4'
  inverse-surface: '#e2e3e1'
  inverse-on-surface: '#2f3130'
  outline: '#8b938f'
  outline-variant: '#414945'
  surface-tint: '#2ee5b5'
  primary: '#2ee5b5'
  on-primary: '#00382a'
  primary-container: '#00513e'
  on-primary-container: '#79ffd3'
  inverse-primary: '#006c53'
  secondary: '#fff9ef'
  on-secondary: '#3a3000'
  secondary-container: '#ffdb3c'
  on-secondary-container: '#725f00'
  tertiary: '#ffe4bf'
  on-tertiary: '#432c00'
  tertiary-container: '#ffc158'
  on-tertiary-container: '#744f00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#79ffd3'
  primary-fixed-dim: '#52fdcb'
  on-primary-fixed: '#002117'
  on-primary-fixed-variant: '#00513e'
  secondary-fixed: '#ffe16d'
  secondary-fixed-dim: '#e9c400'
  on-secondary-fixed: '#221b00'
  on-secondary-fixed-variant: '#544600'
  tertiary-fixed: '#ffdead'
  tertiary-fixed-dim: '#f9bc53'
  on-tertiary-fixed: '#281900'
  on-tertiary-fixed-variant: '#604100'
  background: '#121413'
  on-background: '#e2e3e1'
  surface-variant: '#414945'
typography:
  hero-data:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '300'
    lineHeight: 16px
    letterSpacing: 0.05em
  chart-label:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 12px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 20px
  stack-gap: 16px
  inner-padding: 12px
  inline-gap: 8px
---

## Brand & Style

This design system is built on a **High-Contrast / Bold** foundation, optimized for elite performance tracking and clarity in low-light environments. The personality is energetic, precise, and data-centric, utilizing a "Darkest-to-Light" elevation model to create focus on nutritional metrics.

The aesthetic balances professional medical precision with the vibrancy of modern fitness tech. By utilizing aggressive neon accents against a deep obsidian backdrop, the interface minimizes eye strain while maximizing the "pop" of critical health data. The emotional goal is to evoke a sense of discipline, high-tech capability, and immediate clarity.

## Colors

The palette is strictly dark-themed, using high-chroma accents for categorization and urgency.

- **Foundational Neutrals:** The hierarchy is established through luminance. The base background is the deepest black (#121413), while interactive cards and nested fields increment in lightness to provide a sense of physical layering.
- **Brand Accent:** A high-vibrancy teal (#2EE5B5) serves as the primary action color and progress indicator.
- **Semantic Macros & Meals:** Each macro-nutrient and meal type is color-coded to allow for split-second cognitive recognition without reading labels.
- **State States:** The Today Highlight uses a warm golden tone (#ffdb3c) to differentiate the current calendar view from historical data.

## Typography

This design system utilizes system default sans-serifs (San Francisco on iOS, Roboto on Android) to ensure platform-native performance and readability. 

- **Weight Contrast:** Visual interest is generated through extreme weight variance. Heavy weights (700-800) are reserved strictly for quantitative data (calorie counts, gram totals). Light weights (300) are used for metadata and secondary labels to reduce visual noise.
- **Scale:** A wide scale is used to emphasize "Hero" metrics, with the primary daily calorie balance appearing at 48px to serve as the dashboard's visual anchor.
- **Utility:** Small, high-medium weight fonts (10px-12px) are used for chart axes and pill labels to maintain legibility at small sizes.

## Layout & Spacing

The system follows a fluid-grid model with a focus on vertical stack rhythm. 

- **Safe Zones:** A standard 20px margin is maintained on the horizontal axis of the device.
- **Rhythm:** An 8px linear scaling system is used for spacing. 16px is the standard gap between cards, while 8px is used for internal element grouping.
- **Density:** Elements are grouped into distinct cards to avoid a "floating" look on the deep background. Spacing within cards is tighter (12px) than the spacing between the cards themselves.

## Elevation & Depth

Hierarchy is achieved through **Tonal Layering** rather than traditional shadows.

- **Layer 0 (Base):** #121413 — The canvas.
- **Layer 1 (Cards):** #1a1c1b — Main content containers. Use no shadows; depth is implied by the color contrast against the base.
- **Layer 2 (Inputs/Insets):** #1e201f — Inner elements like search bars or input fields. These should appear "sunken" or nested within Layer 1.
- **Modals:** Bottom sheets use a subtle #e2e3e1 (opacity 0.05) top border to separate them from the content behind them when they slide over the UI.

## Shapes

The shape language is "Hyper-Rounded," creating a friendly, modern feel that softens the high-contrast color palette.

- **Cards:** Fixed 16px radius.
- **Interactive Elements:** Buttons use a 12px rounded rectangle style, providing a distinct look from the cards they sit upon.
- **Status Elements:** All tags, badges, and progress chips use the pill shape (fully circular ends) to denote they are non-structural, secondary info.
- **Modals:** Bottom sheets feature an aggressive 32px radius on the top corners to emphasize the "sheet" metaphor.

## Components

- **Buttons:** Primary buttons are #2EE5B5 with black text for maximum legibility. Secondary buttons are #1e201f with white text.
- **Inputs:** Use Layer 2 (#1e201f) background with no borders. Placeholder text should be a mid-grey (#8b938f).
- **Navigation (Bottom Tab Bar):** #121413 background with a 0.5px top border in #1e201f. Use Ionicons; active state icons are Filled and colored in the Brand Accent (#2EE5B5), inactive icons are Outline and colored in #8b938f.
- **Progress Bars:** Background track is #1e201f. The fill color corresponds to the semantic macro or meal type.
- **Cards:** 16px radius, #1a1c1b background. Used to group "Meal" entries or "Macro" summaries.
- **Chips:** Pill-shaped, used for "Quick Add" or "Filter" actions.
