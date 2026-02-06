const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function authMiddleware(req, res, next) {
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

        const { data: roles, error: rolesError } = await supabase
            .from('roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

        if (rolesError) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        req.user = {
            role: roles.role,
        };

        next();
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = authMiddleware;
