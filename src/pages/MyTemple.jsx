import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
    doc,
    setDoc,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore'; // Cleaned up imports
import WeightTracker from '../components/WeightTracker';
import StrengthTracker from '../components/StrengthTracker';
import ClimbingTracker from '../components/ClimbingTracker';
import SleepTracker from '../components/SleepTracker';
import './MyTemple.css';

const DEFAULT_WATER_GOAL = 2500; // mL
const BOTTLE_CAPACITY = 3000; // For visual cap

const formatDateKey = (date) => {
    // Manually format to YYYY-MM-DD using local time to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const MyTemple = () => {
    const { user } = useAuth();

    // -- Water State --
    const [waterAmount, setWaterAmount] = useState(0);
    const [waterGoal, setWaterGoal] = useState(DEFAULT_WATER_GOAL);
    const [waterLoading, setWaterLoading] = useState(true);

    const todayKey = useMemo(() => formatDateKey(new Date()), []);

    // ----------------------------------------------------------------
    // WATER LOGIC
    // ----------------------------------------------------------------
    useEffect(() => {
        if (!user) return;
        const waterDocRef = doc(db, 'users', user.uid, 'temple_water', todayKey);

        // Listen to today's water
        const unsub = onSnapshot(waterDocRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setWaterAmount(data.amount || 0);
                setWaterGoal(data.goal || DEFAULT_WATER_GOAL);
            } else {
                setWaterAmount(0);
            }
            setWaterLoading(false);
        });

        return () => unsub();
    }, [user, todayKey]);

    const updateWater = async (change) => {
        if (!user) return;
        const waterDocRef = doc(db, 'users', user.uid, 'temple_water', todayKey);
        const newAmount = Math.max(0, waterAmount + change); // Prevent negative

        // Optimistic update
        setWaterAmount(newAmount);

        try {
            await setDoc(waterDocRef, {
                amount: newAmount,
                goal: waterGoal,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (err) {
            console.error("Error updating water:", err);
        }
    };

    const waterPercentage = Math.min((waterAmount / waterGoal) * 100, 100);
    const visualHeightPercentage = Math.min((waterAmount / BOTTLE_CAPACITY) * 100, 100);

    return (
        <div className="my-temple-page">
            <header className="my-temple-header">
                <h1>My Temple</h1>
                <p>The body is a temple — treat it with honor.</p>
            </header>

            <div className="temple-dashboard">

                {/* WEIGHT TRACKER CARD */}
                <section className="temple-card weight-tracker">
                    <WeightTracker />
                </section>

                {/* CLIMBING TRACKER CARD */}
                <section className="temple-card climbing-tracker">
                    <ClimbingTracker />
                </section>

                {/* STRENGTH TRACKER CARD */}
                <section className="temple-card strength-tracker">
                    <StrengthTracker />
                </section>

                {/* HYDRATION TRACKER CARD */}
                <section className="temple-card water-tracker" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', width: '100%' }}>
                        <h2 style={{ margin: 0, width: '100%', textAlign: 'center' }}>
                            Hydration Tracker
                            <span style={{ fontSize: '0.6em', opacity: 0.7, marginLeft: '0.5rem' }}>{Math.round(waterPercentage)}%</span>
                        </h2>
                    </div>

                    {waterLoading ? (
                        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontStyle: 'italic' }}>
                            Loading vessel...
                        </div>
                    ) : (
                        <>
                            <div className="water-vessel-container">
                                <div className="water-vessel">
                                    <div
                                        className="water-level"
                                        style={{ height: `${visualHeightPercentage}%` }}
                                    >
                                        {/* Visual bubbles */}
                                        <div className="bubble" style={{ left: '20%', width: '10px', height: '10px', animationDelay: '0s' }}></div>
                                        <div className="bubble" style={{ left: '60%', width: '14px', height: '14px', animationDelay: '1.5s' }}></div>
                                        <div className="bubble" style={{ left: '40%', width: '8px', height: '8px', animationDelay: '3s' }}></div>
                                    </div>
                                </div>
                                <div className="water-info">
                                    <span className="current-ml">{waterAmount}</span>
                                    <span className="goal-ml">/ {waterGoal} ml</span>
                                </div>
                            </div>

                            <div className="water-controls">
                                <button className="water-btn remove" onClick={() => updateWater(-250)} style={{ background: 'rgba(255, 99, 71, 0.1)', color: '#d9534f', border: '1px solid rgba(217, 83, 79, 0.2)' }}>- 250ml</button>
                                <button className="water-btn" onClick={() => updateWater(250)}>+ 250ml</button>
                                <button className="water-btn" onClick={() => updateWater(500)}>+ 500ml</button>
                            </div>
                        </>
                    )}
                </section>

                {/* SLEEP TRACKER CARD */}
                <SleepTracker />

            </div>
        </div>
    );
};

export default MyTemple;
