import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import NancyNavbar from '../../components/NancyNavbar';

import { useNancyTheme } from '../../context/NancyThemeContext';

const Map = () => {
    const { user } = useAuth();
    const { currentBg } = useNancyTheme();
    const [locations, setLocations] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newLoc, setNewLoc] = useState({ city: '', country: '', date: '', notes: '' });

    // Fetch Locations
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'users', user.uid, 'nancy_locations'),
            orderBy('createdAt', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setLocations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error(error));
        return () => unsubscribe();
    }, [user]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newLoc.city || !user) return;

        try {
            await addDoc(collection(db, 'users', user.uid, 'nancy_locations'), {
                ...newLoc,
                createdAt: serverTimestamp()
            });
            setNewLoc({ city: '', country: '', date: '', notes: '' });
            setIsAdding(false);
        } catch (error) {
            alert("Failed to add location.");
        }
    };

    const handleDelete = async (id) => {
        if (!user || !window.confirm("Remove this place?")) return;
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'nancy_locations', id));
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: currentBg,
            padding: '4rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            <NancyNavbar />

            <NancyNavbar />


            <h1 style={{ color: '#be185d', fontSize: '3rem', marginTop: '2rem', marginBottom: '2rem', textShadow: '0 2px 5px rgba(190, 24, 93, 0.1)' }}>Map of Us 🗺️</h1>

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
                    marginBottom: '3rem'
                }}
            >
                {isAdding ? 'Cancel' : '+ Add Place'}
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
                            type="text"
                            placeholder="City / Place"
                            required
                            value={newLoc.city}
                            onChange={e => setNewLoc({ ...newLoc, city: e.target.value })}
                            style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', flex: 1 }}
                        />
                        <input
                            type="text"
                            placeholder="Country"
                            value={newLoc.country}
                            onChange={e => setNewLoc({ ...newLoc, country: e.target.value })}
                            style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', flex: 1 }}
                        />
                    </div>
                    <input
                        type="date"
                        value={newLoc.date}
                        onChange={e => setNewLoc({ ...newLoc, date: e.target.value })}
                        style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd' }}
                    />
                    <textarea
                        placeholder="Travel notes..."
                        value={newLoc.notes}
                        onChange={e => setNewLoc({ ...newLoc, notes: e.target.value })}
                        style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', minHeight: '80px' }}
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
                        Check In 📍
                    </button>
                </form>
            )}

            {/* Travel Log Grid (Passport Stamps) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '2rem',
                width: '100%',
                maxWidth: '1000px',
                padding: '1rem'
            }}>
                {locations.map((loc, index) => (
                    <div key={loc.id} style={{
                        background: '#fff',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        position: 'relative',
                        boxShadow: '0 4px 15px rgba(236, 72, 153, 0.1)',
                        border: '2px dashed #fbcfe8',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        minHeight: '200px',
                        transition: 'transform 0.2s'
                    }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{
                            position: 'absolute',
                            top: '0.5rem',
                            right: '0.5rem',
                            cursor: 'pointer',
                            opacity: 0.3,
                            fontSize: '0.9rem'
                        }}
                            onClick={() => handleDelete(loc.id)}>
                            ✖
                        </div>

                        {/* Stamp Effect */}
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            width: '80px',
                            height: '80px',
                            border: '3px double rgba(190, 24, 93, 0.1)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transform: 'rotate(-20deg)',
                            pointerEvents: 'none'
                        }}>
                            <span style={{ fontSize: '0.6rem', color: 'rgba(190, 24, 93, 0.2)', fontWeight: 'bold' }}>VISITED</span>
                        </div>

                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📍</div>
                        <h3 style={{ margin: '0 0 0.2rem 0', color: '#be185d', fontSize: '1.4rem' }}>{loc.city}</h3>
                        <div style={{ textTransform: 'uppercase', color: '#9d174d', fontWeight: 'bold', fontSize: '0.8rem', letterSpacing: '1px' }}>{loc.country}</div>

                        {loc.date && (
                            <div style={{
                                marginTop: '0.8rem',
                                background: '#fdf2f8',
                                color: '#be185d',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '20px',
                                fontSize: '0.8rem'
                            }}>
                                {new Date(loc.date).toLocaleDateString()}
                            </div>
                        )}

                        {loc.notes && (
                            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666', fontStyle: 'italic' }}>
                                "{loc.notes}"
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {locations.length === 0 && !isAdding && (
                <p style={{ color: '#9d174d', marginTop: '2rem' }}>No adventures logged. Add a place! 🗺️</p>
            )}

            <style>{`
                 @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Map;
