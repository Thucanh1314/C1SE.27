# Frontend Implementation - Role Mismatch Warning System

## Tổng quan
Hệ thống cảnh báo khi User được mời vào Workspace với vai trò cao hơn System Role của họ (User được mời làm Collaborator/Owner nhưng System Role chỉ là `user`).

---

## 1. Backend Changes Summary

### A. Workspace Invitation Flow
Khi Owner/Admin mời User với vai trò Collaborator/Owner:
- Backend tự động check nếu `inviteeUser.role === 'user'` và workspace role là `collaborator` hoặc `owner`
- Ghi log cảnh báo vào `workspace_activities` với type `role_mismatch_warning`

### B. Permission API Updates
- `/api/modules/permissions/my` - Thêm field `roleMismatch`
- `/api/modules/permissions/ui-config` - Thêm flags `showUpgradeModal` và `roleMismatchWarning`

---

## 2. API Endpoints

### 2.1. Get Workspace Activities (Cho Owner)
```
GET /api/modules/workspaces/:workspaceId/activities?limit=50
Authorization: Bearer {token}
```

**Response mẫu khi có role mismatch warning:**
```json
{
  "ok": true,
  "activities": [
    {
      "id": 123,
      "workspace_id": 5,
      "user_id": 10,
      "activity_type": "role_mismatch_warning",
      "description": "Cảnh báo: Người dùng Nguyễn Văn A hiện có vai trò hệ thống là User. Họ sẽ không thể thực hiện các quyền Collaborator (tạo Template/Survey) cho đến khi nâng cấp tài khoản lên Creator.",
      "entity_type": "user",
      "entity_id": 101,
      "metadata": {
        "invitee_email": "user@example.com",
        "workspace_role": "collaborator",
        "system_role": "user",
        "warning": "...",
        "blocked_features": ["create_template", "create_survey", "create_workspace"]
      },
      "created_at": "2025-12-20T10:30:00Z"
    },
    {
      "id": 122,
      "activity_type": "member_invited",
      "description": "Invited user@example.com",
      "created_at": "2025-12-20T10:29:55Z"
    }
  ]
}
```

### 2.2. Get User Permissions (Cho User được mời)
```
GET /api/modules/permissions/my?workspaceId=5
Authorization: Bearer {token}
```

**Response khi có role mismatch:**
```json
{
  "success": true,
  "data": {
    "systemRole": "user",
    "isCreator": false,
    "roleMismatch": {
      "hasRoleMismatch": true,
      "systemRole": "user",
      "workspaceRole": "collaborator",
      "warning": "Bạn đang là thành viên của Workspace này với vai trò Collaborator, nhưng bạn cần nâng cấp lên Creator để sử dụng các tính năng thiết kế và AI (tạo Template/Survey).",
      "blockedFeatures": ["create_template", "create_survey", "create_workspace"],
      "recommendedAction": "upgrade_to_creator"
    },
    "permissions": {
      "canCreateTemplate": false,
      "canCreateSurvey": false,
      "canUseAI": false
    }
  }
}
```

### 2.3. Get UI Config (Cho User được mời)
```
GET /api/modules/permissions/ui-config
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "buttons": {
      "createTemplate": {
        "visible": true,
        "enabled": false,
        "tooltip": "Vui lòng nâng cấp lên Creator",
        "showLockIcon": true,
        "showUpgradeModal": true
      },
      "createSurvey": {
        "visible": true,
        "enabled": false,
        "tooltip": "Vui lòng nâng cấp lên Creator",
        "showLockIcon": true,
        "showUpgradeModal": true
      },
      "useAI": {
        "visible": true,
        "enabled": false,
        "tooltip": "Chỉ Creator mới có thể sử dụng AI",
        "showLockIcon": true,
        "showUpgradeModal": true
      }
    },
    "messages": {
      "roleMismatchWarning": "Bạn đang là thành viên của Workspace này với vai trò Collaborator, nhưng bạn cần nâng cấp lên Creator để sử dụng các tính năng thiết kế và AI (tạo Template/Survey)."
    }
  }
}
```

