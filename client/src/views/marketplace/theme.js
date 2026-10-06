// Storefront theme carried over from fexdigital, on the CRM's font.
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },
  palette: {
    mode: 'light',
    primary: {
      dark: '#051118',
      main: '#233dff',
      light: '#4a6eff',
    },
    secondary: {
      main: '#050a30',
      light: '#373b5c',
      dark: '#00001a',
    },
    background: {
      default: '#f8f7f4',
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: '#4a5068',
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
        },
      },
    },
  },
});

export default theme;
