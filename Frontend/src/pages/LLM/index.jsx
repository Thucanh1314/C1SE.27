// src/pages/LLM/index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import TextArea from '../../components/UI/TextArea';
import Loader from '../../components/common/Loader/Loader';
import { useToast } from '../../contexts/ToastContext';
import LLMService from '../../api/services/llm.service';
import WorkspaceService from '../../api/services/workspace.service';
import SurveyCreator from '../../components/LLM/SurveyCreator';
import SurveyActions from '../../components/LLM/SurveyActions';
import SurveyQuestionEditor from '../../components/LLM/SurveyQuestionEditor';
import Modal from '../../components/common/Modal/Modal';
import { useAuth } from '../../contexts/AuthContext';
import UpgradeModal from '../../components/UpgradeToCreator/UpgradeModal';
import UpgradeUpsellModal from '../../components/UI/UpgradeUpsellModal/UpgradeUpsellModal';
import { LuSparkles, LuBrain, LuSettings, LuFileText, LuWand, LuCircleCheck, LuInfo, LuArrowRight, LuLock } from 'react-icons/lu';
import styles from './LLM.module.scss';

const LLM = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');
  const [formData, setFormData] = useState({
    keyword: '',
    category: '',
    questionCount: 5,
    prompt: ''
  });
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  // const [categories, setCategories] = useState([]); // Unused
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [createdSurvey, setCreatedSurvey] = useState(null);
  const [editingSurveyId, setEditingSurveyId] = useState(null);

  // Workspace & Target Audience State
  const [workspaces, setWorkspaces] = useState([]);
  const [targetAudience, setTargetAudience] = useState('all_users'); // 'all_users' (public) or 'internal'
  const [targetWorkspace, setTargetWorkspace] = useState('');
  const [showManageMembers, setShowManageMembers] = useState(false);
  const { user } = useAuth(); // Get current user

  // Upgrade & Upsell Modals
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isLockedForRoleMismatch = () => {
    return user?.role === 'user';
  };

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);

      // Load prompts (categories not currently used)
      const promptsRes = await LLMService.getLlmPrompts();
      setPrompts(promptsRes.data.prompts || []);

      // Load Workspaces for Internal Target
      const workspaceRes = await WorkspaceService.getMyWorkspaces();
      if (workspaceRes.ok) {
        // Filter workspaces where user has role >= Collaborator
        const validWorkspaces = workspaceRes.items.filter(ws =>
          ['owner', 'collaborator', 'admin'].includes(ws.role || ws.current_user_role)
        );
        setWorkspaces(validWorkspaces);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      showToast('Error while loading initial data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGenerateQuestions = async () => {
    if (isLockedForRoleMismatch()) {
      setShowUpsellModal(true);
      return;
    }
    if (!formData.keyword.trim()) {
      showToast('Please enter a keyword or topic', 'error');
      return;
    }

    try {
      setLoading(true);
      setSelectedIndices(new Set()); // Reset selection on new generation
      console.log(' Generating questions with:', formData);

      const response = await LLMService.generateQuestions({
        topic: formData.keyword,
        count: parseInt(formData.questionCount) || 5,
        category: formData.category || 'general'
      });

      console.log(' Full Response:', response);

      // Backend returns: {success: true, data: {questions: [...], metadata: {...}}}
      const questions = response.data?.questions || response.questions || [];

      console.log(' Questions extracted:', questions);
      console.log(' Questions count:', questions.length);

      if (questions.length === 0) {
        showToast('No questions generated. Please try again.', 'warning');
        return;
      }

      setGeneratedQuestions(questions);
      showToast(`Generated ${questions.length} questions successfully!`, 'success');
    } catch (error) {
      console.error(' Error generating questions:', error);
      console.error('Error response:', error.response);
      showToast(
        'Error while generating questions: ' +
        (error.response?.data?.message || error.message),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestionSelection = (index) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIndices = new Set(generatedQuestions.map((_, i) => i));
    setSelectedIndices(allIndices);
  };

  const handleClearSelection = () => {
    setSelectedIndices(new Set());
  };

  const handlePredictCategory = async () => {
    if (isLockedForRoleMismatch()) {
      setShowUpsellModal(true);
      return;
    }
    if (!formData.keyword.trim()) {
      showToast('Please enter a keyword', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await LLMService.predictCategory({
        keyword: formData.keyword
      });

      if (response.data.category) {
        setFormData(prev => ({
          ...prev,
          category: response.data.category
        }));
        showToast(
          `Predicted category: ${response.data.category} (${response.data.confidence}%)`,
          'success'
        );
      }
    } catch (error) {
      console.error('Error predicting category:', error);
      showToast('Error while predicting category', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSurvey = async () => {
    if (isLockedForRoleMismatch()) {
      setShowUpsellModal(true);
      return;
    }
    if (!formData.prompt.trim() && !selectedPrompt) {
      showToast('Please enter a prompt or select an existing one', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await LLMService.generateSurvey({
        prompt: formData.prompt,
        prompt_id: selectedPrompt,
        description: 'Generated by AI',
        target_audience: 'General', // LLM might ignore this, but our survey creation needs it
        access_type: targetAudience === 'internal' ? 'internal' : 'public', // Custom field to pass to createSurvey
        workspace_id: targetAudience === 'internal' ? targetWorkspace : null,
        title: 'AI Generated Survey', // Provide a default or extract from prompt
        course_name: 'AI Course' // Legacy?
      });

      showToast('Survey generated successfully!', 'success');
      console.log('Generated survey:', response.data);
    } catch (error) {
      console.error('Error generating survey:', error);
      showToast(
        'Error while generating survey: ' +
        (error.response?.data?.message || error.message),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditSurvey = (surveyId) => {
    setEditingSurveyId(surveyId);
    setActiveTab('edit');
  };

  const renderQuestionGeneration = () => (
    <div className={styles.tabContent}>
      <Card className={styles.formCard}>
        <h3><LuSparkles /> {activeTab === 'generate' ? 'Generate Questions' : 'Generate Survey'}</h3>

        <div className={styles.formGroup}>
          <label>Topic or Keyword</label>
          <Input
            type="text"
            placeholder="Sales performance, AI adoption, customer feedback..."
            value={formData.keyword}
            onChange={(e) => handleInputChange('keyword', e.target.value)}
          />
          <p className={styles.helpText}>Enter a topic or keyword to define the context for AI-generated questions.</p>

          <div className={styles.predictWrapper}>
            <button
              onClick={handlePredictCategory}
              disabled={loading || !formData.keyword.trim()}
              className={styles.predictBtn}
            >
              <LuBrain size={16} /> Predict Category
            </button>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Number of questions</label>
          <Select
            value={formData.questionCount}
            onChange={(value) => handleInputChange('questionCount', parseInt(value))}
          >
            <option value={3}>3 questions</option>
            <option value={5}>5 questions</option>
            <option value={10}>10 questions</option>
            <option value={15}>15 questions</option>
          </Select>
        </div>

        <Button
          onClick={handleGenerateQuestions}
          disabled={loading || !formData.keyword.trim()}
          className={styles.generateBtn}
        >
          {loading ? (
            <>Generating questions...</>
          ) : (
            <>
              {isLockedForRoleMismatch() ? <LuLock size={18} /> : <LuWand size={18} />}
              Generate Questions
            </>
          )}
        </Button>
      </Card>

      <Card className={styles.resultsCard}>
        <header>
          <h3>Generated Results</h3>
          <div className={styles.headerActions}>
            {generatedQuestions.length > 0 && (
              <>
                <button className={styles.textBtn} onClick={handleSelectAll}>Select All</button>
                <button className={styles.textBtn} onClick={handleClearSelection}>Clear</button>
                <span className={styles.metaBadge + ' ' + styles.confidence}>
                  <LuCircleCheck size={12} /> {selectedIndices.size || generatedQuestions.length} Questions
                </span>
              </>
            )}
          </div>
        </header>

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <h4>Crafting smart questions...</h4>
            <p>Our AI is analyzing the topic and generating relevant questions for your survey.</p>
          </div>
        ) : generatedQuestions.length > 0 ? (
          <div className={styles.questionsList}>
            {generatedQuestions.map((q, index) => (
              <div
                key={index}
                className={`${styles.questionItem} ${selectedIndices.has(index) ? styles.selected : ''}`}
                onClick={() => toggleQuestionSelection(index)}
              >
                <div className={styles.questionNumber}>
                  {selectedIndices.has(index) ? <LuCircleCheck size={16} /> : index + 1}
                </div>
                <div className={styles.questionContent}>
                  <p className={styles.questionText}>{q.question}</p>
                  <div className={styles.questionMeta}>
                    <span className={`${styles.metaBadge} ${styles.type}`}>
                      {q.type || 'Text'}
                    </span>
                    
                  </div>
                </div>
                <div className={styles.selectAction}>
                  <button
                    className={`${styles.selectBtn} ${selectedIndices.has(index) ? styles.selected : ''}`}
                  >
                    {selectedIndices.has(index) ? 'Selected' : 'Select'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyResults}>
            <LuSparkles size={48} />
            <p>Enter a topic and click generate to see AI magic happen.</p>
          </div>
        )}
      </Card>
    </div>
  );

  const renderSurveyGeneration = () => (
    <div className={`${styles.tabContent} ${styles.fullWidth}`}>
      <Card className={styles.formCard} style={{ position: 'relative', top: 0, maxWidth: '100%', margin: '0 auto' }}>
        <h3><LuSettings /> Survey Generation Settings</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          <div>
            <div className={styles.formGroup}>
              <label>Select prompt</label>
              <Select
                value={selectedPrompt}
                onChange={(value) => setSelectedPrompt(value)}
                placeholder="Select prompt"
              >
                <option value="">Custom prompt</option>
                {prompts.map(prompt => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.prompt_name}
                  </option>
                ))}
              </Select>
            </div>

            <div className={styles.formGroup}>
              <label>Custom prompt</label>
              <TextArea
                placeholder="Describe the survey you want to create..."
                value={formData.prompt}
                onChange={(e) => handleInputChange('prompt', e.target.value)}
                rows={4}
                disabled={selectedPrompt}
                className={styles.textarea}
              />
              {selectedPrompt && (
                <p className={styles.helpText}>
                  Using predefined prompt. Clear selection to type custom prompt.
                </p>
              )}
            </div>
          </div>

          <div>
            <div className={styles.formGroup}>
              <label>Target Audience</label>
              <Select
                value={targetAudience}
                onChange={(val) => setTargetAudience(val)}
              >
                <option value="all_users">Public / All Users</option>
                <option value="internal">Internal Workspace</option>
              </Select>
            </div>

            {targetAudience === 'internal' && (
              <div className={styles.formGroup}>
                <label>Workspace</label>
                {workspaces.length > 0 ? (
                  <div className={styles.workspaceSelector}>
                    <Select
                      value={targetWorkspace}
                      onChange={(val) => setTargetWorkspace(val)}
                    >
                      <option value="">-- Select Workspace --</option>
                      {workspaces.map(ws => (
                        <option key={ws.id} value={ws.id}>
                          {ws.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                ) : (
                  <p className={styles.helpText} style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <LuInfo size={14} /> No eligible workspaces found.
                  </p>
                )}
              </div>
            )}

            <Button
              onClick={handleGenerateSurvey}
              disabled={loading || (!formData.prompt.trim() && !selectedPrompt)}
              className={styles.generateBtn}
              style={{ marginTop: '24px' }}
            >
              {loading ? (
                <>Generating survey...</>
              ) : (
                <>
                  {isLockedForRoleMismatch() ? <LuLock size={18} /> : <LuWand size={18} />}
                  Generate Complete Survey
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  if (loading && activeTab === 'generate' && generatedQuestions.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>AI Question &amp; Survey Generator</h1>
          <p>Create smart questions and surveys with AI</p>
        </div>
        <div className={styles.loadingContainer}>
          <Loader />
          <p>Generating content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>AI Question &amp; Survey Generator</h1>
        <p>Create smart questions and surveys with AI</p>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'generate' ? styles.active : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          <LuSparkles size={16} /> Generate Questions
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'survey' ? styles.active : ''}`}
          onClick={() => setActiveTab('survey')}
          disabled={generatedQuestions.length === 0}
        >
          <LuFileText size={16} /> Create Survey ({selectedIndices.size || generatedQuestions.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'prompt' ? styles.active : ''}`}
          onClick={() => setActiveTab('prompt')}
        >
          <LuArrowRight size={16} /> Advanced Prompt
        </button>
      </div>

      {activeTab === 'generate' && renderQuestionGeneration()}
      {activeTab === 'survey' && generatedQuestions.length > 0 && (
        <SurveyCreator
          generatedQuestions={generatedQuestions}
          initialSelectedIndices={selectedIndices}
          onSurveyCreated={(survey) => {
            setCreatedSurvey(survey);
            setActiveTab('result');
          }}
        />
      )}
      {activeTab === 'prompt' && renderSurveyGeneration()}
      {activeTab === 'result' && createdSurvey && (
        <SurveyActions
          survey={createdSurvey}
          onClose={() => setActiveTab('generate')}
          onEditSurvey={handleEditSurvey}
        />
      )}
      {activeTab === 'edit' && editingSurveyId && (
        <SurveyQuestionEditor
          surveyId={editingSurveyId}
          onClose={() => setActiveTab('result')}
          onSurveyUpdated={() => {
            // Survey has been updated successfully
            showToast('Survey has been updated', 'success');
          }}
        />
      )}

      {showManageMembers && targetWorkspace && (
        <Modal
          isOpen={showManageMembers}
          onClose={() => setShowManageMembers(false)}
          title="Manage Workspace Members"
          size="lg"
        >
          <div style={{ padding: '20px' }}>
            <p>Redirecting to workspace management...</p>
            <Button onClick={() => window.open(`/workspaces/${targetWorkspace}/invitations`, '_blank')}>
              Go to Member Management
            </Button>
          </div>
        </Modal>
      )}

      {/* Upgrade Modals Integration */}
      <UpgradeUpsellModal
        isOpen={showUpsellModal}
        onClose={() => setShowUpsellModal(false)}
        onUpgrade={() => setShowUpgradeModal(true)}
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
};

export default LLM;
