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
        },
      },
    },
  },
});
