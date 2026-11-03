// TermsOfService.jsx
import LegalDocument from './LegalDocument.jsx';
import { TERMS_EFFECTIVE_DATE, TERMS_SECTIONS } from './legalContent.js';

export default function TermsOfService() {
  return (
    <LegalDocument
      title='Terms of Service'
      effectiveDate={TERMS_EFFECTIVE_DATE}
      sections={TERMS_SECTIONS}
    />
  );
}