---

## 3. Frontend Implementation Tasks

### 3.1. Owner/Admin View - Workspace Activities Feed
**File:** `components/Workspace/ActivityFeed.jsx`

```jsx
import { useEffect, useState } from 'react';
import api from '../../services/api';
import { AlertTriangle } from 'lucide-react';

function WorkspaceActivityFeed({ workspaceId }) {
  const [activities, setActivities] = useState([]);
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    async function fetchActivities() {
      const response = await api.get(`/api/modules/workspaces/${workspaceId}/activities?limit=50`);
      const data = response.data.activities;
      
      setActivities(data);
      
      // Filter role mismatch warnings
      const roleMismatchWarnings = data.filter(
        activity => activity.activity_type === 'role_mismatch_warning'
      );
      setWarnings(roleMismatchWarnings);
    }
    
    fetchActivities();
  }, [workspaceId]);

  return (
    <div className="activity-feed">
      <h3>Workspace Activities</h3>
      
      {/* Role Mismatch Warnings Section */}
      {warnings.length > 0 && (
        <div className="warnings-section">
          <div className="warning-header">
            <AlertTriangle className="icon-warning" />
            <h4>Cảnh Báo Quyền Hạn</h4>
          </div>
          
          {warnings.map(warning => (
            <div key={warning.id} className="warning-card">
              <div className="warning-icon">⚠️</div>
              <div className="warning-content">
                <p className="warning-message">{warning.description}</p>
                <div className="warning-details">
                  <span className="user-email">{warning.metadata?.invitee_email}</span>
                  <span className="role-badge workspace-role">
                    Workspace: {warning.metadata?.workspace_role}
                  </span>
                  <span className="role-badge system-role">
                    System: {warning.metadata?.system_role}
                  </span>
                </div>
                <div className="blocked-features">
                  <strong>Tính năng bị chặn:</strong>
                  <ul>
                    {warning.metadata?.blocked_features?.map(feature => (
                      <li key={feature}>{formatFeatureName(feature)}</li>
                    ))}
                  </ul>
                </div>
                <button 
                  className="btn-remind"
                  onClick={() => remindUserToUpgrade(warning.metadata?.invitee_email)}
                >
                  Nhắc nhở nâng cấp
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Regular Activities */}
      <div className="activities-list">
        {activities.map(activity => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}

function formatFeatureName(feature) {
  const names = {
    'create_template': 'Tạo Template',
    'create_survey': 'Tạo Survey',
    'create_workspace': 'Tạo Workspace'
  };
  return names[feature] || feature;
}
```

**CSS:**
```css
.warnings-section {
  background: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.warning-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.icon-warning {
  color: #ff9800;
  width: 24px;
  height: 24px;
}

.warning-card {
  background: white;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  gap: 12px;
}

.warning-icon {
  font-size: 32px;
}

.warning-message {
  font-weight: 500;
  color: #856404;
  margin-bottom: 12px;
}

.warning-details {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.role-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.workspace-role {
  background: #e3f2fd;
  color: #1976d2;
}

.system-role {
  background: #fce4ec;
  color: #c2185b;
}

.blocked-features {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 12px;
}

.blocked-features ul {
  margin: 8px 0 0 20px;
  color: #666;
}

.btn-remind {
  background: #ff9800;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-remind:hover {
  background: #f57c00;
}
```

### 3.2. User View - Role Mismatch Banner
**File:** `components/Workspace/RoleMismatchBanner.jsx`

