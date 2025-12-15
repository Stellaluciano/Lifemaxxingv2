import React from 'react';
import { NavLink } from 'react-router-dom';

const NancyNavbar = () => {

    const navStyle = ({ isActive }) => ({
        textDecoration: 'none',
        color: isActive ? '#be185d' : '#db2777',
        fontWeight: isActive ? '800' : '600',
        fontSize: '1rem',
        padding: '0.5rem 1rem',
        borderRadius: '20px',
        background: isActive ? 'rgba(255, 255, 255, 0.8)' : 'transparent',
        transition: 'all 0.2s ease',
        opacity: isActive ? 1 : 0.8
    });

    return (
        <div style={{
            position: 'absolute',
            top: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '0.5rem',
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(10px)',
            padding: '0.5rem',
            borderRadius: '100px',
            boxShadow: '0 4px 20px rgba(236, 72, 153, 0.1)',
            zIndex: 50,
            whiteSpace: 'nowrap'
        }}>
            <NavLink to="/nancy" end style={navStyle}>Home</NavLink>
            <NavLink to="/nancy/timeline" style={navStyle}>Timeline</NavLink>
            <NavLink to="/nancy/photos" style={navStyle}>Photo Album</NavLink>
            <NavLink to="/nancy/map" style={navStyle}>Map of Us</NavLink>
            <NavLink to="/nancy/bucket-list" style={navStyle}>Bucket List</NavLink>
        </div>
    );
};

export default NancyNavbar;
