import {
  Alert,
  Autocomplete,
  Avatar,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import dayjs from 'dayjs';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';

import {
  dismissUnmatchedReview,
  getAgents,
  getUnmatchedReviews,
  matchReview,
} from '../utils/query';
import { stringToColor } from '../utils/helpers';
import {
  SNACKBAR_ERROR_OPTIONS,
  SNACKBAR_SUCCESS_OPTIONS,
} from '../utils/constants';

const ReviewTriage = () => {
  const [selectedAgents, setSelectedAgents] = useState({});
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['unmatched-reviews'],
    queryFn: getUnmatchedReviews,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
  });

  const reviews = data?.reviews || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['unmatched-reviews'] });
  };

  const { mutate: match, isPending: isMatching } = useMutation({
    mutationFn: matchReview,
    onSuccess: (_, { reviewId }) => {
      enqueueSnackbar('Review matched to agent', SNACKBAR_SUCCESS_OPTIONS);
      setSelectedAgents((prev) => {
        const next = { ...prev };
        delete next[reviewId];
        return next;
      });
      invalidate();
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message || 'Failed to match review';
      enqueueSnackbar(message, SNACKBAR_ERROR_OPTIONS);
    },
  });

  const { mutate: dismiss, isPending: isDismissing } = useMutation({
    mutationFn: dismissUnmatchedReview,
    onSuccess: () => {
      enqueueSnackbar('Review dismissed', SNACKBAR_SUCCESS_OPTIONS);
      invalidate();
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message || 'Failed to dismiss review';
      enqueueSnackbar(message, SNACKBAR_ERROR_OPTIONS);
    },
  });

  if (isLoading) {
    return (
      <Stack alignItems='center' justifyContent='center' sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (isError) {
    return (
      <Stack alignItems='center' justifyContent='center' sx={{ py: 4 }}>
        <Alert severity='error'>
          Failed to load unmatched reviews. Please refresh or try again
          later.
        </Alert>
      </Stack>
    );
  }

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Stack
        direction='row'
        justifyContent='space-between'
        alignItems='center'
        mb={3}
      >
        <Typography variant='h4'>Review Triage</Typography>
        <Typography variant='body2' color='text.secondary'>
          {reviews.length} unmatched review{reviews.length !== 1 ? 's' : ''}
        </Typography>
      </Stack>

      {reviews.length === 0 ? (
        <Alert severity='success'>No unmatched reviews to triage.</Alert>
      ) : (
        <Stack spacing={2}>
          {reviews.map((review) => {
            const selectedAgent = selectedAgents[review.docId] || null;

            return (
              <Card key={review.docId} variant='outlined'>
                <CardContent>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    justifyContent='space-between'
                    mb={1.5}
                  >
                    <Stack direction='row' spacing={1.5} alignItems='center'>
                      <Avatar
                        src={review.reviewerPhotoUrl}
                        sx={{ bgcolor: stringToColor(review.reviewerName || '') }}
                      >
                        {review.reviewerName?.[0]?.toUpperCase()}
                      </Avatar>
                      <Stack>
                        <Typography variant='subtitle1' fontWeight={600}>
                          {review.reviewerName}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {review.date
                            ? dayjs(review.date).format('MMM D, YYYY')
                            : 'Unknown date'}
                        </Typography>
                      </Stack>
                    </Stack>
                    <Rating value={review.rating || 0} readOnly size='small' />
                  </Stack>

                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 2, whiteSpace: 'pre-wrap' }}
                  >
                    {review.text}
                  </Typography>

                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                  >
                    <Autocomplete
                      size='small'
                      sx={{ minWidth: 280, flex: 1 }}
                      options={agents}
                      value={selectedAgent}
                      getOptionLabel={(agent) =>
                        agent
                          ? `${agent.first_name} ${agent.last_name} (${agent.email})`
                          : ''
                      }
                      isOptionEqualToValue={(option, value) =>
                        option.id === value.id
                      }
                      onChange={(_, value) =>
                        setSelectedAgents((prev) => ({
                          ...prev,
                          [review.docId]: value,
                        }))
                      }
                      renderInput={(params) => (
                        <TextField {...params} label='Assign to agent' />
                      )}
                    />
                    <Button
                      variant='contained'
                      startIcon={<CheckCircleOutlinedIcon />}
                      disabled={!selectedAgent || isMatching}
                      onClick={() =>
                        match({
                          reviewId: review.docId,
                          agentEmail: selectedAgent.email,
                        })
                      }
                    >
                      Match
                    </Button>
                    <Button
                      color='error'
                      startIcon={<DeleteOutlinedIcon />}
                      disabled={isDismissing}
                      onClick={() => dismiss({ reviewId: review.docId })}
                    >
                      Dismiss
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Container>
  );
};

export default ReviewTriage;
