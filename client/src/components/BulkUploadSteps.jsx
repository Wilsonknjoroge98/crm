import {
  Alert,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';

export const UploadCsvStep = ({
  isUploading,
  onUpload,
  onDropUpload,
  onDownloadTemplate,
  isTemplateLoading,
}) => (
  <Paper variant='outlined' sx={{ p: 3, borderRadius: 1 }}>
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent='space-between'
        alignItems={{ sm: 'center' }}
        spacing={2}
      >
        <Box>
          <Typography variant='h5'>Upload File</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
            Download and complete the template in Excel or Google Sheets then upload the finished file.
          </Typography>
        </Box>
        <Button
          variant='contained'
          color='action'
          disabled={isTemplateLoading}
          onClick={onDownloadTemplate}
        >
          {isTemplateLoading ? 'Loading Template...' : 'Download Template'}
        </Button>
      </Stack>

      <Paper
        component='label'
        variant='outlined'
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (isUploading) return;
          const file = event.dataTransfer.files?.[0];
          if (file) onDropUpload(file);
        }}
        sx={{
          minHeight: 340,
          borderRadius: 1,
          borderStyle: 'dashed',
          borderColor: 'rgba(26, 26, 26, 0.35)',
          bgcolor: '#F3F3F3',
          cursor: isUploading ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          px: 4,
          py: 5,
          transition: 'background-color 160ms ease, border-color 160ms ease',
          '&:hover': {
            bgcolor: isUploading ? '#F3F3F3' : '#EEEEEE',
            borderColor: 'rgba(26, 26, 26, 0.55)',
          },
        }}
      >
        <input
          type='file'
          accept='.xlsx'
          hidden
          disabled={isUploading}
          onChange={onUpload}
        />
        <Stack spacing={2.5} alignItems='center' maxWidth={560}>
          <Box
            sx={{
              width: 78,
              height: 78,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: '#FFFFFF',
              color: 'text.primary',
              border: '1px solid rgba(26, 26, 26, 0.12)',
              boxShadow: '0px 8px 20px rgba(0,0,0,0.06)',
            }}
          >
            <DescriptionOutlinedIcon sx={{ fontSize: 40 }} />
          </Box>

          <Typography variant='body2' color='text.secondary'>
            Drag and drop your completed file
            <br />
            or click anywhere in this box to choose a file.
          </Typography>

          <Button
            variant='outlined'
            startIcon={<UploadFileOutlinedIcon />}
            component='span'
            disabled={isUploading}
            sx={{
              mt: 0.5,
              color: '#1A1A1A',
              borderColor: '#1A1A1A',
              '&:hover': {
                borderColor: '#1A1A1A',
                bgcolor: '#F7F7F7',
              },
            }}
          >
            Choose File
          </Button>
        </Stack>
      </Paper>
    </Stack>
  </Paper>
);

const rowHasIssue = (uploadSummary, rowNumber) =>
  (uploadSummary?.errors || []).some((error) => error.row === rowNumber);

const beneficiaryPreview = (row) => {
  const primaryNames = Object.keys(row)
    .map((field) => field.match(/^Primary Beneficiary (\d+) Name$/))
    .filter(Boolean)
    .map((match) => ({
      index: Number(match[1]),
      name: String(row[`Primary Beneficiary ${match[1]} Name`] || '').trim(),
    }))
    .filter(({ name }) => name)
    .sort((a, b) => a.index - b.index)
    .map(({ name }) => name);

  return primaryNames.length ? primaryNames.join(', ') : '-';
};

