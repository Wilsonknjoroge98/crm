import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';

import { patchAccount } from '../utils/query';
import { stringToColor } from '../utils/helpers';
import {
  SNACKBAR_ERROR_OPTIONS,
  SNACKBAR_SUCCESS_OPTIONS,
} from '../utils/constants';

const SPECIALTIES = [
  'Final Expense',
  'Annuities',
  'Mortgage Protection',
  'Term Life',
  'Indexed Universal Life',
];
const CROP_SIZE = 260;
const MAX_ZOOM = 3;

export default function AgentCardSettings({ accountData, agentData }) {
  const [bioOpen, setBioOpen] = React.useState(false);
  const [tagsOpen, setTagsOpen] = React.useState(false);
  const [imageOpen, setImageOpen] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewLoaded, setPreviewLoaded] = React.useState(false);
  const [previewVersion, setPreviewVersion] = React.useState(0);
  const [previewSlug, setPreviewSlug] = React.useState('');
  const [previewPending, setPreviewPending] = React.useState(false);
  const [imageSrc, setImageSrc] = React.useState('');
  const [imageScale, setImageScale] = React.useState(1);
  const [imageOffset, setImageOffset] = React.useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = React.useState({ width: 0, height: 0 });
  const [dragStart, setDragStart] = React.useState(null);
  const [bioDraft, setBioDraft] = React.useState('');
  const [specialtyDraft, setSpecialtyDraft] = React.useState([]);
  const cropImageRef = React.useRef(null);
  const cropPreviewRef = React.useRef(null);
  const queryClient = useQueryClient();

  const { mutate: saveProfile, isPending } = useMutation({
    mutationFn: patchAccount,
    onSuccess: () => {
      enqueueSnackbar('Profile updated!', SNACKBAR_SUCCESS_OPTIONS);
      queryClient.invalidateQueries({ queryKey: ['account'] });
      setBioOpen(false);
      setTagsOpen(false);
      setImageOpen(false);
      setImageSrc('');
      setPreviewLoaded(false);
      setPreviewVersion((version) => version + 1);
    },
    onError: (error) => {
      const message = error?.userMessage || 'Failed to update profile.';
      enqueueSnackbar(message, SNACKBAR_ERROR_OPTIONS);
    },
  });

  const getInitials = (name) => {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  const openBioEditor = () => {
    setBioDraft(accountData?.bio || '');
    setBioOpen(true);
  };

  const openTagsEditor = () => {
    setSpecialtyDraft(accountData?.specialties || []);
    setTagsOpen(true);
  };

  const toggleSpecialty = (specialty) => {
    setSpecialtyDraft((current) =>
      current.includes(specialty)
        ? current.filter((item) => item !== specialty)
        : [...current, specialty],
    );
  };

  const selectImage = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      enqueueSnackbar('Choose a JPG, PNG, or WebP image.', SNACKBAR_ERROR_OPTIONS);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
      setImageScale(1);
      setImageOffset({ x: 0, y: 0 });
      setImageSize({ width: 0, height: 0 });
    };
    reader.readAsDataURL(file);
  };

  const closeImageEditor = () => {
    setImageOpen(false);
    setImageSrc('');
    setImageScale(1);
    setImageOffset({ x: 0, y: 0 });
    setImageSize({ width: 0, height: 0 });
    setDragStart(null);
  };

  const clampImageOffset = (offset, scale = imageScale) => {
    const overflowX = Math.max(0, (imageSize.width * scale - CROP_SIZE) / 2);
    const overflowY = Math.max(0, (imageSize.height * scale - CROP_SIZE) / 2);
    return {
      x: Math.min(overflowX, Math.max(-overflowX, offset.x)),
      y: Math.min(overflowY, Math.max(-overflowY, offset.y)),
    };
  };

  const previewImageScale = (value) => {
    const nextOffset = clampImageOffset(imageOffset, value);
    if (cropPreviewRef.current) {
      cropPreviewRef.current.style.transform =
        `translate(${nextOffset.x}px, ${nextOffset.y}px) scale(${value})`;
    }
  };

  const uploadImage = () => {
    const imageEl = cropImageRef.current;
    if (!imageEl) return;
    const outputSize = 400;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const context = canvas.getContext('2d');
    const baseScale = Math.max(
      CROP_SIZE / imageEl.naturalWidth,
      CROP_SIZE / imageEl.naturalHeight,
    );
    const outputScale = outputSize / CROP_SIZE;
    const drawWidth = imageEl.naturalWidth * baseScale * imageScale * outputScale;
    const drawHeight =
      imageEl.naturalHeight * baseScale * imageScale * outputScale;
    context.drawImage(
      imageEl,
      (outputSize - drawWidth) / 2 + imageOffset.x * outputScale,
      (outputSize - drawHeight) / 2 + imageOffset.y * outputScale,
      drawWidth,
      drawHeight,
    );
    saveProfile({
      data: {
        email: agentData?.email,
        image: {
          data: canvas.toDataURL('image/jpeg', 0.9),
          contentType: 'image/jpeg',
        },
      },
    });
  };

  const openPreview = async () => {
    if (previewPending) return;

    if (accountData?.slug) {
      setPreviewSlug(accountData.slug);
      setPreviewOpen(true);
      return;
    }

    setPreviewPending(true);
    try {
      const updatedAccount = await patchAccount({
        data: { email: agentData?.email },
      });
      setPreviewSlug(updatedAccount.slug);
      queryClient.invalidateQueries({ queryKey: ['account'] });
      setPreviewLoaded(false);
      setPreviewVersion((version) => version + 1);
      setPreviewOpen(true);
    } catch (error) {
      const message =
        error?.userMessage || 'Failed to prepare agent card preview.';
      enqueueSnackbar(message, SNACKBAR_ERROR_OPTIONS);
    } finally {
      setPreviewPending(false);
    }
  };

  const previewBaseUrl = previewSlug || accountData?.slug
    ? `${import.meta.env.DEV ? 'http://localhost:5173' : 'https://getseniorquotes.com'}/agents/${previewSlug || accountData?.slug}`
    : '';
  const previewUrl = previewBaseUrl
    ? `${previewBaseUrl}?preview=${previewVersion}`
    : '';

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <Paper
        variant='outlined'
        sx={{
          width: '100%',
          p: { xs: 2, md: 3 },
          borderRadius: 1,
          bgcolor: 'background.paper',
          ...(previewOpen
            ? {}
            : {
                position: 'absolute',
                inset: 0,
                visibility: 'hidden',
                pointerEvents: 'none',
              }),
        }}
      >
        <Stack spacing={2}>
          <Button
            size='small'
            startIcon={<ArrowBackIcon />}
            onClick={() => setPreviewOpen(false)}
            sx={{ alignSelf: 'flex-start' }}
          >
            Back
          </Button>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: { xs: '70vh', md: '78vh' },
            }}
          >
            {!previewLoaded && (
              <Stack
                alignItems='center'
                justifyContent='center'
                spacing={1}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  bgcolor: 'background.paper',
                  zIndex: 1,
                }}
              >
                <CircularProgress size={28} />
                <Typography variant='body2' color='text.secondary'>
                  Loading preview...
                </Typography>
              </Stack>
            )}
            {previewUrl && (
              <Box
                component='iframe'
                src={previewUrl}
                title='Agent card preview'
                onLoad={() => setPreviewLoaded(true)}
                sx={{
                  display: previewLoaded || !previewOpen ? 'block' : 'none',
                  width: '100%',
                  height: '100%',
                  border: 0,
                }}
              />
            )}
          </Box>
        </Stack>
      </Paper>

      <Paper
        variant='outlined'
        sx={{
          display: previewOpen ? 'none' : 'block',
          width: '100%',
          p: { xs: 3, md: 4 },
          borderRadius: 1,
          bgcolor: 'background.paper',
        }}
      >
        <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 3, md: 4 }}
          alignItems={{ xs: 'flex-start', sm: 'stretch' }}
        >
          <Stack
            direction='row'
            spacing={3}
            alignItems='center'
            sx={{ flex: { sm: '0 0 42%' } }}
          >
            <Avatar
              src={accountData?.imageUrl || agentData?.avatar}
              sx={{
                width: 148,
                height: 148,
                bgcolor: stringToColor(agentData?.name || ''),
                fontSize: 44,
              }}
            >
              {getInitials(agentData?.name)}
            </Avatar>
            <Stack spacing={1}>
              <Typography variant='h6' fontWeight={600}>
                {agentData?.name}
              </Typography>
              <Button
                variant='outlined'
                size='small'
                startIcon={<FileUploadOutlinedIcon />}
                onClick={() => setImageOpen(true)}
                sx={{ alignSelf: 'flex-start' }}
              >
                Update Photo
              </Button>
            </Stack>
          </Stack>

          <Divider
            orientation='vertical'
            flexItem
            sx={{ display: { xs: 'none', sm: 'block' } }}
          />

          <Box
            sx={{
              flex: 1,
              py: { sm: 2 },
            }}
          >
            <Typography variant='h6' fontWeight={600}>
              Bio
            </Typography>
            {accountData?.bio ? (
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ my: 2, whiteSpace: 'pre-wrap', lineHeight: 1.8 }}
              >
                {accountData.bio}
              </Typography>
            ) : (
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ my: 2, lineHeight: 1.8 }}
              >
                In 1-2 sentences, tell a potential client who you are and why
                you do this work.
              </Typography>
            )}
            <Button
              size='small'
              startIcon={<EditOutlinedIcon fontSize='small' />}
              onClick={openBioEditor}
              sx={{ mt: 0.5, px: 0 }}
            >
              {accountData?.bio ? 'Edit bio' : 'Add bio'}
            </Button>
          </Box>

          <Divider
            flexItem
            sx={{ display: { xs: 'block', sm: 'none' }, width: '100%' }}
          >
            <span />
          </Divider>
        </Stack>

        <Divider />

        <Box>
          <Typography variant='h6' fontWeight={600} mb={0.75}>
            Specialties
          </Typography>
          <Stack
            direction='row'
            gap={0.5}
            flexWrap='wrap'
            sx={{ ml: (accountData?.specialties || []).length ? -0.5 : 0 }}
          >
            {(accountData?.specialties || []).length ? (
              accountData.specialties.map((specialty) => (
                <Chip key={specialty} label={specialty} />
              ))
            ) : (
              <Typography variant='body2'>No specialties yet.</Typography>
            )}
          </Stack>
          <Button
            size='small'
            startIcon={<EditOutlinedIcon fontSize='small' />}
            onClick={openTagsEditor}
            sx={{ mt: 0.5, px: 0 }}
          >
            {(accountData?.specialties || []).length
              ? 'Edit specialties'
              : 'Add specialties'}
          </Button>
        </Box>

        <Divider />

        <Button
          variant='contained'
          startIcon={<VisibilityOutlinedIcon />}
          onClick={openPreview}
          disabled={previewPending}
          sx={{ alignSelf: 'flex-start' }}
        >
          {previewPending ? 'Preparing preview...' : 'Preview Agent Card'}
        </Button>
        </Stack>
      </Paper>

      <Dialog open={bioOpen} onClose={() => setBioOpen(false)} fullWidth>
        <DialogTitle>Edit Bio</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={4}
            placeholder="Example: I've spent 12 years helping families find coverage that actually fits their budget. I treat every client like I'd want someone to treat my own parents."
            value={bioDraft}
            onChange={(event) => setBioDraft(event.target.value.slice(0, 200))}
            helperText={`${bioDraft.length}/200`}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBioOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            disabled={isPending}
            onClick={() =>
              saveProfile({ data: { email: agentData?.email, bio: bioDraft } })
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={imageOpen} onClose={closeImageEditor} fullWidth>
        <DialogTitle>Update Profile Photo</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1} alignItems='center'>
            {!imageSrc ? (
              <Box
                component='label'
                onDrop={(event) => {
                  event.preventDefault();
                  selectImage(event.dataTransfer.files?.[0]);
                }}
                onDragOver={(event) => event.preventDefault()}
                sx={{
                  width: '100%',
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  py: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                <FileUploadOutlinedIcon color='action' sx={{ my: 1 }} />
                <Typography variant='body2'>
                  Drag and drop a profile photo, or upload one
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  JPG, PNG, or WebP. Will be resized to 1:1 aspect ratio. Max
                  2MB.
                </Typography>
                <input
                  hidden
                  type='file'
                  accept='image/jpeg,image/png,image/webp'
                  onChange={(event) => selectImage(event.target.files?.[0])}
                />
              </Box>
            ) : (
              <>
                <Box
                  onDragStart={(event) => event.preventDefault()}
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDragStart({
                      x: event.clientX,
                      y: event.clientY,
                      offset: imageOffset,
                    });
                  }}
                  onPointerMove={(event) => {
                    if (!dragStart) return;
                    const nextOffset = clampImageOffset({
                      x: dragStart.offset.x + event.clientX - dragStart.x,
                      y: dragStart.offset.y + event.clientY - dragStart.y,
                    });
                    if (cropPreviewRef.current) {
                      cropPreviewRef.current.style.transform =
                        `translate(${nextOffset.x}px, ${nextOffset.y}px) ` +
                        `scale(${imageScale})`;
                    }
                  }}
                  onPointerUp={(event) => {
                    const nextOffset = dragStart
                      ? clampImageOffset({
                          x: dragStart.offset.x + event.clientX - dragStart.x,
                          y: dragStart.offset.y + event.clientY - dragStart.y,
                        })
                      : imageOffset;
                    event.currentTarget.releasePointerCapture(event.pointerId);
                    setImageOffset(nextOffset);
                    setDragStart(null);
                  }}
                  sx={{
                    width: CROP_SIZE,
                    height: CROP_SIZE,
                    overflow: 'hidden',
                    borderRadius: '50%',
                    bgcolor: 'grey.100',
                    cursor: dragStart ? 'grabbing' : 'grab',
                    touchAction: 'none',
                    userSelect: 'none',
                  }}
                >
                  <Box
                    component='img'
                    ref={cropImageRef}
                    src={imageSrc}
                    alt='Profile crop preview'
                    onLoad={(event) => {
                      cropPreviewRef.current = event.currentTarget;
                      const { naturalWidth, naturalHeight } =
                        event.currentTarget;
                      const baseScale = Math.max(
                        CROP_SIZE / naturalWidth,
                        CROP_SIZE / naturalHeight,
                      );
                      setImageSize({
                        width: naturalWidth * baseScale,
                        height: naturalHeight * baseScale,
                      });
                    }}
                    sx={{
                      width: imageSize.width || 'auto',
                      height: imageSize.height || 'auto',
                      maxWidth: 'none',
                      position: 'relative',
                      left: imageSize.width
                        ? (CROP_SIZE - imageSize.width) / 2
                        : 0,
                      top: imageSize.height
                        ? (CROP_SIZE - imageSize.height) / 2
                        : 0,
                      transform: `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${imageScale})`,
                      transformOrigin: 'center',
                      userSelect: 'none',
                      pointerEvents: 'none',
                    }}
                  />
                </Box>
                <Box sx={{ width: CROP_SIZE }}>
                  <Typography variant='caption' color='text.secondary'>
                    Zoom
                  </Typography>
                  <Slider
                    min={1}
                    max={MAX_ZOOM}
                    step={0.05}
                    key={imageSrc}
                    defaultValue={1}
                    onChange={(_, value) => previewImageScale(value)}
                    onChangeCommitted={(_, value) => {
                      const nextOffset = clampImageOffset(imageOffset, value);
                      setImageOffset(nextOffset);
                      setImageScale(value);
                    }}
                  />
                </Box>
                <Button size='small' onClick={() => setImageSrc('')}>
                  Choose different image
                </Button>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeImageEditor}>Cancel</Button>
          <Button
            variant='contained'
            disabled={!imageSrc || isPending}
            onClick={uploadImage}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={tagsOpen} onClose={() => setTagsOpen(false)} fullWidth>
        <DialogTitle>Edit Specialties</DialogTitle>
        <DialogContent>
          <Stack spacing={3.5} mt={1}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {specialtyDraft.length === 0 && (
                <Typography variant='body2' color='text.secondary'>
                  No specialties added
                </Typography>
              )}
              {specialtyDraft.map((specialty) => (
                <Chip
                  key={specialty}
                  label={specialty}
                  onDelete={() => toggleSpecialty(specialty)}
                />
              ))}
            </Box>
            <FormControl size='small' fullWidth>
              <InputLabel>Add Specialty</InputLabel>
              <Select
                label='Add Specialty'
                value=''
                onChange={(event) => toggleSpecialty(event.target.value)}
              >
                {SPECIALTIES.map((specialty) => (
                  <MenuItem
                    key={specialty}
                    value={specialty}
                    disabled={specialtyDraft.includes(specialty)}
                  >
                    {specialty}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTagsOpen(false)}>Cancel</Button>
          <Button
            variant='contained'
            disabled={isPending}
            onClick={() =>
              saveProfile({
                data: { email: agentData?.email, specialties: specialtyDraft },
              })
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
