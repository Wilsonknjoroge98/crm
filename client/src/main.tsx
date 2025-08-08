import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider } from '@mui/material/styles';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { Provider } from 'react-redux';

import theme from './utils/theme.js';
import router from './utils/router.jsx';
import store from './utils/redux/store.js';
import client from './utils/client.js';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <SnackbarProvider>
        <QueryClientProvider client={client}>
          <ThemeProvider theme={theme}>
            <RouterProvider router={router} />
          </ThemeProvider>
        </QueryClientProvider>
      </SnackbarProvider>
    </Provider>
  </StrictMode>,
);
