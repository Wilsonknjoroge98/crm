/**
 * One-off backfill: stamps `refunded: true` on the GSQ lead doc of every
 * refund approved before the approve route started doing it, so the GSQ
 * marketplace stops reselling those bad numbers as aged leads.
 *
 * Idempotent: a doc already stamped is left alone, a missing doc is reported.
 *
 * Usage (from server/functions):
 *   node scripts/backfillRefundedGsqLeads.js --dry-run
 *   node scripts/backfillRefundedGsqLeads.js
 *
 * Env: SUPABASE_SERVICE_ROLE_KEY, GSQ_PROJECT_ID, GSQ_SERVICE_ACCOUNT_KEY,
 * read from .env and .secret.local (the service role key only lives in the
 * latter). Firebase injects these when serving functions; a plain `node`
 * run has to load them itself.
 */
const path = require('path');

require('dotenv').config({
  path: [
    path.join(__dirname, '..', '.secret.local'),
    path.join(__dirname, '..', '.env'),
  ],
});

const { Firestore, FieldValue } = require('@google-cloud/firestore');
const { supabaseService } = require('../services/supabase');

const PAGE_SIZE = 1000;

const parseArgs = (argv) => {
  const args = { dryRun: false };
  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
};

const fetchApprovedGsqIds = async () => {
  const ids = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseService
      .from('leads')
      .select('gsq_id')
      .eq('refund_status', 'approved')
      .not('gsq_id', 'is', null)
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    ids.push(...data.map((row) => row.gsq_id));
    if (data.length < PAGE_SIZE) return ids;
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const firestore = new Firestore({
    projectId: process.env.GSQ_PROJECT_ID,
    credentials: JSON.parse(process.env.GSQ_SERVICE_ACCOUNT_KEY),
  });

  const gsqIds = await fetchApprovedGsqIds();
  console.log(
    `${args.dryRun ? '[dry run] ' : ''}${gsqIds.length} approved refund(s) with a gsq_id`,
  );

  const summary = { stamped: 0, alreadyStamped: 0, missing: [] };
  for (const gsqId of gsqIds) {
    const ref = firestore.doc(`leads/${gsqId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      summary.missing.push(gsqId);
      continue;
    }
    if (snap.get('refunded') === true) {
      summary.alreadyStamped++;
      continue;
    }
    if (!args.dryRun) {
      await ref.update({ refunded: true, refundedAt: FieldValue.serverTimestamp() });
    }
    summary.stamped++;
  }

  console.log(
    `${args.dryRun ? 'would stamp' : 'stamped'} ${summary.stamped}, ` +
      `already stamped ${summary.alreadyStamped}, missing ${summary.missing.length}`,
  );
  if (summary.missing.length) console.log('missing gsq docs:', summary.missing.join(', '));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
