import React, { createContext, useState, useContext, useEffect } from 'react';

const NancyThemeContext = createContext();

export const useNancyTheme = () => useContext(NancyThemeContext);

export const NancyThemeProvider = ({ children }) => {
    // Default to 'pink' if no preference
    const [theme, setTheme] = useState(() => localStorage.getItem('nancyTheme') || 'pink');

    useEffect(() => {
        localStorage.setItem('nancyTheme', theme);
    }, [theme]);

    const themes = {
        pink: '#fff0f5', // Lavender Blush
        green: '#f0fff4', // Honeydew / Mint Cream equivalent
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'pink' ? 'green' : 'pink');
    };

    return (
        <NancyThemeContext.Provider value={{ theme, currentBg: themes[theme], toggleTheme }}>
            {children}
        </NancyThemeContext.Provider>
    );
};
