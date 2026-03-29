import axios from 'axios';
import store from './redux/store';
import { supabase } from './supabase.js';

const isDev = import.meta.env.MODE === 'development';

// CHECK IF STAGING HOSTING SUBSTRING IN URL
const isStaging = window.location.hostname.includes('crm-dev-dde35');

const BASE_URL = isDev
  ? import.meta.env.VITE_DEV_URL
  : isStaging
    ? import.meta.env.VITE_STAGING_URL
    : import.meta.env.VITE_PROD_URL;

export const apiClient = axios.create({
  baseURL: BASE_URL,
});
apiClient.interceptors.request.use(async (config) => {
  // can't use a selector for redux state since we aren't in a react component
  const token = (await supabase.auth.getSession())?.data?.session?.access_token;
  // console.log('Attaching token to request:', token);
  // if the token exists, add it to the request headers
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
const getOrganizations = async () => {
  const options = {
    method: 'GET',
    url: '/organizations',
    params: {
      mode: import.meta.env.MODE,
    },
  };
  try {
    const response = await apiClient.request(options);
    return response.data;
  } catch (error) {
    console.error('Error getting organizations:', error);
    throw error;
  }
};
const getClients = async () => {
  // request config for compulife server
  console.log('Fetching clients');
  const options = {
    method: 'GET',
    url: 'client',
    // signal: signal,
    params: {
      mode: import.meta.env.MODE,
    },
  };

  try {
    const response = await apiClient(options);

    return response.data;
  } catch (error) {
    console.error('Error getting clients:', error);
    // Rethrow for React Query to recognize it
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;

      if (status === 500) {
        return { error: 'Internal Server Error' };
      }
    }

    throw error;
  }
};

const getLeads = async ({ data }) => {
  console.log('Fetching leads with data:', data);

  // request config for compulife server
  const options = {
    method: 'GET',
    // signal: signal,
    url: '/lead',
    params: {
      mode: import.meta.env.MODE,
    },
  };

  // abort request when notified by react-query
  // signal?.addEventListener('abort', () => {
  //   controller.abort();
  // });

  try {
    const response = await apiClient.request(options);

    return response.data;
  } catch (error) {
    console.error('Error getting leads:', error);
    // Rethrow for React Query to recognize it
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;

      if (status === 500) {
        return { error: 'Internal Server Error' };
      }
    }

    throw error;
  }
};

const patchAccount = async ({ data }) => {
  console.log('Updating client account', data);
  const options = {
    method: 'PATCH',
    data: { account: data, mode: import.meta.env.MODE },
    url: '/customer-account',
  };
  try {
    const response = await apiClient.request(options);
    return response.data;
  } catch (error) {
    console.error('Error updating account:', error);
    throw error;
  }
};

const getAccount = async ({ email }) => {
  console.log('Getting client account', email);

  const options = {
    method: 'GET',
    // signal: signal,
    url: '/customer-account',
    params: {
      email: email,
      mode: import.meta.env.MODE,
    },
  };

  try {
    const response = await apiClient.request(options);

    return response.data;
  } catch (error) {
    console.error('Error getting account:', error);
    // Rethrow for React Query to recognize it
    throw error;
  }
};

const getPremiumLeaderboard = async ({ startDate, endDate, agency }) => {
  const options = {
    method: 'GET',
    url: '/leaderboard',
    params: {
      startDate,
      endDate,
      orgId: agency,
    },
  };

  try {
    const response = await apiClient.request(options);

    return response.data;
  } catch (error) {
    console.error('Error getting policies:', error);
    // Rethrow for React Query to recognize it
    if (axios.isAxiosError(error)) {
      // Optional: normalize structure
      const status = error.response?.status ?? 500;
      const message = error.response?.data?.message || error.message;
      const err = new Error(message);
      err.status = status;
      throw err;
    }
    throw error;
  }
};

const getPremiumPerLead = async ({ agency }) => {
  // request config for compulife server
  const options = {
    method: 'GET',
    url: 'premiums/per-lead',
    params: {
      mode: import.meta.env.MODE,

      agency,
    },
  };

  try {
    const response = await apiClient.request(options);

    return response.data;
  } catch (error) {
    console.error('Error getting policies:', error);
    // Rethrow for React Query to recognize it
    if (axios.isAxiosError(error)) {
      // Optional: normalize structure
      const status = error.response?.status ?? 500;
      const message = error.response?.data?.message || error.message;
      const err = new Error(message);
      err.status = status;
      throw err;
    }
    throw error;
  }
};

