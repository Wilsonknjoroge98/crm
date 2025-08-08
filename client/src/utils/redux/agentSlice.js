import { createSlice } from '@reduxjs/toolkit';

export const agentSlice = createSlice({
  name: 'agent',
  initialState: {},
  reducers: {
    setAgentAction: (state, action) => {
      const data = action.payload;

      state.agent = { ...data };
    },
  },
});

export const { setAgentAction } = agentSlice.actions;

export default agentSlice.reducer;
