// PrivacyPolicy.jsx
import LegalDocument from './LegalDocument.jsx';
import { EFFECTIVE_DATE, PRIVACY_SECTIONS } from './legalContent.js';

export default function PrivacyPolicy() {
  return (
    <LegalDocument
      title='Privacy Policy'
      effectiveDate={EFFECTIVE_DATE}
      sections={PRIVACY_SECTIONS}
    />
  );
}
