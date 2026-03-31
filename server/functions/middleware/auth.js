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
    const supabase = createPublicClient(authHeader);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      if (error) logger.error('Auth error in auth.js', error);
      else logger.warn('Auth user missing in auth.js', { token });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    // TODO: consider trigger inside supabase on insert to auth.users to automatically create profile
    logger.log('Auth profile', profile);
    if (profile == null) {
      logger.log('Creating profile for user: ', user.id);

      // Must use service role — public client will be blocked by RLS on profiles
      // Use upsert with ignoreDuplicates to handle concurrent requests for the same user
      // that both see a null profile and race to insert
      const { error: insertError } = await supabaseService
        .from('profiles')
        .upsert(
          { id: user.id, role: 'agent' },
          { onConflict: 'id', ignoreDuplicates: true },
        );

      if (insertError) {
        logger.error('Auth profile insert error in auth.js', insertError);
        return res.status(500).json({ error: 'Internal server error' });
      }

      const { data: newProfile, error: newProfileError } = await supabaseService
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (newProfileError || !newProfile) {
        logger.error(
          'Auth profile fetch after insert error in auth.js',
          newProfileError,
        );
        return res.status(500).json({ error: 'Internal server error' });
      }

      profile = newProfile;
      logger.log('Auth profile after insert', profile);
    }
    if (profileError) {
      logger.error('Auth profile error in auth.js', profileError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    console.log('Identified user', {
      id: user.id,
      email: user.email,
      role: profile.role,
    });

    const { data: agent, error: agentError } = await supabaseService
      .from('agents')
      .select('*')
      .eq('id', user.id)
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
