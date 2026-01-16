import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    LuLayoutDashboard,
    LuLogOut,
    LuSettings,
    LuUser,
    LuMenu,
    LuX
} from 'react-icons/lu';
import styles from './LandingHeader.module.scss';
// Image import removed

const LandingHeader = () => {
    const { state, logout } = useAuth();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const scrollToSection = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            setMobileMenuOpen(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
    };

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                {/* Logo */}
                <Link to="/" className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="2" y="4" width="20" height="16" rx="4" fill="#14B8A6" />
                            <path d="M7 12H17M7 8H17M7 16H13" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                    <span className={styles.brandName}>ALLMTAGS</span>
                </Link>

                {/* Desktop Nav */}
                <nav className={styles.desktopNav}>
                    {!state.isAuthenticated ? (
                        // Public Navigation
                        <>
                            <button onClick={() => scrollToSection('features')} className={styles.navLink}>Features</button>
                            <button onClick={() => scrollToSection('how-it-works')} className={styles.navLink}>How it Works</button>
                            <button onClick={() => scrollToSection('testimonials')} className={styles.navLink}>Testimonials</button>
                        </>
                    ) : (
                        // App Navigation (Authenticated)
                        <>
                            <Link to="/surveys" className={styles.navLink}>Surveys</Link>
                            <Link to="/analytics" className={styles.navLink}>Analytics</Link>
                            <Link to="/templates" className={styles.navLink}>Templates</Link>
                        </>
                    )}
                </nav>

                {/* Actions (Right Side) */}
                <div className={styles.actions}>
                    {!state.isAuthenticated ? (
                        <>
                            <Link to="/login" className={styles.loginBtn}>Log In</Link>
                            <Link to="/register" className={styles.signupBtn}>Get Started</Link>
                        </>
                    ) : (
                        <div className={styles.userMenuWrapper}>
                            <button
                                className={styles.userButton}
                                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                            >
                                <div className={styles.avatar}>
                                    {getInitials(state.user?.full_name || state.user?.username)}
                                </div>
                                <span className={styles.userName}>{state.user?.full_name?.split(' ')[0]}</span>
                            </button>

                            {userDropdownOpen && (
                                <div className={styles.dropdown}>
                                    <div className={styles.dropdownHeader}>
                                        <strong>{state.user?.full_name}</strong>
                                        <span>{state.user?.email}</span>
                                    </div>
                                    <div className={styles.dropdownDivider} />
                                    <Link to="/profile" className={styles.dropdownItem}>
                                        <LuUser size={16} /> Profile
                                    </Link>
                                    <Link to="/settings" className={styles.dropdownItem}>
                                        <LuSettings size={16} /> Settings
                                    </Link>
                                    <Link to="/dashboard" className={styles.dropdownItem}>
                                        <LuLayoutDashboard size={16} /> Dashboard
                                    </Link>
                                    <div className={styles.dropdownDivider} />
                                    <button onClick={handleLogout} className={`${styles.dropdownItem} ${styles.danger}`}>
                                        <LuLogOut size={16} /> Log Out
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mobile Toggle */}
                    <button
                        className={styles.mobileToggle}
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <LuX size={24} /> : <LuMenu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className={styles.mobileMenu}>
                    {!state.isAuthenticated ? (
                        <>
                            <button onClick={() => scrollToSection('features')}>Features</button>
                            <button onClick={() => scrollToSection('how-it-works')}>How it Works</button>
                            <Link to="/login" className={styles.mobileLogin}>Log In</Link>
                            <Link to="/register" className={styles.mobileSignup}>Get Started Free</Link>
                        </>
                    ) : (
                        <>
                            <Link to="/dashboard">Dashboard</Link>
                            <Link to="/surveys">Surveys</Link>
                            <button onClick={handleLogout} className={styles.mobileLogout}>Log Out</button>
                        </>
                    )}
                </div>
            )}
        </header>
    );
};

export default LandingHeader;
