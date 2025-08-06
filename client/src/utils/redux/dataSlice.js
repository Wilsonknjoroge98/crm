import { createSlice } from '@reduxjs/toolkit';

export const dataSlice = createSlice({
  name: 'data',
  initialState: {},
  reducers: {
    setDataAction: (state, action) => {
      const data = action.payload;
    },
  },
});

export const { setDataAction } = dataSlice.actions;

export default dataSlice.reducer;
