import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import Card from '../../../components/UI/Card';
import Button from '../../../components/UI/Button';
import styles from './Settings.module.scss';
import { LuShield, LuKey, LuGlobe, LuMoon, LuSun } from 'react-icons/lu';

const Settings = () => {
    const { state } = useAuth();
    const { t, language, setLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const user = state.user || {};

    return (
        <div className={styles.settingsContainer}>
            <div className={styles.header}>
                <h1>{t('settings_page')}</h1>
                <p>{t('manage_account_settings')}</p>
            </div>

            <div className={styles.content}>
                {/* 1) Security Card */}
                <Card>
                    <div className={styles.cardHeader}>
                        <div className={styles.iconTitle}>
                            <LuShield className={styles.icon} />
                            <h3>{t('security')}</h3>
                        </div>
                    </div>

                    <div className={styles.infoRow}>
                        <span className={styles.label}>{t('email')}</span>
                        <span className={styles.value}>{user.email || 'N/A'}</span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.label}>Role</span>
                        <span className={styles.value} style={{ textTransform: 'capitalize' }}>
                            {user.role || 'User'}
                        </span>
                    </div>

                    <div className={styles.actionLinks}>
                        <Button
                            variant="outline"
                            className={styles.linkBtn}
                            onClick={() => navigate('/profile')}
                        >
                            <LuKey className={styles.btnIcon} />
                            {t('change_password_via_profile') || 'Change Password via Profile'}
                        </Button>
                    </div>
                </Card>

                {/* 2) Preferences Card */}
                <Card>
                    <div className={styles.cardHeader}>
                        <div className={styles.iconTitle}>
                            <LuGlobe className={styles.icon} />
                            <h3>{t('preferences') || 'Preferences'}</h3>
                        </div>
                    </div>

                    <div className={styles.prefRow}>
                        <div className={styles.prefLabel}>
                            <LuGlobe className={styles.icon} />
                            <span>{t('language') || 'Language'}</span>
                        </div>
                        <div className={styles.prefControl}>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className={styles.select}
                            >
                                <option value="en">English</option>
                                <option value="vi">Tiếng Việt</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.prefRow}>
                        <div className={styles.prefLabel}>
                            {theme === 'dark' ? <LuMoon className={styles.icon} /> : <LuSun className={styles.icon} />}
                            <span>{t('theme') || 'Theme'}</span>
                        </div>
                        <div className={styles.prefControl}>
                            <label className={styles.toggleSwitch}>
                                <input
                                    type="checkbox"
                                    checked={theme === 'dark'}
                                    onChange={toggleTheme}
                                />
                                <span className={styles.slider}></span>
                            </label>
                            <span className={styles.themeLabel}>
                                {theme === 'dark' ? 'Dark' : 'Light'}
                            </span>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Settings;
