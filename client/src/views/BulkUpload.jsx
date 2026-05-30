import { Box, Container, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BulkUploadStepper,
  PrepareCsvStep,
  ReviewImportStep,
  UploadCsvStep,
} from '../components/BulkUploadSteps';
import { apiClient, getCarriers, getLeadVendors, getProducts } from '../utils/query';
import {
  FIELD_COLUMN_LAYOUT,
  MORE_OPTIONAL_COLUMNS,
  normalizeOptions,
  parseCsvText,
} from '../utils/bulkUpload';

const BulkUpload = () => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [validatedRows, setValidatedRows] = useState([]);
  const [selectedLeadVendor, setSelectedLeadVendor] = useState('Self Generated');
  const [selectedCarrier, setSelectedCarrier] = useState('Mutual of Omaha');
  const [selectedProduct, setSelectedProduct] = useState('Accidental Death');
  const [showMoreOptionalFields, setShowMoreOptionalFields] = useState(false);

  const { data: leadVendors = [] } = useQuery({
    queryKey: ['leadVendors'],
    queryFn: getLeadVendors,
  });
  const { data: carriers = [] } = useQuery({
    queryKey: ['carriers'],
    queryFn: getCarriers,
  });
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const leadVendorOptions = normalizeOptions(leadVendors);
  const carrierOptions = normalizeOptions(carriers);
  const productOptions = normalizeOptions(products);
  const filteredProductOptions = useMemo(() => {
    const selectedCarrierRecord = carrierOptions.find(
      (carrier) => carrier.name === selectedCarrier,
    );
    if (!selectedCarrierRecord) return productOptions;
    return productOptions.filter(
      (product) => product.carrier_id === selectedCarrierRecord.id,
    );
  }, [carrierOptions, productOptions, selectedCarrier]);

  useEffect(() => {
    if (!filteredProductOptions.length) return;
    if (filteredProductOptions.some((product) => product.name === selectedProduct)) {
      return;
    }
    setSelectedProduct(filteredProductOptions[0].name);
  }, [filteredProductOptions, selectedProduct]);

  const handleCarrierChange = (carrierName) => {
    setSelectedCarrier(carrierName);
    const carrier = carrierOptions.find((option) => option.name === carrierName);
    const matchingProducts = carrier
      ? productOptions.filter((product) => product.carrier_id === carrier.id)
      : productOptions;
    if (matchingProducts.length) {
      setSelectedProduct(matchingProducts[0].name);
    }
  };

  const csvHeaders = [
    ...FIELD_COLUMN_LAYOUT[0],
    ...(showMoreOptionalFields ? MORE_OPTIONAL_COLUMNS : []),
    ...FIELD_COLUMN_LAYOUT[1],
    ...FIELD_COLUMN_LAYOUT[2],
  ].map(({ field }) => field);

  const rowErrorCount = new Set(
    (uploadSummary?.errors || [])
      .map((error) => error.row)
      .filter((row) => Number.isInteger(row)),
  ).size;
  const importableRowCount = Math.max(validatedRows.length - rowErrorCount, 0);

  const isReadyToImport =
    uploadSummary &&
    uploadSummary.stage !== 'import' &&
    (!uploadSummary.error ||
      (uploadSummary.errors || []).some((error) =>
        Number.isInteger(error.row),
      )) &&
    !(uploadSummary.errors || []).some((error) => error.row === '-') &&
    importableRowCount > 0;

  const invalidateBulkUploadQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    queryClient.invalidateQueries({ queryKey: ['policies'] });
    queryClient.invalidateQueries({ queryKey: ['insights'] });
    queryClient.invalidateQueries({ queryKey: ['personalSummary'] });
    queryClient.invalidateQueries({ queryKey: ['teamSummary'] });
    queryClient.invalidateQueries({ queryKey: ['teamLeaderboard'] });
    queryClient.invalidateQueries({ queryKey: ['premiumLeaderboard'] });
  };

  const handleDownloadTemplate = () => {
    const escapedHeaders = csvHeaders.map((header) => `"${header}"`);
    const csvContent = `${escapedHeaders.join(',')}\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.setAttribute('download', 'book-of-business-template.csv');
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
    setPreviewRows([]);
    setValidatedRows([]);

    try {
      const rows = parseCsvText(await file.text());
      setPreviewRows(rows);
      if (rows.length === 0) {
        setUploadSummary({
          error: true,
          message: 'CSV has no data rows.',
          total: 0,
          inserted: 0,
          failed: 0,
          errors: [],
        });
        setCurrentStep(2);
        return;
      }

      const response = await apiClient.post('/bulk-upload/validate', { rows });
      const hasRowErrors = (response.data?.errors || []).some((error) =>
        Number.isInteger(error.row),
      );
      const hasSystemErrors = (response.data?.errors || []).some(
        (error) => error.row === '-',
      );
      if (!response.data?.error || (hasRowErrors && !hasSystemErrors)) {
        setValidatedRows(rows);
      }
      setUploadSummary(response.data);
      setCurrentStep(2);
    } catch (error) {
      setUploadSummary({
        error: true,
        message: error?.response?.data?.error || 'Validation failed',
        total: 0,
        inserted: 0,
        failed: 0,
        errors: [],
      });
      setCurrentStep(2);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleImportBook = async () => {
    if (!isReadyToImport || isImporting) return;

    setIsImporting(true);
    try {
      const response = await apiClient.post('/bulk-upload/import', {
        rows: validatedRows,
      });

      if (!response.data?.error) invalidateBulkUploadQueries();
      setUploadSummary(response.data);
    } catch (error) {
      setUploadSummary({
        error: true,
        message: error?.response?.data?.error || 'Import failed',
        total: validatedRows.length,
        inserted: 0,
        failed: validatedRows.length,
        errors: [],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleReviewBack = () => {
    if (uploadSummary && !uploadSummary.error && uploadSummary.stage === 'import') {
      setUploadSummary(null);
      setPreviewRows([]);
      setValidatedRows([]);
    }
    setCurrentStep(1);
  };

  const lookupProps = {
    leadVendorOptions,
    carrierOptions,
    filteredProductOptions,
    selectedLeadVendor,
    setSelectedLeadVendor,
    selectedCarrier,
    setSelectedCarrier: handleCarrierChange,
    selectedProduct,
    setSelectedProduct,
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
              Import your entire book of business by uploading a CSV file.
            </Typography>
          </Box>
        </Stack>

        <BulkUploadStepper currentStep={currentStep} />

        {currentStep === 0 && (
          <PrepareCsvStep
            onDownloadTemplate={handleDownloadTemplate}
            onNext={() => setCurrentStep(1)}
            showMoreOptionalFields={showMoreOptionalFields}
            setShowMoreOptionalFields={setShowMoreOptionalFields}
            lookupProps={lookupProps}
          />
        )}

        {currentStep === 1 && (
          <UploadCsvStep
            isUploading={isUploading}
            onUpload={handleCsvUpload}
            onBack={() => setCurrentStep(0)}
          />
        )}

        {currentStep === 2 && (
          <ReviewImportStep
            uploadSummary={uploadSummary}
            isReadyToImport={isReadyToImport}
            isImporting={isImporting}
            previewRows={previewRows}
            onBack={handleReviewBack}
            onImport={handleImportBook}
          />
        )}
      </Stack>
    </Container>
  );
};

export default BulkUpload;
