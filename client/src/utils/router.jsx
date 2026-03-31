import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import { MoonLoader } from 'react-spinners';

const Clients = lazy(() => import('../views/Clients'));
const Policies = lazy(() => import('../views/Policies'));
const Login = lazy(() => import('../views/Login'));
const SignUp = lazy(() => import('../views/SignUp'));
const Insights = lazy(() => import('../views/Insights'));
const Premiums = lazy(() => import('../views/Premiums'));
const Commissions = lazy(() => import('../views/Commissions'));
const CashFlow = lazy(() => import('../views/CashFlow'));
const Leads = lazy(() => import('../views/Leads'));
const Purchase = lazy(() => import('../views/Purchase'));
const Leaderboard = lazy(() => import('../views/Leaderboard'));
const Production = lazy(() => import('../views/Production'));
const Agents = lazy(() => import('../views/Agents'));
const ResetPassword = lazy(() => import('../views/ResetPassword'));
const ForgotPassword = lazy(() => import('../views/ForgotPassword'));
import ErrorBoundary from '../views/ErrorBoundary';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        path: '/premiums',
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
                <MoonLoader color='#1A1A1A' size={150} loading={true} />
              </div>
            }
          >
            <Premiums />
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
                <MoonLoader color='#1A1A1A' size={150} loading={true} />
              </div>
            }
          >
            <Insights />
          </Suspense>
        ),
      },
      {
        path: '/team-production',
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
                <MoonLoader color='#1A1A1A' size={150} loading={true} />
              </div>
            }
          >
            <Production />
          </Suspense>
        ),
      },

      {
        path: '/agents',
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
                <MoonLoader color='#1A1A1A' size={150} loading={true} />
              </div>
            }
          >
            <Agents />
          </Suspense>
        ),
      },
      {
        path: '/purchase-leads',
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
                <MoonLoader color='#1A1A1A' size={150} loading={true} />
              </div>
            }
          >
            <Purchase />
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
                <MoonLoader color='#1A1A1A' size={150} loading={true} />
              </div>
            }
          >
            <Insights />
          </Suspense>
        ),
      },
      {
        path: '/leads',
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
                <MoonLoader color='#1A1A1A' size={150} loading={true} />
              </div>
            }
          >
            <Leads />
          </Suspense>
        ),
      },
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
                <MoonLoader color='#1A1A1A' size={150} loading={true} />
              </div>
            }
          >
            <Leaderboard />
          </Suspense>
        ),
      },
      {
        path: '/cashflow',
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
                <MoonLoader color='#1A1A1A' size={150} loading={true} />
              </div>
            }
          >
            <CashFlow />
          </Suspense>
        ),
      },
      {
        path: '/commissions',
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
                <MoonLoader color='#1A1A1A' size={150} loading={true} />
              </div>
            }
          >
            <Commissions />
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
                <MoonLoader color='#1A1A1A' size={150} loading={true} />
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
                <MoonLoader color='#1A1A1A' size={150} loading={true} />
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
                <MoonLoader color='#1A1A1A' size={150} loading={true} />
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
                <MoonLoader color='#1A1A1A' size={150} loading={true} />
              </div>
            }
          >
            <SignUp />
          </Suspense>
        ),
      },
      {
        path: '/forgot-password',
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
                <MoonLoader color='#1A1A1A' size={150} loading={true} />
              </div>
            }
          >
            <ForgotPassword />
          </Suspense>
        ),
      },
      {
        path: '/reset-password',
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
                <MoonLoader color='#1A1A1A' size={150} loading={true} />
              </div>
            }
          >
            <ResetPassword />
          </Suspense>
        ),
      },
    ],
  },
]);

export default router;
