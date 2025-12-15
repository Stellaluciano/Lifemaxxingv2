import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { ADMIN_EMAILS } from '../constants';

const PrivatePage = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
    }

    // 1. Check if user is logged in
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // 2. Check if user is authorized
    // You can also check user.uid for more security if allowed emails change
    const isAuthorized = ADMIN_EMAILS.includes(user.email);

    if (!isAuthorized) {
        return (
            <div style={{
                padding: '4rem',
                textAlign: 'center',
                color: '#ef4444',
                maxWidth: '600px',
                margin: '0 auto'
            }}>
                <h1>🛑 Access Denied</h1>
                <p>Your account ({user.email}) is not authorized to view this page.</p>
                <p>This page is restricted to specific personnel.</p>
            </div>
        );
    }

    const startDate = new Date('2025-05-11');
    const today = new Date();
    const diffTime = today - startDate;
    const daysTogether = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // Roughly 218

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            minHeight: '100%',
            background: '#fff0f5', // Full Page Pink Tint
            padding: '4rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            <button
                onClick={() => navigate(-1)}
                style={{
                    position: 'absolute',
                    top: '2rem',
                    left: '2rem',
                    background: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    color: '#db2777',
                    fontSize: '1.5rem',
                    zIndex: 20
                }}
            >
                ←
            </button>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ color: '#db2777', fontSize: '3.5rem', marginBottom: '0.5rem', textShadow: '0 2px 10px rgba(219, 39, 119, 0.1)' }}>Nancy 王♡然</h1>
                <p style={{ color: '#db2777', fontSize: '1.25rem', opacity: 0.9, fontWeight: '500' }}>🐱My dearest girlfriend. My best friend. My love.🐱</p>

                <div style={{
                    marginTop: '2rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 2rem',
                    background: 'white',
                    borderRadius: '50px',
                    boxShadow: '0 8px 20px rgba(236, 72, 153, 0.15)',
                    color: '#be185d',
                    fontWeight: '700',
                    fontSize: '1.1rem'
                }}>
                    <span>🌹</span>
                    <span>我们在一起 {daysTogether}天啦～</span>
                </div>
            </div>

            <div style={{ maxWidth: '800px', width: '100%', textAlign: 'center' }}>
                <h2 style={{ color: '#9d174d', fontSize: '2rem', marginBottom: '1rem' }}>Our Memories</h2>
                <p style={{ color: '#831843', fontSize: '1.1rem' }}>Content coming soon...</p>
                {/* Add your private components here */}
            </div>
        </div>
    );
};

export default PrivatePage;