const getMonthlyPremiums = async ({ agency }) => {
  // request config for compulife server
  const options = {
    method: 'GET',
    url: `premiums/monthly`,
    params: {
      mode: import.meta.env.MODE,
      agency,
    },
  };

  try {
    const response = await apiClient.request(options);

    return response.data;
  } catch (error) {
    console.error('Error getting policies:', error);
    // Rethrow for React Query to recognize it
    if (axios.isAxiosError(error)) {
      // Optional: normalize structure
      const status = error.response?.status ?? 500;
      const message = error.response?.data?.message || error.message;
      const err = new Error(message);
      err.status = status;
      throw err;
    }
    throw error;
  }
};

const getPersistencyRates = async ({ agency }) => {
  // request config for compulife server
  const options = {
    method: 'GET',
    url: '/persistency-rates',
    params: {
      mode: import.meta.env.MODE,
      agency,
    },
  };

  try {
    const response = await apiClient.request(options);

    return response.data;
  } catch (error) {
    console.error('Error getting policies:', error);
    // Rethrow for React Query to recognize it
    if (axios.isAxiosError(error)) {
      // Optional: normalize structure
      const status = error.response?.status ?? 500;
      const message = error.response?.data?.message || error.message;
      const err = new Error(message);
      err.status = status;
      throw err;
    }
    throw error;
  }
};

const getCloseRates = async ({ agency }) => {
  // request config for compulife server
  const options = {
    method: 'GET',
    url: '/close-rates',
    params: {
      mode: import.meta.env.MODE,

      agency,
    },
  };

  try {
    const response = await apiClient.request(options);

    return response.data;
  } catch (error) {
    console.error('Error getting policies:', error);
    // Rethrow for React Query to recognize it
    if (axios.isAxiosError(error)) {
      // Optional: normalize structure
      const status = error.response?.status ?? 500;
      const message = error.response?.data?.message || error.message;
      const err = new Error(message);
      err.status = status;
      throw err;
    }
    throw error;
  }
};

const getPolicyStatuses = async ({ agency }) => {
  // request config for compulife server
  const options = {
    method: 'GET',
    url: '/policies/statuses',
    params: {
      mode: import.meta.env.MODE,

      agency,
    },
  };

  try {
    const response = await apiClient.request(options);

    return response.data;
  } catch (error) {
    console.error('Error getting policies:', error);
    // Rethrow for React Query to recognize it
    if (axios.isAxiosError(error)) {
      // Optional: normalize structure
      const status = error.response?.status ?? 500;
      const message = error.response?.data?.message || error.message;
      const err = new Error(message);
      err.status = status;
      throw err;
    }
    throw error;
  }
};

const getStripeCharges = async ({ startDate, endDate }) => {
  console.log('Fetching revenue for dates:', startDate, endDate);

  // request config for compulife server
  const options = {
    method: 'GET',
    url: '/stripe-charges',
    params: {
      startDate,
      endDate,
      mode: import.meta.env.MODE,
    },
  };

  try {
    const response = await apiClient.request(options);
    return response.data;
  } catch (error) {
    console.error('Error getting revenue:', error);
    throw error;
  }
};

const getAdSpend = async ({ startDate, endDate }) => {
  console.log('Fetching ad spend for dates:', startDate, endDate);
  // request config for compulife server
  const options = {
    method: 'GET',
    url: '/ad-spend',
    params: {
      startDate,
      endDate,
      mode: import.meta.env.MODE,
    },
  };
  try {
    const response = await apiClient.request(options);
    return response.data;
  } catch (error) {
    console.error('Error getting ad spend:', error);
    throw error;
  }
};

