import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import WorkspaceService from '../api/services/workspace.service';
import { useAuth } from './AuthContext';
import socketService from '../api/services/socket.service';

const WorkspaceContext = createContext();

export const WorkspaceProvider = ({ children }) => {
    const { state: { user, isAuthenticated } } = useAuth();
    const [workspaces, setWorkspaces] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchWorkspaceStatus = useCallback(async () => {
        if (!isAuthenticated || !user) return;

        setLoading(true);
        try {
            const [wsResult, invitResult] = await Promise.all([
                WorkspaceService.getMyWorkspaces(),
                WorkspaceService.getReceivedInvitations()
            ]);

            if (wsResult.ok) {
                setWorkspaces(wsResult.workspaces || []);
            }

            if (invitResult.ok) {
                setInvitations(invitResult.invitations || []);
            }
        } catch (error) {
            console.error('[WorkspaceContext] Error fetching workspace status:', error);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, user]);

    useEffect(() => {
        fetchWorkspaceStatus();
    }, [fetchWorkspaceStatus]);

    // Set up socket listeners for real-time updates
    useEffect(() => {
        if (!isAuthenticated || !user) return;

        socketService.init();

        const handleUpdate = () => {
            fetchWorkspaceStatus();
        };

        // Listen for events that should trigger a refresh of the count/list
        const cleanupRemoved = socketService.on('workspaceMemberRemoved', (data) => {
            if (parseInt(data.userId) === parseInt(user.id)) {
                fetchWorkspaceStatus();
            }
        });

        const cleanupInvitation = socketService.on('workspaceInvitation', handleUpdate);
        const cleanupAccepted = socketService.on('workspaceInvitationAccepted', handleUpdate);

        return () => {
            cleanupRemoved();
            cleanupInvitation();
            cleanupAccepted();
        };
    }, [isAuthenticated, user, fetchWorkspaceStatus]);

    const value = {
        workspaces,
        invitations,
        loading,
        hasWorkspaces: workspaces.length > 0,
        hasInvitations: invitations.length > 0,
        refresh: fetchWorkspaceStatus,
        // Helper to find current workspace role if we are in a workspace URL
        getWorkspaceRole: (workspaceId) => {
            const ws = workspaces.find(w => w.id === parseInt(workspaceId));
            return ws?.current_user_role || ws?.role;
        }
    };

    return (
        <WorkspaceContext.Provider value={value}>
            {children}
        </WorkspaceContext.Provider>
    );
};

export const useWorkspaces = () => {
    const context = useContext(WorkspaceContext);
    if (!context) {
        throw new Error('useWorkspaces must be used within a WorkspaceProvider');
    }
    return context;
};
