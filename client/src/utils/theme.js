// theme.js
import { createTheme, alpha } from '@mui/material/styles';

// ["#be8624","#160501","#ca9d56","#f9d077","#b29260","#442b0f","#e8b14d","#7a5f37"]

export const createAppTheme = ({ agency }) => {
  return createTheme({
    palette: {
      primary: {
        main: agency === 'ag_Hq92aLsK' ? '#0C0B0A' : '#0C0B0A', // Black or alternative color
        contrastText: '#F2F2F2',
      },
      secondary: {
        main: agency === 'ag_Hq92aLsK' ? '#7a5f37' : '#8F6A2A', // Charcoal or alternative color
        contrastText: '#F2F2F2',
      },
      action: {
        main: agency === 'ag_Hq92aLsK' ? '#442b0f' : '#B8923C', // Gold
        contrastText: agency === 'ag_Hq92aLsK' ? '#F2F2F2' : '#1A1A1A',
      },
      accent: {
        main: agency === 'ag_Hq92aLsK' ? '#2F5D8A' : '#2F4E6F', // Light Blue
      },
      info: {
        main: agency === 'ag_Hq92aLsK' ? '#DCE6EF' : '#D6EAF8',
        alertBackground: '#e5f6fd',
        alertTextColor: '#2E3A59',
        alertIconColor: '#1C7EBB',
        contrastText: '#1A1A1A',
      },
      warning: {
        main: agency === 'ag_Hq92aLsK' ? '#C9A24D' : '#C9A24D',
      },
      success: {
        main: '#3F6F5B',
        light: '#E6F1EC',
        contrastText: '#1E3D32',
      },
      error: {
        main: agency === 'ag_Hq92aLsK' ? '#8B2E2E' : '#8B2E2E',
      },
      background: {
        default: agency === 'ag_Hq92aLsK' ? '#F7F5F2' : '#F7F5F2',
        paper: '#FFFFFF',
      },
      text: {
        primary: '#1C1A17',
        secondary: '#5F5A52',
        disabled: '#9C958A',
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
            borderRadius: 3,
            boxShadow: 'none',
            padding: '8px 20px',
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
      // MuiAlert: {
      //   styleOverrides: {
      //     standardInfo: ({ theme }) => ({
      //       marginBottom: theme.spacing(2),
      //       color: alpha(theme.palette.info.alertTextColor, 0.9),
      //       backgroundColor: alpha(theme.palette.info.alertBackground, 0.9),
      //       '& .MuiAlert-icon': {
      //         color: alpha(theme.palette.info.alertIconColor, 0.9),
      //       },
      //     }),
      //     standardWarning: ({ theme }) => ({
      //       marginBottom: theme.spacing(2),
      //       color: alpha(theme.palette.warning.alertTextColor, 0.9),
      //       backgroundColor: alpha(theme.palette.warning.alertBackground, 0.9),
      //       '& .MuiAlert-icon': {
      //         color: alpha(theme.palette.warning.alertIconColor, 0.9),
      //       },
      //     }),
      //     standardError: ({ theme }) => ({
      //       marginBottom: theme.spacing(2),
      //       color: alpha(theme.palette.error.alertTextColor, 0.9),
      //       backgroundColor: alpha(theme.palette.error.alertBackground, 0.9),
      //       '& .MuiAlert-icon': {
      //         color: alpha(theme.palette.error.alertIconColor, 0.9),
      //       },
      //     }),
      //   },
      // },
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
};
// const theme = createTheme({
//   palette: {
//     primary: {
//       main: '#1A1A1A', // Black
//       contrastText: '#F2F2F2',
//     },
//     secondary: {
//       main: '#4A4A4A', // Charcoal
//       contrastText: '#F2F2F2',
//     },
//     action: {
//       main: '#CA9837', // Gold
//       contrastText: '#1A1A1A',
//     },
//     accent: {
//       main: '#5DA9E9', // Light Blue
//     },
//     info: {
//       main: '#D6EAF8',
//       alertBackground: '#e5f6fd',
//       alertTextColor: '#2E3A59',
//       alertIconColor: '#1C7EBB',
//       contrastText: '#1A1A1A',
//     },
//     warning: {
//       main: '#FCF3CF',
//       contrastText: '#1A1A1A',
//       alertBackground: '#fff4e6',
//       alertTextColor: '#7A4A00',
//       alertIconColor: '#D48806',
//     },
//     success: {
//       main: '#D5F5E3',
//       contrastText: '#1A1A1A',
//     },
//     error: {
//       main: '#FADBD8',
//       alertBackground: '#fff1f0',
//       alertTextColor: '#611A15',
//       alertIconColor: '#D32F2F',
//       contrastText: '#1A1A1A',
//     },
//     background: {
//       default: '#F2F2F2',
//       paper: '#FFFFFF',
//     },
//     text: {
//       primary: '#1A1A1A',
//       secondary: '#4A4A4A',
//     },
//   },

//   typography: {
//     fontFamily: `"Libre Baskerville", serif`,
//     h4: {
//       fontWeight: 700,
//       textTransform: 'uppercase',
//       letterSpacing: '0.5px',
//     },
//     button: {
//       fontWeight: 600,
//       textTransform: 'none',
//       fontSize: '0.95rem',
//     },
//   },
//   components: {
//     MuiButton: {
//       styleOverrides: {
//         root: {
//           borderRadius: 3,
//           boxShadow: 'none',
//           padding: '8px 20px',
//         },
//       },
//     },
//     MuiPaper: {
//       styleOverrides: {
//         root: {
//           boxShadow: '0px 10px 25px rgba(0,0,0,0.05)',
//         },
//       },
//     },
//     MuiTableHead: {
//       styleOverrides: {
//         root: {
//           backgroundColor: '#F9F9F9',
//           '& .MuiTableCell-head': {
//             fontWeight: 700,
//             fontSize: '0.875rem',
//             color: '#1A1A1A',
//           },
//         },
//       },
//     },
//     MuiTableCell: {
//       styleOverrides: {
//         root: {
//           borderBottom: '1px solid #E0E0E0',
//         },
//       },
//     },
//     MuiChip: {
//       styleOverrides: {
//         root: {
//           fontWeight: 600,
//           letterSpacing: '0.3px',
//           textTransform: 'capitalize',
//         },
//       },
//     },
//     MuiAlert: {
//       styleOverrides: {
//         standardInfo: ({ theme }) => ({
//           marginBottom: theme.spacing(2),
//           color: alpha(theme.palette.info.alertTextColor, 0.9),
//           backgroundColor: alpha(theme.palette.info.alertBackground, 0.9),
//           '& .MuiAlert-icon': {
//             color: alpha(theme.palette.info.alertIconColor, 0.9),
//           },
//         }),
//         standardWarning: ({ theme }) => ({
//           marginBottom: theme.spacing(2),
//           color: alpha(theme.palette.warning.alertTextColor, 0.9),
//           backgroundColor: alpha(theme.palette.warning.alertBackground, 0.9),
//           '& .MuiAlert-icon': {
//             color: alpha(theme.palette.warning.alertIconColor, 0.9),
//           },
//         }),
//         standardError: ({ theme }) => ({
//           marginBottom: theme.spacing(2),
//           color: alpha(theme.palette.error.alertTextColor, 0.9),
//           backgroundColor: alpha(theme.palette.error.alertBackground, 0.9),
//           '& .MuiAlert-icon': {
//             color: alpha(theme.palette.error.alertIconColor, 0.9),
//           },
//         }),
//       },
//     },
//     MuiInputBase: {
//       styleOverrides: {
//         root: {
//           borderRadius: 10,
//           backgroundColor: '#FFFFFF',
//         },
//       },
//     },
//     MuiOutlinedInput: {
//       styleOverrides: {
//         notchedOutline: {
//           borderColor: '#DDD',
//         },
//       },
//     },
//   },
// });

// export default theme;
