import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // Check localStorage for saved theme, default to 'light'
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('allmtags_theme');
        return savedTheme || 'light';
    });

    useEffect(() => {
        // Save theme to localStorage
        localStorage.setItem('allmtags_theme', theme);

        // Apply theme to document body or html
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
