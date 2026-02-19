import axios from 'axios';
import store from './redux/store'
import {supabase} from "./supabase.js";



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
       const token = (await supabase.auth.getSession())?.data?.session?.access_token;
       console.log('Attaching token to request:', token);
       // if the token exists, add it to the request headers
       if (token) {
         config.headers.Authorization = `Bearer ${token}`;
       }
       return config;

    }
)



const getClients = async () => {
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
    url: '/customer-account'
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
    url:'customer_account',
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

const getPremiumPerLead = async ({agency }) => {

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

const getMonthlyPremiums = async ({agency }) => {


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

const getStripeCharges = async ({  startDate, endDate }) => {
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

const getCommissions = async ({  startDate, endDate, agent }) => {
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
    const response = await apiClient.request(options);

    console.log('Commissions fetched:', response.data);

    return response.data;
  } catch (error) {
    console.error('Error getting commissions:', error);

    throw error;
  }
};

const getPolicies = async ({  data }) => {

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

const postClient = async ({  data }) => {

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
    url: '/clients_temp',
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
    url: '/agent',
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

const getAgents = async () => {

  // request config for compulife server
  const options = {
    method: 'GET',
    url:'/agents',
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
  // request config for custom firebase endpoint
  const options = {

    method: 'DELETE',
    data: { expenseId: expenseId, mode: import.meta.env.MODE },
    signal: controller.signal,
    url: '/expense',
  };

  // response from server
  const response = await apiClient.request(options);
  console.log('Delete response:', response.data);

  // return to component
  return response.data;
};

const postExpense = async ({  name, amount, date }) => {

  // client side validation
  if (!name || !amount || !date) {
    console.log('missing data');
    throw new Error('Missing data');
  }

  console.log('Posting Expense: ', { name, amount, date });

  const controller = new AbortController();
  // request config for custom firebase endpoint
  const options = {
    method: 'POST',
    data: {
      name: name,
      amount: amount,
      date: date,
      mode: import.meta.env.MODE,
    },
    signal: controller.signal,
    url: '/expense',
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

const getExpenses = async ({  startDate, endDate }) => {
  // request config for compulife server
  const options = {
    method: 'GET',
    url: '/expenses',
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
    console.error('Error getting expenses:', error);
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

const patchPolicy = async ({  data }) => {


  console.log({  data });

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

const postPolicy = async ({ data }) => {

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
    method: 'POST',
    data: {
      policy: policy,
      clientId: clientId,
      agentIds: agentIds,
      mode: import.meta.env.MODE,
    },
    signal: controller.signal,
    url: '/policy',
  };
  try {
    // response from server
    const response = await apiClient.request(options);

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

const deleteClient = async ({  data }) => {
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

const deletePolicy = async ({  data }) => {


  const { policyId } = data || {};

  console.log('Deleting policy with ID:', policyId);

  // client side validation
  if (!policyId) {
    throw new Error('Missing policy ID');
  }
  const controller = new AbortController();
  // request config for custom firebase endpoint

  const options = {

    method: 'DELETE',
    data: { policyId: policyId, mode: import.meta.env.MODE },
    signal: controller.signal,
    url:'/policy',
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
