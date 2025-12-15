import React from 'react';
import { useAuth } from '../context/AuthContext';
import WeightTracker from '../components/WeightTracker';
import StrengthTracker from '../components/StrengthTracker';
import ClimbingTracker from '../components/ClimbingTracker';
import SleepTracker from '../components/SleepTracker';
import HydrationTracker from '../components/HydrationTracker';
import './MyTemple.css';
const MyTemple = () => {

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
                <HydrationTracker />

                {/* SLEEP TRACKER CARD */}
                <SleepTracker />

            </div>
        </div>
    );
};

export default MyTemple;
