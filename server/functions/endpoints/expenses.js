const express = require('express');
const logger = require('firebase-functions/logger');
const { supabaseService } = require('../services/supabase');

// eslint-disable-next-line new-cap
const expensesRouter = express.Router();

expensesRouter.get('/all', async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    logger.log('Fetching all expenses', {
      route: '/expenses/all',
      method: 'GET',
      requesterId: req.agent?.id,
    });

    let query = supabaseService
      .from('expenses')
      .select('id, agent_id, name, amount, created_at, updated_at, date')
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00`);
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59.999`);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching all expenses in endpoints/expenses.js', {
        route: '/expenses/all',
        method: 'GET',
        requesterId: req.agent?.id,
        error,
      });
      return res.status(500).json({ error: 'Failed to fetch expenses' });
    }

    return res.status(200).json(data);
  } catch (error) {
    logger.error(
      'Unexpected error fetching all expenses in endpoints/expenses.js',
      {
        route: '/expenses/all',
        method: 'GET',
        requesterId: req.agent?.id,
        error,
      },
    );
    return res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

expensesRouter.get('/', async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    logger.log('Fetching expenses', {
      route: '/expenses',
      method: 'GET',
      requesterId: req.agent?.id,
    });

    let query = supabaseService
      .from('expenses')
      .select('id, agent_id, name, amount, created_at, updated_at')
      .eq('agent_id', req.agent.id)
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00`);
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59.999`);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching expenses in endpoints/expenses.js', {
        route: '/expenses',
        method: 'GET',
        requesterId: req.agent?.id,
        error,
      });
      return res.status(500).json({ error: 'Failed to fetch expenses' });
    }

    return res.status(200).json(data);
  } catch (error) {
    logger.error(
      'Unexpected error fetching expenses in endpoints/expenses.js',
      {
        route: '/expenses',
        method: 'GET',
        requesterId: req.agent?.id,
        error,
      },
    );
    return res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

expensesRouter.post('/', async (req, res) => {
  const { name, amount, date } = req.body;

  if (!name || amount == null || !date) {
    return res.status(400).json({ error: 'Missing name, amount, or date' });
  }

  try {
    logger.log('Creating expense', {
      route: '/expenses',
      method: 'POST',
      requesterId: req.agent?.id,
    });

    const { data, error } = await supabaseService
      .from('expenses')
      .insert({ agent_id: req.agent.id, name, amount: Number(amount), date })
      .select('id, agent_id, name, amount, date, created_at, updated_at')
      .single();

    if (error) {
      logger.error('Error creating expense in endpoints/expenses.js', {
        route: '/expenses',
        method: 'POST',
        requesterId: req.agent?.id,
        error,
      });
      return res.status(500).json({ error: 'Failed to create expense' });
    }

    return res.status(201).json(data);
  } catch (error) {
    logger.error('Unexpected error creating expense in endpoints/expenses.js', {
      route: '/expenses',
      method: 'POST',
      requesterId: req.agent?.id,
      error,
    });
    return res.status(500).json({ error: 'Failed to create expense' });
  }
});

// DELETE /expenses/:id — delete an expense owned by the authenticated agent
expensesRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    logger.log('Deleting expense', {
      route: '/expenses/:id',
      method: 'DELETE',
      requesterId: req.agent?.id,
      expenseId: id,
    });

    const { error } = await supabaseService
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('agent_id', req.agent.id);

    if (error) {
      logger.error('Error deleting expense in endpoints/expenses.js', {
        route: '/expenses/:id',
        method: 'DELETE',
        requesterId: req.agent?.id,
        expenseId: id,
        error,
      });
      return res.status(500).json({ error: 'Failed to delete expense' });
    }

    return res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error) {
    logger.error('Unexpected error deleting expense in endpoints/expenses.js', {
      route: '/expenses/:id',
      method: 'DELETE',
      requesterId: req.agent?.id,
      expenseId: id,
      error,
    });
    return res.status(500).json({ error: 'Failed to delete expense' });
  }
});

module.exports = expensesRouter;
