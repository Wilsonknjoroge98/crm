import {
  Alert,
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import {
  FIELD_COLUMN_LAYOUT,
  FIELD_HELP,
  MORE_OPTIONAL_COLUMNS,
  OPTIONAL_BENEFICIARY_COLUMNS,
  REQUIRED_COLUMNS,
  optionValue,
} from '../utils/bulkUpload';

const selectSx = {
  ml: 1,
  minWidth: 160,
  flexShrink: 0,
  '& .MuiInputBase-input': { py: 0 },
  '& .MuiInputBase-root': {
    height: 24,
    fontSize: '0.875rem',
    color: 'text.secondary',
    alignItems: 'center',
  },
};

const LookupSelect = ({ value, onChange, options, fallbackValue }) => (
  <TextField
    select
    size='small'
    value={value}
    onChange={onChange}
    variant='standard'
    sx={selectSx}
  >
    {options.length === 0 ? (
      <MenuItem value={fallbackValue}>{fallbackValue}</MenuItem>
    ) : (
      options.map((option) => (
        <MenuItem key={option.id || option} value={optionValue(option)}>
          {optionValue(option)}
        </MenuItem>
      ))
    )}
  </TextField>
);

const FieldRow = ({
  fieldConfig,
  isRequired,
  shouldTruncate = false,
  lookupProps,
}) => {
  const { field, example } = fieldConfig;
  const isLeadVendor = field === 'Lead Vendor';
  const isCarrier = field === 'Carrier';
  const isProduct = field === 'Product';

  return (
    <Box
      key={field}
      sx={{
        display: 'flex',
        alignItems: 'center',
        fontSize: '0.875rem',
        lineHeight: 1.5,
        minHeight: 28,
        minWidth: 0,
      }}
    >
      <Typography
        variant='body2'
        component='span'
        sx={{ flexShrink: 0, lineHeight: 1.5, whiteSpace: 'nowrap' }}
      >
        {field}
        {isRequired && (
          <Typography
            component='span'
            sx={{ color: '#e53935', ml: 0.15, fontWeight: 700 }}
          >
            *
          </Typography>
        )}
      </Typography>

      {isLeadVendor && (
        <LookupSelect
          value={lookupProps.selectedLeadVendor}
          onChange={(e) => lookupProps.setSelectedLeadVendor(e.target.value)}
          options={lookupProps.leadVendorOptions}
          fallbackValue='Self Generated'
        />
      )}
      {isCarrier && (
        <LookupSelect
          value={lookupProps.selectedCarrier}
          onChange={(e) => lookupProps.setSelectedCarrier(e.target.value)}
          options={lookupProps.carrierOptions}
          fallbackValue='Mutual of Omaha'
        />
      )}
      {isProduct && (
        <LookupSelect
          value={lookupProps.selectedProduct}
          onChange={(e) => lookupProps.setSelectedProduct(e.target.value)}
          options={lookupProps.filteredProductOptions}
          fallbackValue='Accidental Death'
        />
      )}

      {!isLeadVendor && !isCarrier && !isProduct && (
        <Typography
          component='span'
          variant='body2'
          color='text.secondary'
          sx={{
            lineHeight: 1.5,
            minWidth: 0,
            whiteSpace: 'nowrap',
            ...(shouldTruncate
              ? {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }
              : {}),
          }}
        >
          {` - ${example}`}
        </Typography>
      )}

      <Tooltip title={FIELD_HELP[field] || `Example: ${example}`} arrow>
        <HelpOutlineIcon
          sx={{
            ml: 0.5,
            fontSize: '0.95rem',
            color: 'text.secondary',
            flexShrink: 0,
          }}
        />
      </Tooltip>
    </Box>
  );
};

export const BulkUploadStepper = ({ currentStep }) => (
  <Paper variant='outlined' sx={{ p: 3, borderRadius: 1 }}>
    <Stepper activeStep={currentStep} alternativeLabel>
      <Step>
        <StepLabel>Prepare CSV File</StepLabel>
      </Step>
      <Step>
        <StepLabel>Upload CSV File</StepLabel>
      </Step>
      <Step>
        <StepLabel>Review and Import</StepLabel>
      </Step>
    </Stepper>
  </Paper>
);

export const PrepareCsvStep = ({
  onDownloadTemplate,
  onNext,
  showMoreOptionalFields,
  setShowMoreOptionalFields,
  lookupProps,
}) => (
  <Paper variant='outlined' sx={{ p: 3, borderRadius: 1, position: 'relative' }}>
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent='space-between'
        alignItems={{ sm: 'center' }}
        spacing={2}
      >
        <Box>
          <Typography variant='h5'>1. Prepare CSV File</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
            Create a CSV file with the following columns or download our template.
            <br />
            Each row of the CSV should specify a policy with the following columns
            and values:
          </Typography>
        </Box>
        <Button variant='contained' color='action' onClick={onDownloadTemplate}>
          Download Template
        </Button>
      </Stack>

      <Divider />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          columnGap: 2.5,
          rowGap: 2,
          alignItems: 'stretch',
        }}
      >
        {FIELD_COLUMN_LAYOUT.map((column, columnIndex) => (
          <Stack key={columnIndex} spacing={0.75}>
            {column.map((fieldConfig) => (
              <FieldRow
                key={fieldConfig.field}
                fieldConfig={fieldConfig}
                isRequired={
                  REQUIRED_COLUMNS.some(({ field }) => field === fieldConfig.field) &&
                  !OPTIONAL_BENEFICIARY_COLUMNS.some(
                    ({ field }) => field === fieldConfig.field,
                  )
                }
                shouldTruncate={columnIndex === 2}
                lookupProps={lookupProps}
              />
            ))}
            {columnIndex === 0 &&
              showMoreOptionalFields &&
              MORE_OPTIONAL_COLUMNS.map((fieldConfig) => (
                <FieldRow
                  key={fieldConfig.field}
                  fieldConfig={fieldConfig}
                  isRequired={false}
                  lookupProps={lookupProps}
                />
              ))}
            {columnIndex === 0 && (
              <Button
                variant='text'
                size='small'
                onClick={() => setShowMoreOptionalFields((current) => !current)}
                sx={{
                  alignSelf: 'flex-start',
                  px: 0,
                  minWidth: 0,
                  color: 'text.secondary',
                }}
              >
                {showMoreOptionalFields
                  ? 'Hide optional fields'
                  : 'View more optional fields...'}
              </Button>
            )}
          </Stack>
        ))}
      </Box>
    </Stack>
    <Button
      variant='outlined'
      sx={{
        position: 'absolute',
        right: 24,
        bottom: 24,
        bgcolor: '#FFFFFF',
        color: '#1A1A1A',
        borderColor: '#1A1A1A',
        '&:hover': {
          bgcolor: '#F7F7F7',
          borderColor: '#1A1A1A',
        },
      }}
      onClick={onNext}
    >
      Next Step
    </Button>
  </Paper>
);

