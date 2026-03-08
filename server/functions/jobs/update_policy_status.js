const { supabaseService } = require('../services/supabase');

const updatePolicyStatus = async () => {
    // get all policies that are not sold and effective_date lte today and set to sold
    const todaysDate = new Date().toISOString().split('T')[0];
    const { error } = await supabaseService.from('policies')
        .update({ policy_status: 'effective' })
        .lte('effective_date', todaysDate);
};

module.exports = { updatePolicyStatus };
