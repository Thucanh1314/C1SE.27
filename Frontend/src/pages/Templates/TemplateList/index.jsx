import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TemplateService from '../../../api/services/template.service';
import Loader from '../../../components/common/Loader/Loader';
import Pagination from '../../../components/common/Pagination/Pagination';
import ConfirmModal from '../../../components/UI/ConfirmModal';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import styles from './TemplateList.module.scss';

const TemplateList = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { state: { user } } = useAuth();
  const { tSafe } = useLanguage();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  // Scope State: 'my' (default) or 'all'
  const [scope, setScope] = useState(() => {
    return localStorage.getItem('scope.templates') || 'my';
  });

  const itemsPerPage = 10;

  const fetchTemplates = useCallback(async (currentScope = 'my') => {
    try {
      setLoading(true);
      const { templates: data, pagination } = await TemplateService.getAll({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        scope: currentScope
      });

      setTemplates(Array.isArray(data) ? data : []);

      if (pagination) {
        setTotalPages(pagination.totalPages);
        setTotalItems(pagination.total);
      } else {
        // Fallback if no pagination data
        setTotalPages(1);
        setTotalItems(data.length);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setTemplates([]);
      showToast(error.response?.data?.message || tSafe('failed_fetch_templates', 'Failed to fetch templates'), 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, showToast, tSafe]);

  useEffect(() => {
    fetchTemplates(scope);
  }, [fetchTemplates, scope]); // Fetch when scope changes

  // Reset selection when page or search changes
  useEffect(() => {
    setSelectedIds([]);
  }, [currentPage, searchTerm, scope]);

  // Handle Scope Change
  const handleScopeChange = (newScope) => {
    if (newScope === scope) return;
    setScope(newScope);
    setCurrentPage(1); // Reset to page 1
    localStorage.setItem('scope.templates', newScope);
    // fetchTemplates() will be triggered by useEffect
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;

    try {
      await TemplateService.delete(templateToDelete.id);
      showToast(tSafe('template_deleted_success', 'Template deleted successfully'), 'success');
      setShowDeleteModal(false);
      setTemplateToDelete(null);
      fetchTemplates(scope);
    } catch (error) {
      showToast(error.response?.data?.message || tSafe('failed_delete_template', 'Failed to delete template'), 'error');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await TemplateService.deleteMany(selectedIds);
      showToast(tSafe('templates_deleted_success', { count: selectedIds.length }) || `${selectedIds.length} templates deleted successfully`, 'success');
      setShowBulkDeleteModal(false);
      setSelectedIds([]);
      fetchTemplates(scope);
    } catch (error) {
      showToast(error.response?.data?.message || tSafe('failed_delete_templates', 'Failed to delete templates'), 'error');
    }
  };

  const openDeleteModal = (template) => {
    setTemplateToDelete(template);
    setShowDeleteModal(true);
  };

  const canDelete = (template) => {
    if (!user) return false;
    return user.role === 'admin' || template.created_by === parseInt(user.id);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Only select templates the user can delete
      const deletableTemplates = templates.filter(t => canDelete(t));
      setSelectedIds(deletableTemplates.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(itemId => itemId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  if (loading && templates.length === 0) return <Loader />;

  const isAdmin = user && user.role === 'admin';

  return (
    <div className={styles.templateList}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {tSafe('survey_templates', 'Survey Templates')}
            <span style={{ fontSize: '0.6em', color: '#6b7280', marginLeft: '0.5rem', fontWeight: 'normal' }}>
              — {scope === 'my' ? tSafe('my_templates', 'My Templates') : tSafe('all_templates', 'All Templates')}
            </span>
          </h1>
          <p className={styles.subtitle}>{tSafe('manage_templates_desc', 'Create and manage reusable survey templates')}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Scope Tabs - Only show if Admin */}
          {isAdmin && (
            <div className={styles.scopeTabs} style={{
              display: 'flex',
              backgroundColor: '#f3f4f6',
              padding: '4px',
              borderRadius: '8px',
            }}>
              <button
                onClick={() => handleScopeChange('my')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: scope === 'my' ? 'white' : 'transparent',
                  color: scope === 'my' ? '#111827' : '#6b7280',
                  boxShadow: scope === 'my' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {tSafe('my_templates', 'My Templates')}
              </button>
              <button
                onClick={() => handleScopeChange('all')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: scope === 'all' ? 'white' : 'transparent',
                  color: scope === 'all' ? '#111827' : '#6b7280',
                  boxShadow: scope === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {tSafe('all_templates', 'All Templates (Admin)')}
              </button>
            </div>
          )}

          <button
            className={styles.createButton}
            onClick={() => navigate('/templates/new')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {tSafe('create_template', 'Create Template')}
          </button>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder={tSafe('search_templates', 'Search templates...')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.searchInput}
            style={{ paddingLeft: '4rem' }}
          />
        </div>

        <div className={styles.actions}>
          {selectedIds.length > 0 && (
            <button
              className={styles.bulkDeleteButton}
              onClick={() => setShowBulkDeleteModal(true)}
              style={{
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginRight: '1rem',
                cursor: 'pointer'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              {tSafe('delete_selected', 'Delete Selected')} ({selectedIds.length})
            </button>
          )}

          <span className={styles.resultCount}>
            {totalItems} {totalItems === 1 ? tSafe('template', 'template') : tSafe('templates', 'templates')} {tSafe('found', 'found')}
          </span>
        </div>
      </div>

      {/* Selection Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0.5rem 1rem',
        marginBottom: '1rem',
        backgroundColor: '#f9fafb',
        borderRadius: '0.375rem',
        border: '1px solid #e5e7eb'
      }}>
        <input
          type="checkbox"
          checked={templates.length > 0 && templates.filter(t => canDelete(t)).every(t => selectedIds.includes(t.id)) && selectedIds.length > 0}
          onChange={handleSelectAll}
          style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer', marginRight: '0.75rem' }}
        />
        <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>
          {tSafe('select_all_my_templates', 'Select All (My Templates)')}
        </span>
      </div>

      {templates.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <h3>{tSafe('no_templates_found', 'No templates found')}</h3>
          <p>{tSafe('create_first_template_desc', 'Create your first survey template to get started')}</p>
          <button
            className={styles.emptyButton}
            onClick={() => navigate('/templates/new')}
          >
            {tSafe('create_template', 'Create Template')}
          </button>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {templates.map((template) => {
              const isDeletable = canDelete(template);
              return (
                <div key={template.id} className={styles.templateCard} style={{ position: 'relative' }}>
                  {isDeletable && (
                    <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 10 }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(template.id)}
                        onChange={() => handleSelectOne(template.id)}
                        style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                      />
                    </div>
                  )}

                  <div className={styles.cardHeader} style={{ paddingLeft: isDeletable ? '2rem' : '0' }}>
                    <h3 className={styles.cardTitle}>{template.title}</h3>
                    <div className={styles.cardActions}>
                      <button
                        onClick={() => navigate(`/templates/${template.id}/edit`)}
                        className={styles.editButton}
                        title={tSafe('edit', 'Edit')}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {isDeletable && (
                        <button
                          onClick={() => openDeleteModal(template)}
                          className={styles.deleteButton}
                          title={tSafe('delete', 'Delete')}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  <p className={styles.cardDescription} style={{ paddingLeft: isDeletable ? '2rem' : '0' }}>
                    {template.description || tSafe('no_description', 'No description')}
                  </p>

                  <div className={styles.cardFooter}>
                    <span className={styles.questionCount}>
                      📝 {template.questionCount || 0} {template.questionCount === 1 ? tSafe('question', 'Question') : tSafe('questions', 'Questions')}
                    </span>
                    <span className={styles.createdDate}>
                      {new Date(template.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className={styles.paginationWrapper}>
              <Pagination
                currentPage={currentPage}
                totalPages={Number(totalPages) || 1}
                totalItems={Number(totalItems) || 0}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setTemplateToDelete(null);
        }}
        onConfirm={handleDelete}
        title={tSafe('delete_template', 'Delete Template')}
        message={tSafe('delete_template_confirm', `Are you sure you want to delete "${templateToDelete?.title}"?`)}
        confirmText={tSafe('delete', 'Delete')}
        confirmColor="danger"
      />

      <ConfirmModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        title={user?.role === 'admin' ? tSafe('delete_selected_admin', 'Delete Selected (Admin)') : tSafe('delete_selected', 'Delete Selected')}
        message={
          user?.role === 'admin'
            ? tSafe('delete_selected_admin_confirm', { count: selectedIds.length }) || `Are you sure you want to delete ${selectedIds.length} templates?`
            : tSafe('delete_selected_confirm', { count: selectedIds.length }) || `Are you sure you want to delete ${selectedIds.length} templates?`
        }
        confirmText={`${tSafe('delete', 'Delete')} ${selectedIds.length} ${tSafe('templates', 'templates')}`}
        confirmColor="danger"
      />
    </div>
  );
};

export default TemplateList;
