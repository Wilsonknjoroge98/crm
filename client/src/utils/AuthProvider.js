import { supabase } from './supabase';
import { setUserAction, clearAuth } from './redux/userSlice';
import { useDispatch } from 'react-redux'
import {useEffect, useRef} from "react";

const AuthProvider = ({ children }) => {
    const initialized = useRef(false);
    const dispatch = useDispatch();
    
    // prevent multiple calls which would result in multiple listeners being added
    useEffect(() => {

        if (initialized.current) return;
        initialized.current = true;

        // get the current session if there is one
        supabase.auth.getSession().then(({ data }) => {
            const session = data.session;
            if (session) {
                dispatch(
                    setUserAction({
                        user: session.user,
                        accessToken: session.access_token,
                        isAuthenticated: true,
                    })
                );
            } else {
                dispatch(clearAuth());
            }
        });

        // IMPORTANT: do not await any supabase functions inside this listener as it will deadlock.
        // https://supabase.com/docs/reference/javascript/auth-onauthstatechange
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log('auth state changed', _event)
            if (session) {
                dispatch(
                    setUserAction({
                        user: session.user,
                        accessToken: session.access_token,
                        isAuthenticated: true,
                    })
                );
            } else {

                dispatch(clearAuth());
            }
        });
        return () =>{
            // was being called right away
            // listener.subscription.unsubscribe();
        }
    })
    return children;
};
export { AuthProvider }
