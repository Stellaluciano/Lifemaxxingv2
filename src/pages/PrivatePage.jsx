import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { ADMIN_EMAILS } from '../constants';

const PrivatePage = () => {
    const { user, loading } = useAuth();


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

    // 3. Render the restricted content
    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ color: '#ec4899' }}>Nancy ♡</h1>
            <p>Our little corner of the world.</p>

            <div style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '12px',
                padding: '2rem',
                marginTop: '2rem'
            }}>
                <h2>Our Memories</h2>
                <p>Content coming soon...</p>
                {/* Add your private components here */}
            </div>
        </div>
    );
};

export default PrivatePage;
