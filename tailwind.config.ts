import type { Config } from "tailwindcss";
import tokens from "./design-tokens.json";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: tokens.colors.primary,
        secondary: tokens.colors.secondary,
        neutral: tokens.colors.neutral,
        status: tokens.colors.status,
      },
      fontFamily: {
        sans: [tokens.typography.fontFamily],
      },
      fontSize: tokens.typography.sizes,
      spacing: tokens.spacing,
      borderRadius: tokens.radius,
      boxShadow: tokens.shadows,
      screens: {
        tablet: tokens.breakpoints.tablet,
        desktop: tokens.breakpoints.desktop,
      },
    },
  },
  plugins: [],
};

export default config;
