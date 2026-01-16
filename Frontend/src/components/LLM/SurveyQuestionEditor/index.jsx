import React, { useState, useEffect } from 'react';
import { useToast } from '../../../contexts/ToastContext';
import LLMService from '../../../api/services/llm.service';
import Button from '../../UI/Button';
import Input from '../../UI/Input';
import Select from '../../UI/Select';
import TextArea from '../../UI/TextArea';
import Modal from '../../UI/Modal';
import styles from './SurveyQuestionEditor.module.scss';

// const QUESTION_TYPE_LABELS - removed unused import

const QUESTION_TYPES = [
  { value: 'text', label: 'Văn bản (ngắn)' },
  { value: 'open_ended', label: 'Văn bản (dài)' },
  { value: 'single_choice', label: 'Lựa chọn đơn' },
  { value: 'multiple_choice', label: 'Lựa chọn nhiều (Checkbox)' },
  { value: 'rating', label: 'Đánh giá' },
  { value: 'dropdown', label: 'Menu thả xuống' },
  { value: 'likert_scale', label: 'Thang đo Likert' }
];

const SurveyQuestionEditor = ({ surveyId, onClose, onSurveyUpdated }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [survey, setSurvey] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    question_type: 'text',
    is_required: false,
    description: '',
    options: ['']
  });

  const [surveySettings, setSurveySettings] = useState({
    title: '',
    description: '',
    status: 'draft'
  });

  useEffect(() => {
    if (surveyId) {
      loadSurveyForEditing();
    }
  }, [surveyId, loadSurveyForEditing]);

  const loadSurveyForEditing = async () => {
    try {
      setLoading(true);
      const response = await LLMService.getSurveyForEditing(surveyId);
      setSurvey(response.data);
      setSurveySettings({
        title: response.data.title,
        description: response.data.description || '',
        status: response.data.status
      });
    } catch (error) {
      showToast('Unable to load survey for editing', 'error');
      console.error('Load survey error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSurveySettings = async () => {
    try {
      setSaving(true);
      await LLMService.updateSurveySettings(surveyId, surveySettings);
      setSurvey(prev => ({ ...prev, ...surveySettings }));
      setShowSettingsModal(false);
      showToast('Survey settings updated successfully', 'success');
      onSurveyUpdated?.(); // Notify parent component
    } catch (error) {
      showToast('Error updating survey settings', 'error');
      console.error('Update survey settings error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = async () => {
    try {
      setSaving(true);
      const questionData = {
        ...newQuestion,
        options: newQuestion.question_type === 'multiple_choice' || newQuestion.question_type === 'multiple_select'
          ? newQuestion.options.filter(opt => opt.trim())
          : undefined
      };

      await LLMService.addSurveyQuestion(surveyId, questionData);

      // Reload survey data to get updated information
      const updatedSurvey = await LLMService.getSurveyForEditing(surveyId);
      setSurvey(updatedSurvey.data);

      setNewQuestion({
        question_text: '',
        question_type: 'text',
        is_required: false,
        description: '',
        options: ['']
      });
      setShowAddModal(false);
      showToast('Question added successfully', 'success');
      onSurveyUpdated?.(); // Notify parent component
    } catch (error) {
      showToast('Error adding question', 'error');
      console.error('Add question error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateQuestion = async () => {
    try {
      setSaving(true);
      const questionData = {
        ...editingQuestion,
        options: editingQuestion.question_type === 'multiple_choice' || editingQuestion.question_type === 'multiple_select'
          ? editingQuestion.options?.filter(opt => opt.trim()) || []
          : undefined
      };

      await LLMService.updateSurveyQuestion(surveyId, editingQuestion.id, questionData);

      // Reload survey data to get updated information
      const updatedSurvey = await LLMService.getSurveyForEditing(surveyId);
      setSurvey(updatedSurvey.data);

      setEditingQuestion(null);
      setShowEditModal(false);
      showToast('Question updated successfully', 'success');
      onSurveyUpdated?.(); // Notify parent component
    } catch (error) {
      showToast('Error updating question', 'error');
      console.error('Update question error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    try {
      setSaving(true);
      await LLMService.deleteSurveyQuestion(surveyId, questionId);
      setSurvey(prev => ({
        ...prev,
        questions: prev.questions.filter(q => q.id !== questionId)
      }));
      showToast('Question deleted successfully', 'success');
      onSurveyUpdated?.(); // Notify parent component
    } catch (error) {
      showToast('Error deleting question', 'error');
      console.error('Delete question error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleOptionChange = (index, value, isEditing = false) => {
    if (isEditing) {
      setEditingQuestion(prev => ({
        ...prev,
        options: prev.options.map((opt, i) => i === index ? value : opt)
      }));
    } else {
      setNewQuestion(prev => ({
        ...prev,
        options: prev.options.map((opt, i) => i === index ? value : opt)
      }));
    }
  };

  const addOption = (isEditing = false) => {
    if (isEditing) {
      setEditingQuestion(prev => ({
        ...prev,
        options: [...prev.options, '']
      }));
    } else {
      setNewQuestion(prev => ({
        ...prev,
        options: [...prev.options, '']
      }));
    }
  };

  const removeOption = (index, isEditing = false) => {
    if (isEditing) {
      setEditingQuestion(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    } else {
      setNewQuestion(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  const openEditModal = (question) => {
    setEditingQuestion({
      ...question,
      options: question.options?.map(opt => opt.option_text) || ['']
    });
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading survey...</p>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className={styles.error}>
        <p>Không thể tải survey</p>
        <Button onClick={onClose}>Quay lại</Button>
      </div>
    );
  }

  return (
    <div className={styles.surveyEditor}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>Edit Survey: {survey.title}</h2>
          <p>Tổng số câu hỏi: {survey.questions?.length || 0}</p>
        </div>
        <div className={styles.headerRight}>
          <Button
            variant="outline"
            onClick={() => setShowSettingsModal(true)}
            icon="⚙️"
          >
            Cài đặt Survey
          </Button>
          <Button onClick={onClose} variant="primary">
            Complete Editing
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.questionsSection}>
          <div className={styles.sectionHeader}>
            <h3>Danh sách câu hỏi</h3>
            <Button onClick={() => setShowAddModal(true)} icon="➕">
              Add Question
            </Button>
          </div>

          <div className={styles.questionsList}>
            {survey.questions?.map((question, index) => (
              <div key={question.id} className={styles.questionCard}>
                <div className={styles.questionHeader}>
                  <span className={styles.questionNumber}>#{index + 1}</span>
                  <span className={styles.questionType}>
                    {QUESTION_TYPES.find(t => t.value === question.question_type)?.label || question.question_type}
                  </span>
                  {question.is_required && <span className={styles.required}>Bắt buộc</span>}
                </div>

                <div className={styles.questionContent}>
                  <h4>{question.question_text}</h4>
                  {question.description && <p className={styles.description}>{question.description}</p>}

                  {question.options?.length > 0 && (
                    <div className={styles.options}>
                      <strong>Các lựa chọn:</strong>
                      <ul>
                        {question.options.map(option => (
                          <li key={option.id}>{option.option_text}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className={styles.questionActions}>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => openEditModal(question)}
                  >
                    ✏️ Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => handleDeleteQuestion(question.id)}
                    disabled={saving}
                  >
                    🗑️ Delete
                  </Button>
                </div>
              </div>
            ))}

            {(!survey.questions || survey.questions.length === 0) && (
              <div className={styles.empty}>
                <p>No questions yet</p>
                <Button onClick={() => setShowAddModal(true)}>Add First Question</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Cài đặt Survey */}
      {showSettingsModal && (
        <Modal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          title="Cài đặt Survey"
        >
          <div className={styles.modalContent}>
            <Input
              label="Tiêu đề Survey"
              value={surveySettings.title}
              onChange={(e) => setSurveySettings(prev => ({ ...prev, title: e.target.value }))}
              required
            />

            <TextArea
              label="Mô tả"
              value={surveySettings.description}
              onChange={(e) => setSurveySettings(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
            />

            <Select
              label="Trạng thái"
              value={surveySettings.status}
              onChange={(e) => setSurveySettings(prev => ({ ...prev, status: e.target.value }))}
              options={[
                { value: 'draft', label: 'Nháp' },
                { value: 'active', label: 'Hoạt động' },
                { value: 'inactive', label: 'Tạm dừng' },
                { value: 'completed', label: 'Completed' }
              ]}
            />

            <div className={styles.modalActions}>
              <Button variant="outline" onClick={() => setShowSettingsModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateSurveySettings} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Question Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New Question"
        >
          <div className={styles.modalContent}>
            <Input
              label="Question Content"
              value={newQuestion.question_text}
              onChange={(e) => setNewQuestion(prev => ({ ...prev, question_text: e.target.value }))}
              required
            />

            <Select
              label="Question Type"
              value={newQuestion.question_type}
              onChange={(e) => setNewQuestion(prev => ({ ...prev, question_type: e.target.value }))}
              options={QUESTION_TYPES}
            />

            <TextArea
              label="Description (optional)"
              value={newQuestion.description}
              onChange={(e) => setNewQuestion(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />

            <div className={styles.checkboxGroup}>
              <label>
                <input
                  type="checkbox"
                  checked={newQuestion.is_required}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, is_required: e.target.checked }))}
                />
                Câu hỏi bắt buộc
              </label>
            </div>

            {(newQuestion.question_type === 'multiple_choice' || newQuestion.question_type === 'multiple_select') && (
              <div className={styles.optionsSection}>
                <label>Các lựa chọn</label>
                {newQuestion.options.map((option, index) => (
                  <div key={index} className={styles.optionInput}>
                    <Input
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Lựa chọn ${index + 1}`}
                    />
                    {newQuestion.options.length > 1 && (
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => removeOption(index)}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" onClick={() => addOption()}>
                  + Thêm lựa chọn
                </Button>
              </div>
            )}

            <div className={styles.modalActions}>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddQuestion} disabled={saving || !newQuestion.question_text}>
                {saving ? 'Adding...' : 'Add Question'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Question Modal */}
      {showEditModal && editingQuestion && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Question"
        >
          <div className={styles.modalContent}>
            <Input
              label="Question Content"
              value={editingQuestion.question_text}
              onChange={(e) => setEditingQuestion(prev => ({ ...prev, question_text: e.target.value }))}
              required
            />

            <Select
              label="Question Type"
              value={editingQuestion.question_type}
              onChange={(e) => setEditingQuestion(prev => ({ ...prev, question_type: e.target.value }))}
              options={QUESTION_TYPES}
            />

            <TextArea
              label="Description (optional)"
              value={editingQuestion.description || ''}
              onChange={(e) => setEditingQuestion(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />

            <div className={styles.checkboxGroup}>
              <label>
                <input
                  type="checkbox"
                  checked={editingQuestion.is_required}
                  onChange={(e) => setEditingQuestion(prev => ({ ...prev, is_required: e.target.checked }))}
                />
                Câu hỏi bắt buộc
              </label>
            </div>

            {(editingQuestion.question_type === 'multiple_choice' || editingQuestion.question_type === 'multiple_select') && (
              <div className={styles.optionsSection}>
                <label>Các lựa chọn</label>
                {editingQuestion.options?.map((option, index) => (
                  <div key={index} className={styles.optionInput}>
                    <Input
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value, true)}
                      placeholder={`Lựa chọn ${index + 1}`}
                    />
                    {editingQuestion.options.length > 1 && (
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => removeOption(index, true)}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" onClick={() => addOption(true)}>
                  + Thêm lựa chọn
                </Button>
              </div>
            )}

            <div className={styles.modalActions}>
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateQuestion} disabled={saving || !editingQuestion.question_text}>
                {saving ? 'Updating...' : 'Update Question'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SurveyQuestionEditor;