const getCommissions = async ({ startDate, endDate, agent }) => {
  // request config for compulife server
  const options = {
    method: 'GET',
    // signal: signal,
    url: '/commissions',
    params: {
      mode: import.meta.env.MODE,
      startDate,
      endDate,
      agent: { id: agent?.id, role: agent?.role },
    },
  };

  // abort request when notified by react-query
  // signal?.addEventListener('abort', () => {
  //   controller.abort();
  // });

  try {
    const response = await apiClient.request(options);

    console.log('Commissions fetched:', response.data);

    return response.data;
  } catch (error) {
    console.error('Error getting commissions:', error);

    throw error;
  }
};

const getPolicies = async ({ agentId, startDate, endDate } = {}) => {
  const params = {};
  if (agentId) params.agentId = agentId;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const options = {
    method: 'GET',
    url: '/policy',
    params: Object.keys(params).length ? params : undefined,
  };

  try {
    const response = await apiClient.request(options);
    console.log('Policies fetched:', response.data);

    return response.data;
  } catch (error) {
    // Rethrow for React Query to recognize it
    if (axios.isAxiosError(error)) {
      // Optional: normalize structure
      const status = error.response?.status ?? 500;
      const message = error.response?.data?.message || error.message;
      const err = new Error(message);
      err.status = status;
      throw err;
    }
    throw error;
  }
};

const postClient = async ({ data }) => {
  console.log('Posting client:', data);

  // client side validation
  if (!data) {
    throw new Error('Missing data');
  }

  const controller = new AbortController();
  // request config for custom firebase endpoint
  const options = {
    method: 'POST',
    data: { client: data, mode: import.meta.env.MODE },
    signal: controller.signal,
    url: 'client',
  };

  try {
    const response = await apiClient.request(options);

    // return to component
    return response.data;
  } catch (error) {
    console.error('Error posting policy:', error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;

      if (status === 409) throw new Error('Client already exists');
      throw new Error('Internal Server Error');
    }

    throw error;
  }
};

const patchClient = async ({ data }) => {
  console.log('Patching client:', data);

  const { clientId, client } = data || {};

  // client side validation
  if (!client) {
    throw new Error('Missing data');
  }

  const controller = new AbortController();
  // request config for custom firebase endpoint
  const options = {
    method: 'PATCH',
    data: { clientId: clientId, client: client, mode: import.meta.env.MODE },
    signal: controller.signal,
    url: 'client',
  };

  // response from server
  const response = await apiClient.request(options);

  // return to component
  return response.data;
};

const postAgent = async ({ data }) => {
  // client side validation

  if (!data) {
    throw new Error('Missing data');
  }

  const controller = new AbortController();
  // request config for custom firebase endpoint
  const options = {
    method: 'POST',
    data: { agent: data, mode: import.meta.env.MODE },
    signal: controller.signal,
    url: 'agent',
  };
  // response from server
  const response = await apiClient.request(options);
  // return to component
  return response.data;
};

const getAgent = async ({ data }) => {
  const { id } = data || {};

  if (!id) {
    throw new Error('Missing UID');
  }

  // request config for compulife server
  const options = {
    method: 'GET',
    url: 'agent',
    params: { uid: id, mode: import.meta.env.MODE },
  };

  try {
    const response = await apiClient.request(options);

    return response.data;
  } catch (error) {
    // Rethrow for React Query to recognize it
    if (axios.isAxiosError(error)) {
      // Optional: normalize structure
      const status = error.response?.status ?? 500;
      const message = error.response?.data?.message || error.message;
      const err = new Error(message);
      err.status = status;
      throw err;
    }
    throw error;
  }
};

const patchAgent = async ({ agentId, agent }) => {
  const options = {
    method: 'PATCH',
    data: { agentId, agent, mode: import.meta.env.MODE },
    url: '/agent',
  };
  const response = await apiClient.request(options);
  return response.data;
};

const getAgents = async () => {
  // request config for compulife server
  const options = {
    method: 'GET',
    url: '/agent/all',
    params: { mode: import.meta.env.MODE },
  };

  try {
    const response = await apiClient.request(options);

    return response.data;
  } catch (error) {
    // Rethrow for React Query to recognize it
    if (axios.isAxiosError(error)) {
      // Optional: normalize structure
      const status = error.response?.status ?? 500;
      const message = error.response?.data?.message || error.message;
      const err = new Error(message);
      err.status = status;
      throw err;
    }
    throw error;
  }
};

