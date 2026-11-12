// Shared by Axios and React Query so wrapped errors cannot restart requests
// while a rejected session is being cleared. Dependencies are injected for tests.
export const createAuthRecovery = ({ signOut, redirect }) => {
  let invalidSession = false;
  let recovery;

  const beforeRequest = (config) => {
    if (invalidSession) {
      const error = new Error('Session expired. Please sign in again.');
      error.status = 401;
      throw error;
    }
    return config;
  };

  const onResponseError = async (error) => {
    if (error?.response?.status === 401) {
      invalidSession = true;
      if (!recovery) {
        // A revoked session must be cleared locally, not globally sign out
        // the agent's other devices. Always leave this page, even on failure.
        recovery = Promise.resolve()
          .then(() => signOut({ scope: 'local' }))
          .catch(() => {})
          .finally(() => redirect('/login'));
      }
      await recovery;
    }
    throw error;
  };

  const shouldRetryQuery = (failureCount, error) =>
    !invalidSession &&
    (error?.response?.status ?? error?.status) !== 401 &&
    failureCount < 3;

  return { beforeRequest, onResponseError, shouldRetryQuery };
};
