import axios from 'axios';
import store from './redux/store'
import {supabase} from "./supabase.js";




// this can be one line that could be shoved into the create axios client function, but it would probably sacrifice on
// readability in exchange for cleaner looking code

const isDev = import.meta.env.MODE === 'development';

// CHECK IF STAGING HOSTING SUBSTRING IN URL
const isStaging = window.location.hostname.includes('crm-dev-dde35');

const BASE_URL = isDev
    ? import.meta.env.VITE_DEV_URL
    : isStaging
        ? import.meta.env.VITE_STAGING_URL
        : import.meta.env.VITE_API_URL;

export const apiClient = axios.create({
  baseURL: BASE_URL,
});
apiClient.interceptors.request.use(
    async (config) => {

       // can't use a selector for redux state since we aren't in a react component
       const token = await supabase.auth.getSession()?.access_token;
       // if the token exists, add it to the request headers
       if (token) {
         config.headers.Authorization = `Bearer ${token}`;
       }
       return config;

    }
)



const getClients = async ({ token, data }) => {
  // request config for compulife server
  const options = {
    method: 'GET',
    url: '/clients',
    // signal: signal,
    params: {
      mode: import.meta.env.MODE,
    },
  };

  try {
    const response = await axios.request(options);

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

const getLeads = async ({ token, data }) => {
  console.log('Fetching leads with data:', data);

  // request config for compulife server
  const options = {

    method: 'GET',
    // signal: signal,
    url: '/leads',
    params: {

      mode: import.meta.env.MODE,
    },
  };

  // abort request when notified by react-query
  // signal?.addEventListener('abort', () => {
  //   controller.abort();
  // });

  try {
    const response = await axios.request(options);

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

const patchAccount = async ({ token, data }) => {


  console.log('Updating client account', data);
  const options = {

    method: 'PATCH',
    data: { account: data, mode: import.meta.env.MODE },
    url: '/customer_account'
  };
  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    console.error('Error updating account:', error);
    throw error;
  }
};

const getAccount = async ({ token, email }) => {


  console.log('Getting client account', email);

  const options = {
    method: 'GET',
    // signal: signal,
    url:'customer_account',
    params: {
      email: email,
      mode: import.meta.env.MODE,
    },
  };

  try {
    const response = await axios.request(options);

    return response.data;
  } catch (error) {
    console.error('Error getting account:', error);
    // Rethrow for React Query to recognize it
    throw error;
  }
};

const getPremiumLeaderboard = async ({ token, startDate, endDate, agency }) => {

  // request config for compulife server
  const options = {
    method: 'GET',
    url: 'premiums',
    params: {
      mode: import.meta.env.MODE,
      startDate,
      endDate,
      agency,
    },
  };

  try {
    const response = await axios.request(options);

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

const getPremiumPerLead = async ({ token, agency }) => {

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
    const response = await axios.request(options);

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

const getMonthlyPremiums = async ({ token, agency }) => {


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
    const response = await axios.request(options);

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

const getPersistencyRates = async ({ token, agency }) => {

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
    const response = await axios.request(options);

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

const getCloseRates = async ({ token, agency }) => {
  const isDev = import.meta.env.DEV;

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
    const response = await axios.request(options);

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

const getPolicyStatuses = async ({ token, agency }) => {
  const isDev = import.meta.env.DEV;

  // request config for compulife server
  const options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: 'GET',
    url: isDev ? `${DEV_URL}/policies/statuses` : `${BASE_URL}/policies/statuses`,
    params: {
      mode: import.meta.env.MODE,

      agency,
    },
  };

  try {
    const response = await axios.request(options);

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

const getStripeCharges = async ({ token, startDate, endDate }) => {
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
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    console.error('Error getting revenue:', error);
    throw error;
  }
};

const getAdSpend = async ({ token, startDate, endDate }) => {
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
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    console.error('Error getting ad spend:', error);
    throw error;
  }
};

const getCommissions = async ({ token, startDate, endDate, agent }) => {
  // request config for compulife server
  const options = {
    method: 'GET',
    // signal: signal,
    url: '/commissions',
    params: {
      mode: import.meta.env.MODE,
      startDate,
      endDate,
      agent: { uid: agent?.uid, role: agent?.role },
    },
  };

  // abort request when notified by react-query
  // signal?.addEventListener('abort', () => {
  //   controller.abort();
  // });

  try {
    const response = await axios.request(options);

    console.log('Commissions fetched:', response.data);

    return response.data;
  } catch (error) {
    console.error('Error getting commissions:', error);

    throw error;
  }
};

const getPolicies = async ({ token, data }) => {

  // request config for compulife server
  const options = {

    method: 'GET',
    // signal: signal,
    url: '/policies',
    params: {
      agentId: agentId,
      agentRole: agentRole,
      mode: import.meta.env.MODE,
      agency: agency,
    },
  };

  try {
    const response = await axios.request(options);

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

const postClient = async ({ token, data }) => {

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
    url: '/client',
  };

  try {
    const response = await axios.request(options);

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

const patchClient = async ({ token, data }) => {

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
  const response = await axios.request(options);

  // return to component
  return response.data;
};

const postAgent = async ({ token, data }) => {
  const isDev = import.meta.env.DEV;

  // client side validation

  if (!data) {
    throw new Error('Missing data');
  }

  const controller = new AbortController();
  // request config for custom firebase endpoint
  const options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: 'POST',
    data: { agent: data, mode: import.meta.env.MODE },
    signal: controller.signal,
    url: isDev ? `${DEV_URL}/agent` : `${BASE_URL}/agent`,
  };
  // response from server
  const response = await axios.request(options);
  // return to component
  return response.data;
};

const getAgent = async ({ token, data }) => {
  const isDev = import.meta.env.DEV;

  const { uid } = data || {};

  if (!uid) {
    throw new Error('Missing UID');
  }

  // request config for compulife server
  const options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: 'GET',
    url: isDev ? `${DEV_URL}/agent` : `${BASE_URL}/agent`,
    params: { uid: uid, mode: import.meta.env.MODE },
  };

  try {
    const response = await axios.request(options);

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

const getAgents = async ({ token }) => {
  const isDev = import.meta.env.DEV;

  if (!token) {
    throw new Error('Missing token');
  }

  // request config for compulife server
  const options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: 'GET',
    url: isDev ? `${DEV_URL}/agents` : `${BASE_URL}/agents`,
    params: { mode: import.meta.env.MODE },
  };

  try {
    const response = await axios.request(options);

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

const deleteExpense = async ({ token, expenseId }) => {
  const isDev = import.meta.env.DEV;

  if (!expenseId) {
    throw new Error('Missing expense ID');
  }

  const controller = new AbortController();
  // request config for custom firebase endpoint
  const options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: 'DELETE',
    data: { expenseId: expenseId, mode: import.meta.env.MODE },
    signal: controller.signal,
    url: isDev ? `${DEV_URL}/expense` : `${BASE_URL}/expense`,
  };

  // response from server
  const response = await axios.request(options);
  console.log('Delete response:', response.data);

  // return to component
  return response.data;
};

const postExpense = async ({ token, name, amount, date }) => {
  const isDev = import.meta.env.DEV;

  // client side validation
  if (!name || !amount || !date) {
    console.log('missing data');
    throw new Error('Missing data');
  }

  console.log('Posting Expense: ', { name, amount, date });

  const controller = new AbortController();
  // request config for custom firebase endpoint
  const options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: 'POST',
    data: {
      name: name,
      amount: amount,
      date: date,
      mode: import.meta.env.MODE,
    },
    signal: controller.signal,
    url: isDev ? `${DEV_URL}/expense` : `${BASE_URL}/expense`,
  };

  try {
    // response from server
    const response = await axios.request(options);

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

const getExpenses = async ({ token, startDate, endDate }) => {
  const isDev = import.meta.env.DEV;

  // request config for compulife server
  const options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: 'GET',
    url: isDev ? `${DEV_URL}/expenses` : `${BASE_URL}/expenses`,
    params: {
      startDate,
      endDate,
      mode: import.meta.env.MODE,
    },
  };
  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    console.error('Error getting expenses:', error);
    throw error;
  }
};

const getInsights = async ({ token, startDate, endDate }) => {
  const isDev = import.meta.env.DEV;

  if (!token) {
    throw new Error('Missing token');
  }

  // request config for compulife server
  const options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: 'GET',
    url: isDev ? `${DEV_URL}/insights` : `${BASE_URL}/insights`,
    params: { mode: import.meta.env.MODE, startDate, endDate },
  };

  try {
    const response = await axios.request(options);

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

const patchPolicy = async ({ token, data }) => {
  const isDev = import.meta.env.DEV;

  console.log({ token, data });

  // client side validation
  if (!data) {
    throw new Error('Missing data');
  }

  const controller = new AbortController();
  // request config for custom firebase endpoint
  const options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: 'PATCH',
    data: { policyId: data.id, policy: data, mode: import.meta.env.MODE },
    signal: controller.signal,
    url: isDev ? `${DEV_URL}/policy` : `${BASE_URL}/policy`,
  };

  // response from server
  const response = await axios.request(options);

  // return to component
  return response.data;
};

const postPolicy = async ({ token, data }) => {
  const isDev = import.meta.env.DEV;

  const { policy, clientId, agentIds } = data || {};

  // client side validation
  if (!policy || !clientId || !agentIds) {
    console.log('missing data');
    throw new Error('Missing data');
  }

  console.log('Posting Policy: ', policy);

  const controller = new AbortController();
  // request config for custom firebase endpoint
  const options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: 'POST',
    data: {
      policy: policy,
      clientId: clientId,
      agentIds: agentIds,
      mode: import.meta.env.MODE,
    },
    signal: controller.signal,
    url: isDev ? `${DEV_URL}/policy` : `${BASE_URL}/policy`,
  };
  try {
    // response from server
    const response = await axios.request(options);

    // return to component
    return response.data;
  } catch (error) {
    console.error('Error posting policy:', error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;

      if (status === 409) throw new Error('Policy number already exists');
      throw new Error('Internal Server Error');
    }

    throw error;
  }
};

const deleteClient = async ({ token, data }) => {
  const isDev = import.meta.env.DEV;

  const { clientId } = data || {};

  console.log('Deleting client with ID:', clientId);
  // client side validation
  if (!clientId) {
    throw new Error('Missing client ID');
  }

  const controller = new AbortController();
  // request config for custom firebase endpoint
  const options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: 'DELETE',
    data: { clientId: clientId, mode: import.meta.env.MODE },
    signal: controller.signal,
    url: isDev ? `${DEV_URL}/client` : `${BASE_URL}/client`,
  };

  // response from server
  const response = await axios.request(options);
  console.log('Delete response:', response.data);
  // return to component
  return response.data;
};

const deletePolicy = async ({ token, data }) => {
  const isDev = import.meta.env.DEV;

  const { policyId } = data || {};

  console.log('Deleting policy with ID:', policyId);

  // client side validation
  if (!policyId) {
    throw new Error('Missing policy ID');
  }
  const controller = new AbortController();
  // request config for custom firebase endpoint

  const options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: 'DELETE',
    data: { policyId: policyId, mode: import.meta.env.MODE },
    signal: controller.signal,
    url: isDev ? `${DEV_URL}/policy` : `${BASE_URL}/policy`,
  };
  // response from server
  const response = await axios.request(options);
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
    url: isDev ? `${DEV_URL}/error` : `${BASE_URL}/error`,
  };

  const response = await axios.request(options);

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
  getAgent,
  deleteClient,
  deletePolicy,
  getAgents,
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
  getAdSpend,
  getCommissions,
  getLeads,
  patchAccount,
  postError,
};
