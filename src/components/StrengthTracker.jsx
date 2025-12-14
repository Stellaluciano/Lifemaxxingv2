import React, { useState, useEffect } from 'react';
import {
    onSnapshot,
    serverTimestamp,
    collection,
    query,
    where,
    setDoc,
    doc
} from 'firebase/firestore';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import './StrengthTracker.css';

import BenchIcon from '../assets/bench_press.svg';
import SquatIcon from '../assets/squat.svg';
import DeadliftIcon from '../assets/deadlift.svg.svg';

const StrengthTracker = () => {
    const { user } = useAuth();
    // const [loading, setLoading] = useState(true);
    const [unit, setUnit] = useState('kg'); // 'kg' or 'lb'
    const [timeRange, setTimeRange] = useState('ALL'); // '1W', '1M', '1Y', 'ALL'
    const [rmType, setRmType] = useState('1rm'); // '1rm', '5rm', '10rm', '20rm'

    // History Data for Graphs: { bench: [{date, weight}, ...], squat: [], ... }
    const [historyData, setHistoryData] = useState({ bench: [], squat: [], deadlift: [] });

    // Current Maxes (Cached or calculated from history)
    const [maxes, setMaxes] = useState({ bench: 0, squat: 0, deadlift: 0 });

    // Modal State
    const [showLogModal, setShowLogModal] = useState(false);
    const [logLift, setLogLift] = useState(null); // 'bench', 'squat', 'deadlift'
    const [logWeight, setLogWeight] = useState('');

    // Fetch History for current RM Type
    useEffect(() => {
        if (!user) return;

        const historyRef = collection(db, 'users', user.uid, 'strength_history');
        const q = query(
            historyRef,
            where('rmType', '==', rmType)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            // Group by date to deduplicate multiple entries per day
            const raw = { bench: {}, squat: {}, deadlift: {} };

            snapshot.docs.forEach(doc => {
                const d = doc.data();
                if (d.lift && raw[d.lift] !== undefined) {
                    // Create date string for grouping (YYYY-MM-DD)
                    const dateObj = d.date?.toDate() || new Date();
                    const y = dateObj.getFullYear();
                    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const dateKey = `${y}-${m}-${day}`;

                    const currentTs = dateObj.getTime();
                    const existing = raw[d.lift][dateKey];

                    // Keep the entry with the latest timestamp for that day
                    if (!existing || currentTs > existing.timestamp) {
                        raw[d.lift][dateKey] = {
                            timestamp: currentTs,
                            weight: d.weight,
                            id: doc.id
                        };
                    }
                }
            });

            // Convert back to sorted arrays
            const processed = { bench: [], squat: [], deadlift: [] };
            Object.keys(raw).forEach(lift => {
                processed[lift] = Object.values(raw[lift]).sort((a, b) => a.timestamp - b.timestamp);
            });

            setHistoryData(processed);

            // Calculate Maxes from history (All-time best for this RM)
            const newMaxes = {
                bench: Math.max(0, ...processed.bench.map(i => i.weight)),
                squat: Math.max(0, ...processed.squat.map(i => i.weight)),
                deadlift: Math.max(0, ...processed.deadlift.map(i => i.weight)),
            };
            setMaxes(newMaxes);
        });

        return () => unsub();
    }, [user, rmType]);

    // Filtered Data for Graphs based on timeRange
    const getFilteredHistory = (data) => {
        if (!data || data.length === 0) return [];
        if (timeRange === 'ALL') return data;

        const now = Date.now();
        let cutoff = 0;
        if (timeRange === '1W') cutoff = now - 7 * 24 * 60 * 60 * 1000;
        if (timeRange === '1M') cutoff = now - 30 * 24 * 60 * 60 * 1000;
        if (timeRange === '1Y') cutoff = now - 365 * 24 * 60 * 60 * 1000;

        return data.filter(d => d.timestamp >= cutoff);
    };

    // Handle Saving New PR - Enforce 1 per day
    const handleLogSave = async () => {
        if (!user || !logLift || !logWeight) return;

        let val = parseFloat(logWeight);
        if (isNaN(val) || val < 0) val = 0;

        // Convert to Kg if input was Lb
        let valKg = unit === 'kg' ? val : val / 2.20462;
        valKg = Math.round(valKg * 100) / 100;

        try {
            // Generate ID for today: lift_rmType_YYYY-MM-DD
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const dateKey = `${year}-${month}-${day}`;
            const docId = `${logLift}_${rmType}_${dateKey}`;

            // Use setDoc to overwrite if exists (enforces 1 per day)
            await setDoc(doc(db, 'users', user.uid, 'strength_history', docId), {
                lift: logLift,
                rmType: rmType,
                weight: valKg,
                date: serverTimestamp(), // Store server time, but ID enforces date
                dateKey: dateKey // Helpful for debugging/querying
            });

            setShowLogModal(false);
            setLogLift(null);
            setLogWeight('');
        } catch (err) {
            console.error("Error logging PR:", err);
        }
    };

    const openLogModal = (lift) => {
        setLogLift(lift);
        setLogWeight('');
        setShowLogModal(true);
    };

    const convert = (kg) => {
        const val = unit === 'kg' ? kg : kg * 2.20462;
        return parseFloat(val.toFixed(1));
    };

    const totalKg = (maxes.bench + maxes.squat + maxes.deadlift) || 0;
    const totalDisplay = convert(totalKg);

    const LIFT_CONFIG = [
        { key: 'bench', label: 'Bench Press', icon: <img src={BenchIcon} alt="Bench" style={{ width: '40px', height: '40px' }} /> },
        { key: 'squat', label: 'Squat', icon: <img src={SquatIcon} alt="Squat" style={{ width: '40px', height: '40px' }} /> },
        { key: 'deadlift', label: 'Deadlift', icon: <img src={DeadliftIcon} alt="Deadlift" style={{ width: '40px', height: '40px' }} /> }
    ];
    return (
        <div className="strength-tracker-container">
            <div className="top-bar">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Strength Tracker</h2>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="time-range-controls">
                        {['1W', '1M', '1Y', 'ALL'].map(range => (
                            <button
                                key={range}
                                className={`time-range-btn ${timeRange === range ? 'active' : ''}`}
                                onClick={() => setTimeRange(range)}
                            >
                                {range}
                            </button>
                        ))}
                    </div>

                    <button
                        className="unit-toggle-btn"
                        onClick={() => setUnit(unit === 'kg' ? 'lb' : 'kg')}
                    >
                        Unit: {unit.toUpperCase()}
                    </button>
                </div>
            </div>

            <div className="strength-tracker-grid">
                {LIFT_CONFIG.map(({ key, label, icon }) => {
                    const filteredData = getFilteredHistory(historyData[key]);
                    // Transform data for the chart: convert weight to selected unit
                    const chartData = filteredData.map(d => ({
                        ...d,
                        displayWeight: convert(d.weight)
                    }));

                    return (
                        <div key={key} className="lift-card">
                            <span className="lift-icon">{icon}</span>
                            <span className="lift-label">{label}</span>

                            <div
                                className="lift-value-display"
                                style={{ cursor: 'default', pointerEvents: 'none' }}
                            >
                                {maxes[key] > 0 ? convert(maxes[key]) : '--'}
                                <div className="unit-label">{maxes[key] > 0 ? unit : ''}</div>
                            </div>

                            <button className="log-pr-btn" onClick={() => openLogModal(key)}>
                                Log New PR
                            </button>

                            <div className="chart-container-expanded">
                                {chartData && chartData.length > 1 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData}>
                                            <XAxis
                                                dataKey="timestamp"
                                                type="number"
                                                domain={['dataMin', 'dataMax']}
                                                tickFormatter={(ts) => new Date(ts).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                                                tick={{ fontSize: 10, fill: '#aaa' }}
                                                tickLine={false}
                                                axisLine={false}
                                                interval="preserveStartEnd"
                                                minTickGap={30}
                                            />
                                            <YAxis
                                                domain={['auto', 'auto']}
                                                tick={{ fontSize: 10, fill: '#aaa' }}
                                                tickLine={false}
                                                axisLine={false}
                                                width={40}
                                                tickFormatter={(val) => Math.round(val)}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                labelFormatter={(ts) => new Date(ts).toLocaleDateString()}
                                                formatter={(val) => [`${val} ${unit}`, 'Weight']}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="displayWeight"
                                                stroke="#395aff"
                                                strokeWidth={3}
                                                dot={{ r: 4, fill: '#395aff', strokeWidth: 2, stroke: '#fff' }}
                                                activeDot={{ r: 6 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3, fontSize: '0.8em' }}>
                                        {chartData.length === 1 ? 'Log more to see trend' : 'No history'}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div >

            <div className="strength-tracker-controls">
                {['1rm', '5rm', '10rm', '20rm'].map(rm => (
                    <button
                        key={rm}
                        className={`rm-toggle-btn ${rmType === rm ? 'active' : ''}`}
                        onClick={() => setRmType(rm)}
                    >
                        {rm.toUpperCase()}
                    </button>
                ))}
            </div>

            <div className="strength-tracker-total">
                <span className="total-label">Big Three Total</span>
                <span className="total-value">{totalDisplay} <span style={{ fontSize: '0.9rem', fontWeight: 500, opacity: 0.6 }}>{unit}</span></span>
            </div>

            {/* LOG MODAL */}
            {
                showLogModal && (
                    <div className="strength-modal-overlay" onClick={() => setShowLogModal(false)}>
                        <div className="strength-modal" onClick={e => e.stopPropagation()}>
                            <h3>Log New {rmType.toUpperCase()} PR</h3>
                            <div style={{ textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
                                {LIFT_CONFIG.find(l => l.key === logLift)?.label}
                            </div>

                            <div className="lift-input-group">
                                <input
                                    type="number"
                                    className="lift-input"
                                    value={logWeight}
                                    onChange={(e) => setLogWeight(e.target.value)}
                                    placeholder={`Enter weight in ${unit}`}
                                    autoFocus
                                />
                            </div>

                            <div className="strength-modal-actions">
                                <button className="strength-modal-btn cancel" onClick={() => setShowLogModal(false)}>Cancel</button>
                                <button className="strength-modal-btn save" onClick={handleLogSave}>Log Record</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default StrengthTracker;
