import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
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
const Business = lazy(() => import('../views/Business'));
const BulkUpload = lazy(() => import('../views/BulkUpload'));
const Purchase = lazy(() => import('../views/Purchase'));
const Leaderboard = lazy(() => import('../views/Leaderboard'));
const Production = lazy(() => import('../views/Production'));
const Agents = lazy(() => import('../views/Agents'));
const ReviewTriage = lazy(() => import('../views/ReviewTriage'));
const SalesAnalytics = lazy(() => import('../views/SalesAnalytics'));
const ResetPassword = lazy(() => import('../views/ResetPassword'));
const ForgotPassword = lazy(() => import('../views/ForgotPassword'));
const Profile = lazy(() => import('../views/Profile'));
import ErrorBoundary from '../views/ErrorBoundary';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <Navigate to='/business' replace />,
      },
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
        path: '/review-triage',
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
            <ReviewTriage />
          </Suspense>
        ),
      },
      {
        path: '/sales-analytics',
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
            <SalesAnalytics />
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
        path: '/business',
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
            <Business />
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
        path: '/bulk-upload',
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
            <BulkUpload />
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
        path: '/profile',
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
            <Profile />
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
