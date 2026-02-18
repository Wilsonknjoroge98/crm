const { createClient } = require('@supabase/supabase-js');
const logger = require('firebase-functions/logger');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
);


const authMiddleware = async (req, res, next) => {
    // get the url and method of the request
    try {
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            logger.warn('Authorization header missing');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.replace('Bearer ', '');

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            if (error) logger.error('Auth error in auth.js', error);
            else logger.warn('Auth user missing in auth.js');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

        // TODO: consider trigger inside supabase on insert to auth.users to automatically create profile
        logger.log('Auth profile', profile);
        if (profile == null ) {
            logger.log('Creating profile for user: ', user.id);

            await supabase.from('profiles').insert({ id: user.id, role: 'agent' });
            const { data: newProfile, error: newProfileError } = (await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single());

            if (newProfileError) {
                logger.error('Auth profile error in auth.js', newProfileError);
                return res.status(500).json({ error: 'Internal server error' });
            }

            profile = newProfile;
            logger.log('Auth profile after insert', profile);
        }
        if (profileError) {
            logger.error('Auth profile error in auth.js', profileError);
            return res.status(500).json({ error: 'Internal server error' });
        }

        const { data: agent, error: agentError } = await supabase
            .from('agents')
            .select('*')
            .eq('auth_user_id', user.id)
            .maybeSingle();

        logger.log('Agent', agent);
        if (agentError) {
            logger.error('Agent error in auth.js', agentError);
            return res.status(403).json({ error: 'Forbidden' });
        }

        req.user = {
            id: user.id,
            role: profile.role,
        };

        req.agent = agent;

        next();
    } catch (err) {
        logger.error('Auth middleware error in auth.js', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { authMiddleware };
