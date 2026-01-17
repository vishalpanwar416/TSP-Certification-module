import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    padding: '2rem',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                    <h1 style={{ color: '#ef4444', marginBottom: '1rem' }}>Something went wrong</h1>
                    <p style={{ color: '#6b7280', marginBottom: '1rem', textAlign: 'center' }}>
                        The application encountered an error. Please check the browser console for details.
                    </p>
                    {this.state.error && (
                        <p style={{ 
                            color: '#dc2626', 
                            marginBottom: '2rem', 
                            textAlign: 'center',
                            padding: '1rem',
                            backgroundColor: '#fef2f2',
                            borderRadius: '0.5rem',
                            maxWidth: '600px',
                            fontSize: '0.875rem',
                            fontFamily: 'monospace'
                        }}>
                            <strong>Error:</strong> {this.state.error.toString()}
                        </p>
                    )}
                    <button
                        onClick={() => {
                            this.setState({ hasError: false, error: null, errorInfo: null });
                            window.location.reload();
                        }}
                        style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        Reload Page
                    </button>
                    {(import.meta.env.DEV || import.meta.env.MODE === 'development') && this.state.error && (
                        <details style={{ marginTop: '2rem', maxWidth: '800px', width: '100%' }}>
                            <summary style={{ cursor: 'pointer', color: '#6b7280', marginBottom: '1rem' }}>
                                Error Details (Development Only)
                            </summary>
                            <pre style={{
                                backgroundColor: '#1f2937',
                                color: '#f3f4f6',
                                padding: '1rem',
                                borderRadius: '0.5rem',
                                overflow: 'auto',
                                fontSize: '0.875rem'
                            }}>
                                {this.state.error.toString()}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
