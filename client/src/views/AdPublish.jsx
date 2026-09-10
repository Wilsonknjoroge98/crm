import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import { useMutation } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { useState } from 'react';
import { useAgent } from '../hooks/useAgent';
import { publishAds } from '../utils/query';

const MAX_TOTAL_DAILY_BUDGET = 500;
const MAX_TOTAL_UPLOAD_BYTES = 30 * 1024 * 1024;

const filenameToAdName = (filename) => {
  const name = filename
    .replace(/\.[^.]*$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return name.replace(
    /\S+/g,
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  );
};

const initialsForAgent = (agent) =>
  [agent?.first_name, agent?.last_name]
    .map((name) => String(name || '').trim().charAt(0).toUpperCase())
    .join('');

const publishDate = () => {
  const [month, day, year] = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .split('/');
  return [day, month, year].join('/');
};

const AdPublish = () => {
  const agent = useAgent();
  const [assets, setAssets] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState('');
  const [primaryText, setPrimaryText] = useState('');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [dailyBudget, setDailyBudget] = useState('10');

  const budget = Number(dailyBudget);
  const total = Number.isFinite(budget) && budget > 0 ? assets.length * budget : 0;
  const isOverBudget = total > MAX_TOTAL_DAILY_BUDGET;
  const isBudgetValid =
    /^\d+(\.\d{1,2})?$/.test(dailyBudget.trim()) && budget > 0;
  const isFormValid =
    assets.length > 0 &&
    isBudgetValid &&
    !isOverBudget &&
    primaryText.trim() &&
    headline.trim() &&
    description.trim() &&
    assets.every(({ adName, initials }) => adName.trim() && initials.trim());
  const hasVideo = assets.some(({ file }) => file.type.startsWith('video/'));

  const {
    mutate: publish,
    isPending,
    data: results,
    error: publishError,
  } = useMutation({ mutationFn: publishAds });

  const handlePublish = () => {
    if (!isFormValid || isPending) return;
    publish({
      assets,
      dailyBudget,
      primaryText,
      headline,
      description,
    });
  };

  const addFiles = (fileList) => {
    const selected = Array.from(fileList || []);
    const supported = selected.filter(
      (file) =>
        file.type.startsWith('image/') || file.type.startsWith('video/'),
    );

    const totalUploadBytes =
      assets.reduce((totalBytes, asset) => totalBytes + asset.file.size, 0) +
      supported.reduce((totalBytes, file) => totalBytes + file.size, 0);
    if (totalUploadBytes > MAX_TOTAL_UPLOAD_BYTES) {
      setFileError('Selected files cannot exceed 30 MB combined.');
      return;
    }

    setFileError(
      supported.length === selected.length
        ? ''
        : 'Only image and video files can be added.',
    );
    setAssets((current) => [
      ...current,
      ...supported.map((file) => ({
        id: crypto.randomUUID(),
        file,
        adName: filenameToAdName(file.name),
        initials: initialsForAgent(agent),
      })),
    ]);
  };

  const updateAsset = (id, field, value) => {
    setAssets((current) =>
      current.map((asset) =>
        asset.id === id ? { ...asset, [field]: value } : asset,
      ),
    );
  };

  if (!agent) {
    return (
      <Stack alignItems='center' justifyContent='center' sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (!['admin', 'owner'].includes(agent.role)) {
    return <Navigate to='/business' replace />;
  }

  return (
    <Container maxWidth='lg' sx={{ mt: 4, mb: 6 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant='h4'>Click + Publish</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
            Create one paused Meta ad set and ad for each creative asset.
          </Typography>
        </Box>

        <Paper variant='outlined' sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant='h6'>Ad copy</Typography>
              <Typography variant='body2' color='text.secondary'>
                These fields will be used for every creative in this batch.
              </Typography>
            </Box>
            <TextField
              label='Primary text'
              value={primaryText}
              onChange={(event) => setPrimaryText(event.target.value)}
              disabled={isPending}
              multiline
              minRows={4}
            />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label='Headline'
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                disabled={isPending}
                fullWidth
              />
              <TextField
                label='Description'
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={isPending}
                fullWidth
              />
            </Stack>
          </Stack>
        </Paper>

        <Paper
          component='label'
          variant='outlined'
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            if (!isPending) addFiles(event.dataTransfer.files);
          }}
          sx={{
            minHeight: 210,
            borderStyle: 'dashed',
            borderColor: isDragging ? 'action.main' : 'divider',
            bgcolor: isDragging ? 'warning.light' : 'grey.100',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
            p: 4,
          }}
        >
          <input
            type='file'
            accept='image/*,video/*'
            multiple
            hidden
            disabled={isPending}
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = '';
            }}
          />
          <Stack spacing={1.5} alignItems='center'>
            <CloudUploadOutlinedIcon sx={{ fontSize: 42 }} />
            <Typography variant='h6'>Add creative assets</Typography>
            <Typography variant='body2' color='text.secondary'>
              Drag and drop images or videos here, or click to browse.
            </Typography>
            <Button component='span' variant='outlined'>
              Choose files
            </Button>
          </Stack>
        </Paper>

        {fileError && <Alert severity='error'>{fileError}</Alert>}

        {assets.length > 0 && (
          <Paper variant='outlined' sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant='h6'>Creative names</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Review the Meta naming convention for each asset.
                </Typography>
              </Box>
              {assets.map((asset) => (
                <Paper key={asset.id} variant='outlined' sx={{ p: 2 }}>
                  <Stack spacing={2}>
                    <Stack direction='row' alignItems='center' spacing={1}>
                      {asset.file.type.startsWith('image/') ? (
                        <ImageOutlinedIcon />
                      ) : (
                        <MovieOutlinedIcon />
                      )}
                      <Typography variant='subtitle2' noWrap sx={{ flex: 1 }}>
                        {asset.file.name}
                      </Typography>
                      <IconButton
                        size='small'
                        aria-label={'Remove ' + asset.file.name}
                        disabled={isPending}
                        onClick={() =>
                          setAssets((current) =>
                            current.filter((item) => item.id !== asset.id),
                          )
                        }
                      >
                        <CloseOutlinedIcon fontSize='small' />
                      </IconButton>
                    </Stack>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '140px 1fr' },
                        gap: 2,
                      }}
                    >
                      <TextField
                        label='Initials'
                        value={asset.initials}
                        disabled={isPending}
                        onChange={(event) =>
                          updateAsset(asset.id, 'initials', event.target.value)
                        }
                      />
                      <TextField
                        label='Ad Name'
                        value={asset.adName}
                        disabled={isPending}
                        onChange={(event) =>
                          updateAsset(asset.id, 'adName', event.target.value)
                        }
                      />
                    </Box>
                    <Typography variant='body2' color='text.secondary'>
                      Meta name:{' '}
                      <Box component='span' sx={{ color: 'text.primary' }}>
                        {asset.initials.trim().toUpperCase()} |{' '}
                        {asset.adName.trim()} | {publishDate()}
                      </Box>
                    </Typography>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Paper>
        )}

        <Paper variant='outlined' sx={{ p: { xs: 2, md: 3 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent='space-between'
            alignItems={{ sm: 'center' }}
            spacing={2}
          >
            <TextField
              label='Daily budget per asset'
              type='number'
              value={dailyBudget}
              onChange={(event) => setDailyBudget(event.target.value)}
              disabled={isPending}
              error={isOverBudget || (dailyBudget !== '' && !isBudgetValid)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>$</InputAdornment>
                  ),
                },
                htmlInput: { min: 0.01, step: 0.01 },
              }}
              sx={{ width: { xs: '100%', sm: 240 } }}
            />
            <Box sx={{ textAlign: { sm: 'right' } }}>
              <Typography variant='body2' color='text.secondary'>
                {assets.length} {assets.length === 1 ? 'asset' : 'assets'} × $
                {budget > 0 ? budget.toFixed(2) : '0.00'}
              </Typography>
              <Typography
                variant='h6'
                color={isOverBudget ? 'error.main' : 'text.primary'}
              >
                {'Total daily spend: $' + total.toFixed(2)}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                Maximum allowed: $500.00
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {isOverBudget && (
          <Alert severity='error'>
            Lower the daily budget or remove assets to stay within the $500 cap.
          </Alert>
        )}

        {publishError && (
          <Alert severity='error'>
            {publishError.response?.data?.error ||
              publishError.message ||
              'The publishing request failed.'}
          </Alert>
        )}

        {isPending && (
          <Paper variant='outlined' sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Typography variant='subtitle1'>Publishing ads</Typography>
              <LinearProgress />
              <Typography variant='body2' color='text.secondary'>
                {hasVideo
                  ? 'Uploading assets and waiting for Meta to process video.'
                  : 'Uploading assets and creating paused Meta ads.'}
              </Typography>
            </Stack>
          </Paper>
        )}

        {Array.isArray(results) && (
          <Paper variant='outlined' sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant='h6'>Publishing results</Typography>
            <List disablePadding sx={{ mt: 1 }}>
              {results.map((result, index) => (
                <Box key={`${result.filename}-${index}`}>
                  {index > 0 && <Divider component='li' />}
                  <ListItem disableGutters alignItems='flex-start'>
                    <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                      {result.success ? (
                        <CheckCircleOutlineIcon color='success' />
                      ) : (
                        <ErrorOutlineIcon color='error' />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={result.filename}
                      secondary={
                        result.success
                          ? [
                              result.imageHash &&
                                `Image hash: ${result.imageHash}`,
                              result.videoId && `Video ID: ${result.videoId}`,
                              `Ad set ID: ${result.adSetId}`,
                              `Creative ID: ${result.creativeId}`,
                              `Ad ID: ${result.adId}`,
                            ]
                              .filter(Boolean)
                              .join(' · ')
                          : result.error
                      }
                      slotProps={{
                        secondary: {
                          color: result.success ? 'text.secondary' : 'error',
                        },
                      }}
                    />
                  </ListItem>
                </Box>
              ))}
            </List>
          </Paper>
        )}

        <Stack direction='row' justifyContent='flex-end'>
          <Button
            variant='contained'
            color='action'
            startIcon={<CampaignOutlinedIcon />}
            disabled={!isFormValid || isPending}
            onClick={handlePublish}
          >
            {isPending ? 'Publishing...' : 'Publish ads'}
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
};

export default AdPublish;
