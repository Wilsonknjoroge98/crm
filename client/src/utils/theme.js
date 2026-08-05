import { createTheme, alpha } from '@mui/material/styles';

export const createAppTheme = () => {
  return createTheme({
    palette: {
      primary: {
        main: '#051118', // Deep Executive Ink / Off-Black
        contrastText: '#F2F2F2',
      },
      secondary: {
        main: '#2F4E6F', // Slate Blue
        contrastText: '#F2F2F2',
      },

      // 1. BRAND GOLD (Primary CTAs & Leaderboard Badges)
      action: {
        main: '#D4AF37', // Metallic Executive Gold
        hover: '#C29F2D',
        contrastText: '#000000',
      },

      // 2. SYSTEM STATUS PALETTES (Muted Editorial Tints)

      // SUCCESS: Deep Forest Green & Sage Background Tint
      success: {
        main: '#3F6F5B', // Forest Green
        light: '#EAF4EE', // Sage Tint (for chips & row highlights)
        dark: '#1E3D32',
        contrastText: '#FFFFFF',
      },

      // WARNING: Warm Ochre (Underwriting Flags / Health Risk Factors)
      warning: {
        main: '#B78103', // Muted Amber / Ochre
        light: '#FFF8E7', // Champagne / Warm Light Gold Tint
        dark: '#7A5400',
        contrastText: '#3D2A00',
      },

      // ERROR: Deep Crimson Burgundy & Soft Rose Tint
      error: {
        main: '#8B2E2E', // Crimson Burgundy
        light: '#FDF2F2', // Crisp Rose Tint (for destructive chips & unverified states)
        dark: '#5C1E1E',
        contrastText: '#FFFFFF',
      },

      // INFO: Executive Blue & Ice Blue Banner Tint
      info: {
        main: '#1C7EBB', // Muted Steel Blue
        light: '#E5F6FD', // Ice Blue Tint (for BMI banner & New metric card)
        alertBackground: '#E5F6FD',
        alertTextColor: '#2E3A59',
        alertIconColor: '#1C7EBB',
        contrastText: '#FFFFFF',
      },

      background: {
        default: '#FFFFFF',
        paper: '#FFFFFF',
      },
      text: {
        primary: '#1C1A17', // Dark Warm Charcoal
        secondary: '#5F5A52', // Muted Slate Gray
        disabled: '#9C958A', // Soft Warm Gray
      },
    },

    // 1. GLOBAL TYPOGRAPHY SYSTEM
    typography: {
      // Set Inter as the global default for all UI/Body text
      fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',

      // Force Libre Baskerville ONLY on Headings
      h1: { fontFamily: '"Libre Baskerville", serif', fontWeight: 700 },
      h2: { fontFamily: '"Libre Baskerville", serif', fontWeight: 700 },
      h3: { fontFamily: '"Libre Baskerville", serif', fontWeight: 700 },
      h4: {
        fontFamily: '"Libre Baskerville", serif',
        fontWeight: 700,
        letterSpacing: '0.5px',
      },
      h5: { fontFamily: '"Libre Baskerville", serif', fontWeight: 700 },
      h6: { fontFamily: '"Libre Baskerville", serif', fontWeight: 700 },

      // Standard UI weights
      button: {
        fontFamily: '"Inter", sans-serif',
        fontWeight: 600,
        textTransform: 'none',
        fontSize: '0.95rem',
      },
      body1: { fontFamily: '"Inter", sans-serif' },
      body2: { fontFamily: '"Inter", sans-serif' },
      caption: { fontFamily: '"Inter", sans-serif' },
    },

    // 2. GLOBAL COMPONENT OVERRIDES
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 6, // Slightly softer edges
            boxShadow: 'none',
            padding: '8px 20px',
            '&:hover': {
              boxShadow: 'none',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            backgroundImage: 'none',
          },
          outlined: {
            borderColor: '#E0E0E0',
            borderRadius: 8,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 700,
            fontSize: '0.675rem',
            letterSpacing: '0.3px',
            fontFamily: '"Inter", sans-serif',
          },
        },
      },
      // Automatically polish ALL DataGrids across the app
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: 'none',
            fontFamily: '"Inter", sans-serif',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#FAFAFA',
              borderBottom: '2px solid #E0E0E0',
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: 700,
                color: '#5F5A52',
                fontSize: '0.7rem',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                userSelect: 'none',
              },
            },
            '& .MuiDataGrid-row': {
              transition: 'background-color 0.15s ease-in-out',
              '&:hover': {
                backgroundColor: '#F9FAFB',
              },
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #F0F0F0',
            },
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          slotProps: { inputLabel: { shrink: true } },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: '#FFFFFF',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          notchedOutline: {
            borderColor: '#DDD',
          },
        },
      },
    },
  });
};