const deleteExpense = async ({ expenseId }) => {
  if (!expenseId) {
    throw new Error('Missing expense ID');
  }

  const controller = new AbortController();
  const options = {
    method: 'DELETE',
    signal: controller.signal,
    url: `/expenses/${expenseId}`,
  };

  const response = await apiClient.request(options);
  return response.data;
};

const postExpense = async ({ name, amount }) => {
  if (!name || amount == null) {
    throw new Error('Missing name or amount');
  }

  const controller = new AbortController();
  const options = {
    method: 'POST',
    data: { name, amount },
    signal: controller.signal,
    url: '/expenses',
  };

  try {
    // response from server
    const response = await apiClient.request(options);

    // return to component
    return response.data;
  } catch (error) {
    console.error('Error posting expense:', error);

    if (axios.isAxiosError(error)) {
      throw new Error('Internal Server Error');
    }

    throw error;
  }
};

const getExpenses = async ({ startDate, endDate }) => {
  const options = {
    method: 'GET',
    url: '/expenses',
    params: { startDate, endDate },
  };
  try {
    const response = await apiClient.request(options);
    return response.data;
  } catch (error) {
    console.error('Error getting expenses:', error);
    throw error;
  }
};

const getAllExpenses = async ({ startDate, endDate }) => {
  const options = {
    method: 'GET',
    url: '/expenses/all',
    params: { startDate, endDate },
  };
  try {
    const response = await apiClient.request(options);
    return response.data;
  } catch (error) {
    console.error('Error getting all expenses:', error);
    throw error;
  }
};

const getInsights = async ({ startDate, endDate }) => {
  // request config for compulife server
  const options = {
    method: 'GET',
    url: '/insights',
    params: { mode: import.meta.env.MODE, startDate, endDate },
  };

  try {
    const response = await apiClient.request(options);

    return response.data;
  } catch (error) {
    // Rethrow for React Query to recognize it
    if (axios.isAxiosError(error)) {
      // Optional: normalize structure
      const status = error.response?.status ?? 500;
      const message = error.response?.data?.message || error.message;
      const err = new Error(message);
      err.status = status;
      throw err;
    }
    throw error;
  }
};

const patchPolicy = async ({ data }) => {
  console.log({ data });

  // client side validation
  if (!data) {
    throw new Error('Missing data');
  }

  const controller = new AbortController();
  // request config for custom firebase endpoint
  const options = {
    method: 'PATCH',
    data: { policyId: data.id, policy: data, mode: import.meta.env.MODE },
    signal: controller.signal,
    url: '/policy',
  };

  // response from server
  const response = await apiClient.request(options);

  // return to component
  return response.data;
};

const deletePolicy = async ({ data }) => {
  const { policyId } = data || {};

  if (!policyId) {
    throw new Error('Missing policy ID');
  }

  const controller = new AbortController();
  const options = {
    method: 'DELETE',
    data: { policyId, mode: import.meta.env.MODE },
    signal: controller.signal,
    url: '/policy',
  };

  const response = await apiClient.request(options);
  return response.data;
};

const postPolicy = async ({ data }) => {
  const { policy, client_id } = data || {};

  console.log('Posting policy:', data);

  if (!policy || !client_id) {
    console.log('missing data');
    throw new Error('Missing data');
  }

  console.log('Posting Policy: ', policy);

  const options = {
    method: 'POST',
    url: '/policy',
    data: {
      policy: policy,
      client_id: client_id,
      mode: import.meta.env.MODE,
    },
  };
  try {
    const response = await apiClient.request(options);
    return response.data;
  } catch (error) {
    console.error('Error posting policy:', error);
    throw error;
  }
};

const deleteClient = async ({ data }) => {
  const { clientId } = data || {};

  console.log('Deleting client with ID:', clientId);
  // client side validation
  if (!clientId) {
    throw new Error('Missing client ID');
  }

  const controller = new AbortController();
  // request config for custom firebase endpoint
  const options = {
    method: 'DELETE',
    data: { clientId: clientId, mode: import.meta.env.MODE },
    signal: controller.signal,
    url: '/client',
  };

  // response from server
  const response = await apiClient.request(options);
  console.log('Delete response:', response.data);
  // return to component
  return response.data;
};

