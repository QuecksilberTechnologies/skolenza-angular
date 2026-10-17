import { definePreset } from '@openng/optimus-ui-themes';
import Aura from '@openng/optimus-ui-themes/aura';

export const SkolenzaPreset = definePreset(Aura, {
  semantic: {
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '{zinc.50}',
          100: '{zinc.100}',
          200: '{zinc.200}',
          300: '{zinc.300}',
          400: '{zinc.400}',
          500: '{zinc.500}',
          600: '{zinc.600}',
          700: '{zinc.700}',
          800: '{zinc.800}',
          900: '{zinc.900}',
          950: '{zinc.950}',
        },
      },
      dark: {
        surface: {
          0: '#ffffff',
          50: '{slate.50}',
          100: '{slate.100}',
          200: '{slate.200}',
          300: '{slate.300}',
          400: '{slate.400}',
          500: '{slate.500}',
          600: '{slate.600}',
          700: '{slate.700}',
          800: '{slate.800}',
          900: '{slate.900}',
          950: '{slate.950}',
        },
        // Aura's dark field sits on `surface.950` (a hole in the slate-900 card) with a
        // `surface.600` border (2.36:1, below the 3:1 WCAG 1.4.11 floor). Level the field with
        // the card, draw the boundary at `surface.500` (3.75:1), and keep disabled *below* enabled:
        // Aura's `surface.700` renders an inert control brighter than a live one.
        formField: {
          background: '{surface.900}',
          disabledBackground: '{surface.950}',
          borderColor: '{surface.500}',
          hoverBorderColor: '{surface.400}',
        },
      },
    },
  },
  components: {
    button: {
      colorScheme: {
        // Aura fills success/danger at -500, where white text is 2.28:1 / 3.76:1. Shift one to
        // two stops darker so the white label or icon clears 4.5:1. Dark mode keeps Aura's
        // -400 fill with dark text, which already passes.
        light: {
          root: {
            success: {
              background: '{green.700}',
              hoverBackground: '{green.800}',
              activeBackground: '{green.900}',
              borderColor: '{green.700}',
              hoverBorderColor: '{green.800}',
              activeBorderColor: '{green.900}',
              focusRing: { color: '{green.700}', shadow: 'none' },
            },
            danger: {
              background: '{red.600}',
              hoverBackground: '{red.700}',
              activeBackground: '{red.800}',
              borderColor: '{red.600}',
              hoverBorderColor: '{red.700}',
              activeBorderColor: '{red.800}',
              focusRing: { color: '{red.600}', shadow: 'none' },
            },
          },
          // Outlined and text variants colour the label itself at -500 (2.28:1 / 3.76:1 on white).
          // green.700 / red.700 clear 4.5:1 on white and on the -50 / -100 hover and active tints.
          outlined: {
            success: { color: '{green.700}' },
            danger: { color: '{red.700}' },
          },
          text: {
            success: { color: '{green.700}' },
            danger: { color: '{red.700}' },
          },
        },
      },
    },
  },
});
