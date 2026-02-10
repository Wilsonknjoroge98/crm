import { supabase } from './supabase';
import store from './redux/store';
import { setUserAction, clearAuth } from './redux/userSlice';

let initialized = false;

export const initAuth = () => {

    // prevent multiple calls which would result in multiple listeners being added
    if (initialized) throw new Error('Auth is already initialized');
    initialized = true;

    // get the current session if there is one
    supabase.auth.getSession().then(({ data }) => {
        const session = data.session;

        if (session) {
            store.dispatch(
                setUserAction({
                    user: session.user,
                    accessToken: session.access_token,
                    isAuthenticated: true,
                })
            );
        } else {
            store.dispatch(clearAuth());
        }
    });

    // IMPORTANT: do not await any supabase functions inside this listener as it will deadlock.
    // https://supabase.com/docs/reference/javascript/auth-onauthstatechange
    supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
            store.dispatch(
                setUserAction({
                    user: session.user,
                    accessToken: session.access_token,
                    isAuthenticated: true,
                })
            );
        } else {
            store.dispatch(clearAuth());
        }
    });
};
