import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
    doc,
    setDoc,
    collection,
    query,
    getDocs,
    serverTimestamp,
    onSnapshot,
    deleteDoc
} from 'firebase/firestore';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Cell
} from 'recharts';
import './HydrationTracker.css';

const DEFAULT_WATER_GOAL = 2500; // mL
const BOTTLE_CAPACITY = 3000; // For visual cap
const DAYS_IN_WEEK = 7;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatDateKey = (date) => {
    // Manually format to YYYY-MM-DD using local time
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper: Weeks builder (same as SleepTracker)
const buildWeeksInRange = (counts, startDate, endDate) => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const endDay = end.getDay();
    const endDiff = endDay === 0 ? 0 : 7 - endDay;
    end.setDate(end.getDate() + endDiff);

    const weeks = [];
    let currentWeek = [];

    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        const dayClone = new Date(cursor);
        dayClone.setHours(0, 0, 0, 0);
        const key = formatDateKey(dayClone);
        const val = counts[key] || 0;

        currentWeek.push({
            date: dayClone,
            key,
            count: val,
        });

        if (currentWeek.length === DAYS_IN_WEEK) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);
    return weeks;
};

const HydrationTracker = () => {
    const { user } = useAuth();
    const todayKey = useMemo(() => formatDateKey(new Date()), []);

    // Current State
    const [waterAmount, setWaterAmount] = useState(0);
    const [waterGoal, setWaterGoal] = useState(DEFAULT_WATER_GOAL);



    // History & Heatmap State
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showFullHistory, setShowFullHistory] = useState(false);
    const [hydrationHistory, setHydrationHistory] = useState([]); // List of past docs
    const [hydrationCounts, setHydrationCounts] = useState({}); // { '2023-10-25': 2500 }

    // Manual Entry / Edit State
    const [isEntryMode, setIsEntryMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [manualDate, setManualDate] = useState('');
    const [manualAmount, setManualAmount] = useState('');

    // --- 1. Real-time Listener for Today ---
    useEffect(() => {
        if (!user) return;
        const waterDocRef = doc(db, 'users', user.uid, 'temple_water', todayKey);
        const unsub = onSnapshot(waterDocRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setWaterAmount(data.amount || 0);
                setWaterGoal(data.goal || DEFAULT_WATER_GOAL);
            } else {
                setWaterAmount(0);
            }
        });
        return () => unsub();
    }, [user, todayKey]);

    // --- 2. Update Water Function ---
    const updateWater = async (change) => {
        if (!user) return;
        const waterDocRef = doc(db, 'users', user.uid, 'temple_water', todayKey);
        const newAmount = Math.max(0, waterAmount + change);
        setWaterAmount(newAmount); // Optimistic

        try {
            await setDoc(waterDocRef, {
                amount: newAmount,
                goal: waterGoal,
                updatedAt: serverTimestamp()
            }, { merge: true });

            // Also update local cache for heatmap immediately if possible, 
            // but fetching full heatmap is safer to keep common logic.
            // For now, simple optimistic UI is enough for the main view.
        } catch (err) {
            console.error("Error updating water:", err);
        }
    };

    // --- 3. Fetch History & Heatmap Data ---
    const fetchHistoryData = useCallback(async () => {
        if (!user) return;
        // Fetch all docs from subcollection 'temple_water'
        // Since we store one doc per day with ID=Date, we can query all.
        const q = query(collection(db, 'users', user.uid, 'temple_water'));
        const snapshot = await getDocs(q);

        const counts = {};
        const historyList = [];

        snapshot.docs.forEach(docSnap => {
            const data = docSnap.data();
            const dateKey = docSnap.id; // YYYY-MM-DD
            const amt = data.amount || 0;

            counts[dateKey] = amt;
            historyList.push({
                id: docSnap.id,
                dateKey,
                amount: amt,
                goal: data.goal || DEFAULT_WATER_GOAL
            });
        });

        // Sort history desc
        historyList.sort((a, b) => b.dateKey.localeCompare(a.dateKey));

        setHydrationCounts(counts);
        setHydrationHistory(historyList);
    }, [user]);

    useEffect(() => {
        if (showHistoryModal) {
            fetchHistoryData();
        }
    }, [showHistoryModal, fetchHistoryData]);

    // --- Actions: Save Manual, Edit, Delete ---
    const handleSaveManual = async () => {
        if (!user || !manualDate || !manualAmount) return;
        const val = parseInt(manualAmount, 10);
        if (isNaN(val) || val < 0) return;

        try {
            const docRef = doc(db, 'users', user.uid, 'temple_water', manualDate);
            await setDoc(docRef, {
                amount: val,
                goal: waterGoal,
                updatedAt: serverTimestamp()
            }, { merge: true });

            setIsEntryMode(false);
            setManualDate('');
            setManualAmount('');
            setEditingId(null);
            fetchHistoryData();

            // If updated today's data manually, reflect it in main view immediately
            if (manualDate === todayKey) {
                setWaterAmount(val);
            }
        } catch (err) {
            console.error("Error saving water:", err);
        }
    };

    const handleDelete = async (id) => {
        if (!user) return;
        if (!window.confirm("Delete this log?")) return;
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'temple_water', id));
            fetchHistoryData();
            if (id === todayKey) setWaterAmount(0);
        } catch (err) {
            console.error(err);
        }
    };

    const handleEdit = (item) => {
        setManualDate(item.dateKey);
        setManualAmount(item.amount);
        setEditingId(item.id);
        setIsEntryMode(true);
    };

    // --- 4. Chart Data (Current Week) ---
    // Note: Hydration uses the same X-Axis logic as Sleep? Or simpler?
    // SleepChart is last 7 days from Monday. Let's stick to that pattern.
    const weeklyChartData = useMemo(() => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diffToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(today);
        monday.setDate(today.getDate() - diffToMon);
        monday.setHours(0, 0, 0, 0);

        const data = [];
        const labels = ['M', 'T', 'W', 'Th', 'F', 'S', 'Su'];

        for (let i = 0; i < 7; i++) {
            const cursor = new Date(monday);
            cursor.setDate(monday.getDate() + i);
            const key = formatDateKey(cursor);
            // Use current live amount for today if available? 
            // setHydrationCounts might be stale for *today* if we don't merge.
            // Actually, we can check if key === todayKey, use waterAmount.
            let val = 0;
            if (key === todayKey) {
                val = waterAmount;
            } else {
                val = hydrationCounts[key] || 0;
            }

            // Ideally we need hydrationCounts to include today's updated value.
            // But since fetchHistoryData is only called on modal open,
            // The chart on the MAIN CARD needs live data for today.

            data.push({
                day: labels[i],
                val: Math.round(val / 100) / 10, // Convert to Liters (e.g. 2500 -> 2.5)
                raw: val,
                isToday: key === todayKey
            });
        }
        return data;
    }, [hydrationCounts, waterAmount, todayKey]);


    // --- 5. Heatmap Memoization ---
    const recentWeeks = useMemo(() => {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 3);
        // We need to merge today's live amount into counts for accurate heatmap
        const mergedCounts = { ...hydrationCounts, [todayKey]: waterAmount };
        return buildWeeksInRange(mergedCounts, start, end);
    }, [hydrationCounts, waterAmount, todayKey]);

    const allYearsWeeks = useMemo(() => {
        const mergedCounts = { ...hydrationCounts, [todayKey]: waterAmount };
        const yearsInData = Object.keys(mergedCounts).map(k => parseInt(k.split('-')[0]));

        if (yearsInData.length === 0) {
            const currentYear = new Date().getFullYear();
            return [{
                year: currentYear,
                weeks: buildWeeksInRange(mergedCounts, new Date(currentYear, 0, 1), new Date(currentYear, 11, 31))
            }];
        }
        const minYear = Math.min(...yearsInData);
        const maxYear = new Date().getFullYear();
        const timeline = [];
        for (let y = maxYear; y >= minYear; y--) {
            timeline.push({
                year: y,
                weeks: buildWeeksInRange(mergedCounts, new Date(y, 0, 1), new Date(y, 11, 31))
            });
        }
        return timeline;
    }, [hydrationCounts, waterAmount, todayKey]);

    // Helpers
    const getMonthLabels = (weeks, contextYear) => {
        return weeks.map((week, index) => {
            const firstDayOfMonth = week.find(day => day.date && day.date.getDate() === 1);
            if (firstDayOfMonth) {
                if (contextYear && firstDayOfMonth.date.getFullYear() !== contextYear) {
                    return { label: '', key: `month-${index}` };
                }
                return { label: MONTH_LABELS[firstDayOfMonth.date.getMonth()], key: `month-${index}` };
            }
            if (index === 0 && week[0]?.date) {
                return { label: MONTH_LABELS[week[0].date.getMonth()], key: `month-${index}` };
            }
            return { label: '', key: `month-${index}` };
        });
    };

    const getLevelClass = (ml) => {
        if (!ml) return 'profile-heatmap__day--level0';
        // Hydration Levels (assuming 2500 goal)
        if (ml >= 2500) return 'profile-heatmap__day--level4'; // Met goal
        if (ml >= 1800) return 'profile-heatmap__day--level3';
        if (ml >= 1200) return 'profile-heatmap__day--level2';
        return 'profile-heatmap__day--level1';
    };

    const visualHeightPercentage = Math.min((waterAmount / BOTTLE_CAPACITY) * 100, 100);


    return (
        <div className="water-tracker-card sketch-layout" style={{ position: 'relative' }}>
            <div className="water-card-header">
                <div>
                    <h2 className="water-title">Hydration Tracker</h2>
                    <div className="water-subtitle">Stay Hydrated!</div>
                </div>
                <div className="water-header-actions">
                    <button className="history-btn" onClick={() => setShowHistoryModal(true)}>
                        Show History
                    </button>
                </div>
            </div>

            <div className="water-card-body">
                {/* 1. Water Vessel (Centered) */}
                <div className="water-vessel-wrapper">
                    <div className="water-vessel-container">
                        <div className="water-vessel">
                            <div className="water-level" style={{ height: `${visualHeightPercentage}%` }}>
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
                </div>

                {/* 2. Bar Chart (Same as SleepTracker but Blue) */}
                <div className="water-recharts-wrapper">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyChartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: '#f0f0f0' }} tick={{ fontSize: 12, fill: '#aaa' }} dy={5} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#ccc' }} domain={[0, 'auto']} />
                            <Tooltip cursor={{ fill: '#f7f7f7', radius: 4 }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(val) => [`${val}L`, 'Water']} />
                            <Bar dataKey="val" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                {weeklyChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.isToday ? '#395aff' : '#395aff90'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* 3. Footer Actions */}
                <div className="water-controls-footer">
                    <button className="water-btn remove" onClick={() => updateWater(-250)}>-</button>
                    <button className="water-btn" onClick={() => updateWater(250)}>+ 250ml</button>
                    <button className="water-btn" onClick={() => updateWater(500)}>+ 500ml</button>
                </div>
            </div>

            {/* HISTORY MODAL (Same logic as Sleep) */}
            {showHistoryModal && createPortal(
                <div className="water-modal-overlay" onClick={() => { setShowHistoryModal(false); setShowFullHistory(false); }}>
                    <div className="water-modal" onClick={e => e.stopPropagation()}>
                        <div className="water-modal-header">
                            <h3>Hydration History</h3>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {!isEntryMode && (
                                    <button
                                        className="icon-btn"
                                        onClick={() => {
                                            setIsEntryMode(true);
                                            setEditingId(null);
                                            setManualDate(formatDateKey(new Date()));
                                            setManualAmount('');
                                        }}
                                        style={{ fontSize: '0.9rem', fontWeight: 600, color: '#395aff' }}
                                    >
                                        + Add Log
                                    </button>
                                )}
                                <button className="close-btn" onClick={() => { setShowHistoryModal(false); setShowFullHistory(false); }}>×</button>
                            </div>
                        </div>

                        <div className="water-modal-body">
                            {isEntryMode ? (
                                <div className="manual-entry-form" style={{ padding: '0 0.5rem' }}>
                                    <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>{editingId ? 'Edit Water Log' : 'New Water Log'}</h4>
                                    <div className="form-group">
                                        <label>Date</label>
                                        <input
                                            type="date"
                                            value={manualDate}
                                            onChange={(e) => setManualDate(e.target.value)}
                                            disabled={!!editingId} // Disable date editing if updating existing record to avoid dupes/confusion? Or allow it? 
                                        // Ideally if they change date, it creates a new doc. Simpler to lock date for edit, or allow "Add" effectively.
                                        // Let's allow changing date but treating it as "write to that date".
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Amount (ml)</label>
                                        <input
                                            type="number"
                                            value={manualAmount}
                                            onChange={(e) => setManualAmount(e.target.value)}
                                            placeholder="e.g. 2500"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="form-actions">
                                        <button className="cancel-btn" onClick={() => setIsEntryMode(false)}>Cancel</button>
                                        <button className="save-btn" onClick={handleSaveManual}>Save</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="water-history-list">
                                        {hydrationHistory.length === 0 ? (
                                            <p className="empty-msg">No hydration logs found.</p>
                                        ) : (
                                            hydrationHistory.map(item => (
                                                <div key={item.id} className="history-item">
                                                    <div className="history-info">
                                                        <div className="history-date">
                                                            {new Date(item.dateKey + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                        </div>
                                                    </div>
                                                    <div className="history-right">
                                                        <span className="history-duration">{item.amount} ml</span>
                                                        <button className="icon-btn edit" onClick={() => handleEdit(item)}>✏️</button>
                                                        <button className="icon-btn delete" onClick={() => handleDelete(item.id)}>🗑️</button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Heatmap Footer */}
                                    <div className="profile-heatmap-wrapper water-heatmap">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <div className="profile-heatmap__title">Recent Hydration</div>
                                            <button className="view-full-btn" onClick={() => setShowFullHistory(true)}>View Full History →</button>
                                        </div>
                                        <div className="profile-heatmap">
                                            <div className="profile-heatmap__months-row">
                                                <span className="profile-heatmap__month-spacer" />
                                                <div className="profile-heatmap__months">
                                                    {getMonthLabels(recentWeeks).map(({ label, key }) => (
                                                        <span key={key} className={`profile-heatmap__month-label${label ? ' profile-heatmap__month-label--visible' : ''}`}>{label}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="profile-heatmap__body">
                                                <div className="profile-heatmap__day-labels">
                                                    {DAY_LABELS.map(label => <span key={label}>{label}</span>)}
                                                </div>
                                                <div className="profile-heatmap__weeks">
                                                    {recentWeeks.map((week, index) => (
                                                        <div className="profile-heatmap__week" key={`week-${index}`}>
                                                            {week.map(day => (
                                                                <span key={day.key} className={`profile-heatmap__day ${getLevelClass(day.count)}`} title={`${day.key}: ${day.count}ml`} />
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* FULL HISTORY OVERLAY */}
            {showFullHistory && createPortal(
                <div className="water-modal-overlay full-history" onClick={() => setShowFullHistory(false)}>
                    <div className="water-modal large" onClick={e => e.stopPropagation()}>
                        <div className="water-modal-header">
                            <h3>Complete Hydration History</h3>
                            <button className="close-btn" onClick={() => setShowFullHistory(false)}>×</button>
                        </div>
                        <div className="water-modal-body full-width">
                            {allYearsWeeks.map(yearData => (
                                <div key={yearData.year} style={{ marginBottom: '2.5rem' }}>
                                    <h4 style={{ margin: '0 0 1rem 0' }}>{yearData.year}</h4>
                                    <div className="profile-heatmap-wrapper water-heatmap">
                                        <div className="profile-heatmap">
                                            <div className="profile-heatmap__months-row">
                                                <span className="profile-heatmap__month-spacer" />
                                                <div className="profile-heatmap__months">
                                                    {getMonthLabels(yearData.weeks, yearData.year).map(({ label, key }) => (
                                                        <span key={key} className={`profile-heatmap__month-label${label ? ' profile-heatmap__month-label--visible' : ''}`}>{label}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="profile-heatmap__body">
                                                <div className="profile-heatmap__day-labels">
                                                    {DAY_LABELS.map(label => <span key={label}>{label}</span>)}
                                                </div>
                                                <div className="profile-heatmap__weeks">
                                                    {yearData.weeks.map((week, index) => (
                                                        <div className="profile-heatmap__week" key={`week-${index}`}>
                                                            {week.map(day => (
                                                                <span key={day.key} className={`profile-heatmap__day ${getLevelClass(day.count)}`} title={`${day.key}: ${day.count}ml`} />
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default HydrationTracker;
