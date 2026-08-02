import { createTheme, alpha } from '@mui/material/styles';

export const createAppTheme = () => {
  return createTheme({
    palette: {
      primary: {
        main: '#051118',
        contrastText: '#F2F2F2',
      },
      secondary: {
        main: '#2F4E6F',
        contrastText: '#F2F2F2',
      },
      action: {
        main: '#D4AF37', // Gold
        contrastText: '#000000',
      },
      accent: {
        main: '#2F4E6F', // Light Blue
      },
      info: {
        main: '#D6EAF8',
        alertBackground: '#E5F6FD',
        alertTextColor: '#2E3A59',
        alertIconColor: '#1C7EBB',
        contrastText: '#1A1A1A',
      },
      warning: {
        main: '#C9A24D',
      },
      success: {
        main: '#3F6F5B',
        light: '#E6F1EC',
        contrastText: '#1E3D32',
      },
      error: {
        main: '#8B2E2E',
      },
      background: {
        default: '#FFFFFF',
        paper: '#FFFFFF',
      },
      text: {
        primary: '#1C1A17',
        secondary: '#5F5A52',
        disabled: '#9C958A',
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