```jsx
import { useEffect, useState } from 'react';
import { AlertCircle, Lock } from 'lucide-react';
import api from '../../services/api';

function RoleMismatchBanner({ workspaceId }) {
  const [roleMismatch, setRoleMismatch] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    async function checkRoleMismatch() {
      const response = await api.get(
        `/api/modules/permissions/my?workspaceId=${workspaceId}`
      );
      
      const data = response.data.data;
      if (data.roleMismatch?.hasRoleMismatch) {
        setRoleMismatch(data.roleMismatch);
      }
    }
    
    checkRoleMismatch();
  }, [workspaceId]);

  if (!roleMismatch) return null;

  return (
    <>
      <div className="role-mismatch-banner">
        <div className="banner-icon">
          <AlertCircle className="icon" />
        </div>
        <div className="banner-content">
          <h4>⚠️ Giới hạn quyền truy cập</h4>
          <p>{roleMismatch.warning}</p>
          <div className="role-info">
            <span className="role-badge">
              <Lock size={14} /> System Role: {roleMismatch.systemRole}
            </span>
            <span className="role-badge workspace">
              Workspace Role: {roleMismatch.workspaceRole}
            </span>
          </div>
        </div>
        <button 
          className="btn-upgrade"
          onClick={() => setShowUpgradeModal(true)}
        >
          Nâng cấp ngay
        </button>
      </div>

      {showUpgradeModal && (
        <UpgradeModal 
          roleMismatch={roleMismatch}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </>
  );
}
```

**CSS:**
```css
.role-mismatch-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.banner-icon .icon {
  width: 40px;
  height: 40px;
}

.banner-content {
  flex: 1;
}

.banner-content h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
}

.banner-content p {
  margin: 0 0 12px 0;
  opacity: 0.95;
  line-height: 1.5;
}

.role-info {
  display: flex;
  gap: 8px;
}

.role-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.role-badge.workspace {
  background: rgba(255, 255, 255, 0.3);
}

.btn-upgrade {
  background: white;
  color: #667eea;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 0.2s;
}

.btn-upgrade:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
```

### 3.3. Locked Button with Upgrade Modal
**File:** `components/Common/LockedButton.jsx`

```jsx
import { Lock } from 'lucide-react';
import { useState } from 'react';
import UpgradeModal from './UpgradeModal';

function LockedButton({ 
  label, 
  tooltip, 
  showUpgradeModal = false,
  roleMismatch = null 
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleClick = () => {
    if (showUpgradeModal) {
      setModalOpen(true);
    } else {
      alert(tooltip);
    }
  };

  return (
    <>
      <button 
        className="btn-locked"
        onClick={handleClick}
        title={tooltip}
      >
        <Lock size={16} />
        {label}
      </button>

      {modalOpen && showUpgradeModal && (
        <UpgradeModal 
          roleMismatch={roleMismatch}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
```

### 3.4. Upgrade Modal
**File:** `components/Modals/UpgradeModal.jsx`

```jsx
import { X, Lock, CheckCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function UpgradeModal({ roleMismatch, onClose }) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    // Navigate to upgrade page
    navigate('/upgrade');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content upgrade-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="modal-header">
          <div className="lock-icon-large">
            <Lock size={48} />
          </div>
          <h2>Nâng Cấp Lên Creator</h2>
          <p className="subtitle">
            {roleMismatch?.warning || 
             'Bạn cần nâng cấp lên Creator để sử dụng đầy đủ tính năng'}
          </p>
        </div>

        <div className="modal-body">
          {/* Current Status */}
          <div className="status-section">
            <h3>Trạng thái hiện tại</h3>
            <div className="status-cards">
              <div className="status-card">
                <span className="label">System Role:</span>
                <span className="value">{roleMismatch?.systemRole || 'user'}</span>
              </div>
              <div className="status-card">
                <span className="label">Workspace Role:</span>
                <span className="value">{roleMismatch?.workspaceRole || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Blocked Features */}
          {roleMismatch?.blockedFeatures && (
            <div className="blocked-section">
              <h3>Tính năng bị khóa</h3>
              <ul className="blocked-list">
                {roleMismatch.blockedFeatures.map(feature => (
                  <li key={feature}>
                    <Lock size={16} />
                    {formatFeatureName(feature)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Benefits */}
          <div className="benefits-section">
            <h3>Lợi ích khi nâng cấp Creator</h3>
            <ul className="benefits-list">
              <li>
                <CheckCircle size={20} className="icon-check" />
                <span>Tạo Template khảo sát tùy chỉnh</span>
              </li>
              <li>
                <CheckCircle size={20} className="icon-check" />
                <span>Tạo và quản lý Survey không giới hạn</span>
              </li>
              <li>
                <CheckCircle size={20} className="icon-check" />
                <span>Sử dụng đầy đủ AI features (Port 8001 & Gemini)</span>
              </li>
              <li>
                <CheckCircle size={20} className="icon-check" />
                <span>Phân tích dữ liệu nâng cao với AI</span>
              </li>
              <li>
                <CheckCircle size={20} className="icon-check" />
                <span>Tạo và quản lý Workspace</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Để sau
          </button>
          <button className="btn-primary" onClick={handleUpgrade}>
            Nâng cấp ngay
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatFeatureName(feature) {
  const names = {
    'create_template': 'Tạo Template',
    'create_survey': 'Tạo Survey',
    'create_workspace': 'Tạo Workspace'
  };
  return names[feature] || feature;
}
```

