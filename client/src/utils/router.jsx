import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import CircularProgress from '@mui/material/CircularProgress';
import { PuffLoader } from 'react-spinners';

const Clients = lazy(() => import('../views/Clients'));
const Policies = lazy(() => import('../views/Policies'));
const Login = lazy(() => import('../views/Login'));
const SignUp = lazy(() => import('../views/SignUp'));
const Insights = lazy(() => import('../views/Insights'));
const Leaderboard = lazy(() => import('../views/Leaderboard'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '/leaderboard',
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
                <PuffLoader color='#1A1A1A' size={150} loading={true} />
              </div>
            }
          >
            <Leaderboard />
          </Suspense>
        ),
      },
      {
        path: '/insights',
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
                <PuffLoader color='#1A1A1A' size={150} loading={true} />
              </div>
            }
          >
            <Insights />
          </Suspense>
        ),
      },
      {
        path: '/clients',
        index: true,
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
                <PuffLoader color='#1A1A1A' size={150} loading={true} />
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
                <PuffLoader color='#1A1A1A' size={150} loading={true} />
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
                <PuffLoader color='#1A1A1A' size={150} loading={true} />
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
                <PuffLoader color='#1A1A1A' size={150} loading={true} />
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
