import { useState, useEffect } from 'react';
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
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';

export const UploadCsvStep = ({
  isUploading,
  onUpload,
  onDropUpload,
  onDownloadTemplate,
  isTemplateLoading,
}) => (
  <Stack spacing={3}>
    <Stack direction='column' alignItems='flex-start' spacing={2}>
      <Typography variant='body2' color='text.secondary'>
        We have a specific spreadsheet format your file needs to follow.
        Download it, fill it in with your clients, then come back to upload it
        here.
      </Typography>
      <Button
        variant='contained'
        color='action'
        disabled={isTemplateLoading}
        onClick={onDownloadTemplate}
        startIcon={isTemplateLoading ? null : <SystemUpdateAltIcon />}
        sx={{ flexShrink: 0 }}
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
        minHeight: 220,
        borderRadius: 1,
        borderStyle: 'dashed',
        borderColor: 'divider',
        bgcolor: 'grey.100',
        cursor: isUploading ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 4,
        py: 5,
        transition: 'background-color 160ms ease, border-color 160ms ease',
        '&:hover': {
          bgcolor: isUploading ? 'grey.100' : 'grey.200',
          borderColor: 'text.secondary',
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
      <Stack spacing={2} alignItems='center' maxWidth={560}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'background.paper',
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <DescriptionOutlinedIcon sx={{ fontSize: 28 }} />
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
        >
          Upload File
        </Button>
      </Stack>
    </Paper>
  </Stack>
);

const rowHasIssue = (uploadSummary, rowNumber) =>
  (uploadSummary?.errors || []).some((error) => error.row === rowNumber);

const ROWS_PER_PAGE = 10;

const rowHasPolicyData = (row) =>
  !!(
    row['Policy Number'] ||
    row['Premium Amount'] ||
    row['Coverage Amount'] ||
    row['Carrier'] ||
    row['Effective Date']
  );

const ReviewRowsTable = ({ rows, uploadSummary }) => {
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [rows]);

  const isImported =
    uploadSummary && !uploadSummary.error && uploadSummary.stage === 'import';
  const skippedRows = new Set(uploadSummary?.skippedRowNumbers || []);
  const pageRows = rows.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

  return (
    <TableContainer component={Paper} variant='outlined'>
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell>Row</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Policy #</TableCell>
            <TableCell>Carrier</TableCell>
            <TableCell>Client</TableCell>
            <TableCell>Policy</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pageRows.map((row, index) => {
            const rowNumber = page * ROWS_PER_PAGE + index + 2;
            const hasIssue = rowHasIssue(uploadSummary, rowNumber);
            const wasSkipped = skippedRows.has(rowNumber);
            const hasPolicyData = rowHasPolicyData(row);
            const clientLabel = wasSkipped
              ? 'Skipped'
              : hasIssue
                ? 'Has issues'
                : isImported
                  ? 'Added'
                  : 'Ready to add';
            const policyLabel = !hasPolicyData
              ? 'No policy'
              : wasSkipped
                ? 'Skipped'
                : hasIssue
                  ? 'Has issues'
                  : isImported
                    ? 'Added'
                    : 'Ready to add';
            return (
              <TableRow key={`${rowNumber}-${row['Policy Number']}`} hover>
                <TableCell>{rowNumber}</TableCell>
                <TableCell>{row['Full Name'] || '-'}</TableCell>
                <TableCell>{row['Policy Number'] || '-'}</TableCell>
                <TableCell>{row['Carrier'] || '-'}</TableCell>
                <TableCell>
                  <Stack direction='row' spacing={0.75} alignItems='center'>
                    {wasSkipped ? (
                      <Typography variant='body2' color='text.disabled'>
                        —
                      </Typography>
                    ) : hasIssue ? (
                      <WarningAmberOutlinedIcon
                        color='warning'
                        sx={{ fontSize: '1rem' }}
                      />
                    ) : (
                      <CheckCircleOutlineIcon
                        color='success'
                        sx={{ fontSize: '1rem' }}
                      />
                    )}
                    {!wasSkipped && (
                      <Typography
                        variant='body2'
                        color={
                          hasIssue
                            ? 'warning.main'
                            : isImported
                              ? 'success.main'
                              : 'text.primary'
                        }
                      >
                        {clientLabel}
                      </Typography>
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction='row' spacing={0.75} alignItems='center'>
                    {!hasPolicyData || wasSkipped ? (
                      <Typography variant='body2' color='text.disabled'>
                        —
                      </Typography>
                    ) : hasIssue ? (
                      <WarningAmberOutlinedIcon
                        color='warning'
                        sx={{ fontSize: '1rem' }}
                      />
                    ) : (
                      <CheckCircleOutlineIcon
                        color='success'
                        sx={{ fontSize: '1rem' }}
                      />
                    )}
                    {hasPolicyData && !wasSkipped && (
                      <Typography
                        variant='body2'
                        color={
                          hasIssue
                            ? 'warning.main'
                            : isImported
                              ? 'success.main'
                              : 'text.primary'
                        }
                      >
                        {policyLabel}
                      </Typography>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6}>
                <Typography variant='body2' color='text.secondary'>
                  Upload a file to preview rows.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {rows.length > ROWS_PER_PAGE && (
        <TablePagination
          component='div'
          count={rows.length}
          rowsPerPage={ROWS_PER_PAGE}
          rowsPerPageOptions={[]}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
        />
      )}
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

const formatImportSummary = (uploadSummary) => {
  const clientsCreated = uploadSummary.summary?.clientsCreated ?? 0;
  const policiesCreated =
    uploadSummary.summary?.policiesCreated ?? uploadSummary.inserted ?? 0;
  const parts = [];

  if (clientsCreated > 0) {
    parts.push(`${clientsCreated} client${clientsCreated === 1 ? '' : 's'}`);
  }
  if (policiesCreated > 0) {
    parts.push(
      `${policiesCreated} polic${policiesCreated === 1 ? 'y' : 'ies'}`,
    );
  }
  if (!parts.length) return 'Import completed.';

  return `${parts.join(' and ')} imported.`;
};

const UploadSummaryAlert = ({ uploadSummary }) => {
  if (!uploadSummary) return null;

  const hasImportSummary = !!uploadSummary.summary;
  const hasWarnings = (uploadSummary.warnings || []).length > 0;
  const skippedRows = uploadSummary.skippedRowNumbers || [
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
      severity={
        hasSkippableRows ? 'warning' : uploadSummary.error ? 'error' : 'success'
      }
      icon={
        !uploadSummary.error && !hasImportSummary ? (
          <CheckCircleOutlineIcon sx={{ color: 'success.main' }} />
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
          formatImportSummary(uploadSummary)}
        {!uploadSummary.error &&
          !hasImportSummary &&
          (hasWarnings
            ? `${uploadSummary.total} records ready to import with warnings.`
            : `${uploadSummary.total} records ready to import. No issues found.`)}
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
  <Paper sx={{ borderRadius: 1 }}>
    <Stack spacing={2.5}>
      <Box>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
          If any rows show "Has issues," those rows will be skipped and
          everything else will still be imported successfully. You can fix the
          flagged rows in your spreadsheet and upload them again afterward.
        </Typography>
      </Box>

      <ReviewRowsTable rows={previewRows} uploadSummary={uploadSummary} />

      <Stack direction='row' justifyContent='space-between' sx={{ mt: 1 }}>
        <Button variant='outlined' onClick={onBack}>
          {uploadSummary &&
          !uploadSummary.error &&
          uploadSummary.stage === 'import'
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
