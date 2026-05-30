import { Box, Container, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ReviewImportStep,
  UploadCsvStep,
} from '../components/BulkUploadSteps';
import { apiClient, getCarriers, getLeadVendors, getProducts } from '../utils/query';
import {
  TEMPLATE_COLUMNS,
  normalizeOptions,
  parseUploadFile,
} from '../utils/bulkUpload';
import { createBulkUploadTemplateXlsx } from '../utils/bulkUploadTemplate';

const BulkUpload = () => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [validatedRows, setValidatedRows] = useState([]);

  const { data: leadVendors = [], isLoading: isLeadVendorsLoading } = useQuery({
    queryKey: ['leadVendors'],
    queryFn: getLeadVendors,
  });
  const { data: carriers = [], isLoading: isCarriersLoading } = useQuery({
    queryKey: ['carriers'],
    queryFn: getCarriers,
  });
  const { data: products = [], isLoading: isProductsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const leadVendorOptions = normalizeOptions(leadVendors);
  const carrierOptions = normalizeOptions(carriers);
  const productOptions = normalizeOptions(products);
  const isTemplateLoading =
    isLeadVendorsLoading ||
    isCarriersLoading ||
    isProductsLoading;

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

  const handleDownloadTemplate = async () => {
    const blob = await createBulkUploadTemplateXlsx({
      columns: TEMPLATE_COLUMNS,
      leadVendorOptions,
      carrierOptions,
      productOptions,
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.setAttribute('download', 'book-of-business-template.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUploadFile = async (file) => {
    if (!file) return;

    setIsUploading(true);
    setUploadSummary(null);
    setPreviewRows([]);
    setValidatedRows([]);

    try {
      const rows = await parseUploadFile(file);
      setPreviewRows(rows);
      if (rows.length === 0) {
        setUploadSummary({
          error: true,
          message: 'File has no data rows.',
          total: 0,
          inserted: 0,
          failed: 0,
          errors: [],
        });
        setCurrentStep(1);
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
      setCurrentStep(1);
    } catch (error) {
      setUploadSummary({
        error: true,
        message: error?.response?.data?.error || 'Validation failed',
        total: 0,
        inserted: 0,
        failed: 0,
        errors: [],
      });
      setCurrentStep(1);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCsvUpload = async (event) => {
    try {
      await handleUploadFile(event.target.files?.[0]);
    } finally {
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
    setCurrentStep(0);
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
              Import your entire book of business by uploading an XLSX file.
            </Typography>
          </Box>
        </Stack>

        {currentStep === 0 && (
          <UploadCsvStep
            isUploading={isUploading}
            onUpload={handleCsvUpload}
            onDropUpload={handleUploadFile}
            onDownloadTemplate={handleDownloadTemplate}
            isTemplateLoading={isTemplateLoading}
          />
        )}

        {currentStep === 1 && (
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
