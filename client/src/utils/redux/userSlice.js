import { createSlice } from '@reduxjs/toolkit';

export const userSlice = createSlice({
    name: 'user',
    initialState: {},
    reducers: {
        setUserAction: (state, action) => {
            const data = action.payload;
            state.isAuthenticated = data.isAuthenticated;
            state.user = data.user;
            state.accessToken = data.accessToken;
        },
        clearAuth: (state) => {
            state.isAuthenticated = false;
            state.user = null;
            state.accessToken = null;
        }
    },
});

export const { setUserAction, clearAuth } = userSlice.actions;

export default userSlice.reducer;
