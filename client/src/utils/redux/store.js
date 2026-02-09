import { configureStore } from '@reduxjs/toolkit';

import dataReducer from './dataSlice';
import agentReducer from './agentSlice';
import userReducer from './userSlice';


const store = configureStore({
  reducer: {
    data: dataReducer,
    agent: agentReducer,
    user: userReducer,
  },
});

export default store;
