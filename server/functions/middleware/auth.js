const logger = require('firebase-functions/logger');
const { createPublicClient, supabaseService } = require('../services/supabase');

const authMiddleware = async (req, res, next) => {
  // get the url and method of the request
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      logger.warn('Authorization header missing');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');

    const {
      data: { user },
      error,
    } = await supabaseService.auth.getUser(token);

    const supabase = createPublicClient(req.headers.authorization);

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
    if (profile == null) {
      logger.log('Creating profile for user: ', user.id);

      await supabase.from('profiles').insert({ id: user.id, role: 'agent' });
      const { data: newProfile, error: newProfileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

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
      .eq('id', user.id)
      .maybeSingle();

    logger.log('Agent', agent);
    if (agentError) {
      logger.error('Agent error in auth.js', agentError);
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!agent) {
      logger.warn('No agent record found for user in auth.js', {
        userId: user.id,
      });
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.user = {
      id: user.id,
      role: profile.role,
    };

    req.supabase = supabase;
    req.agent = agent;
    req.logData = {
      route: req.originalUrl,
      method: req.method,
      requesterId: user.id,
    };

    next();
  } catch (err) {
    logger.error('Auth middleware error in auth.js', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { authMiddleware };
