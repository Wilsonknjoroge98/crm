const cors = require('cors');
const express = require('express');
const axios = require('axios');
const app = express();
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);
const logger = require('firebase-functions/logger');
// eslint-disable-next-line no-unused-vars
const { PRODUCT_RATES } = require('./constants');
const { authMiddleware } = require('./middleware/auth');
const { Firestore, Timestamp } = require('firebase-admin/firestore');
const admin = require('firebase-admin');
const {
  agentRouter,
  policyRouter,
  leadRouter,
  clientRouter,
  teamLeaderboardRouter,
  summaryRouter,
  hierarchyRouter,
  eventsRouter,
  expensesRouter,
  leaderboardRouter,
  publicRouter,
  inviteRouter,
  leadVendorsRouter,
  carriersRouter,
  insightsRouter,
  gsqRouter,
  commissionsRouter,
  bulkUploadRouter,
} = require('./endpoints');

admin.initializeApp();
app.use(
  cors({
    origin: [
      'https://crm-dev-dde35.web.app',
      'https://fearless-ins.com',
      'https://hourglasslifegroup.com',
      'https://hourglass-ef3ca.web.app',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:4173',
    ],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(publicRouter);
app.use(authMiddleware);
app.use('/agent', agentRouter);
app.use('/invite', inviteRouter);
app.use('/policy', policyRouter);
app.use('/leads', leadRouter);
app.use('/client', clientRouter);
app.use('/lead-vendors', leadVendorsRouter);
app.use('/carriers', carriersRouter);
app.use('/team-leaderboard', teamLeaderboardRouter);
app.use('/summary', summaryRouter);
app.use('/hierarchy', hierarchyRouter);
app.use('/events', eventsRouter);
app.use('/expenses', expensesRouter);
app.use('/leaderboard', leaderboardRouter);
app.use('/insights', insightsRouter);
app.use('/gsq-account', gsqRouter);
app.use('/commissions', commissionsRouter);
app.use('/bulk-upload', bulkUploadRouter);

app.get('/ad-spend', async (req, res) => {
  const { startDate, endDate, mode } = req.query;
  // if (mode === 'development') {
  //   console.log('Development mode: returning sample data');
  //   return res.status(200).send({ total: Math.round(1234.56) });
  // }

  if (!startDate || !endDate) {
    console.error('Missing startDate or endDate');
    return res.status(400).json({ error: 'Missing startDate or endDate' });
  }

  const since = dayjs(startDate).format('YYYY-MM-DD');
  const until = dayjs(endDate).format('YYYY-MM-DD');

  console.log('Ad spend from', startDate, 'to', endDate);

  try {
    const adAccountIds = (process.env.META_AD_ACCOUNT_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    const responses = await Promise.all(
      adAccountIds.map((accountId) =>
        axios.request({
          method: 'GET',
          url: `https://graph.facebook.com/v20.0/act_${accountId}/insights`,
          params: {
            fields: 'spend',
            time_range: JSON.stringify({ since, until }),
            access_token: process.env.META_MARKETING_ACCESS_TOKEN,
          },
        }),
      ),
    );

    // Sum spend across all ad accounts (each response may have multiple rows)
    console.log(
      'Meta response data:',
      responses.map((r) => r.data),
    );
    const totalSpend = responses.reduce((sum, response) => {
      const rows = response.data['data'] || [];
      const accountSpend = rows.reduce(
        (rowSum, row) => rowSum + Number(row.spend || 0),
        0,
      );
      return sum + accountSpend;
    }, 0);

    console.log(
      `Total spend from ${startDate} to ${endDate}: $${totalSpend.toFixed(2)}`,
    );
    res.status(200).send({ total: Math.round(Number(totalSpend)) });
  } catch (error) {
    console.error(
      'Error fetching spend:',
      error.response?.data || error.message,
    );
    res.status(500).send({ error: 'Failed to fetch spend data' });
  }
});

app.get('/stripe-charges', async (req, res) => {
  const { startDate, endDate, mode } = req.query;

  logger.log('Calculating Stripe charges', {
    route: '/stripe-charges',
    method: 'GET',
    startDate,
    endDate,
    mode,
  });

  // if (mode === 'development') {
  //   console.log('Development mode: returning sample data');
  //   return res.status(200).send({ total: Math.round(12345.67) });
  // }

  if (!startDate || !endDate) {
    logger.error('Missing startDate or endDate', {
      route: '/stripe-charges',
      method: 'GET',
      startDate,
      endDate,
      mode,
    });
    return res.status(400).send({ error: 'Missing startDate or endDate' });
  }

  const startTimestamp = dayjs
    .tz(startDate, 'America/Los_Angeles')
    .startOf('day')
    .unix();
  const endTimestamp = dayjs
    .tz(endDate, 'America/Los_Angeles')
    .endOf('day')
    .unix();

  console.log('Reconciliation from', startDate, 'to', endDate);

  try {
    let totalRevenue = 0;
    let hasMore = true;
    let startingAfter = null;

    while (hasMore) {
      const response = await axios.get('https://api.stripe.com/v1/charges', {
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        },
        params: {
          limit: 100,
          created: {
            gte: startTimestamp,
            lte: endTimestamp,
          },
          ...(startingAfter && { starting_after: startingAfter }),
        },
      });

      const charges = response.data.data;
      const DO_NOT_INCLUDE = ['sheamoralesffl@gmail.com'];
      charges.forEach((charge) => {
        if (
          charge.paid &&
          !charge.refunded &&
          !DO_NOT_INCLUDE.includes(charge.billing_details.email)
        ) {
          totalRevenue += charge.amount; // Amount is in cents
        }
      });

      hasMore = response.data.has_more;
      if (hasMore) {
        startingAfter = charges[charges.length - 1].id;
      }
    }

    logger.log(
      `Total revenue from ${startDate} to ${endDate}: $${(
        totalRevenue / 100
      ).toLocaleString()}`,
    );

    const total = totalRevenue / 100;
    res.status(200).send({ total });
  } catch (error) {
    console.error(
      'Error fetching Stripe revenue:',
      error.response?.data || error.message,
    );
    res.status(500).send({ error: 'Failed to fetch revenue data' });
  }
});

app.post('/expense', async (req, res) => {
  console.log('Creating expense');
  const db = new Firestore();
  const { name, amount, date } = req.body;

  if (!name || !amount || !date) {
    return res.status(400).json({ error: 'Missing name, amount, or date' });
  }

  try {
    const expenseRef = await db.collection('expenses').add({
      name,
      amount: Math.round(Number(amount)),
      date,
      createdAt: Timestamp.now(),
    });
    res.status(201).json({
      id: expenseRef.id,
      name,
      amount: Math.round(Number(amount)),
      date,
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

app.post('/error', async (req, res) => {
  const { message, stack, route, uid } = req.body;

  if (!message || !stack || !route || !uid) {
    res.status(400).send({ message: 'Invalid request' });
    return;
  }

  const firestore = new Firestore();
  const errorRef = firestore.collection('errors').doc(uid);

  const errorSnapshot = await errorRef.get();

  if (errorSnapshot.exists) {
    console.log('Error already exists:', uid);
    res.status(200).send({ message: 'Error already logged' });
    return;
  }

  const doc = {
    message,
    stack,
    route,
    uid,
    createdAt: Timestamp.now(),
  };

  if (errorSnapshot.exists) {
    await errorRef.update(doc);
  } else {
    await errorRef.set(doc);
  }

  res.status(200).send({ message: 'Error saved successfully' });
});

module.exports = app;