**CSS:**
```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s;
}

.modal-content.upgrade-modal {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  animation: slideUp 0.3s;
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
}

.modal-header {
  text-align: center;
  padding: 40px 24px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.lock-icon-large {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  color: white;
  margin-bottom: 16px;
}

.modal-header h2 {
  margin: 0 0 8px 0;
  font-size: 28px;
  color: #333;
}

.subtitle {
  color: #666;
  margin: 0;
  line-height: 1.5;
}

.modal-body {
  padding: 24px;
}

.status-section,
.blocked-section,
.benefits-section {
  margin-bottom: 24px;
}

.status-section h3,
.blocked-section h3,
.benefits-section h3 {
  font-size: 16px;
  color: #333;
  margin-bottom: 12px;
}

.status-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.status-card {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-card .label {
  font-size: 12px;
  color: #666;
}

.status-card .value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  text-transform: capitalize;
}

.blocked-list,
.benefits-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.blocked-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #fff3cd;
  border-radius: 4px;
  margin-bottom: 8px;
  color: #856404;
}

.benefits-list li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.benefits-list li:last-child {
  border-bottom: none;
}

.icon-check {
  color: #4caf50;
  flex-shrink: 0;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #e0e0e0;
}

.btn-secondary,
.btn-primary {
  flex: 1;
  padding: 12px 24px;
  border-radius: 6px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-secondary {
  background: #f5f5f5;
  color: #666;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 3.5. Integration in Main Components
**File:** `pages/WorkspacePage.jsx`

```jsx
import RoleMismatchBanner from '../components/Workspace/RoleMismatchBanner';
import ActivityFeed from '../components/Workspace/ActivityFeed';

function WorkspacePage() {
  const { workspaceId } = useParams();
  const { user } = useAuth();

  return (
    <div className="workspace-page">
      {/* Show role mismatch banner for user */}
      <RoleMismatchBanner workspaceId={workspaceId} />

      {/* Main content */}
      <div className="workspace-content">
        {/* ... other components ... */}
      </div>

      {/* Activity feed for owner/admin */}
      {user.isOwner && (
        <div className="sidebar">
          <ActivityFeed workspaceId={workspaceId} />
        </div>
      )}
    </div>
  );
}
```

**File:** `components/Survey/SurveyList.jsx`

```jsx
import { useEffect, useState } from 'react';
import api from '../../services/api';
import LockedButton from '../Common/LockedButton';

