import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import { Navigate } from 'react-router-dom';
import { useState } from 'react';
import { useAgent } from '../hooks/useAgent';

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
              multiline
              minRows={4}
            />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label='Headline'
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                fullWidth
              />
              <TextField
                label='Description'
                value={description}
                onChange={(event) => setDescription(event.target.value)}
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
            addFiles(event.dataTransfer.files);
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
                        onChange={(event) =>
                          updateAsset(asset.id, 'initials', event.target.value)
                        }
                      />
                      <TextField
                        label='Ad Name'
                        value={asset.adName}
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
              error={isOverBudget}
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

        <Stack direction='row' justifyContent='flex-end'>
          <Button
            variant='contained'
            color='action'
            startIcon={<CampaignOutlinedIcon />}
            disabled
          >
            Publish ads
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
};

export default AdPublish;
