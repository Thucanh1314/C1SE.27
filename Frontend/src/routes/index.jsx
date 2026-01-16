import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout imports
import DefaultLayout from '../components/Layout/DefaultLayout/DefaultLayout.jsx';
import ProtectedRoute, { PublicRoute } from '../components/Layout/DefaultLayout/ProtectedRoute.jsx';

// Page imports
import Landing from '../pages/Landing/index.jsx';
import Login from '../pages/Auth/Login/index.jsx';
import Register from '../pages/Auth/Register/index.jsx';
import WorkspaceOnboarding from '../pages/Onboarding/WorkspaceOnboarding.jsx';
import ForgotPassword from '../pages/Auth/ForgotPassword/index.jsx';
import ResetPassword from '../pages/Auth/ResetPassword/index.jsx';
import AuthCallback from '../pages/Auth/AuthCallback.jsx';
import Dashboard from '../pages/Dashboard/index.jsx';
import AdminDashboard from '../pages/Admin/Dashboard/index.jsx';
import CreatorDashboard from '../pages/Creator/Dashboard/index.jsx';
import UserManagement from '../pages/Admin/Users/index.jsx';
import UpgradeRequests from '../pages/Admin/UpgradeRequests/index.jsx';
import TemplateList from '../pages/Templates/TemplateList/index.jsx';
import TemplateEditor from '../pages/Templates/TemplateEditor/index.jsx';
import SurveyList from '../pages/Surveys/SurveyList/index.jsx';
import SurveyEditor from '../pages/Surveys/SurveyEditor/index.jsx';
import SurveyDistribute from '../pages/Surveys/Distribute/index.jsx';
import SurveyResults from '../pages/Surveys/Results/index.jsx';
import CollectorList from '../pages/Collectors/CollectorList/index.jsx';
import Workspaces from '../pages/Workspaces/index.jsx';
import WorkspaceDetail from '../pages/Workspaces/WorkspaceDetail/index.jsx';
import ManageInvitations from '../pages/Workspaces/ManageInvitations/index.jsx';
import Invitations from '../pages/User/Invitations/index.jsx';
import Notifications from '../pages/User/Notifications/index.jsx';
import Chat from '../pages/Chat/index.jsx';
import LLM from '../pages/LLM/index.jsx';
import PublicResponseForm from '../pages/Public/ResponseForm/index.jsx';
import WorkspaceInvitationAccept from '../pages/Public/WorkspaceInvitationAccept/index.jsx';
import InvitationAccept from '../pages/Public/InvitationAccept/index.jsx';
import UserResponses from '../pages/User/Responses/index.jsx';
import Profile from '../pages/User/Profile/Profile.jsx';
import Settings from '../pages/User/Settings/Settings.jsx';
import AnalyticsPage from '../pages/Analytics/index.jsx';

