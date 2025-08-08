import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../utils/firebase';

import { useQuery } from '@tanstack/react-query';
import { getAgent } from '../utils/query';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  const {
    data: agent,
    isLoading: agentLoading,
    error,
  } = useQuery({
    queryKey: ['agent', user?.uid],
    queryFn: () => getAgent(user.uid),
    enabled: !!user,
    retry: false,
  });

  const loading = !authChecked || (user && agentLoading);

  return {
    user,
    agent,
    loading,
    error,
  };
};

export default useAuth;
