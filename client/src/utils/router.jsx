import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import CircularProgress from '@mui/material/CircularProgress';

const Clients = lazy(() => import('../views/Clients'));
const Policies = lazy(() => import('../views/Policies'));
const Login = lazy(() => import('../views/Login'));
const SignUp = lazy(() => import('../views/SignUp'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '/clients',
        root: true,
        element: (
          <Suspense
            fallback={
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100vh',
                }}
              >
                <CircularProgress />
              </div>
            }
          >
            <Clients />
          </Suspense>
        ),
      },
      {
        path: '/policies',
        element: (
          <Suspense
            fallback={
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100vh',
                }}
              >
                <CircularProgress />
              </div>
            }
          >
            <Policies />
          </Suspense>
        ),
      },
      {
        path: '/login',
        element: (
          <Suspense
            fallback={
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100vh',
                }}
              >
                <CircularProgress />
              </div>
            }
          >
            <Login />
          </Suspense>
        ),
      },
      {
        path: '/signup',
        element: (
          <Suspense
            fallback={
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100vh',
                }}
              >
                <CircularProgress />
              </div>
            }
          >
            <SignUp />
          </Suspense>
        ),
      },
    ],
  },
]);

export default router;
