import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { Provider } from 'react-redux';
import { AuthProvider } from './utils/AuthProvider.js';
import router from './utils/router.jsx';
import store from './utils/redux/store.js';
import client from './utils/client.js';

const root = document.getElementById('root');
if (!root) throw new Error('Failed to find the root element');

createRoot(root).render(
  <StrictMode>
    <Provider store={store}>
      <SnackbarProvider>
        <QueryClientProvider client={client}>
            <AuthProvider>
                <RouterProvider router={router} />
            </AuthProvider>
        </QueryClientProvider>
      </SnackbarProvider>
    </Provider>
  </StrictMode>,
);
