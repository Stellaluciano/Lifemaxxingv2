import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import NancyNavbar from '../../components/NancyNavbar';
import { useNancyTheme } from '../../context/NancyThemeContext';

// Leaflet Imports
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom Icons
const createEmojiIcon = (emoji) => {
    return new L.DivIcon({
        className: 'custom-emoji-icon',
        html: `<div style="font-size: 2rem; text-shadow: 0 2px 5px rgba(0,0,0,0.2);">${emoji}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30], // Bottom center-ish
        popupAnchor: [0, -30]
    });
};

const ICONS = {
    default: createEmojiIcon('📍'),
    love: createEmojiIcon('❤️'),
    home: createEmojiIcon('🏠'),
    travel: createEmojiIcon('✈️'),
    food: createEmojiIcon('🍽️'),
    star: createEmojiIcon('⭐')
};

// Component to handle map clicks
const LocationMarker = ({ isAdding, onMapClick }) => {
    useMapEvents({
        click(e) {
            if (isAdding) {
                onMapClick(e.latlng);
            }
        },
    });
    return null;
};

const Map = () => {
    const { user } = useAuth();
    const { currentBg } = useNancyTheme();
    const [locations, setLocations] = useState([]);
    const [isAddingMode, setIsAddingMode] = useState(false);
    const [tempCoords, setTempCoords] = useState(null); // Coords for new pin
    const [formData, setFormData] = useState({ city: '', country: '', date: '', notes: '', type: 'default' });

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

    const handleMapClick = (latlng) => {
        setTempCoords(latlng);
        setIsAddingMode(false); // Stop listening for clicks, show form
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!user || !tempCoords) return;

        try {
            await addDoc(collection(db, 'users', user.uid, 'nancy_locations'), {
                ...formData,
                lat: tempCoords.lat,
                lng: tempCoords.lng,
                createdAt: serverTimestamp()
            });
            // Reset
            setFormData({ city: '', country: '', date: '', notes: '', type: 'default' });
            setTempCoords(null);
        } catch (error) {
            console.error("Error saving location:", error);
            alert("Failed to save location.");
        }
    };

    const handleDelete = async (id) => {
        if (!user || !window.confirm("Remove this memory?")) return;
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'nancy_locations', id));
        } catch (error) {
            console.error(error);
        }
    };

    // Separate mapped vs unmapped (legacy) locations
    const mappedLocations = locations.filter(l => l.lat && l.lng);
    const unmappedLocations = locations.filter(l => !l.lat || !l.lng);

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            background: currentBg,
            position: 'relative',
            overflow: 'hidden'
        }}>
            <NancyNavbar />

            {/* Map Container */}
            <MapContainer
                center={[39.8283, -98.5795]} // Center of USA approx
                zoom={4}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <LocationMarker isAdding={isAddingMode} onMapClick={handleMapClick} />

                {mappedLocations.map(loc => (
                    <Marker
                        key={loc.id}
                        position={[loc.lat, loc.lng]}
                        icon={ICONS[loc.type] || ICONS.default}
                    >
                        <Popup>
                            <div style={{ textAlign: 'center', fontFamily: 'sans-serif' }}>
                                <h3 style={{ margin: '0 0 5px 0', color: '#be185d' }}>{loc.city}</h3>
                                {loc.country && <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#666' }}>{loc.country}</div>}
                                {loc.date && <div style={{ fontSize: '0.8rem', color: '#999', margin: '5px 0' }}>{new Date(loc.date).toLocaleDateString()}</div>}
                                {loc.notes && <p style={{ margin: '5px 0', fontStyle: 'italic' }}>"{loc.notes}"</p>}
                                <button
                                    onClick={() => handleDelete(loc.id)}
                                    style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', marginTop: '5px', cursor: 'pointer', fontSize: '0.7rem' }}
                                >
                                    Remove
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* UI Overlay: Title & Add Button */}
            <div style={{
                position: 'absolute',
                top: '6rem',
                left: '2rem',
                zIndex: 40,
                pointerEvents: 'none' // Let clicks pass through to map
            }}>
                <h1 style={{
                    margin: 0,
                    color: '#be185d',
                    fontSize: '3rem',
                    textShadow: '2px 2px 0px white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 1px 0 white',
                    pointerEvents: 'auto'
                }}>
                    Map of Us 🗺️
                </h1>
            </div>

            {/* Instruction Banner when Adding */}
            {isAddingMode && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    padding: '1rem 2rem',
                    borderRadius: '50px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                    zIndex: 1000,
                    pointerEvents: 'none', // Allow clicking through
                    textAlign: 'center'
                }}>
                    <h2 style={{ margin: 0, color: '#be185d' }}>👇 Tap anywhere on the map!</h2>
                    <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>(Zoom in for better precision)</p>
                </div>
            )}

            {/* Floating Action Button */}
            {!tempCoords && (
                <button
                    onClick={() => {
                        setIsAddingMode(!isAddingMode);
                        setTempCoords(null);
                    }}
                    style={{
                        position: 'absolute',
                        bottom: '3rem',
                        right: '3rem',
                        background: isAddingMode ? '#6b7280' : '#be185d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50px',
                        padding: '1rem 2rem',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                        cursor: 'pointer',
                        zIndex: 1000,
                        transition: 'transform 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    {isAddingMode ? 'Cancel' : '📍 Add Memory'}
                </button>
            )}

            {/* Modal Form for New Pin */}
            {tempCoords && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'white',
                    padding: '2rem',
                    borderRadius: '24px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                    zIndex: 2000,
                    width: '90%',
                    maxWidth: '400px'
                }}>
                    <h3 style={{ marginTop: 0, color: '#be185d' }}>Add New Memory</h3>
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <select
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                            style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                        >
                            <option value="default">📍 General Place</option>
                            <option value="love">❤️ Romantic Date</option>
                            <option value="home">🏠 Our Home</option>
                            <option value="travel">✈️ Trip / Vacation</option>
                            <option value="food">🍽️ Restaurant / Food</option>
                            <option value="star">⭐ Special Event</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Place Name (e.g. Navy Pier)"
                            required
                            value={formData.city}
                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                            style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                        <input
                            type="text"
                            placeholder="Country / State"
                            value={formData.country}
                            onChange={e => setFormData({ ...formData, country: e.target.value })}
                            style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                        <input
                            type="date"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                            style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                        <textarea
                            placeholder="What happened here?"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', minHeight: '80px' }}
                        />
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => setTempCoords(null)}
                                style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none', background: '#ddd', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none', background: '#be185d', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Save Pin
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Unmapped Legacy Data Warning */}
            {unmappedLocations.length > 0 && (
                <div style={{
                    position: 'absolute',
                    bottom: '1rem',
                    left: '1rem',
                    background: 'rgba(255, 255, 255, 0.8)',
                    padding: '1rem',
                    borderRadius: '12px',
                    zIndex: 1000,
                    maxWidth: '300px',
                    fontSize: '0.8rem',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                }}>
                    <strong>Unmapped Memories:</strong>
                    <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', marginBottom: 0 }}>
                        {unmappedLocations.map(l => (
                            <li key={l.id}>
                                {l.city}
                                <button
                                    onClick={() => handleDelete(l.id)}
                                    style={{ marginLeft: '5px', border: 'none', background: 'none', cursor: 'pointer', color: 'red' }}>
                                    (x)
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div style={{ marginTop: '0.5rem', fontStyle: 'italic', color: '#666' }}>
                        *Please re-add these on the map!
                    </div>
                </div>
            )}
        </div>
    );
};

export default Map;
