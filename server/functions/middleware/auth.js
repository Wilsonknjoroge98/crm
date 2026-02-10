const { createClient } = require('@supabase/supabase-js');
const logger = require('firebase-functions/logger');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const authMiddleware = async (req, res, next) =>{
    try {
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        logger.log('Auth profile', profile);
        if (profileError) {
            logger.error(profileError);
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { data: agent, error: agentError } = await supabase
            .from('agents')
            .select('*')
            .eq('auth_user_id', user.id)
            .maybeSingle();

        logger.log('Agent', agent);
        if (agentError) {
            logger.error('Agent error', agentError);
            return res.status(403).json({ error: 'Forbidden' });
        }

        req.user = {
            id: user.id,
            role: profile.role,
        };

        req.agent = agent;

        next();
    } catch (err) {
        logger.error('Auth middleware error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { authMiddleware };
