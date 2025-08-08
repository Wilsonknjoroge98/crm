import { configureStore } from '@reduxjs/toolkit';

import dataReducer from './dataSlice';
import agentReducer from './agentSlice';

const store = configureStore({
  reducer: {
    data: dataReducer,
    agent: agentReducer,
  },
});

export default store;
