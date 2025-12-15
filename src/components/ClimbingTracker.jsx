import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
    deleteDoc,
    doc
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
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import './ClimbingTracker.css';

const V_GRADES = ['VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17'];

const getLocalToday = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const ClimbingTracker = () => {
    const { user } = useAuth();
    const [climbs, setClimbs] = useState([]);
    const [timeRange, setTimeRange] = useState('ALL'); // '1W', '1M', '1Y', 'ALL'
    const [showLogModal, setShowLogModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // Form State
    const [selectedGrade, setSelectedGrade] = useState('V3');
    const [logDate, setLogDate] = useState(getLocalToday());

    // Graph Color Helper
    const getBarColor = (grade) => {
        // Gradient from Green (easy) to Red/Purple (hard)
        const index = V_GRADES.indexOf(grade);
        if (index < 3) return '#4ade80'; // Easy
        if (index < 6) return '#fbbf24'; // Moderate
        if (index < 9) return '#f87171'; // Hard
        return '#a855f7'; // Elite
    };

    // Fetch History
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'users', user.uid, 'climbing_history'),
            orderBy('date', 'desc')
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Convert timestamp to Date object for easier filtering
                timestamp: doc.data().date?.toMillis() || Date.now()
            }));
            setClimbs(data);
        });

        return () => unsub();
    }, [user]);

    // Calculate Chart Data based on Time Range
    const chartData = React.useMemo(() => {
        const now = Date.now();
        let cutoff = 0;
        if (timeRange === '1W') cutoff = now - 7 * 24 * 60 * 60 * 1000;
        if (timeRange === '1M') cutoff = now - 30 * 24 * 60 * 60 * 1000;
        if (timeRange === '1Y') cutoff = now - 365 * 24 * 60 * 60 * 1000;

        // Filter
        const filtered = climbs.filter(c => c.timestamp >= cutoff);

        // Aggregate
        const counts = {};
        V_GRADES.forEach(g => counts[g] = 0); // Initialize all grades to 0

        filtered.forEach(c => {
            if (counts[c.grade] !== undefined) {
                counts[c.grade]++;
            }
        });

        // Convert to array
        return V_GRADES.map(grade => ({
            grade,
            count: counts[grade]
        })).filter(d => d.count > 0 || timeRange === 'ALL');
    }, [climbs, timeRange]);

    const handleLogClimb = async () => {
        if (!user) return;
        try {
            // Create a proper date object from the input string (YYYY-MM-DD)
            // We set time to noon to avoid timezone rolling issues
            const [y, m, d] = logDate.split('-').map(Number);
            const dateObj = new Date(y, m - 1, d, 12, 0, 0, 0);

            await addDoc(collection(db, 'users', user.uid, 'climbing_history'), {
                grade: selectedGrade,
                date: dateObj,
                createdAt: serverTimestamp()
            });
            setShowLogModal(false);
            // Reset to defaults
            setSelectedGrade('V3');
            setLogDate(getLocalToday());
        } catch (error) {
            console.error("Error logging climb:", error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this log?")) return;
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'climbing_history', id));
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <div className="climbing-tracker-container">
            <div className="top-bar">
                <div className="title-group">
                    <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#1f2333' }}>Climbing Tracker</h2>
                    <span className="climb-subtitle">The only way is up.</span>
                </div>
                <button
                    className="climb-history-btn-top"
                    onClick={() => setShowHistoryModal(true)}
                >
                    Show History
                </button>
            </div>

            <div className="chart-area">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis
                            dataKey="grade"
                            tickLine={false}
                            axisLine={{ stroke: '#eee' }}
                            tick={{ fontSize: 10, fill: '#666' }}
                            interval={timeRange === 'ALL' ? 'preserveStartEnd' : 0}
                            ticks={timeRange === 'ALL' ? ['VB', 'V1', 'V3', 'V5', 'V7', 'V9', 'V11', 'V13', 'V15', 'V17'] : undefined}
                        />
                        <YAxis
                            allowDecimals={false}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 12, fill: '#aaa' }}
                        />
                        <Tooltip
                            cursor={{ fill: '#f4f4f5' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getBarColor(entry.grade)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
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
            </div>

            <div className="climb-actions-bottom">
                <button className="log-climb-btn full-width" onClick={() => setShowLogModal(true)}>
                    + Log Climb
                </button>
            </div>

            {/* LOG MODAL */}
            {showLogModal && createPortal(
                <div className="climb-modal-overlay" onClick={() => setShowLogModal(false)}>
                    <div className="climb-modal" onClick={e => e.stopPropagation()}>
                        <h3>Log Sent Climb</h3>

                        <div className="form-group">
                            <label>Grade</label>
                            <div className="grade-grid">
                                {V_GRADES.map(g => (
                                    <button
                                        key={g}
                                        className={`grade-select-btn ${selectedGrade === g ? 'selected' : ''}`}
                                        onClick={() => setSelectedGrade(g)}
                                        style={{
                                            borderColor: selectedGrade === g ? getBarColor(g) : 'transparent',
                                            backgroundColor: selectedGrade === g ? `${getBarColor(g)}20` : '#f5f5f5',
                                            color: selectedGrade === g ? getBarColor(g) : '#333'
                                        }}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Date Sent</label>
                            <input
                                type="date"
                                value={logDate}
                                onChange={(e) => setLogDate(e.target.value)}
                                className="climb-date-input"
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowLogModal(false)}>Cancel</button>
                            <button className="save-btn" onClick={handleLogClimb}>Log It!</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* HISTORY MODAL */}
            {showHistoryModal && createPortal(
                <div className="climb-modal-overlay" onClick={() => setShowHistoryModal(false)}>
                    <div className="climb-modal history-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="history-header">
                            <h3>Climb History</h3>
                            <button className="close-icon" onClick={() => setShowHistoryModal(false)}>✕</button>
                        </div>

                        <div className="history-list">
                            {climbs.length === 0 ? (
                                <p className="empty-message">No climbs logged yet. Go send some rocks!</p>
                            ) : (
                                climbs.map(climb => (
                                    <div key={climb.id} className="history-item">
                                        <div className="history-info">
                                            <span
                                                className="history-grade"
                                                style={{ backgroundColor: getBarColor(climb.grade) }}
                                            >
                                                {climb.grade}
                                            </span>
                                            <span className="history-date">
                                                {new Date(climb.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <button className="delete-log-btn" onClick={() => handleDelete(climb.id)}>
                                            Trash
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ClimbingTracker;
