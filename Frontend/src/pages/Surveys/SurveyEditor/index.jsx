import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SurveyService from '../../../api/services/survey.service';
import TemplateService from '../../../api/services/template.service';
import WorkspaceService from '../../../api/services/workspace.service';
import InviteService from '../../../api/services/invite.service';
import Loader from '../../../components/common/Loader/Loader';
import StatusBadge from '../../../components/UI/StatusBadge';
import SurveyAccessControl from '../../../components/SurveyAccessControl';
import { useToast } from '../../../contexts/ToastContext';
import useAutoSave from '../../../hooks/useAutoSave';
import useUnsavedChanges from '../../../hooks/useUnsavedChanges';
import { useAuth } from '../../../contexts/AuthContext';
import { SpinnerIcon, CheckIcon } from '../../../components/Icons';
import styles from './SurveyEditor.module.scss';

const STEPS = [
  { id: 'basics', label: '1. Basics', description: 'Title & Template' },
  { id: 'access', label: '2. Access', description: 'Permissions' },
  { id: 'review', label: '3. Publish', description: 'Review & Launch' }
];

const SurveyEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { state: authState } = useAuth(); // Get auth state
  const isEditMode = Boolean(id && id !== 'new');

  // Global State
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState('basics');
  const [templates, setTemplates] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);

  // Data State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    template_id: '',
    start_date: '',
    end_date: '',
    status: 'draft',
    access_type: 'public',
    require_login: false,
    allow_anonymous: true,
    workspace_id: null,
    inviteEmails: ''
  });

  const [dirty, setDirty] = useState(false);

  // Computed Draft Key
  const userId = authState?.user?.id || 'guest';
  const draftKey = `survey_draft:${isEditMode ? id : 'new'}:${userId}`;
  const didRestoreRef = React.useRef(false); // Ref to prevent duplicate restores

  // Hooks
  useUnsavedChanges(dirty && !saving);
  const { lastSaved, isSaving: isAutoSaving, loadSavedData, clearSavedData } = useAutoSave(
    draftKey,
    dirty ? formData : null
  );

  // Load Reference Data
  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [tplRes, wsRes] = await Promise.all([
          TemplateService.getAll(),
          WorkspaceService.getMyWorkspaces()
        ]);
        setTemplates(tplRes.templates || []);
        // WorkspaceService returns { ok: boolean, items: [], total: number } or similar
        setWorkspaces(wsRes.items || []);
      } catch (err) {
        console.error('Ref load error', err);
      }
    };
    loadRefs();
  }, []);

  // Load Survey Data or Draft
  useEffect(() => {
    const initData = async () => {
      if (isEditMode) {
        setLoading(true);
        try {
          const data = await SurveyService.getById(id);
          setFormData({
            title: data.title,
            description: data.description || '',
            template_id: data.template_id || '',
            start_date: data.start_date ? data.start_date.split('T')[0] : '',
            end_date: data.end_date ? data.end_date.split('T')[0] : '',
            status: data.status,
            access_type: data.access_type || 'public',
            require_login: data.require_login || false,
            allow_anonymous: data.allow_anonymous !== undefined ? data.allow_anonymous : true,
            workspace_id: data.workspace_id || null,
          });
        } catch (e) {
          showToast('Failed to load survey', 'error');
          navigate('/surveys');
        } finally {
          setLoading(false);
        }
      } else {
        // Only attempt restore ONCE per mount
        if (didRestoreRef.current) return;

        // Check for local draft using NEW key
        let draft = loadSavedData();

        // MIGRATION: Check for OLD key if new one is empty
        if (!draft) {
          const oldKey = `survey_draft_${id || 'new'}`;
          const oldRaw = localStorage.getItem(oldKey);
          if (oldRaw) {
            try {
              const parsed = JSON.parse(oldRaw);
              if (parsed && parsed.data) {
                draft = { data: parsed.data }; // Adapting old format
                localStorage.removeItem(oldKey); // Clear old key
                console.log('Migrated legacy draft');
              }
            } catch (e) {
              console.warn('Failed to migrate draft', e);
            }
          }
        }

        // Check if draft exists and is valid (loadSavedData now returns structured object or null)
        if (draft && draft.data) {
          // Verify template still exists if in draft (optional, but good practice)
          // For now just restore properties
          setFormData(prev => ({ ...prev, ...draft.data }));

          // Show toast exactly once
          showToast('Restored unsaved draft', 'info');
          didRestoreRef.current = true;
          setDirty(true); // Mark as dirty so it saves again if modified
        }
      }
    };
    initData();
  }, [id, isEditMode, navigate, showToast, loadSavedData]);

  // Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setDirty(true);
  };

  const handleAccessChange = (newConfig) => {
    setFormData(prev => ({ ...prev, ...newConfig }));
    setDirty(true);
  };

  const validateStep = (step) => {
    if (step === 'basics') {
      if (!formData.title.trim()) return 'Title is required';
      if (!formData.template_id) return 'Template is required';
    }
    return null;
  };

  const handleStepChange = (stepId) => {
    setCurrentStep(stepId);
  };

  const handleSave = async (publish = false) => {
    const error = validateStep('basics');
    if (error) {
      showToast(error, 'error');
      setCurrentStep('basics');
      return;
    }

    try {
      setSaving(true);
      const payload = { ...formData };
      if (publish) payload.status = 'active';

      let result;
      if (isEditMode) {
        result = await SurveyService.update(id, payload);

        // Handle invites for existing survey
        if (payload.access_type === 'private' && payload.inviteEmails) {
          const emails = payload.inviteEmails.split(/[\n,]+/).map(e => e.trim()).filter(e => e);
          if (emails.length > 0) {
            await InviteService.createInvites(id, emails);
            // Clear invite field after successful send to prevent double send on next save? 
            // Or keep it? Backend handles idempotency, but UX wise maybe show "Invites Sent".
            // For now, let's keep it simple.
            showToast(`${emails.length} invites processed`, 'success');
          }
        }

        showToast('Survey updated successfully', 'success');
      } else {
        result = await SurveyService.create(payload);

        // Handle invites (New Survey)
        if (payload.access_type === 'private' && payload.inviteEmails) {
          const emails = payload.inviteEmails.split(/[\n,]+/).map(e => e.trim()).filter(e => e);
          if (emails.length) await InviteService.createInvites(result.id, emails);
        }

        showToast('Survey created successfully', 'success');
        clearSavedData(); // Clear draft on success
        navigate(`/surveys/${result.id}/edit`);
        return;
      }

      setFormData(prev => ({ ...prev, status: result.status }));
      setDirty(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const accessControlValue = React.useMemo(() => ({
    access_type: formData.access_type,
    require_login: formData.require_login,
    allow_anonymous: formData.allow_anonymous,
    workspace_id: formData.workspace_id,
    inviteEmails: formData.inviteEmails || ''
  }), [formData.access_type, formData.require_login, formData.allow_anonymous, formData.workspace_id, formData.inviteEmails]);

  if (loading) return <div className={styles.builderLayout}><div style={{ margin: 'auto' }}><Loader /></div></div>;

  return (
    <div className={styles.builderLayout}>
      {/* Left Sidebar Steps */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>{isEditMode ? 'Edit Survey' : 'New Survey'}</h2>
          <button onClick={() => { clearSavedData(); navigate('/surveys'); }} className={styles.backLink}>&larr; Back to List</button>
        </div>

        <nav className={styles.stepNav}>
          {STEPS.map((step, idx) => (
            <button
              key={step.id}
              className={`${styles.stepItem} ${currentStep === step.id ? styles.active : ''} ${idx < STEPS.findIndex(s => s.id === currentStep) ? styles.completed : ''}`}
              onClick={() => handleStepChange(step.id)}
            >
              <div className={styles.stepIndicator}>
                {idx < STEPS.findIndex(s => s.id === currentStep) ? <CheckIcon size={14} /> : idx + 1}
              </div>
              <div className={styles.stepInfo}>
                <span className={styles.stepLabel}>{step.label}</span>
                <span className={styles.stepDesc}>{step.description}</span>
              </div>
            </button>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          {isAutoSaving && <span className={styles.autoSave}>Saving draft...</span>}
          {lastSaved && !isAutoSaving && <span className={styles.lastSaved}>Draft saved {lastSaved.toLocaleTimeString()}</span>}
        </div>
      </div>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {/* Render Step Content */}
        <div className={styles.stepContainer}>
          {currentStep === 'basics' && (
            <div className={styles.fsSection}>
              <h3>Basic Information</h3>
              <div className={styles.formGroup}>
                <label>Survey Title <span className={styles.req}>*</span></label>
                <input
                  type="text" name="title"
                  value={formData.title} onChange={handleChange}
                  placeholder="e.g. Student Satisfaction Survey 2024"
                  autoFocus
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description} onChange={handleChange}
                  rows={3}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Template <span className={styles.req}>*</span></label>
                <select name="template_id" value={formData.template_id} onChange={handleChange} disabled={isEditMode}>
                  <option value="">Select a template...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
                {isEditMode && <p className={styles.hint}>Template cannot be changed after creation.</p>}
              </div>
              <div className={styles.row}>
                <div className={styles.formGroup}>
                  <label>Start Date</label>
                  <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} />
                </div>
                <div className={styles.formGroup}>
                  <label>End Date</label>
                  <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} min={formData.start_date} />
                </div>
              </div>
            </div>
          )}

          {currentStep === 'access' && (
            <div className={styles.fsSection}>
              <SurveyAccessControl
                surveyId={id === 'new' ? null : id}
                value={accessControlValue}
                onChange={handleAccessChange}
                availableWorkspaces={workspaces}
              />
            </div>
          )}

          {currentStep === 'review' && (
            <div className={styles.fsSection}>
              <h3>Review & Publish</h3>
              <div className={styles.reviewCard}>
                <div className={styles.reviewItem}>
                  <label>Status</label>
                  <StatusBadge status={formData.status} />
                </div>
                <div className={styles.reviewItem}>
                  <label>Title</label>
                  <p>{formData.title}</p>
                </div>
                <div className={styles.reviewItem}>
                  <label>Access</label>
                  <p>{formData.access_type.toUpperCase()}</p>
                </div>
              </div>

              <div className={styles.publishActions}>
                <p>Ready to launch your survey?</p>
                <button
                  className={styles.publishBtn}
                  onClick={() => handleSave(true)}
                  disabled={saving || !validateStep('basics')}
                >
                  {saving ? <SpinnerIcon /> : 'Save & Publish'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        <footer className={styles.actionBar}>
          <span className={styles.statusMsg}>
            {dirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
          <div className={styles.actionButtons}>
            {currentStep !== 'basics' && (
              <button className={styles.secondaryBtn} onClick={() => setCurrentStep(prev => STEPS[STEPS.findIndex(s => s.id === prev) - 1].id)}>Previous</button>
            )}
            {currentStep !== 'review' ? (
              <button className={styles.primaryBtn} onClick={() => setCurrentStep(prev => STEPS[STEPS.findIndex(s => s.id === prev) + 1].id)}>Next Step</button>
            ) : (
              <button className={styles.primaryBtn} onClick={() => handleSave(false)} disabled={saving}>
                {saving ? <SpinnerIcon /> : isEditMode ? 'Save Changes' : 'Create Survey'}
              </button>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
};

export default SurveyEditor;
