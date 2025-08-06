// theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1A1A1A', // Black
      contrastText: '#F2F2F2',
    },
    secondary: {
      main: '#4A4A4A', // Charcoal
      contrastText: '#F2F2F2',
    },
    action: {
      main: '#CA9837', // Gold
      contrastText: '#1A1A1A',
    },
    accent: {
      main: '#5DA9E9', // Light Blue
    },
    background: {
      default: '#F2F2F2',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1A1A',
      secondary: '#4A4A4A',
    },
  },
  typography: {
    fontFamily: `"Libre Baskerville", serif`,
    h4: {
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      fontSize: '0.95rem',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '3px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
          padding: '8px 20px',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 6px 18px rgba(0, 0, 0, 0.15)',
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0px 10px 25px rgba(0,0,0,0.05)',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#F9F9F9',
          '& .MuiTableCell-head': {
            fontWeight: 700,
            fontSize: '0.875rem',
            color: '#1A1A1A',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #E0E0E0',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          letterSpacing: '0.3px',
          textTransform: 'capitalize',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: 10,
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

export default theme;
