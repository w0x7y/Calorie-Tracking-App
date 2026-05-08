// Kinetic Dark Health — DESIGN.md design system
export const Colors = {
  // Base
  black: "#000000",
  white: "#FFFFFF",

  // Text
  text: "#DCE5DF",         // on-surface
  textDim: "#BACAC2",      // on-surface-variant

  // Backgrounds / surfaces
  background: "#0D1512",            // surface / background
  secondaryBackground: "#19211E",   // surface-container
  tabBackground: "#08100D",         // surface-container-lowest
  cardSurface: "#151D1A",           // surface-container-low
  surfaceBright: "#333B37",         // surface-bright

  // Borders / outlines
  outline: "#84948D",
  outlineVariant: "#3B4A44",

  // Brand primary — teal
  primary: "#79FFD3",              // primary
  primaryContainer: "#2EE5B5",     // primary-container (CTA buttons)
  onPrimary: "#00382A",            // text on primary buttons

  // Secondary — golden
  secondary: "#FFF9EF",
  secondaryContainer: "#FFDB3C",
  onSecondaryContainer: "#725F00",

  // Tertiary — amber
  tertiary: "#FFE4BF",
  tertiaryContainer: "#FFC158",

  // Error
  error: "#FFB4AB",
  errorContainer: "#93000A",

  // Semantic macro colours (matching prototype screenshots)
  proteine: "#EF5350",         // Red — Protein
  carbohydrates: "#5C6BC0",    // Indigo/Blue — Carbs
  fats: "#FFA726",             // Amber — Fat

  // Meal category accent colours
  mealBreakfast: "#FF9F43",
  mealLunch: "#2EE5B5",
  mealDinner: "#A29BFE",
  mealSnacks: "#FD79A8",

  // UI accent — progress bars, active states
  bar: "#2EE5B5",             // primary-container / teal accent

  // Today highlight in calendar strip
  todayHighlight: "#FFDB3C",
  onTodayHighlight: "#3A3000",

  // Water card
  waterAccent: "#2EE5B5",
  waterFill: "rgba(46, 229, 181, 0.18)",
  waterBorder: "#2EE5B5",
} as const;
