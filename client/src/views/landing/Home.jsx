// Home.jsx — the site root. Logged-out visitors get the public landing page;
// signed-in agents go straight to their Business view, as before.
import { lazy, Suspense } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const Landing = lazy(() => import('./Landing'));

const Home = () => {
  const { isAuthenticated, authInitialized } = useSelector(
    (state) => state.user,
  );

  // Supabase password-recovery links can land on the site root. They used to
  // be caught on the way to /login; keep sending them to the reset page.
  const { hash } = window.location;
  if (hash.includes('type=recovery')) {
    return <Navigate to={`/reset-password${hash}`} replace />;
  }

  // Wait for the session check so signed-in agents never see a flash of the
  // marketing page.
  if (!authInitialized) return null;
  if (isAuthenticated) return <Navigate to='/business' replace />;

  return (
    <Suspense fallback={null}>
      <Landing />
    </Suspense>
  );
};

export default Home;
