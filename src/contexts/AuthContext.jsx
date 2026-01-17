import { createContext, useContext, useEffect, useState } from 'react';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult
} from 'firebase/auth';
import { auth } from '../config/firebase';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth) {
            console.error('Firebase Auth is not initialized!');
            console.error('Cannot initialize auth state - auth object is missing');
            setLoading(false);
            return;
        }

        // Set a timeout to ensure loading doesn't stay true forever
        const loadingTimeout = setTimeout(() => {
            console.warn('Auth state check taking too long, setting loading to false');
            setLoading(false);
        }, 5000);

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            clearTimeout(loadingTimeout);
            setUser(user);
            setLoading(false);
        }, (error) => {
            clearTimeout(loadingTimeout);
            console.error('Auth state change error:', error);
            setLoading(false);
        });

        // Check for redirect result on mount
        getRedirectResult(auth)
            .then((result) => {
                if (result) {
                    setUser(result.user);
                }
            })
            .catch((error) => {
                console.error('Redirect sign-in error:', error);
        });

        return () => {
            clearTimeout(loadingTimeout);
            unsubscribe();
        };
    }, []);

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const loginWithGoogle = async (useRedirect = false) => {
        const provider = new GoogleAuthProvider();
        // Add additional scopes if needed
        provider.addScope('profile');
        provider.addScope('email');
        // Set custom parameters
        provider.setCustomParameters({
            prompt: 'select_account'
        });

        try {
            if (useRedirect) {
                // Use redirect method (works better with popup blockers)
                await signInWithRedirect(auth, provider);
                // Note: The result will be handled by getRedirectResult in useEffect
                return Promise.resolve();
            } else {
                // Try popup first
                return await signInWithPopup(auth, provider);
            }
        } catch (error) {
            // If popup is blocked, automatically fallback to redirect
            if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
                if (!useRedirect) {
                    // Retry with redirect
                    await signInWithRedirect(auth, provider);
                    return Promise.resolve();
                }
            }
            throw error;
        }
    };

    const logout = () => {
        return signOut(auth);
    };

    const value = {
        user,
        loading,
        login,
        loginWithGoogle,
        logout
    };

    // Debug: Verify loginWithGoogle is defined
    if (typeof loginWithGoogle !== 'function') {
        console.error('loginWithGoogle is not a function!', { loginWithGoogle, value });
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
