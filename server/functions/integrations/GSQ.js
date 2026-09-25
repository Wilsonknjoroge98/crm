const { Firestore } = require('firebase-admin/firestore');
const { getHyrosSource } = require('./hyros');
const { supabaseService } = require('../services/supabase');
const logger = require('firebase-functions/logger');
const { parsePremium } = require('./premium');

// GSQ sends this literal email for leads issued to the platform itself
// rather than a specific agent; ingestion and refunds both need to treat it
// as the house account below.
const GSQ_PLATFORM_EMAIL = 'hello@getseniorquotes.com';
const SUPER_ADMIN_EMAIL = 'info@fexdigital.com';

const parseYesNo = (value) => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (['yes', 'y', 'true'].includes(normalized)) return true;
  if (['no', 'n', 'false'].includes(normalized)) return false;
  return null;
};

// Meta forms name their questions freely and gsq runs more than one form,
// so the same concept arrives under different keys. Canonicalise before
// splitting out the typed columns so every instant form lead lands the
// same shape regardless of which form produced it. Unknown keys pass
// through untouched.
const FORM_KEY_ALIASES = {
  'do_you_use_tobacco?': 'tobacco',
  'when_are_you_best_available?': 'availability',
  'what_is_your_coverage_for?': 'why',
  'why_do_you_need_life_insurance?': 'why',
  'how_much_coverage_do_you_want?': 'coverage',
  'how_much_coverage_do_you_need?': 'coverage',
  'how_soon_do_you_need_to_buy_coverage?': 'urgency',
  'what_is_your_age?': 'age',
  'select_your_sex_at_birth?': 'sex',
};

// The consent question's key is the whole disclosure paragraph and its
// answer is free text ("I agree", "yes", sometimes a name) — no lead data.
const isConsentKey = (key) => key.startsWith('you_will_be_contacted_by');

const canonicalizeFormFields = (fields = {}) => {
  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if (isConsentKey(key)) continue;
    const answer = String(value ?? '').trim();
    if (!answer) continue;
    const canonical = FORM_KEY_ALIASES[key] ?? key;
    // free-text age like "72 years." — keep the number
    out[canonical] =
      canonical === 'age' ? (answer.match(/\d+/)?.[0] ?? answer) : answer;
  }
  return out;
};

