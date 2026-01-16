// src/components/SurveyAccessControl/index.jsx
import React, { useState, useEffect } from 'react';
import styles from './SurveyAccessControl.module.scss';
import { PublicIcon, LoginIcon, PrivateIcon, InternalIcon, CheckIcon } from '../Icons';

const SurveyAccessControl = ({
  surveyId,
  value = { access_type: 'public', require_login: false, allow_anonymous: true, workspace_id: null },
  onChange,
  availableWorkspaces = [],
  compact = false
}) => {
  const [accessConfig, setAccessConfig] = useState(value);
  const [inviteEmails, setInviteEmails] = useState('');
  const [parsedEmails, setParsedEmails] = useState([]);
  const [invalidEmails, setInvalidEmails] = useState([]);

  // Sync check: only update if value deeply changes (or just access_type/workspace)
  // We avoid syncing emails constantly from prop to prevent cursor jumps if we were controlled
  // Sync check: only update if value deeply changes (or just access_type/workspace)
  // We avoid syncing emails constantly from prop to prevent cursor jumps if we were controlled
  useEffect(() => {
    setAccessConfig(prev => {
      if (value.access_type !== prev.access_type ||
        value.workspace_id !== prev.workspace_id ||
        value.require_login !== prev.require_login) {
        return { ...prev, ...value };
      }
      return prev;
    });
  }, [value]);

  // Initial load of emails
  useEffect(() => {
    setInviteEmails(prev => {
      if (value.inviteEmails && !prev) {
        return value.inviteEmails;
      }
      return prev;
    });
  }, [value.inviteEmails]);

  // Parse emails locally for UI feedback
  useEffect(() => {
    if (!inviteEmails) {
      setParsedEmails([]);
      setInvalidEmails([]);
      return;
    }

    const rawList = inviteEmails.split(/[\n,;]+/).map(e => e.trim()).filter(e => e.length > 0);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const valid = [];
    const invalid = [];

    rawList.forEach(email => {
      if (emailRegex.test(email)) valid.push(email);
      else invalid.push(email);
    });

    setParsedEmails(valid);
    setInvalidEmails(invalid);
  }, [inviteEmails]);

  const handleEmailBlur = () => {
    // Sync to parent on blur to avoid render loops
    onChange({ ...accessConfig, inviteEmails });
  };

  const handleAccessTypeChange = (newAccessType) => {
    let newConfig = { ...accessConfig, access_type: newAccessType };

    switch (newAccessType) {
      case 'public':
        newConfig = { ...newConfig, require_login: false, allow_anonymous: true };
        break;
      case 'public_with_login':
        newConfig = { ...newConfig, require_login: true, allow_anonymous: false };
        break;
      case 'private':
      case 'internal':
        newConfig = { ...newConfig, require_login: true, allow_anonymous: false };
        break;
      default: break;
    }

    setAccessConfig(newConfig);
    onChange({ ...newConfig, inviteEmails });
  };

  const handleWorkspaceChange = (workspaceId) => {
    const newConfig = {
      ...accessConfig,
      workspace_id: workspaceId ? parseInt(workspaceId) : null,
      access_type: (!workspaceId && accessConfig.access_type === 'internal') ? 'public' : accessConfig.access_type
    };
    setAccessConfig(newConfig);
    onChange({ ...newConfig, inviteEmails });
  };

  const accessOptions = [
    {
      type: 'public',
      title: 'Public',
      subtitle: 'Anyone can respond. No login required.',
      icon: PublicIcon,
      recommended: true
    },
    {
      type: 'public_with_login',
      title: 'Public (Login Required)',
      subtitle: 'Anyone can respond, but must sign in.',
      icon: LoginIcon
    },
    {
      type: 'private',
      title: 'Private (Invite Only)',
      subtitle: 'Only invited people can access.',
      icon: PrivateIcon
    },
    {
      type: 'internal',
      title: 'Internal (Workspace)',
      subtitle: 'Only workspace members.',
      icon: InternalIcon,
      disabled: !availableWorkspaces.length
    }
  ];

  return (
    <div className={styles.container}>
      {/* Workspace Selector (Top) */}
      <div className={styles.workspaceSection}>
        <label className={styles.sectionLabel}>Workspace Context (Optional)</label>
        <select
          value={accessConfig.workspace_id || ''}
          onChange={(e) => handleWorkspaceChange(e.target.value)}
          className={styles.selectInput}
        >
          <option value="">Personal Survey (No Workspace)</option>
          {availableWorkspaces.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      {/* Access Cards */}
      <h3 className={styles.sectionTitle}>Who can respond?</h3>
      <div className={styles.cardsGrid}>
        {accessOptions.map((opt) => {
          const Icon = opt.icon;
          const isSelected = accessConfig.access_type === opt.type;
          const isDisabled = opt.disabled;

          return (
            <button
              key={opt.type}
              type="button"
              className={`${styles.card} ${isSelected ? styles.selected : ''} ${isDisabled ? styles.disabled : ''}`}
              onClick={() => !isDisabled && handleAccessTypeChange(opt.type)}
              disabled={isDisabled}
            >
              <div className={styles.cardContent}>
                <Icon className={styles.icon} size={28} />
                <div className={styles.text}>
                  <div className={styles.titleRow}>
                    <span className={styles.title}>{opt.title}</span>
                    {opt.recommended && <span className={styles.badge}>Recommended</span>}
                  </div>
                  <span className={styles.subtitle}>{opt.subtitle}</span>
                </div>
              </div>
              {isSelected && <div className={styles.checkMark}><CheckIcon size={16} /></div>}
            </button>
          );
        })}
      </div>

      {/* Private Details Section */}
      {accessConfig.access_type === 'private' && (
        <div className={styles.detailBox}>
          <label>Invite Participants by Email</label>
          <p className={styles.hintText}>Enter email addresses separated by commas or new lines.</p>

          <textarea
            value={inviteEmails}
            onChange={(e) => setInviteEmails(e.target.value)}
            onBlur={handleEmailBlur}
            placeholder="user1@example.com&#10;user2@example.com, user3@example.com"
            rows={4}
            className={styles.emailInput}
          />

          <div className={styles.validationStats}>
            {parsedEmails.length > 0 && (
              <div className={styles.validList}>
                <span className={styles.validCount}>✓ {parsedEmails.length} valid recipients</span>
              </div>
            )}
            {invalidEmails.length > 0 && (
              <div className={styles.invalidList}>
                <span className={styles.invalidCount}>⚠️ {invalidEmails.length} invalid emails:</span>
                <p className={styles.invalidItems}>{invalidEmails.slice(0, 5).join(', ')}{invalidEmails.length > 5 ? '...' : ''}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Access Summary Chips */}
      <div className={styles.summaryBar}>
        <span className={styles.summaryLabel}>Summary:</span>
        <div className={styles.chipGroup}>
          <span className={styles.chip}>
            {accessConfig.access_type.replace(/_/g, ' ').toUpperCase()}
          </span>
          <span className={`${styles.chip} ${accessConfig.require_login ? styles.chipInfo : ''}`}>
            {accessConfig.require_login ? 'Login Required' : 'No Login'}
          </span>
          {accessConfig.allow_anonymous && (
            <span className={`${styles.chip} ${styles.chipSuccess}`}>Anonymous Allowed</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurveyAccessControl;