const axios = require('axios');

const REAL_CONTACT_URL = 'https://api.trestleiq.com/2.0/real_contact';

const toTrestlePhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('1')
    ? digits.slice(1)
    : digits;
};

// all three values come from the phone block, activity_score only exists there
const getRealContact = async ({ name, phone, email }) => {
  const trestlePhone = toTrestlePhone(phone);
  if (!trestlePhone) {
    throw new Error('Lead has no phone to grade');
  }

  const response = await axios.get(REAL_CONTACT_URL, {
    headers: {
      'accept': 'application/json',
      'x-api-key': process.env.TRESTLE_API_KEY,
    },
    params: {
      name: name || undefined,
      phone: trestlePhone,
      email: email || undefined,
    },
    timeout: 10000,
  });

  const result = response.data?.phone || {};
  return {
    contact_grade: result.contact_grade ?? null,
    activity_score: result.activity_score ?? null,
    name_match: result.name_match ?? null,
  };
};

module.exports = { getRealContact, toTrestlePhone, REAL_CONTACT_URL };
