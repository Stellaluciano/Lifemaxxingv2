import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import NancyNavbar from '../../components/NancyNavbar';

const Photos = () => {
    const { user } = useAuth();
    const [photos, setPhotos] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newPhoto, setNewPhoto] = useState({ url: '', caption: '', date: '' });

    // Fetch Photos
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'users', user.uid, 'nancy_photos'),
            orderBy('createdAt', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPhotos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error(error));
        return () => unsubscribe();
    }, [user]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newPhoto.url || !user) return;

        try {
            await addDoc(collection(db, 'users', user.uid, 'nancy_photos'), {
                ...newPhoto,
                createdAt: serverTimestamp()
            });
            setNewPhoto({ url: '', caption: '', date: '' });
            setIsAdding(false);
        } catch (error) {
            alert("Failed to add photo.");
        }
    };

    const handleDelete = async (id) => {
        if (!user || !window.confirm("Delete this photo?")) return;
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'nancy_photos', id));
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

            <NancyNavbar />


            <h1 style={{ color: '#be185d', fontSize: '3rem', marginTop: '2rem', marginBottom: '2rem', textShadow: '0 2px 5px rgba(190, 24, 93, 0.1)' }}>Photo Album 📸</h1>

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
                {isAdding ? 'Cancel' : '+ Add Photo'}
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
                    <input
                        type="url"
                        placeholder="Image URL (Paste from web/hosting)"
                        required
                        value={newPhoto.url}
                        onChange={e => setNewPhoto({ ...newPhoto, url: e.target.value })}
                        style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd' }}
                    />
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '-0.5rem' }}>
                        Tip: You can paste image addresses from Google Photos, Imgur, or Discords.
                    </div>
                    <input
                        type="text"
                        placeholder="Caption"
                        value={newPhoto.caption}
                        onChange={e => setNewPhoto({ ...newPhoto, caption: e.target.value })}
                        style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd' }}
                    />
                    <input
                        type="date"
                        value={newPhoto.date}
                        onChange={e => setNewPhoto({ ...newPhoto, date: e.target.value })}
                        style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd' }}
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
                        Add to Album
                    </button>
                </form>
            )}

            {/* Photo Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '2.5rem',
                width: '100%',
                maxWidth: '1200px',
                padding: '1rem'
            }}>
                {photos.map((photo, index) => (
                    <div key={photo.id} style={{
                        background: 'white',
                        padding: '1rem 1rem 3rem 1rem', // Extra bottom padding for Polaroid look
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                        transform: `rotate(${index % 2 === 0 ? '-2deg' : '2deg'})`,
                        transition: 'transform 0.3s ease',
                        cursor: 'default',
                        position: 'relative'
                    }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05) rotate(0deg) zIndex(10)'}
                        onMouseLeave={e => e.currentTarget.style.transform = `rotate(${index % 2 === 0 ? '-2deg' : '2deg'})`}
                    >
                        <div style={{
                            position: 'absolute',
                            top: '0.5rem',
                            right: '0.5rem',
                            cursor: 'pointer',
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            background: 'white',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            textAlign: 'center',
                            lineHeight: '24px'
                        }}
                            className="delete-btn"
                            onClick={() => handleDelete(photo.id)}>
                            ✖
                        </div>

                        <div style={{
                            width: '100%',
                            height: '280px',
                            backgroundColor: '#f3f4f6',
                            backgroundImage: `url(${photo.url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            marginBottom: '1rem',
                            border: '1px solid #eee'
                        }} />

                        <div style={{ textAlign: 'center', fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif' }}>
                            <div style={{ fontSize: '1.2rem', color: '#374151' }}>{photo.caption}</div>
                            {photo.date && (
                                <div style={{ fontSize: '0.9rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                                    {new Date(photo.date).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            {photos.length === 0 && !isAdding && (
                <p style={{ color: '#9d174d', marginTop: '2rem' }}>No photos yet. Paste a link to start! 🖼️</p>
            )}

            <style>{`
                div:hover > .delete-btn {
                    opacity: 1 !important;
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Photos;
