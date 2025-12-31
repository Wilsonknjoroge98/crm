import { useMutation } from '@tanstack/react-query';
import { postError } from '../utils/query';
import { useEffect } from 'react';
import { useLocation, useRouteError } from 'react-router-dom';

import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

const ErrorBoundary = () => {
  const error = useRouteError();
  const location = useLocation();
  const { mutate } = useMutation({
    mutationFn: postError,
  });

  useEffect(() => {
    if (error) {
      if (error instanceof Error) {
        mutate({
          message: error.message,
          stack: error.stack,
          route: location.pathname,
        });
      }
    }
  }, [error, mutate]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        textAlign: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem 2rem',
        maxHeight: '99vh',
        minHeight: '98vh',
      }}
    >
      <Stack style={{ maxWidth: '600px', width: '100%' }}>
        <Typography variant='h2'>Scheduled Maintenance</Typography>
        <Typography variant='h5' style={{ fontSize: '1.2rem', lineHeight: 1.6 }}>
          {'Will be back up shortly!'}
        </Typography>
      </Stack>
    </div>
  );
};

export default ErrorBoundary;
