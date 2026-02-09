import { createSlice } from '@reduxjs/toolkit';

export const userSlice = createSlice({
    name: 'user',
    initialState: {},
    reducers: {
        setUserAction: (state, action) => {
            const data = action.payload;
            state.agent = { ...data };
        },
        clearAuth: (state) => {
            state.agent = {};
        }
    },
});

export const { setUserAction, clearAuth } = userSlice.actions;

export default userSlice.reducer;
