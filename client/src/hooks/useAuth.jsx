// keep the same style for backwards compatibility
import { useSelector } from 'react-redux';

export const useAuth = () => {
  const auth = useSelector((state) => state.user?.user);

  return {
    user: auth?.user ?? null,
    userToken: auth?.accessToken ?? null,
    isAuthenticated: !!auth?.isAuthenticated,
  };
};

export default useAuth;