const ReviewRowsTable = ({ rows, uploadSummary }) => {
  const previewRows = rows.slice(0, 5);
  const hiddenRowCount = Math.max(rows.length - previewRows.length, 0);
  const isImported = uploadSummary && !uploadSummary.error && uploadSummary.stage === 'import';
  const skippedRows = new Set(uploadSummary?.skippedRowNumbers || []);

  return (
    <TableContainer component={Paper} variant='outlined'>
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell>Row</TableCell>
            <TableCell>Policy #</TableCell>
            <TableCell>Client</TableCell>
            <TableCell>Carrier</TableCell>
            <TableCell>Premium</TableCell>
            <TableCell>Beneficiaries</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {previewRows.map((row, index) => {
            const rowNumber = index + 2;
            const hasIssue = rowHasIssue(uploadSummary, rowNumber);
            const wasSkipped = skippedRows.has(rowNumber);
            const status = wasSkipped
              ? 'Skipped'
              : isImported
                ? 'Imported'
                : hasIssue
                  ? 'Review'
                  : 'Ready';
            return (
              <TableRow key={`${rowNumber}-${row['Policy Number']}`} hover>
                <TableCell>{rowNumber}</TableCell>
                <TableCell>{row['Policy Number'] || '-'}</TableCell>
                <TableCell>{row['Full Name'] || '-'}</TableCell>
                <TableCell>{row.Carrier || 'MIGRATION//INVALID REFERENCE'}</TableCell>
                <TableCell>{row['Premium Amount'] || '-'}</TableCell>
                <TableCell>{beneficiaryPreview(row)}</TableCell>
                <TableCell>
                  <Stack direction='row' spacing={0.75} alignItems='center'>
                    {wasSkipped || hasIssue ? (
                      <WarningAmberOutlinedIcon
                        color='warning'
                        sx={{ fontSize: '1rem' }}
                      />
                    ) : isImported ? (
                      <CheckCircleOutlineIcon
                        color='success'
                        sx={{ fontSize: '1rem' }}
                      />
                    ) : (
                      <CheckCircleOutlineIcon
                        sx={{ fontSize: '1rem', color: 'text.secondary' }}
                      />
                    )}
                    <Typography variant='body2'>{status}</Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
          {previewRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7}>
                <Typography variant='body2' color='text.secondary'>
                  Upload a file to preview rows.
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {hiddenRowCount > 0 && (
            <TableRow>
              <TableCell colSpan={7}>
                <Typography variant='caption' color='text.secondary'>
                  +{hiddenRowCount} more rows not shown
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const SummaryList = ({ items, kind }) => {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <List dense sx={{ mt: 1, py: 0 }}>
      {items.slice(0, 8).map((item, idx) => (
        <ListItem key={`${item.row}-${kind}-${idx}`} sx={{ py: 0 }}>
          <ListItemText
            primaryTypographyProps={{ variant: 'caption' }}
            primary={`Row ${item.row}: ${item.message}`}
          />
        </ListItem>
      ))}
      {items.length > 8 && (
        <ListItem sx={{ py: 0 }}>
          <ListItemText
            primaryTypographyProps={{ variant: 'caption' }}
            primary={`+${items.length - 8} more ${kind}`}
          />
        </ListItem>
      )}
    </List>
  );
};

const UploadSummaryAlert = ({ uploadSummary }) => {
  if (!uploadSummary) return null;

  const hasImportSummary = !!uploadSummary.summary;
  const hasWarnings = (uploadSummary.warnings || []).length > 0;
  const skippedRows =
    uploadSummary.skippedRowNumbers ||
    [
      ...new Set(
        (uploadSummary.errors || [])
          .map((error) => error.row)
          .filter((row) => Number.isInteger(row)),
      ),
    ];
  const hasSkippableRows =
    uploadSummary.stage !== 'import' &&
    skippedRows.length > 0 &&
    !(uploadSummary.errors || []).some((error) => error.row === '-');

  return (
    <Alert
      severity={hasSkippableRows ? 'warning' : uploadSummary.error ? 'error' : 'success'}
      icon={
        !uploadSummary.error && !hasImportSummary ? (
          <CheckCircleOutlineIcon sx={{ color: 'text.secondary' }} />
        ) : undefined
      }
      sx={{ alignItems: 'flex-start' }}
    >
      <Typography variant='body2' sx={{ mb: 0.5 }}>
        {uploadSummary.error && (uploadSummary.message || 'Upload failed')}
        {!hasImportSummary &&
          hasSkippableRows &&
          ` Rows ${skippedRows.join(', ')} will be skipped.`}
        {!uploadSummary.error &&
          hasImportSummary &&
          `${uploadSummary.summary?.policiesCreated ?? uploadSummary.inserted} policies imported.`}
        {!uploadSummary.error &&
          !hasImportSummary &&
          (hasWarnings
            ? `${uploadSummary.total} policies ready to import with warnings.`
            : `${uploadSummary.total} policies ready to import. No issues found.`)}
      </Typography>
      {!uploadSummary.error &&
        uploadSummary.stage === 'database_conflict_validation' && (
        <Typography variant='caption' color='text.secondary'>
          Review the preview, then click Import Book to create records.
        </Typography>
      )}
      <SummaryList items={uploadSummary.warnings} kind='warnings' />
      <SummaryList items={uploadSummary.errors} kind='errors' />
    </Alert>
  );
};

export const ReviewImportStep = ({
  uploadSummary,
  isReadyToImport,
  isImporting,
  previewRows,
  onBack,
  onImport,
}) => (
  <Paper variant='outlined' sx={{ p: 3, borderRadius: 1 }}>
    <Stack spacing={2.5}>
      <Box>
        <Typography variant='h5'>Review and Import</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
          Review the policies detected in your file before importing them into your
          book of business. If a client already exists in your account, we will default to existing client data.
        </Typography>
      </Box>

      <ReviewRowsTable rows={previewRows} uploadSummary={uploadSummary} />

      <Stack direction='row' justifyContent='space-between' sx={{ mt: 1 }}>
        <Button variant='outlined' onClick={onBack}>
          {uploadSummary && !uploadSummary.error && uploadSummary.stage === 'import'
            ? 'Import More'
            : 'Back'}
        </Button>
        <Button
          variant='contained'
          color='action'
          startIcon={<CheckCircleOutlineIcon />}
          disabled={!isReadyToImport || isImporting}
          onClick={onImport}
        >
          {isImporting ? 'Importing...' : 'Import Book'}
        </Button>
      </Stack>

      <UploadSummaryAlert uploadSummary={uploadSummary} />
    </Stack>
  </Paper>
);
