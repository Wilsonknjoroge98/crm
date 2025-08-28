import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL;
const DEV_URL = import.meta.env.VITE_DEV_URL;

const getClients = async ({ token, data }) => {
  const isDev = import.meta.env.DEV;

  const { agentId, agentRole } = data || {};

  if (!agentId || !agentRole) {
    return [];
  }

  // eslint-disable-next-line no-unused-vars
  // const [_key, _faceAmount, data] = queryKey;
  // client side validation
  //   if (
  //     !isDev &&
  //     (!reduxData?.state ||
  //       !reduxData?.birthDay ||
  //       !reduxData?.birthMonth ||
  //       !reduxData?.birthYear ||
  //       !reduxData?.sex ||
  //       !reduxData?.smoker ||
  //       !reduxData?.faceAmount)
  //   ) {
  //     throw new Error('Missing data');
  //   }

  // const controller = new AbortController();

  // request config for compulife server
  const options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: 'GET',
    // signal: signal,
    url: isDev ? `${DEV_URL}/clients` : `${BASE_URL}/clients`,
    params: {
      agentId: agentId,
      agentRole: agentRole,
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
    console.error('Error clients policies:', error);
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

const getPolicies = async ({ token, data }) => {
  const isDev = import.meta.env.DEV;

  const { agentId, agentRole } = data || {};

  if (!agentId || !agentRole) {
    return [];
  }

  // request config for compulife server
  const options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: 'GET',
    // signal: signal,
    url: isDev ? `${DEV_URL}/policies` : `${BASE_URL}/policies`,
    params: {
      agentId: agentId,
      agentRole: agentRole,
      mode: import.meta.env.MODE,
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
  const isDev = import.meta.env.DEV;

  console.log('Posting client:', data);

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
    data: { client: data, mode: import.meta.env.MODE },
    signal: controller.signal,
    url: isDev ? `${DEV_URL}/client` : `${BASE_URL}/client`,
  };

  // response from server
  const response = await axios.request(options);

  // return to component
  return response.data;
};

const patchClient = async ({ token, data }) => {
  const isDev = import.meta.env.DEV;

  console.log('Patching client:', data);

  const { clientId, client } = data || {};

  // client side validation
  if (!client) {
    throw new Error('Missing data');
  }

  const controller = new AbortController();
  // request config for custom firebase endpoint
  const options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: 'PATCH',
    data: { clientId: clientId, client: client, mode: import.meta.env.MODE },
    signal: controller.signal,
    url: isDev ? `${DEV_URL}/client` : `${BASE_URL}/client`,
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

  // response from server
  const response = await axios.request(options);

  // return to component
  return response.data;
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

export {
  getClients,
  getPolicies,
  postClient,
  patchClient,
  postPolicy,
  patchPolicy,
  postAgent,
  getAgent,
  deleteClient,
  deletePolicy,
  getAgents,
};
