import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../utils/firebase'; // Your initialized Firebase Auth instance

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false); // Prevents flash of undefined state

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecked(true);
    });

    return () => unsubscribe(); // Cleanup
  }, []);

  return { user, authChecked };
};

export default useAuth;
