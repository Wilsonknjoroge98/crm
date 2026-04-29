const { supabaseService } = require('../services/supabase');
const dayjs = require('dayjs');
const logger = require('firebase-functions/logger');

const updatePolicyStatus = async () => {
  const todaysDate = dayjs().format('YYYY-MM-DD');
  const { error } = await supabaseService
    .from('policies')
    .update({ policy_status: 'active' })
    .eq('effective_date', todaysDate);

  if (error) {
    logger.error('Error updating policy status:', error);
  }
};

module.exports = { updatePolicyStatus };
