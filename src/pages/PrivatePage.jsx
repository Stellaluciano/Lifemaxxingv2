import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { ADMIN_EMAILS } from '../constants';
import NancyNavbar from '../components/NancyNavbar';

const TimerBlock = ({ value, label }) => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        padding: '1.5rem 1rem',
        borderRadius: '24px',
        boxShadow: '0 8px 25px rgba(236, 72, 153, 0.2)',
        width: '130px',
        height: '150px',
        border: '2px solid rgba(255, 240, 245, 0.8)'
    }}>
        <span style={{ fontSize: '3.5rem', fontWeight: '800', color: '#be185d', lineHeight: 1, letterSpacing: '-2px' }}>
            {String(value).padStart(2, '0')}
        </span>
        <span style={{ fontSize: '0.9rem', color: '#be185d', opacity: 0.8, marginTop: '0.5rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {label}
        </span>
    </div>
);

const PrivatePage = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    // Timer State
    const [time, setTime] = useState({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        const startDate = new Date('2025-05-11T04:27:00'); // Fixed start date

        const updateTimer = () => {
            const now = new Date();
            let years = now.getFullYear() - startDate.getFullYear();
            let months = now.getMonth() - startDate.getMonth();
            let days = now.getDate() - startDate.getDate();
            let hours = now.getHours() - startDate.getHours();
            let minutes = now.getMinutes() - startDate.getMinutes();
            let seconds = now.getSeconds() - startDate.getSeconds();

            if (seconds < 0) { seconds += 60; minutes--; }
            if (minutes < 0) { minutes += 60; hours--; }
            if (hours < 0) { hours += 24; days--; }
            if (days < 0) {
                const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                days += prevMonth.getDate();
                months--;
            }
            if (months < 0) { months += 12; years--; }

            setTime({ years, months, days, hours, minutes, seconds });
        };

        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, []);

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

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

    // Calculate total days for the top-right badge
    const startDatePure = new Date('2025-05-11T04:27:00');
    const today = new Date();
    const diffTime = today - startDatePure;
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

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
            <NancyNavbar />
            <button
                onClick={() => navigate('/profile')}
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

            <div style={{
                position: 'absolute',
                top: '2rem',
                right: '2rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 2rem',
                background: 'white',
                borderRadius: '50px',
                boxShadow: '0 4px 15px rgba(236, 72, 153, 0.1)',
                color: '#be185d',
                fontWeight: '700',
                fontSize: '1rem',
                zIndex: 20
            }}>
                <span>我们在一起 {totalDays}天啦～</span>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '3rem', width: '100%' }}>
                <h1 style={{ color: '#db2777', fontSize: '3.5rem', marginBottom: '0.5rem', textShadow: '0 2px 10px rgba(219, 39, 119, 0.1)' }}>♡nancy&doug♡</h1>
                <p style={{ color: '#db2777', fontSize: '1.25rem', opacity: 0.9, fontWeight: '500' }}>🐱My dearest girlfriend. My best friend. My love.🐶</p>

                {/* New Time Together Timer */}
                <div style={{ marginTop: '3rem' }}>
                    <h2 style={{
                        color: '#9d174d',
                        fontSize: '1.5rem',
                        marginBottom: '1.5rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        Time Together
                    </h2>
                    <div style={{
                        display: 'flex',
                        gap: '0.8rem',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        maxWidth: '100%'
                    }}>
                        <TimerBlock value={time.years} label="Years" />
                        <TimerBlock value={time.months} label="Months" />
                        <TimerBlock value={time.days} label="Days" />
                        <TimerBlock value={time.hours} label="Hours" />
                        <TimerBlock value={time.minutes} label="Minutes" />
                        <div style={{ position: 'relative' }}>
                            <TimerBlock value={time.seconds} label="Seconds" />
                            <div style={{
                                position: 'absolute',
                                top: '-10px',
                                right: '-8px',
                                fontSize: '1.2rem',
                                animation: 'bounce 2s infinite',
                                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                            }}>
                                ❤️
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Menu Removed */}
            </div>

            <style>
                {`
                    @keyframes bounce {
                        0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
                        40% {transform: translateY(-6px);}
                        60% {transform: translateY(-3px);}
                    }
                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>
        </div>
    );
};

export default PrivatePage;
