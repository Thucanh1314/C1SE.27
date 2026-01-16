import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import { useAuth } from '../../contexts/AuthContext'; // Unused
import WorkspaceService from '../../api/services/workspace.service';
import { useToast } from '../../contexts/ToastContext';
import Button from '../../components/UI/Button';
import styles from './WorkspaceOnboarding.module.scss'; // We'll create a simple CSS

// Since styles might not exist, I'll use inline or global if needed, but better to structure it.
// For now, I'll rely on global or create a basic module properly.

const WorkspaceOnboarding = () => {
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();
    const [workspaceName, setWorkspaceName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!workspaceName.trim()) {
            showError('Please enter a workspace name');
            return;
        }

        setIsLoading(true);
        try {
            await WorkspaceService.createWorkspace({ name: workspaceName });
            showSuccess('Workspace created successfully!');

            // Cleanup intent
            localStorage.removeItem('SIGNUP_INTENT');

            // Navigate to dashboard
            navigate('/dashboard');
        } catch (error) {
            showError(error.message || 'Failed to create workspace');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkip = () => {
        localStorage.removeItem('SIGNUP_INTENT');
        navigate('/dashboard'); // or /surveys
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>All Set! Let's create your workspace.</h1>
                <p className={styles.subtitle}>
                    You selected "Create Surveys". To get started, you need a workspace to organize your projects.
                </p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label>Workspace Name</label>
                        <input
                            type="text"
                            placeholder="e.g. My Research Team, Marketing Dept..."
                            value={workspaceName}
                            onChange={(e) => setWorkspaceName(e.target.value)}
                            disabled={isLoading}
                            className={styles.input}
                            autoFocus
                        />
                    </div>

                    <div className={styles.actions}>
                        <Button type="submit" loading={isLoading}>
                            Create Workspace
                        </Button>
                        <Button variant="ghost" type="button" onClick={handleSkip} disabled={isLoading}>
                            Skip for now
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WorkspaceOnboarding;
