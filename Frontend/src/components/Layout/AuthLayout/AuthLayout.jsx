import React from 'react';
import { Link } from 'react-router-dom';
import styles from './AuthLayout.module.scss';
// import logo from '../../../../assets/logo.png'; // Assuming logo exists, or use text

const AuthLayout = ({ children, title, subtitle }) => {
    return (
        <div className={styles.authContainer}>
            <div className={styles.authCard}>
                <div className={styles.header}>
                    <Link to="/" className={styles.logoLink}>
                        {/* <img src={logo} alt="Logo" className={styles.logo} /> */}
                        <div className={styles.logoPlaceholder}>
                            <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                                <rect width="48" height="48" rx="8" fill="#1a73e8" />
                                <path d="M12 18h24M12 24h24M12 30h16" stroke="white" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                        </div>
                    </Link>
                    {title && <h1 className={styles.title}>{title}</h1>}
                    {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                </div>
                <div className={styles.content}>
                    {children}
                </div>
            </div>
            <div className={styles.footerLinks}>
                <Link to="/">Back to Home</Link>
                <span>•</span>
                <Link to="/help">Help</Link>
                <span>•</span>
                <Link to="/privacy">Privacy</Link>
            </div>
        </div>
    );
};

export default AuthLayout;
