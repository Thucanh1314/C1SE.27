import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { TokenService } from '../../api/services/token.service';
import AuthService from '../../api/services/auth.service';
import Loader from '../../components/common/Loader/Loader'; // Assuming Loader exists

const AuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { dispatch } = useAuth();

    useEffect(() => {
        const token = searchParams.get('token');
        const refreshToken = searchParams.get('refreshToken');

        const handleCallback = async () => {
            if (token) {
                // Save tokens
                TokenService.saveTokens(token, refreshToken || ''); // refreshToken might be optional if null

                try {
                    // Fetch user profile
                    // Note: AuthService.getProfile returns response.data which has { data: { user } } structure
                    // Checking AuthService.js: response.data.data.user
                    const response = await AuthService.getProfile();
                    const user = response.data.user; // Based on AuthService.js line 71: user = response.data.data.user

                    // Format user object if needed to match context expectation
                    const userObj = {
                        id: user.id.toString(),
                        username: user.username,
                        email: user.email,
                        full_name: user.full_name,
                        role: user.role,
                        createdAt: new Date(user.created_at || user.createdAt),
                        updatedAt: new Date(user.updated_at || user.updatedAt),
                    };

                    // Dispatch login success
                    dispatch({
                        type: 'LOGIN_SUCCESS',
                        payload: {
                            user: userObj,
                            token,
                            refreshToken
                        }
                    });

                    // Navigate to home or specific redirect path

                    // Priority 1: Backend redirect param (role-based)
                    const backendRedirect = searchParams.get('redirect');

                    // Priority 2: Check for Signup Intent (from localStorage)
                    const signupIntent = localStorage.getItem('SIGNUP_INTENT');

                    if (signupIntent === 'creator') {
                        // Check if backend redirect was explicitly /admin... if not, allow onboarding
                        // If user is just 'user' and wants to create, send to onboarding
                        // BUT if backend said /dashboard, we intercept.
                        navigate('/onboarding/workspace');
                        // Do NOT clear intent here, let Onboarding page clear it on success/skip
                        // OR clear it here if we want to force valid usage.
                        // Let's clear it here to avoid loops, Onboarding page checks if it should render or just redirect if user already has workspaces?
                        // For MVP: Redirect.
                    } else if (backendRedirect) {
                        navigate(backendRedirect);
                    } else {
                        navigate('/');
                    }
                } catch (error) {
                    console.error('Failed to fetch profile during Google Auth:', error);
                    navigate('/login?error=ProfileFetchFailed');
                }
            } else {
                console.error('No token received in callback');
                navigate('/login?error=NoToken');
            }
        };

        handleCallback();
    }, [searchParams, navigate, dispatch]);

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Loader />
            <p style={{ marginLeft: '10px' }}>Authenticating with Google...</p>
        </div>
    );
};

export default AuthCallback;
