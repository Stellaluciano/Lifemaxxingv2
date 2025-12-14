import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
    doc,
    setDoc,
    getDoc,
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    deleteDoc,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import './SleepTracker.css';

const DAYS_IN_WEEK = 7;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Helper to generate weeks for a specific date range
const buildWeeksInRange = (counts, startDate, endDate) => {
    // Align start to Monday (Deterministic)
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const day = start.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = day === 0 ? 6 : day - 1; // Calculate days to subtract to get to Monday
    start.setDate(start.getDate() - diff);

    // Align end to Sunday (Deterministic)
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const endDay = end.getDay();
    const endDiff = endDay === 0 ? 0 : 7 - endDay; // Calculate days to add to get to Sunday
    end.setDate(end.getDate() + endDiff);

    const weeks = [];
    let currentWeek = [];

    // Iterate day by day
    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        const dayClone = new Date(cursor);
        // Normalize time to prevent DST drift
        dayClone.setHours(0, 0, 0, 0);

        const key = dayClone.toISOString().slice(0, 10);

        // Count val: if data exists for this date
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
    // Add any remaining days in the last week if it's not full
    if (currentWeek.length > 0) {
        weeks.push(currentWeek);
    }
    return weeks;
};

const SleepTracker = () => {
    const { user } = useAuth();
    const [isAsleep, setIsAsleep] = useState(false);
    const [sleepStartTime, setSleepStartTime] = useState(null);
    const [elapsedTime, setElapsedTime] = useState('00:00:00');

    // History Modal State
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [isEntryMode, setIsEntryMode] = useState(false);
    const [historyData, setHistoryData] = useState([]);

    // "Full History" Overlay State
    const [showFullHistory, setShowFullHistory] = useState(false);

    // Heatmap Data (Raw Counts)
    const [sleepCounts, setSleepCounts] = useState({});

    // Manual Entry State
    const [manualStart, setManualStart] = useState('');
    const [manualEnd, setManualEnd] = useState('');
    const [editingId, setEditingId] = useState(null);

    // Load initial sleep status
    useEffect(() => {
        if (!user) return;
        const checkSleepStatus = async () => {
            const currentSleepRef = doc(db, 'users', user.uid, 'sleep_tracking', 'current_session');
            const snapshot = await getDoc(currentSleepRef);
            if (snapshot.exists()) {
                const data = snapshot.data();
                if (data.active) {
                    setIsAsleep(true);
                    setSleepStartTime(data.startTime.toDate());
                }
            }
        };
        checkSleepStatus();
    }, [user]);

    // Timer logic
    useEffect(() => {
        let interval;
        if (isAsleep && sleepStartTime) {
            const updateTimer = () => {
                const now = new Date();
                const diff = now - sleepStartTime;
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                setElapsedTime(`${hours}h ${minutes}m`);
            };
            updateTimer();
            interval = setInterval(updateTimer, 60000);
        }
        return () => clearInterval(interval);
    }, [isAsleep, sleepStartTime]);

    // Fetch History List
    const fetchHistory = useCallback(async () => {
        if (!user) return;
        const q = query(
            collection(db, 'users', user.uid, 'sleep_history'),
            orderBy('end', 'desc'),
            limit(30)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setHistoryData(data);
    }, [user]);

    // Fetch All Sleep Data for Heatmap
    const fetchHeatmapData = useCallback(async () => {
        if (!user) return;
        const q = query(collection(db, 'users', user.uid, 'sleep_history'));
        const snapshot = await getDocs(q);

        const counts = {};
        snapshot.docs.forEach(docSnap => {
            const data = docSnap.data();
            const dateKey = data.dateKey; // YYYY-MM-DD
            if (dateKey) {
                const duration = data.durationHours || 0;
                counts[dateKey] = (counts[dateKey] || 0) + duration;
            }
        });
        setSleepCounts(counts);
    }, [user]);

    useEffect(() => {
        if (showHistoryModal) {
            fetchHistory();
            fetchHeatmapData();
        }
    }, [showHistoryModal, fetchHistory, fetchHeatmapData]);

    const handleSleepToggle = async () => {
        if (!user) return;
        const now = new Date();
        const currentSleepRef = doc(db, 'users', user.uid, 'sleep_tracking', 'current_session');

        if (!isAsleep) {
            setIsAsleep(true);
            setSleepStartTime(now);
            await setDoc(currentSleepRef, {
                active: true,
                startTime: now,
                updatedAt: serverTimestamp()
            });
        } else {
            setIsAsleep(false);
            const durationMs = now - sleepStartTime;
            const durationHours = durationMs / (1000 * 60 * 60);

            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            const dateKey = `${y}-${m}-${d}`;

            const historyRef = doc(collection(db, 'users', user.uid, 'sleep_history'));
            await setDoc(historyRef, {
                start: sleepStartTime,
                end: now,
                durationHours: Math.round(durationHours * 10) / 10,
                dateKey: dateKey,
                createdAt: serverTimestamp()
            });

            await setDoc(currentSleepRef, { active: false, lastSessionEnd: now });
            setSleepStartTime(null);
            setElapsedTime('00:00:00');
            fetchHistory();
            fetchHeatmapData();
        }
    };

    const handleSaveManual = async () => {
        if (!manualStart || !manualEnd) return;
        const start = new Date(manualStart);
        const end = new Date(manualEnd);
        if (end <= start) {
            alert("End time must be after start time");
            return;
        }
        const durationMs = end - start;
        const durationHours = durationMs / (1000 * 60 * 60);

        const y = end.getFullYear();
        const m = String(end.getMonth() + 1).padStart(2, '0');
        const d = String(end.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${d}`;

        const data = {
            start: Timestamp.fromDate(start),
            end: Timestamp.fromDate(end),
            durationHours: Math.round(durationHours * 10) / 10,
            dateKey: dateKey,
            updatedAt: serverTimestamp()
        };

        if (editingId) {
            await setDoc(doc(db, 'users', user.uid, 'sleep_history', editingId), data, { merge: true });
        } else {
            data.createdAt = serverTimestamp();
            await setDoc(doc(collection(db, 'users', user.uid, 'sleep_history')), data);
        }

        setManualStart('');
        setManualEnd('');
        setEditingId(null);
        setIsEntryMode(false);
        fetchHistory();
        fetchHeatmapData();
    };

    const handleEdit = (item) => {
        const toLocalISO = (ts) => {
            const date = ts.toDate();
            const offset = date.getTimezoneOffset() * 60000;
            return (new Date(date - offset)).toISOString().slice(0, 16);
        };
        setManualStart(toLocalISO(item.start));
        setManualEnd(toLocalISO(item.end));
        setEditingId(item.id);
        setIsEntryMode(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this log?")) {
            await deleteDoc(doc(db, 'users', user.uid, 'sleep_history', id));
            fetchHistory();
            fetchHeatmapData();
        }
    };

    // --- Heatmap Data Memoization ---

    // 1. Last 3 Months (Recent)
    const recentWeeks = useMemo(() => {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 3);
        return buildWeeksInRange(sleepCounts, start, end);
    }, [sleepCounts]);

    // 2. All Years (Full History) - Stacked
    const allYearsWeeks = useMemo(() => {
        const yearsInData = Object.keys(sleepCounts).map(k => parseInt(k.split('-')[0]));

        if (yearsInData.length === 0) {
            // If no data, show current year as a placeholder
            const currentYear = new Date().getFullYear();
            return [{
                year: currentYear,
                weeks: buildWeeksInRange(sleepCounts, new Date(currentYear, 0, 1), new Date(currentYear, 11, 31))
            }];
        }

        const minYear = Math.min(...yearsInData);
        const maxYear = new Date().getFullYear(); // Up to current year
        const timeline = [];

        // Stack from recent to oldest
        for (let y = maxYear; y >= minYear; y--) {
            timeline.push({
                year: y,
                weeks: buildWeeksInRange(sleepCounts, new Date(y, 0, 1), new Date(y, 11, 31))
            });
        }
        return timeline;
    }, [sleepCounts]);


    // Helpers for Rendering
    const getMonthLabels = (weeks, contextYear = null) => {
        return weeks.map((week, index) => {
            // Priority 1: Label the week that contains the 1st of a month
            const firstDayOfMonth = week.find(day => day.date && day.date.getDate() === 1);
            if (firstDayOfMonth) {
                // If contextYear is set, suppress labels for subsequent years (e.g. Jan of next year)
                if (contextYear && firstDayOfMonth.date.getFullYear() !== contextYear) {
                    return { label: '', key: `month-${index}` };
                }
                return { label: MONTH_LABELS[firstDayOfMonth.date.getMonth()], key: `month-${index}` };
            }
            // Priority 2: Label the very first week with its starting month (if no 1st found)
            if (index === 0 && week[0] && week[0].date) {
                return { label: MONTH_LABELS[week[0].date.getMonth()], key: `month-${index}` };
            }
            return { label: '', key: `month-${index}` };
        });
    };

    const getLevelClass = (hours) => {
        if (!hours) return 'profile-heatmap__day--level0';
        if (hours >= 8) return 'profile-heatmap__day--level4';
        if (hours >= 7) return 'profile-heatmap__day--level3';
        if (hours >= 6) return 'profile-heatmap__day--level2';
        return 'profile-heatmap__day--level1';
    };

    return (
        <div className="sleep-tracker-card">
            <h2 className="sleep-title">Sleep Tracker</h2>
            <div className="sleep-subtitle">{isAsleep ? 'Resting...' : 'Ready to rest?'}</div>

            <div className="sleep-state-display">
                <div className={isAsleep ? "sleep-moon" : "sleep-sun"}></div>
                {isAsleep ? (
                    <>
                        <div className="sleep-status-text">{elapsedTime}</div>
                        <div className="sleep-timer">Current Sleep Duration</div>
                    </>
                ) : (
                    <div className="sleep-status-text" style={{ fontSize: '1.5rem' }}>Good Day</div>
                )}
            </div>

            <button className={`sleep-action-btn ${isAsleep ? 'wake-btn' : ''}`} onClick={handleSleepToggle}>
                {isAsleep ? 'Wake Up' : 'Go to Sleep'}
            </button>

            <button className="sleep-manual-link" onClick={() => { setShowHistoryModal(true); setIsEntryMode(false); }}>
                History & Manual Entry
            </button>

            {/* MAIN MODAL */}
            {showHistoryModal && createPortal(
                <div className="sleep-modal-overlay" onClick={() => { setShowHistoryModal(false); setShowFullHistory(false); }}>
                    <div className="sleep-modal" onClick={e => e.stopPropagation()}>
                        <div className="sleep-modal-header">
                            <h3>Sleep History</h3>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {!isEntryMode && (
                                    <button className="icon-btn" onClick={() => { setIsEntryMode(true); setEditingId(null); setManualStart(''); setManualEnd(''); }} style={{ fontSize: '0.9rem', fontWeight: 600, color: '#395aff' }}>
                                        + Add Log
                                    </button>
                                )}
                                <button className="close-btn" onClick={() => { setShowHistoryModal(false); setShowFullHistory(false); }}>×</button>
                            </div>
                        </div>

                        <div className="sleep-modal-content">
                            {isEntryMode ? (
                                <div className="manual-entry-form">
                                    <h4>{editingId ? 'Edit Sleep Log' : 'New Sleep Log'}</h4>
                                    <div className="form-group">
                                        <label>Sleep Start</label>
                                        <input type="datetime-local" value={manualStart} onChange={(e) => setManualStart(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Sleep End (Wake Up)</label>
                                        <input type="datetime-local" value={manualEnd} onChange={(e) => setManualEnd(e.target.value)} />
                                    </div>
                                    <div className="form-actions">
                                        <button className="cancel-btn" onClick={() => setIsEntryMode(false)}>Cancel</button>
                                        <button className="save-btn" onClick={handleSaveManual}>Save</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="sleep-history-list" style={{ maxHeight: '250px', marginBottom: '2rem' }}>
                                        {historyData.length === 0 ? (
                                            <p className="empty-msg">No sleep logs found.</p>
                                        ) : (
                                            historyData.map(item => (
                                                <div key={item.id} className="history-item">
                                                    <div className="history-info">
                                                        <div className="history-date">
                                                            {item.end?.toDate().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                        </div>
                                                        <div className="history-times">
                                                            {item.start?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                                            {item.end?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                    <div className="history-right">
                                                        <span className="history-duration">{item.durationHours}h</span>
                                                        <button className="icon-btn edit" onClick={() => handleEdit(item)}>✏️</button>
                                                        <button className="icon-btn delete" onClick={() => handleDelete(item.id)}>🗑️</button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* RECENT HEATMAP (Last 3 Months) */}
                                    <div className="profile-heatmap-wrapper" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <div className="profile-heatmap__title" style={{ fontSize: '0.9rem', marginBottom: 0 }}>Recent Sleep</div>
                                            <button style={{ background: 'none', border: 'none', color: '#395aff', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }} onClick={() => setShowFullHistory(true)}>
                                                View Full History →
                                            </button>
                                        </div>

                                        <div className="profile-heatmap">
                                            {/* Months Row for Recent */}
                                            <div className="profile-heatmap__months-row">
                                                <span className="profile-heatmap__month-spacer" />
                                                <div className="profile-heatmap__months">
                                                    {getMonthLabels(recentWeeks).map(({ label, key }) => (
                                                        <span key={key} className={`profile-heatmap__month-label${label ? ' profile-heatmap__month-label--visible' : ''}`}>
                                                            {label}
                                                        </span>
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
                                                                <span
                                                                    key={day.key}
                                                                    className={`profile-heatmap__day ${getLevelClass(day.count)}`}
                                                                    title={day.date ? `${day.key}: ${day.count}h` : ''}
                                                                />
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
                <div className="sleep-modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowFullHistory(false)}>
                    <div className="sleep-modal" style={{ maxWidth: '1100px', width: '95%', height: '90vh' }} onClick={e => e.stopPropagation()}>
                        <div className="sleep-modal-header">
                            <h3>Complete Sleep History</h3>
                            <button className="close-btn" onClick={() => setShowFullHistory(false)}>×</button>
                        </div>
                        <div className="sleep-modal-content" style={{ paddingRight: '1rem' }}>
                            {allYearsWeeks.map(yearData => (
                                <div key={yearData.year} style={{ marginBottom: '2.5rem' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#1f2333', fontSize: '1.1rem' }}>{yearData.year}</h4>
                                    <div className="profile-heatmap-wrapper">
                                        <div className="profile-heatmap" style={{ minWidth: 'unset' }}> {/* Allow full width in large modal */}
                                            <div className="profile-heatmap__months-row">
                                                <span className="profile-heatmap__month-spacer" />
                                                <div className="profile-heatmap__months">
                                                    {getMonthLabels(yearData.weeks, yearData.year).map(({ label, key }) => (
                                                        <span key={key} className={`profile-heatmap__month-label${label ? ' profile-heatmap__month-label--visible' : ''}`}>
                                                            {label}
                                                        </span>
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
                                                                <span
                                                                    key={day.key}
                                                                    className={`profile-heatmap__day ${getLevelClass(day.count)}`}
                                                                    title={day.date ? `${day.key}: ${day.count}h` : ''}
                                                                />
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

export default SleepTracker;

