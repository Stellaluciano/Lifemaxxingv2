import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import NancyNavbar from '../../components/NancyNavbar';

const Timeline = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newEvent, setNewEvent] = useState({ date: '', title: '', description: '', icon: '❤️' });

    // Fetch Timeline Events
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'users', user.uid, 'nancy_timeline'),
            orderBy('date', 'desc') // Newest first
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error(error));
        return () => unsubscribe();
    }, [user]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newEvent.date || !newEvent.title || !user) return;

        try {
            await addDoc(collection(db, 'users', user.uid, 'nancy_timeline'), {
                ...newEvent,
                createdAt: serverTimestamp()
            });
            setNewEvent({ date: '', title: '', description: '', icon: '❤️' });
            setIsAdding(false);
        } catch (error) {
            alert("Failed to add event.");
        }
    };

    const handleDelete = async (id) => {
        if (!user || !window.confirm("Remove this memory?")) return;
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'nancy_timeline', id));
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#fff0f5', // Pink tint
            padding: '4rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            overflowX: 'hidden'
        }}>
            <NancyNavbar />

            <NancyNavbar />


            <h1 style={{ color: '#be185d', fontSize: '3rem', marginTop: '2rem', marginBottom: '2rem', textShadow: '0 2px 5px rgba(190, 24, 93, 0.1)' }}>Our Story ⏳</h1>

            {/* Add Button */}
            <button
                onClick={() => setIsAdding(!isAdding)}
                style={{
                    background: '#be185d',
                    color: 'white',
                    border: 'none',
                    padding: '0.8rem 2rem',
                    borderRadius: '50px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(190, 24, 93, 0.2)',
                    marginBottom: '3rem',
                    zIndex: 10
                }}
            >
                {isAdding ? 'Cancel' : '+ Add Memory'}
            </button>

            {/* Add Form */}
            {isAdding && (
                <form onSubmit={handleAdd} style={{
                    background: 'white',
                    padding: '2rem',
                    borderRadius: '24px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    width: '100%',
                    maxWidth: '500px',
                    marginBottom: '3rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    animation: 'fadeInUp 0.3s ease-out'
                }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <input
                            type="date"
                            required
                            value={newEvent.date}
                            onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                            style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', flex: 1 }}
                        />
                        <select
                            value={newEvent.icon}
                            onChange={e => setNewEvent({ ...newEvent, icon: e.target.value })}
                            style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', fontSize: '1.2rem' }}
                        >
                            <option value="❤️">❤️ Love</option>
                            <option value="✈️">✈️ Trip</option>
                            <option value="📅">📅 Date</option>
                            <option value="🏠">🏠 Home</option>
                            <option value="🎉">🎉 Party</option>
                            <option value="✨">✨ Special</option>
                        </select>
                    </div>
                    <input
                        type="text"
                        placeholder="Title (e.g., First Date)"
                        required
                        value={newEvent.title}
                        onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                        style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', fontSize: '1.1rem' }}
                    />
                    <textarea
                        placeholder="Description (optional)"
                        value={newEvent.description}
                        onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                        style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', minHeight: '80px', fontFamily: 'inherit' }}
                    />
                    <button type="submit" style={{
                        background: '#be185d',
                        color: 'white',
                        border: 'none',
                        padding: '1rem',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}>
                        Save Memory
                    </button>
                </form>
            )}

            {/* Timeline */}
            <div style={{
                position: 'relative',
                maxWidth: '800px',
                width: '100%',
                padding: '2rem 0'
            }}>
                {/* Central Line */}
                <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    background: 'rgba(190, 24, 93, 0.2)',
                    transform: 'translateX(-50%)',
                    borderRadius: '2px'
                }} />

                {events.map((event, index) => {
                    const isLeft = index % 2 === 0;
                    return (
                        <div key={event.id} style={{
                            display: 'flex',
                            justifyContent: isLeft ? 'flex-end' : 'flex-start',
                            paddingBottom: '3rem',
                            position: 'relative',
                            width: '100%'
                        }}>
                            {/* Dot on Line */}
                            <div style={{
                                position: 'absolute',
                                left: '50%',
                                width: '20px',
                                height: '20px',
                                background: '#be185d',
                                borderRadius: '50%',
                                transform: 'translateX(-50%)',
                                border: '4px solid white',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                zIndex: 2
                            }} />

                            {/* Card */}
                            <div style={{
                                width: '45%',
                                background: 'white',
                                padding: '1.5rem',
                                borderRadius: '20px',
                                boxShadow: '0 4px 20px rgba(190, 24, 93, 0.1)',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem',
                                border: '1px solid rgba(190, 24, 93, 0.05)'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '1rem',
                                    right: '1rem',
                                    cursor: 'pointer',
                                    opacity: 0.3
                                }} onClick={() => handleDelete(event.id)}>
                                    ✖
                                </div>

                                <div style={{ fontSize: '2rem', marginBottom: '-0.5rem' }}>{event.icon}</div>
                                <div style={{ color: '#be185d', fontWeight: 'bold', opacity: 0.6, fontSize: '0.9rem', letterSpacing: '0.05em' }}>
                                    {new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                                <h3 style={{ margin: 0, color: '#374151', fontSize: '1.4rem' }}>{event.title}</h3>
                                {event.description && (
                                    <p style={{ margin: 0, color: '#6b7280', fontSize: '1rem', lineHeight: 1.5 }}>{event.description}</p>
                                )}
                            </div>
                        </div>
                    );
                })}

                {events.length === 0 && (
                    <div style={{ textAlign: 'center', background: 'white', padding: '2rem', borderRadius: '20px', width: '300px', margin: '0 auto', position: 'relative', zIndex: 5 }}>
                        <p style={{ color: '#9d174d' }}>No memories yet. Start the timeline! 👇</p>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Timeline;