export const UploadCsvStep = ({ isUploading, onUpload, onBack }) => (
  <Paper variant='outlined' sx={{ p: 3, borderRadius: 1 }}>
    <Stack spacing={4}>
      <Box>
        <Typography variant='h5'>2. Upload CSV File</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
          Select the prepared CSV file when you are ready to upload.
        </Typography>
      </Box>

      <Paper
        component='label'
        variant='outlined'
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
          accept='.csv'
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
            Drag and drop your completed CSV
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
            Choose CSV File
          </Button>
        </Stack>
      </Paper>

      <Stack direction='row' justifyContent='flex-start'>
        <Button variant='outlined' onClick={onBack}>
          Back
        </Button>
      </Stack>
    </Stack>
  </Paper>
);

const rowHasIssue = (uploadSummary, rowNumber) =>
  (uploadSummary?.errors || []).some((error) => error.row === rowNumber);

const ReviewRowsTable = ({ rows, uploadSummary }) => {
  const previewRows = rows.slice(0, 5);
  const hiddenRowCount = Math.max(rows.length - previewRows.length, 0);
  const isImported = uploadSummary && !uploadSummary.error && uploadSummary.stage === 'import';

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
            const status = isImported ? 'Imported' : hasIssue ? 'Review' : 'Ready';
            return (
              <TableRow key={`${rowNumber}-${row['Policy Number']}`} hover>
                <TableCell>{rowNumber}</TableCell>
                <TableCell>{row['Policy Number'] || '-'}</TableCell>
                <TableCell>{row['Full Name'] || '-'}</TableCell>
                <TableCell>{row.Carrier || 'MIGRATION//INVALID REFERENCE'}</TableCell>
                <TableCell>{row['Premium Amount'] || '-'}</TableCell>
                <TableCell>{row['Primary Beneficiaries'] || '-'}</TableCell>
                <TableCell>
                  <Stack direction='row' spacing={0.75} alignItems='center'>
                    {hasIssue ? (
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
                  Upload a CSV to preview rows.
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

  return (
    <Alert
      severity={uploadSummary.error ? 'error' : 'success'}
      icon={
        !uploadSummary.error && !hasImportSummary ? (
          <CheckCircleOutlineIcon sx={{ color: 'text.secondary' }} />
        ) : undefined
      }
      sx={{ alignItems: 'flex-start' }}
    >
      <Typography variant='body2' sx={{ mb: 0.5 }}>
        {uploadSummary.error && (uploadSummary.message || 'Upload failed')}
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
        <Typography variant='h5'>3. Review and Import</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
          Review the policies detected in your CSV before importing them into your
          book of business.
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
