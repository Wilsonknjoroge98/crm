import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../utils/firebase';

import { useQuery } from '@tanstack/react-query';
import { getAgent } from '../utils/query';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [userToken, setUserToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        const idToken = await user.getIdToken();

        setUserToken(idToken);

        user.onIdTokenChanged?.(async (refreshedUser) => {
          if (refreshedUser) {
            const refreshedToken = await refreshedUser.getIdToken(true);
            setUserToken(refreshedToken);
          }
        });

        setIsAuthenticated(true);
      } else {
        setUserToken(null);
        setIsAuthenticated(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const { data: agent, error } = useQuery({
    queryKey: ['agent', user?.uid],
    queryFn: () => getAgent({ token: userToken, data: { uid: user.uid } }),
    enabled: !!user,
    retry: false,
  });

  return {
    user,
    agent,
    isAuthenticated,
    error,
    userToken,
  };
};

export default useAuth;