/**
 * Main Routes Configuration
 */
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />
      {/* Backward compatibility for old links */}
      <Route
        path="/auth/reset-password"
        element={<ResetPassword />}
      />
      <Route
        path="/auth/callback"
        element={
          <PublicRoute>
            <AuthCallback />
          </PublicRoute>
        }
      />

      {/* Onboarding Route - Protected as user must be logged in to create workspace */}
      <Route
        path="/onboarding/workspace"
        element={
          <ProtectedRoute>
            <WorkspaceOnboarding />
          </ProtectedRoute>
        }
      />

      {/* Protected Routes with Layout */}

      {/* Role-Specific Dashboards */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DefaultLayout>
              <AdminDashboard />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/creator/dashboard"
        element={
          <ProtectedRoute allowedRoles={['creator']}>
            <DefaultLayout>
              <CreatorDashboard />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />

      {/* Generic Dashboard - redirects to role-specific dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin', 'creator']}>
            <DefaultLayout>
              <Dashboard />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />

      {/* User Management - Admin Only */}
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DefaultLayout>
              <UserManagement />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />

      {/* Upgrade Requests - Admin Only */}
      <Route
        path="/admin/upgrade-requests"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DefaultLayout>
              <UpgradeRequests />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />

      {/* Legacy User Management Route */}
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DefaultLayout>
              <UserManagement />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />

      {/* Templates Routes */}
      <Route
        path="/templates"
        element={
          <ProtectedRoute allowedRoles={['admin', 'creator']}>
            <DefaultLayout>
              <TemplateList />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/templates/new"
        element={
          <ProtectedRoute allowedRoles={['admin', 'creator']}>
            <DefaultLayout>
              <TemplateEditor />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/templates/:id/edit"
        element={
          <ProtectedRoute allowedRoles={['admin', 'creator']}>
            <DefaultLayout>
              <TemplateEditor />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />

      {/* Surveys Routes */}
      <Route
        path="/surveys"
        element={
          <ProtectedRoute>
            <DefaultLayout>
              <SurveyList />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/surveys/new"
        element={
          <ProtectedRoute allowedRoles={['admin', 'creator']}>
            <DefaultLayout>
              <SurveyEditor />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/surveys/:id/edit"
        element={
          <ProtectedRoute allowedRoles={['admin', 'creator']}>
            <DefaultLayout>
              <SurveyEditor />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/surveys/:id/distribute"
        element={
          <ProtectedRoute allowedRoles={['admin', 'creator']}>
            <DefaultLayout>
              <SurveyDistribute />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/surveys/:id/results"
        element={
          <ProtectedRoute allowedRoles={['admin', 'creator']}>
            <DefaultLayout>
              <SurveyResults />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />

      {/* Collectors Routes - Creator/Admin */}
      <Route
        path="/collectors"
        element={
          <ProtectedRoute allowedRoles={['admin', 'creator']}>
            <DefaultLayout>
              <CollectorList />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />

      {/* Workspaces Routes - Creator/Admin */}
      <Route
        path="/workspaces"
        element={
          <ProtectedRoute allowedRoles={['admin', 'creator']}>
            <DefaultLayout>
              <Workspaces />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />

      {/* Workspace Detail Route */}
      <Route
        path="/workspaces/:id"
        element={
          <ProtectedRoute allowedRoles={['admin', 'creator']}>
            <DefaultLayout>
              <WorkspaceDetail />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />

      {/* Manage Workspace Invitations Route */}
      <Route
        path="/workspaces/:id/invitations"
        element={
          <ProtectedRoute allowedRoles={['admin', 'creator']}>
            <DefaultLayout>
              <ManageInvitations />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />

      {/* Invitations Route - User */}
      <Route
        path="/invitations"
        element={
          <ProtectedRoute>
            <DefaultLayout>
              <Invitations />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />

      {/* Notifications Routes - All authenticated users */}
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <DefaultLayout>
              <Notifications />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />

      {/* Responses Routes - User */}
      <Route
        path="/responses"
        element={
          <ProtectedRoute allowedRoles={['user']}>
            <DefaultLayout>
              <UserResponses />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />

      {/* My Responses - All authenticated users can view their own responses */}
      <Route
        path="/my-responses"
        element={
          <ProtectedRoute>
            <DefaultLayout>
              <UserResponses />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />

      {/* Analytics Routes */}
      <Route
        path="/analytics"
        element={
          <ProtectedRoute allowedRoles={['admin', 'creator']}>
            <DefaultLayout>
              <AnalyticsPage />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />

      {/* LLM/AI Routes - Admin/Creator */}
      <Route
        path="/llm"
        element={
          <ProtectedRoute allowedRoles={['admin', 'creator', 'user']}>
            <DefaultLayout>
              <LLM />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />

      {/* Chat Routes - All authenticated users */}
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <DefaultLayout>
              <Chat />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />

      {/* Public Response Collection Route (no auth required) */}
      <Route
        path="/public/response/:token"
        element={<PublicResponseForm />}
      />
      <Route
        path="/public/:token"
        element={<PublicResponseForm />}
      />

      {/* Legacy route for backward compatibility */}
      <Route
        path="/collect/:token"
        element={<PublicResponseForm />}
      />

      {/* Collector Distribution Route (public, no auth required) */}
      <Route
        path="/collector/:token"
        element={<PublicResponseForm />}
      />

      {/* Workspace Invitation Acceptance Route (public, no auth required) */}
      <Route
        path="/workspace/invitation/:inviteToken/accept"
        element={<WorkspaceInvitationAccept />}
      />

      {/* Survey Invitation Acceptance Route (public) */}
      <Route
        path="/invitation/:token"
        element={<InvitationAccept />}
      />
      <Route
        path="/public/invite/:token"
        element={<InvitationAccept />}
      />

      {/* Profile & Settings (All authenticated users) */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <DefaultLayout>
              <Profile />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <DefaultLayout>
              <Settings />
            </DefaultLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