const inboundGSQ = async (req, res) => {
  try {
    const auth = req.headers['authorization']?.split(' ')[1];

    if (auth !== process.env.GSQ_TOKEN) {
      logger.warn('Unauthorized access attempt', { auth });
      return res.status(401).send({ message: 'Unauthorized' });
    }

    logger.info('Received GSQ lead:', req.body);

    const { firstName, lastName, phone, state, email, dob, gsqId, sold } =
      req.body;

    let issuedTo = req.body.issuedTo;

    // set by gsq's meta webhook, the funnel callers never send it
    const isInstantForm = req.body.leadType === 'instant_form';

    // meta forms don't always ask for email or state, and a single word
    // full_name has no last name, gsq has already issued the lead by now
    if (
      !firstName ||
      !phone ||
      (!isInstantForm && (!lastName || !email || !state || !gsqId || !dob)) ||
      !issuedTo ||
      sold === undefined
    ) {
      return res.status(400).send({ message: 'Missing required fields' });
    }

    const hyrosSource = isInstantForm ? null : await getHyrosSource(phone);
    const { data: leadVendor } = await supabaseService
      .from('lead_vendors')
      .select('id')
      .eq('name', 'GetSeniorQuotes.com')
      .single();

    // If the lead is issued to the GSQ platform email, override the email to match company
    if (issuedTo === GSQ_PLATFORM_EMAIL) {
      issuedTo = SUPER_ADMIN_EMAIL;
    }

    let agentId = null;

    const { data: agent, error: agentError } = await supabaseService
      .from('agents')
      .select('id')
      .eq('email', issuedTo)
      .single();

    logger.info('Agent lookup result', { issuedTo, agent, agentError });

    if (agentError || !agent) {
      logger.error('Invalid agent email:', { issuedTo, error: agentError });
      return res.status(422).send({ message: 'Invalid agent email' });
    }

    agentId = agent.id;

    const lead = { ...req.body };
    const premiumParsed = parsePremium(lead.premium);

    const payload = {
      first_name: firstName,
      last_name: lastName || null,
      phone,
      email: email || null,
      state: state || null,
      sold: false,
      date_of_birth: dob,
      smoker: lead.smoker ?? false,
      face_amount: lead.faceAmount
        ? Number(lead.faceAmount.split('-')[0]) || null
        : null,
      premium_min: premiumParsed.min,
      premium_max: premiumParsed.max,
      premium: premiumParsed.raw,
      selected_plan: lead.selectedPlan ?? null,
      selected_carrier: lead.selectedCarrier ?? null,
      beneficiary: lead.beneficiary ?? null,
      priority: null,
      availability: lead.availability ?? null,
      why: lead.why ?? null,
      // The funnel now asks one health-tier question (health_class) instead
      // of these two flags. GSQ no longer sends cholesterolMedication or
      // bloodPressureMedication, so default to null (unknown) rather than
      // false (confirmed no) to avoid recording a false negative.
      cholesterol_medication: lead.cholesterolMedication ?? null,
      blood_pressure_medication: lead.bloodPressureMedication ?? null,
      health_class: lead.healthClass ?? null,
      verified: lead.verified ?? false,
      height_feet: lead.heightFeet ? parseInt(lead.heightFeet) : null,
      height_inches: lead.heightInches ? parseInt(lead.heightInches) : null,
      weight_lbs: lead.weight ? parseInt(lead.weight) : null,
      agent_id: agentId,
      gsq_source: hyrosSource,
      gsq_id: lead.gsqId,
      gsq_instant_form: isInstantForm,
      lead_vendor_id: leadVendor.id,
    };

    // only these three answers get typed columns; everything else (age, sex,
    // coverage, urgency, and any question we don't know) goes to raw_fields
    // under its canonical key. gsq_id stays null, there's no gsq session
    // behind a meta lead
    const { tobacco, availability, why, ...rawFields } = canonicalizeFormFields(
      lead.fields,
    );
    const instantFormColumns = isInstantForm
      ? {
          smoker: parseYesNo(tobacco),
          availability: availability ?? null,
          why: why ?? null,
          gsq_source: lead.adName ?? null,
          gsq_id: null,
          raw_fields: rawFields,
        }
      : {};
    Object.assign(payload, instantFormColumns);

    // Dedup is gsq's job (30-day phone-issuance window ahead of this
    // endpoint) — the phone column no longer has a unique constraint, so
    // every inbound submission is a plain insert.
    const { error } = await supabaseService.from('leads').insert(payload);

    if (error) {
      logger.error('Error inserting lead:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return res.status(400).send({ message: 'Invalid request payload' });
    }

    res.status(201).send({ message: 'Lead created successfully' });
  } catch (error) {
    logger.error('Error saving lead:', { error });
    res.status(500).send({ message: 'Error saving lead:' });
  }
};

// Every gsq collection that holds a sellable lead identity. The fexdigital
// storefront only lists docs with sold == false, so once an agent sells a
// phone every copy of it has to flip, not just the funnel doc.
const GSQ_LEAD_COLLECTIONS = ['leads', 'instant_form_leads'];

// gsq stores phones as 10 bare digits, crm clients can carry formatting
const phoneVariants = (phone) => {
  const raw = String(phone ?? '').trim();
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  return [...new Set([raw, digits].filter(Boolean))];
};

const findLeadDocs = async (db, field, values) => {
  if (values.length === 0) return [];
  const snapshots = await Promise.all(
    GSQ_LEAD_COLLECTIONS.map((name) =>
      db.collection(name).where(field, 'in', values).get(),
    ),
  );
  return snapshots.flatMap((snapshot) => snapshot.docs);
};

const markSoldInGSQ = async (phone, email) => {
  const db = new Firestore({
    projectId: 'life-quoter',
    credentials: JSON.parse(process.env.GSQ_SERVICE_ACCOUNT_KEY),
  });

  let docs = await findLeadDocs(db, 'phone', phoneVariants(phone));

  // email is only a fallback when the phone matched nothing anywhere
  if (docs.length === 0 && email) {
    docs = await findLeadDocs(db, 'email', [email]);
  }

  const unsold = docs.filter((doc) => doc.data().sold !== true);

  // firestore caps a batch at 500 writes
  for (let i = 0; i < unsold.length; i += 500) {
    const batch = db.batch();
    unsold.slice(i, i + 500).forEach((doc) => batch.update(doc.ref, { sold: true }));
    await batch.commit();
  }

  logger.info('Marked lead sold in GSQ', {
    matched: docs.length,
    updated: unsold.length,
    collections: [...new Set(unsold.map((doc) => doc.ref.parent.id))],
  });
};

module.exports = {
  inboundGSQ,
  markSoldInGSQ,
  GSQ_PLATFORM_EMAIL,
  SUPER_ADMIN_EMAIL,
};