function SurveyList({ workspaceId }) {
  const [uiConfig, setUiConfig] = useState(null);
  const [roleMismatch, setRoleMismatch] = useState(null);

  useEffect(() => {
    async function fetchConfig() {
      const [configRes, permRes] = await Promise.all([
        api.get('/api/modules/permissions/ui-config'),
        api.get(`/api/modules/permissions/my?workspaceId=${workspaceId}`)
      ]);
      
      setUiConfig(configRes.data.data);
      setRoleMismatch(permRes.data.data.roleMismatch);
    }
    
    fetchConfig();
  }, [workspaceId]);

  if (!uiConfig) return <div>Loading...</div>;

  return (
    <div>
      <div className="header">
        <h2>Surveys</h2>
        
        {uiConfig.buttons.createSurvey.enabled ? (
          <button 
            className="btn-primary"
            onClick={() => navigate('/surveys/create')}
          >
            Create Survey
          </button>
        ) : (
          <LockedButton
            label="Create Survey"
            tooltip={uiConfig.buttons.createSurvey.tooltip}
            showUpgradeModal={uiConfig.buttons.createSurvey.showUpgradeModal}
            roleMismatch={roleMismatch}
          />
        )}
      </div>

      {/* Survey list */}
    </div>
  );
}
```

---

## 4. Testing Checklist

### 4.1. Owner/Admin View (Người mời)
- [ ] Mời User (system role = user) làm Collaborator
- [ ] Kiểm tra log xuất hiện trong Activities feed
- [ ] Verify cảnh báo hiển thị đầy đủ thông tin:
  - Email người được mời
  - Workspace role vs System role
  - Danh sách tính năng bị chặn
- [ ] Nút "Nhắc nhở nâng cấp" hoạt động

### 4.2. User View (Người được mời)
- [ ] Login với user được mời
- [ ] Verify banner cảnh báo xuất hiện trên workspace page
- [ ] Kiểm tra các nút bị khóa:
  - Create Template - có lock icon
  - Create Survey - có lock icon
  - AI features - có lock icon
- [ ] Click vào nút locked → Modal upgrade xuất hiện
- [ ] Modal hiển thị:
  - System role hiện tại
  - Workspace role hiện tại
  - Danh sách tính năng bị khóa
  - Benefits của Creator
- [ ] Nút "Nâng cấp ngay" navigate đến upgrade page

### 4.3. Edge Cases
- [ ] User đã là Creator → Không hiện banner/warning
- [ ] Viewer role → Không hiện role mismatch (chỉ Collaborator/Owner)
- [ ] Multiple workspaces → Warning riêng cho mỗi workspace
- [ ] User nâng cấp thành Creator → Banner biến mất
- [ ] Refresh page → State persist chính xác

---

## 5. Summary Flow

```
┌─────────────────────────────────────────────────────────────┐
│ OWNER/ADMIN INVITES USER AS COLLABORATOR                    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Backend Check        │
        │ user.role === 'user' │
        │ workspace_role ===   │
        │ 'collaborator'       │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Log Warning to       │
        │ workspace_activities │
        └──────────┬───────────┘
                   │
    ┌──────────────┴──────────────┐
    │                             │
    ▼                             ▼
┌───────────────┐        ┌────────────────┐
│ OWNER SEES    │        │ USER SEES      │
│ - Warning in  │        │ - Banner alert │
│   Activities  │        │ - Locked btns  │
│ - Can remind  │        │ - Upgrade modal│
│   user        │        │ - Benefits     │
└───────────────┘        └────────────────┘
```

---

## 6. API Error Handling

```javascript
// services/api.js
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 403) {
      const data = error.response.data;
      
      if (data.reason === 'CREATOR_ROLE_REQUIRED') {
        // Check if should show upgrade modal
        checkAndShowUpgradeModal(data);
      }
    }
    return Promise.reject(error);
  }
);

function checkAndShowUpgradeModal(errorData) {
  // Get current permissions
  api.get('/api/modules/permissions/my')
    .then(response => {
      const roleMismatch = response.data.data.roleMismatch;
      
      if (roleMismatch?.hasRoleMismatch) {
        // Show upgrade modal
        showUpgradeModal(roleMismatch);
      } else {
        // Show generic error
        alert(errorData.message);
      }
    });
}
```

---

## Tổng Kết

Hệ thống cảnh báo này đảm bảo:

1. **Owner/Admin** biết chính xác ai cần nâng cấp
2. **User** hiểu rõ giới hạn và cách unlock tính năng
3. **UI/UX** mượt mà với visual cues rõ ràng
4. **Backend** log đầy đủ cho audit và analytics

Tất cả được implement theo pattern hiện có, dễ maintain và extend!
