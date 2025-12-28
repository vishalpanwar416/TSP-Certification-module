import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, LogIn, Eye, EyeOff, Sparkles } from 'lucide-react';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 968);
    const [isLoaded, setIsLoaded] = useState(false);
    const [showSplash, setShowSplash] = useState(true);
    const [greeting, setGreeting] = useState('');
    const authContext = useAuth();
    const { login, loginWithGoogle, user: authUser } = authContext || {};
    
    // Debug: Check if loginWithGoogle is available
    useEffect(() => {
        console.log('Auth Context:', { 
            hasLogin: !!login, 
            hasLoginWithGoogle: !!loginWithGoogle,
            loginWithGoogleType: typeof loginWithGoogle,
            authContext 
        });
        if (!loginWithGoogle || typeof loginWithGoogle !== 'function') {
            console.error('loginWithGoogle is not available or not a function in AuthContext', {
                loginWithGoogle,
                authContext
            });
        }
    }, [loginWithGoogle, login, authContext]);

    // Get time-based greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) {
            return 'Good Morning';
        } else if (hour >= 12 && hour < 17) {
            return 'Good Afternoon';
        } else if (hour >= 17 && hour < 21) {
            return 'Good Evening';
        } else {
            return 'Good Night';
        }
    };

    useEffect(() => {
        setGreeting(getGreeting());
    }, []);

    // Handle responsive breakpoint
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 968);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Opening animation on mount
    useEffect(() => {
        // Show splash screen first
        const splashTimer = setTimeout(() => {
            setShowSplash(false);
        }, 800);

        // Trigger opening animation after splash
        const loadTimer = setTimeout(() => {
            setIsLoaded(true);
        }, 100);

        return () => {
            clearTimeout(splashTimer);
            clearTimeout(loadTimer);
        };
    }, []);

    // Dynamic background animation
    useEffect(() => {
        const createFloatingShape = () => {
            const shapes = document.querySelectorAll('.floating-shape');
            shapes.forEach((shape) => {
                const duration = 15 + Math.random() * 10;
                const delay = Math.random() * 5;
                shape.style.animation = `float ${duration}s ease-in-out infinite`;
                shape.style.animationDelay = `${delay}s`;
            });
        };
        createFloatingShape();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setError('');
            setLoading(true);
            await login(email, password);
        } catch (error) {
            setError('Failed to sign in. ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            setError('');
            setLoading(true);
            
            // Check if loginWithGoogle is available
            if (!loginWithGoogle || typeof loginWithGoogle !== 'function') {
                console.error('loginWithGoogle is not a function:', { loginWithGoogle, authContext });
                throw new Error('Google sign-in is not available. Please refresh the page and ensure you are logged into Firebase.');
            }
            
            // Try popup first, will fallback to redirect if blocked
            await loginWithGoogle(false);
            
            // If using redirect, the page will reload, so we don't need to set loading to false
            // The loading state will be reset when the component remounts after redirect
        } catch (error) {
            console.error('Google sign-in error:', error);
            
            // Provide user-friendly error messages
            let errorMessage = 'Failed to sign in with Google. ';
            
            if (error.code === 'auth/configuration-not-found') {
                errorMessage = 'Google Sign-In is not configured in Firebase. Please enable it in Firebase Console: https://console.firebase.google.com/project/channel-partner-54334/authentication/providers';
            } else if (error.code === 'auth/popup-blocked') {
                errorMessage += 'Popup was blocked. Please allow popups for this site or try again.';
            } else if (error.code === 'auth/popup-closed-by-user') {
                errorMessage += 'Sign-in was cancelled. Please try again.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage += 'Network error. Please check your internet connection.';
            } else if (error.code === 'auth/unauthorized-domain') {
                errorMessage += 'This domain is not authorized. Please add it in Firebase Console under Authentication > Settings > Authorized domains.';
            } else if (error.code === 'auth/operation-not-allowed') {
                errorMessage += 'Google sign-in is not enabled. Please enable it in Firebase Console.';
            } else {
                errorMessage += error.message || 'An unexpected error occurred.';
            }
            
            setError(errorMessage);
            setLoading(false);
        }
    };

    return (
        <>
            {/* Splash Screen Overlay */}
            {showSplash && (
                <div 
                    className="splash-overlay"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(135deg, #d32f2f 0%, #c62828 50%, #1a5a8a 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        opacity: showSplash ? 1 : 0,
                        transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
                        transform: showSplash ? 'scale(1)' : 'scale(1.1)'
                    }}
                >
                    <div style={{
                        textAlign: 'center',
                        animation: 'scaleIn 0.6s ease-out'
                    }}>
                        <div style={{
                            width: '120px',
                            height: '120px',
                            margin: '0 auto 2rem',
                            animation: 'pulse 2s ease-in-out infinite',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <img 
                                src="/logo.svg" 
                                alt="Top Selling Properties Logo" 
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    filter: 'brightness(0) invert(1)'
                                }}
                            />
                        </div>
                        <div style={{
                            width: '40px',
                            height: '4px',
                            background: 'rgba(255, 255, 255, 0.3)',
                            margin: '0 auto',
                            borderRadius: '2px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: '100%',
                                height: '100%',
                                background: 'white',
                                borderRadius: '2px',
                                animation: 'loadingBar 1.5s ease-in-out infinite'
                            }}></div>
                        </div>
                    </div>
                </div>
            )}

            <div 
                className={`login-container ${isLoaded ? 'loaded' : ''}`}
                style={{
                    minHeight: '100vh',
                    width: '100vw',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    position: 'relative',
                    overflow: 'hidden',
                    background: 'var(--bg-primary)',
                    opacity: isLoaded ? 1 : 0,
                    transition: 'opacity 0.6s ease-in-out'
                }}
            >
            {/* Animated Background Shapes */}
            <div className="floating-shape" style={{
                position: 'absolute',
                top: '10%',
                left: '5%',
                width: '200px',
                height: '200px',
                background: 'linear-gradient(135deg, rgba(211, 47, 47, 0.1) 0%, rgba(198, 40, 40, 0.05) 100%)',
                borderRadius: '50%',
                filter: 'blur(40px)',
                zIndex: 0
            }}></div>
            <div className="floating-shape" style={{
                position: 'absolute',
                bottom: '10%',
                right: '5%',
                width: '300px',
                height: '300px',
                background: 'linear-gradient(135deg, rgba(26, 90, 138, 0.1) 0%, rgba(13, 58, 90, 0.05) 100%)',
                borderRadius: '50%',
                filter: 'blur(50px)',
                zIndex: 0
            }}></div>

            {/* Left Side - Branding Section */}
            <div 
                className={`branding-section ${isLoaded ? 'slide-in-left' : ''}`}
                style={{
                    flex: isMobile ? '0 0 auto' : '1 1 50%',
                    minHeight: isMobile ? '40vh' : '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 'clamp(2rem, 5vw, 4rem)',
                    background: '#d32f2f',
                    position: 'relative',
                    overflow: 'hidden',
                    zIndex: 1,
                    opacity: isLoaded ? 1 : 0,
                    transform: isLoaded ? 'translateX(0)' : 'translateX(-100%)',
                    transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderTopRightRadius: '40px',
                    borderBottomRightRadius: '40px'
                }}
            >
                {/* Overlay Pattern */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.08) 1px, transparent 0)',
                    backgroundSize: '50px 50px',
                    opacity: 0.4
                }}></div>

                {/* Decorative Elements */}
                <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-50px',
                    width: '200px',
                    height: '200px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '50%',
                    filter: 'blur(40px)'
                }}></div>
                <div style={{
                    position: 'absolute',
                    bottom: '-30px',
                    left: '-30px',
                    width: '150px',
                    height: '150px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '50%',
                    filter: 'blur(30px)'
                }}></div>

                {/* Content */}
                <div 
                    className={`branding-content ${isLoaded ? 'fade-in-up' : ''}`}
                    style={{
                        position: 'relative',
                        zIndex: 2,
                        textAlign: 'center',
                        color: 'white',
                        maxWidth: '480px',
                        padding: '2rem',
                        opacity: isLoaded ? 1 : 0,
                        transform: isLoaded ? 'translateY(0)' : 'translateY(30px)',
                        transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.3s'
                    }}
                >
                    <h1 style={{
                        fontSize: 'clamp(2rem, 5vw, 2.75rem)',
                        fontWeight: '700',
                        marginBottom: '1rem',
                        lineHeight: '1.2',
                        textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        fontFamily: "'Playfair Display', serif",
                        letterSpacing: '-0.02em',
                        marginBottom: '1.25rem'
                    }}>
                        {greeting}
                    </h1>
                    <div style={{
                        display: 'inline-block',
                        padding: '0.5rem 1.25rem',
                        background: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: '20px',
                        marginBottom: '1.75rem',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                        <p style={{
                            fontSize: 'clamp(0.875rem, 1.6vw, 1rem)',
                            opacity: 1,
                            fontWeight: '600',
                            letterSpacing: '1px',
                            fontFamily: "'Poppins', sans-serif",
                            margin: 0,
                            textTransform: 'uppercase'
                        }}>
                            TOP SELLING PROPERTIES
                        </p>
                    </div>
                    <p style={{
                        fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
                        opacity: 0.95,
                        marginBottom: '1.75rem',
                        lineHeight: '1.8',
                        maxWidth: '420px',
                        marginLeft: 'auto',
                        marginRight: 'auto',
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: '400',
                        textShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }}>
                        Your trusted partner in premium property sales and exceptional real estate services.
                    </p>
                    <div style={{
                        marginTop: '2rem',
                        padding: '1.5rem 1.75rem',
                        background: 'rgba(255, 255, 255, 0.12)',
                        borderRadius: '16px',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        maxWidth: '420px',
                        marginLeft: 'auto',
                        marginRight: 'auto',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)'
                    }}>
                        <p style={{
                            fontSize: 'clamp(0.875rem, 1.4vw, 1rem)',
                            opacity: 1,
                            lineHeight: '1.7',
                            fontFamily: "'Poppins', sans-serif",
                            textAlign: 'center',
                            fontWeight: '400',
                            margin: 0
                        }}>
                            <strong style={{ 
                                fontWeight: '600', 
                                fontSize: 'clamp(0.9375rem, 1.5vw, 1.125rem)',
                                display: 'block',
                                marginBottom: '0.5rem',
                                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}>Excellence in Every Transaction</strong>
                            <span style={{ 
                                fontSize: 'clamp(0.8125rem, 1.3vw, 0.9375rem)',
                                opacity: 0.9
                            }}>Delivering exceptional results that exceed expectations.</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div 
                className={`login-form-section ${isLoaded ? 'slide-in-right' : ''}`}
                style={{
                    flex: isMobile ? '1 1 auto' : '1 1 50%',
                    minHeight: isMobile ? '60vh' : '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 'clamp(1.5rem, 4vw, 3rem)',
                    background: 'var(--bg-primary)',
                    position: 'relative',
                    zIndex: 1,
                    overflowY: 'auto',
                    opacity: isLoaded ? 1 : 0,
                    transform: isLoaded ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.2s'
                }}
            >
                <div 
                    className={`form-container ${isLoaded ? 'fade-in-up-delayed' : ''}`}
                    style={{
                        width: '100%',
                        maxWidth: '450px',
                        opacity: isLoaded ? 1 : 0,
                        transform: isLoaded ? 'translateY(0)' : 'translateY(30px)',
                        transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.5s'
                    }}
                >
                    {/* Logo above login form */}
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '2.5rem'
                    }}>
                        <div style={{
                            width: 'clamp(100px, 13vw, 120px)',
                            height: 'clamp(100px, 13vw, 120px)',
                            margin: '0 auto 2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, rgba(211, 47, 47, 0.12) 0%, rgba(211, 47, 47, 0.06) 100%)',
                            borderRadius: '24px',
                            padding: 'clamp(1rem, 2vw, 1.25rem)',
                            boxShadow: '0 12px 32px rgba(211, 47, 47, 0.15), 0 4px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)',
                            border: '1px solid rgba(211, 47, 47, 0.15)',
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
                                borderRadius: '24px',
                                pointerEvents: 'none'
                            }}></div>
                            <img 
                                src="/logo.svg" 
                                alt="Top Selling Properties Logo" 
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                                }}
                            />
                        </div>
                        <h2 style={{
                            fontSize: 'clamp(1.875rem, 4.5vw, 2.5rem)',
                            color: '#1a1a1a',
                            marginBottom: '0.625rem',
                            fontWeight: '700',
                            fontFamily: "'Playfair Display', serif",
                            letterSpacing: '-0.02em',
                            lineHeight: '1.2',
                            textShadow: 'none'
                        }}>
                            Welcome Back
                        </h2>
                        <p style={{
                            fontSize: '0.8125rem',
                            color: '#757575',
                            fontWeight: '600',
                            letterSpacing: '0.8px',
                            textTransform: 'uppercase',
                            marginTop: '0.5rem'
                        }}>
                            TOP SELLING PROPERTIES
                        </p>
                    </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        padding: '1rem 1.25rem',
                        background: 'linear-gradient(135deg, #ffebee 0%, #fce4ec 100%)',
                        border: '1px solid #ef5350',
                        borderRadius: '12px',
                        marginBottom: '1.75rem',
                        color: '#c62828',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        animation: 'shake 0.5s ease-in-out',
                        boxShadow: '0 4px 12px rgba(239, 83, 80, 0.15)'
                    }}>
                        <span style={{ fontWeight: '600', fontSize: '1.25rem' }}>⚠</span>
                        <span style={{ flex: 1, lineHeight: '1.5' }}>{error}</span>
                    </div>
                )}

                {/* Login Form */}
                    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                        <div className="form-group" style={{ 
                            position: 'relative',
                            marginBottom: '1.5rem'
                        }}>
                            <label htmlFor="email" className="form-label" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.625rem',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#424242',
                                transition: 'color 0.3s ease',
                                letterSpacing: '0.3px'
                            }}>
                                <Mail size={16} style={{ color: focusedField === 'email' ? '#d32f2f' : '#757575' }} />
                                Email Address
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail 
                                    size={18} 
                                    style={{
                                        position: 'absolute',
                                        left: '1rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: focusedField === 'email' ? 'var(--primary)' : 'var(--text-muted)',
                                        pointerEvents: 'none',
                                        zIndex: 1,
                                        transition: 'color 0.3s ease'
                                    }}
                                />
                                <input
                                    id="email"
                                    type="email"
                                    className="form-input"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="Enter your email"
                                    required
                                    disabled={loading}
                                    style={{
                                        paddingLeft: '2.75rem',
                                        paddingRight: '1rem',
                                        paddingTop: '0.875rem',
                                        paddingBottom: '0.875rem',
                                        width: '100%',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        border: focusedField === 'email' ? '2px solid #d32f2f' : '1.5px solid #e0e0e0',
                                        borderRadius: '12px',
                                        fontSize: '0.9375rem',
                                        background: focusedField === 'email' ? '#fff' : '#fafafa',
                                        boxShadow: focusedField === 'email' ? '0 0 0 4px rgba(211, 47, 47, 0.1)' : 'none'
                                    }}
                                />
                            </div>
                    </div>

                        <div className="form-group" style={{ 
                            position: 'relative',
                            marginBottom: '1.5rem'
                        }}>
                            <label htmlFor="password" className="form-label" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.625rem',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#424242',
                                transition: 'color 0.3s ease',
                                letterSpacing: '0.3px'
                            }}>
                                <Lock size={16} style={{ color: focusedField === 'password' ? '#d32f2f' : '#757575' }} />
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock 
                                    size={18} 
                                    style={{
                                        position: 'absolute',
                                        left: '1rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: focusedField === 'password' ? 'var(--primary)' : 'var(--text-muted)',
                                        pointerEvents: 'none',
                                        zIndex: 1,
                                        transition: 'color 0.3s ease'
                                    }}
                                />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="Enter your password"
                                    required
                                    disabled={loading}
                                    style={{
                                        paddingLeft: '2.75rem',
                                        paddingRight: '3rem',
                                        paddingTop: '0.875rem',
                                        paddingBottom: '0.875rem',
                                        width: '100%',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        border: focusedField === 'password' ? '2px solid #d32f2f' : '1.5px solid #e0e0e0',
                                        borderRadius: '12px',
                                        fontSize: '0.9375rem',
                                        background: focusedField === 'password' ? '#fff' : '#fafafa',
                                        boxShadow: focusedField === 'password' ? '0 0 0 4px rgba(211, 47, 47, 0.1)' : 'none'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '0.875rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#757575',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0.375rem',
                                        borderRadius: '6px',
                                        transition: 'all 0.2s ease',
                                        zIndex: 1
                                    }}
                                    tabIndex={-1}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = '#d32f2f';
                                        e.currentTarget.style.background = 'rgba(211, 47, 47, 0.08)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = '#757575';
                                        e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{
                            width: '100%',
                            padding: '1rem 1.5rem',
                            fontSize: '0.9375rem',
                            fontWeight: '600',
                            marginTop: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.625rem',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)',
                            color: 'white',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3), 0 2px 4px rgba(0,0,0,0.1)',
                            letterSpacing: '0.3px'
                        }}
                        disabled={loading}
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(211, 47, 47, 0.4), 0 2px 6px rgba(0,0,0,0.15)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(211, 47, 47, 0.3), 0 2px 4px rgba(0,0,0,0.1)';
                        }}
                    >
                            {loading ? (
                                <>
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderTopColor: 'white',
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite'
                                    }}></div>
                                    <span>Signing In...</span>
                                </>
                            ) : (
                                <>
                        <LogIn size={20} />
                                    <span>Sign In</span>
                                </>
                            )}
                    </button>
                </form>

                {/* Divider */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    margin: '2rem 0',
                    gap: '1rem'
                }}>
                    <div style={{ 
                        flex: 1, 
                        height: '1px', 
                        background: 'linear-gradient(to right, transparent, #e0e0e0, #e0e0e0)'
                    }}></div>
                    <span style={{ 
                        color: '#9e9e9e', 
                        fontSize: '0.8125rem',
                        fontWeight: '500',
                        letterSpacing: '0.5px',
                        padding: '0 0.75rem'
                    }}>OR</span>
                    <div style={{ 
                        flex: 1, 
                        height: '1px', 
                        background: 'linear-gradient(to left, transparent, #e0e0e0, #e0e0e0)'
                    }}></div>
                </div>

                {/* Google Sign In */}
                <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="btn btn-secondary"
                    style={{
                        width: '100%',
                            padding: 'clamp(0.875rem, 2vw, 1rem)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                            fontSize: 'clamp(0.9375rem, 2vw, 1rem)',
                            fontWeight: '600',
                            transition: 'all 0.3s ease'
                    }}
                    disabled={loading}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Continue with Google
                </button>

                </div>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes float {
                    0%, 100% {
                        transform: translate(0, 0) rotate(0deg);
                    }
                    33% {
                        transform: translate(30px, -30px) rotate(120deg);
                    }
                    66% {
                        transform: translate(-20px, 20px) rotate(240deg);
                    }
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes slideInLeft {
                    from {
                        opacity: 0;
                        transform: translateX(-100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                @keyframes scaleIn {
                    from {
                        opacity: 0;
                        transform: scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                @keyframes pulse {
                    0%, 100% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.05);
                    }
                }

                @keyframes shake {
                    0%, 100% {
                        transform: translateX(0);
                    }
                    25% {
                        transform: translateX(-10px);
                    }
                    75% {
                        transform: translateX(10px);
                    }
                }

                @keyframes spin {
                    to {
                        transform: rotate(360deg);
                    }
                }

                @keyframes loadingBar {
                    0% {
                        transform: translateX(-100%);
                    }
                    50% {
                        transform: translateX(0%);
                    }
                    100% {
                        transform: translateX(100%);
                    }
                }

                /* Opening animation classes */
                .login-container.loaded {
                    animation: fadeIn 0.6s ease-in-out;
                }

                .branding-section.slide-in-left {
                    animation: slideInLeft 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .login-form-section.slide-in-right {
                    animation: slideInRight 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.2s;
                }

                .branding-content.fade-in-up {
                    animation: fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.3s;
                }

                .form-container.fade-in-up-delayed {
                    animation: fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.5s;
                }

                /* Responsive Styles */
                @media (max-width: 968px) {
                    .floating-shape {
                        display: none;
                    }
                }
            `}</style>
        </div>
        </>
    );
}

export default Login;