const postError = async (data) => {
  if (!data?.message || !data?.stack || !data?.route || !data?.uid) {
    throw new Error('Missing data');
  }

  const controller = new AbortController();

  const options = {
    method: 'POST',
    data: data,
    signal: controller.signal,
    url: '/error',
  };

  const response = await apiClient.request(options);

  return response.data;
};

const getCarriers = async () => {
  const options = {
    method: 'GET',
    url: '/carriers',
    params: { mode: import.meta.env.MODE },
  };
  try {
    const response = await apiClient.request(options);
    return response.data;
  } catch (error) {
    console.error('Error getting carriers:', error);
    throw error;
  }
};

const getProducts = async () => {
  const options = {
    method: 'GET',
    url: '/carriers/products',
    params: { mode: import.meta.env.MODE },
  };
  try {
    const response = await apiClient.request(options);
    return response.data;
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
};

const getLeadVendors = async () => {
  const options = {
    method: 'GET',
    url: '/lead-vendors',
    params: { mode: import.meta.env.MODE },
  };
  try {
    const response = await apiClient.request(options);
    return response.data;
  } catch (error) {
    console.error('Error getting lead vendors:', error);
    throw error;
  }
};

const getEvents = async ({ limit } = {}) => {
  const options = {
    method: 'GET',
    url: '/events',
    params: { limit, mode: import.meta.env.MODE },
  };
  try {
    const response = await apiClient.request(options);
    return response.data;
  } catch (error) {
    console.error('Error getting events:', error);
    throw error;
  }
};

const getHierarchy = async () => {
  const options = {
    method: 'GET',
    url: '/hierarchy',
    params: { mode: import.meta.env.MODE },
  };
  try {
    const response = await apiClient.request(options);
    return response.data;
  } catch (error) {
    console.error('Error getting hierarchy:', error);
    throw error;
  }
};

const getTeamLeaderboard = async ({ startDate, endDate }) => {
  const options = {
    method: 'GET',
    url: '/team-leaderboard',
    params: { startDate, endDate, mode: import.meta.env.MODE },
  };
  try {
    const response = await apiClient.request(options);
    return response.data;
  } catch (error) {
    console.error('Error getting team leaderboard:', error);
    throw error;
  }
};

const getPersonalSummary = async ({ startDate, endDate }) => {
  const options = {
    method: 'GET',
    url: '/summary/personal',
    params: { startDate, endDate, mode: import.meta.env.MODE },
  };
  try {
    const response = await apiClient.request(options);
    return response.data;
  } catch (error) {
    console.error('Error getting personal summary:', error);
    throw error;
  }
};

const getTeamSummary = async ({ startDate, endDate }) => {
  const options = {
    method: 'GET',
    url: '/summary/team',
    params: { startDate, endDate, mode: import.meta.env.MODE },
  };
  try {
    const response = await apiClient.request(options);
    return response.data;
  } catch (error) {
    console.error('Error getting team summary:', error);
    throw error;
  }
};

const createInvite = async () => {
  const response = await apiClient.request({ method: 'POST', url: '/invite' });
  return response.data;
};

const validateInvite = async (token) => {
  const response = await apiClient.request({
    method: 'GET',
    url: '/invite/validate',
    params: { token },
  });
  return response.data;
};

export {
  getClients,
  getPolicies,
  getAccount,
  postClient,
  patchClient,
  postPolicy,
  patchPolicy,
  postAgent,
  getOrganizations,
  getAgent,
  deleteClient,
  deletePolicy,
  getAgents,
  patchAgent,
  getInsights,
  getPremiumLeaderboard,
  getMonthlyPremiums,
  getPremiumPerLead,
  getStripeCharges,
  getPolicyStatuses,
  getPersistencyRates,
  getCloseRates,
  postExpense,
  deleteExpense,
  getExpenses,
  getAllExpenses,
  getAdSpend,
  getCommissions,
  getLeads,
  patchAccount,
  postError,
  createInvite,
  validateInvite,
  getLeadVendors,
  getCarriers,
  getProducts,
  getTeamSummary,
  getPersonalSummary,
  getTeamLeaderboard,
  getHierarchy,
  getEvents,
};
