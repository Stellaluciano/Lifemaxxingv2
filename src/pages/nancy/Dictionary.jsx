import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import NancyNavbar from '../../components/NancyNavbar';

const NancyDictionary = () => {
    const { user } = useAuth();
    const [entries, setEntries] = useState([]);
    const [newWord, setNewWord] = useState('');
    const [newDefinition, setNewDefinition] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch Dictionary Entries
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'users', user.uid, 'nancy_dictionary'),
            orderBy('word', 'asc') // Alphabetical order
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error(error));
        return () => unsubscribe();
    }, [user]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newWord.trim() || !newDefinition.trim() || !user) return;

        try {
            await addDoc(collection(db, 'users', user.uid, 'nancy_dictionary'), {
                word: newWord.trim(),
                definition: newDefinition.trim(),
                createdAt: serverTimestamp()
            });
            setNewWord('');
            setNewDefinition('');
        } catch (error) {
            alert("Failed to add entry.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this definition?")) return;
        await deleteDoc(doc(db, 'users', user.uid, 'nancy_dictionary', id));
    };

    const filteredEntries = entries.filter(entry =>
        entry.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.definition.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{
            minHeight: '100vh',
            background: '#fafafa', // Paper-like off-white
            padding: '4rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontFamily: '"Merriweather", "Georgia", serif' // Dictionary serif look
        }}>
            <NancyNavbar />

            <div style={{ width: '100%', maxWidth: '800px', marginTop: '2rem' }}>
                <h1 style={{
                    textAlign: 'center',
                    fontSize: '3rem',
                    color: '#1f2937',
                    borderBottom: '4px solid #be185d',
                    paddingBottom: '1rem',
                    marginBottom: '3rem'
                }}>
                    The Nancy Dictionary 📖
                </h1>

                {/* Search & Add Section */}
                <div style={{
                    background: 'white',
                    padding: '2rem',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                    marginBottom: '3rem',
                    border: '1px solid #e5e7eb'
                }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <input
                            type="text"
                            placeholder="Search definitions..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                fontSize: '1.1rem',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontFamily: 'inherit'
                            }}
                        />
                    </div>

                    <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ margin: 0, color: '#be185d' }}>Add New Term</h3>
                        <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                            <input
                                type="text"
                                value={newWord}
                                onChange={(e) => setNewWord(e.target.value)}
                                placeholder="Word / Phrase"
                                style={{
                                    padding: '0.8rem',
                                    fontSize: '1.2rem',
                                    fontWeight: 'bold',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    fontFamily: 'inherit'
                                }}
                            />
                            <textarea
                                value={newDefinition}
                                onChange={(e) => setNewDefinition(e.target.value)}
                                placeholder="Definition / Context / Usage"
                                style={{
                                    padding: '0.8rem',
                                    fontSize: '1rem',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    minHeight: '100px',
                                    fontFamily: 'inherit'
                                }}
                            />
                            <button type="submit" style={{
                                alignSelf: 'flex-end',
                                background: '#be185d',
                                color: 'white',
                                border: 'none',
                                padding: '0.8rem 2rem',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                borderRadius: '4px'
                            }}>
                                Add Definition
                            </button>
                        </div>
                    </form>
                </div>

                {/* Dictionary Entries */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {filteredEntries.map(entry => (
                        <div key={entry.id} style={{
                            paddingBottom: '2rem',
                            borderBottom: '1px solid #e5e7eb',
                            position: 'relative'
                        }}>
                            <button
                                onClick={() => handleDelete(entry.id)}
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 0,
                                    background: 'none',
                                    border: 'none',
                                    color: '#9ca3af',
                                    cursor: 'pointer',
                                    fontSize: '1.2rem',
                                    opacity: 0.5
                                }}
                                title="Delete Entry"
                            >
                                ✖
                            </button>

                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
                                <h2 style={{
                                    margin: 0,
                                    fontSize: '2rem',
                                    color: '#111827',
                                    fontWeight: 'bold',
                                    fontFamily: '"Times New Roman", Times, serif'
                                }}>
                                    {entry.word}
                                </h2>
                                <span style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '1rem' }}>noun / verb / whatever</span>
                            </div>

                            <div style={{ marginTop: '0.5rem', paddingLeft: '2rem', borderLeft: '3px solid #fbcfe8' }}>
                                <p style={{
                                    fontSize: '1.1rem',
                                    lineHeight: '1.6',
                                    color: '#374151',
                                    margin: '0.5rem 0',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {entry.definition}
                                </p>
                                {entry.createdAt && (
                                    <small style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                                        — Added {new Date(entry.createdAt.toDate ? entry.createdAt.toDate() : entry.createdAt).toLocaleDateString()}
                                    </small>
                                )}
                            </div>
                        </div>
                    ))}

                    {filteredEntries.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#9ca3af', fontStyle: 'italic', marginTop: '2rem' }}>
                            No entries found. Start building your lexicon!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NancyDictionary;
