import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Stack,
  Tab,
  TextField,
  Tabs,
  Typography,
} from '@mui/material';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, getCarriers, getLeadVendors, getProducts } from '../utils/query';
import {
  FIELD_GUIDES,
  normalizeOptions,
  REQUIRED_FIELDS,
  RELATIONSHIP_OPTIONS,
  SELECT_MENU_PROPS,
  SELECT_SX,
  UPLOAD_TYPES,
} from '../utils/bulkUpload';

const optionValue = (option) => (typeof option === 'string' ? option : option.name);

const LookupSelect = ({ value, onChange, options, fallbackValue }) => (
  <TextField
    select
    size='small'
    value={value}
    onChange={onChange}
    variant='standard'
    SelectProps={{ MenuProps: SELECT_MENU_PROPS, IconComponent: HelpOutlineIcon }}
    sx={SELECT_SX}
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

const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values.map((v) => v.trim());
};

const parseCsvText = (text) => {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim() !== '');

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.replace(/^"|"$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]).map((c) => c.replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = cols[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
};

const BulkUpload = () => {
  const queryClient = useQueryClient();
  const [uploadType, setUploadType] = useState(UPLOAD_TYPES.leads);
  const [selectedLeadVendor, setSelectedLeadVendor] = useState('Self Generated');
  const [selectedCarrier, setSelectedCarrier] = useState('Mutual of Omaha');
  const [selectedProduct, setSelectedProduct] = useState('Accidental Death');
  const [selectedRelationship, setSelectedRelationship] = useState('Spouse');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState(null);

  const { data: carriers = [] } = useQuery({
    queryKey: ['carriers'],
    queryFn: getCarriers,
  });
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });
  const { data: leadVendors = [] } = useQuery({
    queryKey: ['leadVendors'],
    queryFn: getLeadVendors,
  });

  const carrierOptions = normalizeOptions(carriers);
  const productOptions = normalizeOptions(products);
  const leadVendorOptions = normalizeOptions(leadVendors);
  const filteredProductOptions = useMemo(() => {
    const selectedCarrierRecord = carrierOptions.find(
      (carrier) => carrier.name === selectedCarrier
    );
    if (!selectedCarrierRecord) return productOptions;
    return productOptions.filter(
      (product) => product.carrier_id === selectedCarrierRecord.id
    );
  }, [carrierOptions, productOptions, selectedCarrier]);

  useEffect(() => {
    if (filteredProductOptions.length === 0) return;
    const hasSelectedProduct = filteredProductOptions.some(
      (product) => product.name === selectedProduct
    );
    if (!hasSelectedProduct) {
      setSelectedProduct(filteredProductOptions[0].name);
    }
  }, [filteredProductOptions, selectedProduct]);

  const guide = useMemo(() => FIELD_GUIDES[uploadType] || [], [uploadType]);
  const tabLabel =
    uploadType === UPLOAD_TYPES.clients
      ? 'Clients'
      : uploadType === UPLOAD_TYPES.leads
        ? 'Leads'
        : uploadType === UPLOAD_TYPES.policies
          ? 'Policies'
          : 'Beneficiaries';
  const summaryLabel = tabLabel.toLowerCase();

  const requiredSet = REQUIRED_FIELDS[uploadType];

  const requiredFields = guide.filter(({ field }) => requiredSet.has(field));
  const optionalFields = guide.filter(({ field }) => !requiredSet.has(field));
  const csvHeaders = guide.map(({ field }) => field);

  const handleDownloadTemplate = () => {
    const escapedHeaders = csvHeaders.map((header) => `"${header}"`);
    const csvContent = `${escapedHeaders.join(',')}\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `${tabLabel.toLowerCase()}-template.csv`;

    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadSummary(null);

    try {
      const text = await file.text();
      const rows = parseCsvText(text);
      if (rows.length === 0) {
        setUploadSummary({
          error: true,
          message: 'CSV has no data rows.',
          total: 0,
          inserted: 0,
          failed: 0,
          errors: [],
        });
        return;
      }

      const response = await apiClient.post('/bulk-upload', {
        type: uploadType,
        rows,
      });

      if (!response.data?.error) {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['policies'] });
        queryClient.invalidateQueries({ queryKey: ['insights'] });
        queryClient.invalidateQueries({ queryKey: ['personalSummary'] });
        queryClient.invalidateQueries({ queryKey: ['teamSummary'] });
        queryClient.invalidateQueries({ queryKey: ['teamLeaderboard'] });
        queryClient.invalidateQueries({ queryKey: ['premiumLeaderboard'] });
      }

      setUploadSummary(response.data);
    } catch (error) {
      setUploadSummary({
        error: true,
        message: error?.response?.data?.error || 'Upload failed',
        total: 0,
        inserted: 0,
        failed: 0,
        errors: [],
      });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const fieldControl = (field) => {
    if (uploadType === UPLOAD_TYPES.leads && field === 'Lead Vendor') {
      return (
        <LookupSelect
          value={selectedLeadVendor}
          onChange={(e) => setSelectedLeadVendor(e.target.value)}
          options={leadVendorOptions}
          fallbackValue='Self Generated'
        />
      );
    }
    if (uploadType === UPLOAD_TYPES.policies && field === 'Carrier') {
      return (
        <LookupSelect
          value={selectedCarrier}
          onChange={(e) => setSelectedCarrier(e.target.value)}
          options={carrierOptions}
          fallbackValue='Mutual of Omaha'
        />
      );
    }
    if (uploadType === UPLOAD_TYPES.policies && field === 'Product') {
      return (
        <LookupSelect
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          options={filteredProductOptions}
          fallbackValue='Accidental Death'
        />
      );
    }
    if (uploadType === UPLOAD_TYPES.beneficiaries && field === 'Relationship') {
      return (
        <LookupSelect
          value={selectedRelationship}
          onChange={(e) => setSelectedRelationship(e.target.value)}
          options={RELATIONSHIP_OPTIONS}
          fallbackValue='Spouse'
        />
      );
    }
    return null;
  };

  const renderField = ({ field, example }, isRequired) => {
    const control = fieldControl(field);
    return (
      <Typography key={field} variant='body2'>
        {field}
        {isRequired && (
          <Typography
            component='span'
            sx={{ color: '#e53935', ml: 0.15, fontWeight: 700 }}
          >
            *
          </Typography>
        )}
        {control ? (
          control
        ) : (
          <Typography component='span' variant='inherit' color='text.secondary'>
            {` - ${example}`}
          </Typography>
        )}
      </Typography>
    );
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent='space-between'
          alignItems={{ sm: 'center' }}
          spacing={2}
        >
          <Box>
            <Typography variant='h4'>Bulk Upload</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
              Upload CSV files for leads, clients, policies, and beneficiaries in that order.
            </Typography>
          </Box>
          <Stack direction='row' spacing={1.5}>
            <Button variant='outlined' onClick={handleDownloadTemplate}>
              Download Template
            </Button>
            <Button
              variant='contained'
              color='action'
              startIcon={<UploadFileOutlinedIcon />}
              component='label'
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : `Upload ${tabLabel}`}
              <input
                type='file'
                accept='.csv'
                hidden
                onChange={handleCsvUpload}
              />
            </Button>
          </Stack>
        </Stack>

        {uploadSummary && (
          <Alert
            severity={uploadSummary.error ? 'error' : 'success'}
            sx={{ alignItems: 'flex-start' }}
          >
            <Typography variant='body2' sx={{ mb: 0.5 }}>
              {uploadSummary.error
                ? uploadSummary.message || 'Upload failed'
                : `Upload complete: ${uploadSummary.inserted} ${summaryLabel} added`}
            </Typography>
            {!uploadSummary.error && (
              <Typography variant='caption' color='text.secondary'>
                Failed {summaryLabel}: {uploadSummary.failed}
              </Typography>
            )}
            {Array.isArray(uploadSummary.errors) &&
              uploadSummary.errors.length > 0 && (
                <List dense sx={{ mt: 1, py: 0 }}>
                  {uploadSummary.errors.slice(0, 8).map((err, idx) => (
                    <ListItem key={`${err.row}-${idx}`} sx={{ py: 0 }}>
                      <ListItemText
                        primaryTypographyProps={{ variant: 'caption' }}
                        primary={`Row ${err.row}: ${err.message}`}
                      />
                    </ListItem>
                  ))}
                  {uploadSummary.errors.length > 8 && (
                    <ListItem sx={{ py: 0 }}>
                      <ListItemText
                        primaryTypographyProps={{ variant: 'caption' }}
                        primary={`+${uploadSummary.errors.length - 8} more errors`}
                      />
                    </ListItem>
                  )}
                </List>
              )}
          </Alert>
        )}

        <Box>
          <Tabs
            value={uploadType}
            onChange={(_, value) => {
              setUploadType(value);
              setUploadSummary(null);
            }}
            textColor='primary'
            indicatorColor='primary'
            sx={{ mb: 1 }}
          >
            <Tab value={UPLOAD_TYPES.leads} label='Leads' />
            <Tab value={UPLOAD_TYPES.clients} label='Clients' />
            <Tab value={UPLOAD_TYPES.policies} label='Policies' />
            <Tab value={UPLOAD_TYPES.beneficiaries} label='Beneficiaries' />
          </Tabs>
        </Box>

        <Box>
          <Grid container columnSpacing={6} rowSpacing={3}>
            <Grid size={{ xs: 12, md: 'auto' }}>
              <Typography variant='h6' sx={{ mb: 1 }}>
                Required Fields
              </Typography>
              <Stack spacing={1}>{requiredFields.map((f) => renderField(f, true))}</Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 'auto' }}>
              <Typography variant='h6' sx={{ mb: 1 }}>
                Optional Fields
              </Typography>
              <Stack spacing={1}>
                {optionalFields.length === 0 ? (
                  <Typography variant='body2' color='text.secondary'>
                    None
                  </Typography>
                ) : (
                  optionalFields.map((f) => renderField(f, false))
                )}
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Stack>
    </Container>
  );
};

export default BulkUpload;
