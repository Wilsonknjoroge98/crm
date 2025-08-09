import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../utils/firebase';

import { useQuery } from '@tanstack/react-query';
import { getAgent } from '../utils/query';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);

      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const { data: agent, error } = useQuery({
    queryKey: ['agent', user?.uid],
    queryFn: () => getAgent(user.uid),
    enabled: !!user,
    retry: false,
  });

  return {
    user,
    agent,
    isAuthenticated,
    error,
  };
};

export default useAuth;
