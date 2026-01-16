import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import styles from './LanguageSwitcher.module.scss';

const LanguageSwitcher = () => {
    const { language, setLanguage, t } = useLanguage();

    return (
        <div className={styles.languageSwitcher}>
            <label>{t('language')}</label>
            <div className={styles.buttons}>
                <button
                    className={`${styles.langButton} ${language === 'vi' ? styles.active : ''}`}
                    onClick={() => setLanguage('vi')}
                >
                    🇻🇳 {t('vietnamese')}
                </button>
                <button
                    className={`${styles.langButton} ${language === 'en' ? styles.active : ''}`}
                    onClick={() => setLanguage('en')}
                >
                    🇺🇸 {t('english')}
                </button>
            </div>
        </div>
    );
};

export default LanguageSwitcher;
