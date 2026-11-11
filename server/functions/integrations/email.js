const sgMail = require('@sendgrid/mail');

// The one SendGrid sender for every email the CRM sends: the same verified
// sender the gsq functions use (gsq/functions/utils/email.js). Keep the two
// in step. The address must be a verified SendGrid sender or every send is
// refused.
const SENDER_EMAIL = 'notifications@fexdigital.com';
const SENDER_NAME = 'FEX Digital';
// Nobody reads notifications@: replies go to the team inbox, which is also
// where notices for the team are sent.
const TEAM_INBOX = 'info@fexdigital.com';

// User-typed values go into html emails; escape them first.
const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );

// Sends one email from the shared sender. Throws when SENDGRID_API_KEY is
// missing or SendGrid refuses the send, so callers decide what a failed
// email means for them.
const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is not set');
  }
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  await sgMail.send({
    to,
    from: { name: SENDER_NAME, email: SENDER_EMAIL },
    replyTo: TEAM_INBOX,
    subject,
    html,
    text,
  });
};

module.exports = {
  SENDER_EMAIL,
  SENDER_NAME,
  TEAM_INBOX,
  escapeHtml,
  sendEmail,
};
