import React, { useState, useEffect } from 'react';

import { db } from '../../firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import NancyNavbar from '../../components/NancyNavbar';

const CreativeMoments = () => {
    const { user } = useAuth();
    const [moments, setMoments] = useState([]);
    const [newMoment, setNewMoment] = useState('');

    // Fetch Moments
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'users', user.uid, 'nancy_creative_moments'),
            orderBy('createdAt', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMoments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error(error));
        return () => unsubscribe();
    }, [user]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newMoment.trim() || !user) return;

        try {
            await addDoc(collection(db, 'users', user.uid, 'nancy_creative_moments'), {
                text: newMoment,
                createdAt: serverTimestamp()
            });
            setNewMoment('');
        } catch (error) {
            alert("Failed to add moment.");
        }
    };

    const handleDelete = async (id) => {
        if (!user || !window.confirm("Remove this moment?")) return;
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'nancy_creative_moments', id));
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#fff0f5',
            padding: '4rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            <NancyNavbar />

            {/* Title */}
            <h1 style={{
                color: '#be185d',
                fontSize: '3rem',
                marginTop: '4rem',
                marginBottom: '1rem',
                textAlign: 'center',
                textShadow: '0 2px 5px rgba(190, 24, 93, 0.1)'
            }}>
                Somebody is Creative...
            </h1>
            <p style={{ color: '#db2777', fontSize: '1.2rem', marginBottom: '3rem', fontStyle: 'italic' }}>
                It is of paramount importance that we capture the cutest moments of nancy.
            </p>

            {/* Add Input - Similar to Bucket List but maybe a textarea for longer thoughts */}
            <div style={{ width: '100%', maxWidth: '600px', marginBottom: '3rem' }}>
                <form onSubmit={handleAdd} style={{ position: 'relative' }}>
                    <textarea
                        value={newMoment}
                        onChange={(e) => setNewMoment(e.target.value)}
                        placeholder="What creative/special thing did she do?"
                        style={{
                            width: '100%',
                            padding: '1.5rem',
                            paddingRight: '4rem', // Space for button
                            borderRadius: '24px',
                            border: '2px solid rgba(236, 72, 153, 0.2)',
                            fontSize: '1.1rem',
                            outline: 'none',
                            boxShadow: '0 4px 20px rgba(236, 72, 153, 0.05)',
                            resize: 'vertical',
                            minHeight: '120px',
                            fontFamily: 'inherit'
                        }}
                    />
                    <button type="submit" style={{
                        position: 'absolute',
                        bottom: '1.5rem',
                        right: '1.5rem',
                        background: '#be185d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50px',
                        padding: '0.8rem 1.5rem',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(190, 24, 93, 0.2)',
                        transition: 'transform 0.1s'
                    }}
                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        Save
                    </button>
                </form>
            </div>

            {/* List of Moments */}
            <div style={{
                width: '100%',
                maxWidth: '800px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem'
            }}>
                {moments.map(moment => (
                    <div key={moment.id} style={{
                        background: 'white',
                        padding: '2rem',
                        borderRadius: '24px',
                        boxShadow: '0 4px 15px rgba(236, 72, 153, 0.08)',
                        position: 'relative',
                        transition: 'transform 0.2s',
                        border: '1px solid rgba(255, 240, 245, 0.8)'
                    }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{
                            position: 'absolute',
                            top: '1.5rem',
                            right: '1.5rem',
                            cursor: 'pointer',
                            opacity: 0.2,
                            fontSize: '1.2rem'
                        }}
                            onClick={() => handleDelete(moment.id)}>
                            ✖
                        </div>

                        <p style={{
                            fontSize: '1.15rem',
                            color: '#374151',
                            lineHeight: '1.6',
                            whiteSpace: 'pre-wrap',
                            marginBottom: '1rem'
                        }}>
                            {moment.text}
                        </p>

                        {moment.createdAt && (
                            <div style={{
                                fontSize: '0.85rem',
                                color: '#be185d',
                                opacity: 0.6,
                                fontWeight: '600'
                            }}>
                                {new Date(moment.createdAt.toDate ? moment.createdAt.toDate() : moment.createdAt).toLocaleDateString(undefined, {
                                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {moments.length === 0 && (
                <div style={{ textAlign: 'center', opacity: 0.6, marginTop: '2rem', color: '#9d174d' }}>
                    <p>No moments recorded yet.</p>
                </div>
            )}
        </div>
    );
};

export default CreativeMoments;
