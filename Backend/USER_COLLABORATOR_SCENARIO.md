# Kịch Bản: User Mới với Role Collaborator

## Giả định
**User mới:**
- Email: `collaborator@example.com`
- **System Role (users.role)**: `user` (KHÔNG phải `creator`)
- **Workspace Role (workspace_members.role)**: `collaborator` (được Owner mời vào workspace)
- User ID: 101
- Workspace ID: 5

---

## 1. Quyền Truy Cập AI Features (Cổng 8001) ✅

### Trạng thái: **CHO PHÉP**

**Lý do:** Code đã được cập nhật trong `trained-model.service.js`:

```javascript
async checkAIPermission() {
    // 1. Allow global Admin & Creator
    if (['admin', 'creator'].includes(this.user.role)) {
        return; // ❌ User này không pass điều kiện này
    }

    // 2. Allow Collaborator/Owner role in any workspace
    const membership = await WorkspaceMember.findOne({
        where: {
            user_id: this.user.id,
            role: ['owner', 'collaborator']
        }
    });

    if (membership) {
        return; // ✅ User này PASS điều kiện này!
    }
    // ... deny access
}
```

**Kết quả:**
- ✅ **Có thể gọi API AI** (port 8001)
- ✅ **Có thể generate questions** từ keyword
- ✅ **Có thể dự đoán category**
- ✅ **Có thể batch generate questions**

**Test Case:**
```javascript
// User collaborator gọi AI
POST /api/llm/generate-questions
Authorization: Bearer {collaborator_token}
Body: {
  "keyword": "Machine Learning",
  "num_questions": 5
}

// Response: 200 OK ✅
{
  "success": true,
  "questions": [...]
}
```

---

## 2. Quản Lý Workspace ❌

### Trạng thái: **BỊ CHẶN**

**Endpoint:**
```
POST /api/modules/workspaces/
```

**Middleware Applied:**
```javascript
router.post('/', authenticate, isCreatorOrAdmin, workspaceController.createWorkspace);
```

**Kết quả:**
```json
{
  "success": false,
  "message": "Access denied. Requires one of the following roles: creator, admin",
  "status": 403
}
```

**Log ghi lại:**
```javascript
// workspace_activities
{
  "workspace_id": null,
  "user_id": 101,
  "activity_type": "ACCESS_DENIED",
  "description": "Cảnh báo: CREATOR_ROLE_REQUIRED",
  "metadata": {
    "feature": "Workspace",
    "action": "POST",
    "userRole": "user",
    "endpoint": "/api/modules/workspaces/"
  }
}
```

**UI sẽ hiển thị:**
- Nút "Create Workspace" bị ẩn hoàn toàn
- Không có option để tạo workspace mới

---

## 3. Tạo Template (Survey Template) ❌

### Trạng thái: **BỊ CHẶN**

**Endpoint:**
```
POST /api/modules/templates/
```

**Middleware Applied:**
```javascript
router.post('/', authenticate, requireCreatorRole, templateController.createTemplate);
```

**Kết quả:**
```json
{
  "success": false,
  "message": "Vui lòng nâng cấp lên Creator để sử dụng tính năng này",
  "reason": "CREATOR_ROLE_REQUIRED",
  "userRole": "user",
  "requiredRole": "creator"
}
```

**Log ghi lại:**
```javascript
// audit_logs
{
  "user_id": 101,
  "action": "UNAUTHORIZED_POST",
  "entity_type": "Template",
  "details": {
    "userRole": "user",
    "workspaceRole": "collaborator",
    "endpoint": "/api/modules/templates/",
    "method": "POST",
    "reason": "CREATOR_ROLE_REQUIRED"
  }
}
```

**UI sẽ hiển thị:**
```javascript
// Button state
{
  "visible": true,
  "enabled": false,
  "tooltip": "Vui lòng nâng cấp lên Creator"
}
```

Khi user click vào nút "Create Template":
- Hiện modal: "Cảnh báo: Vui lòng nâng cấp lên Creator để thiết kế Template"
- Có button "Upgrade Now"

---

## 4. Tạo Survey ❌

### Trạng thái: **BỊ CHẶN**

**Endpoint:**
```
POST /api/modules/surveys/
```

**Middleware Applied:**
```javascript
router.post('/', authenticate, requireCreatorRole, surveyController.createSurvey);
```

**Kết quả:** Tương tự Template
```json
{
  "success": false,
  "message": "Vui lòng nâng cấp lên Creator để sử dụng tính năng này",
  "reason": "CREATOR_ROLE_REQUIRED"
}
```

**Log ghi lại:**
```javascript
// workspace_activities
{
  "workspace_id": 5,
  "user_id": 101,
  "activity_type": "ACCESS_DENIED",
  "description": "Cảnh báo: Cộng tác viên [101] chưa nâng cấp tài khoản",
  "metadata": {
    "feature": "Survey",
    "action": "POST",
    "userRole": "user",
    "workspaceRole": "collaborator"
  }
}
```

**UI sẽ hiển thị:**
- Nút "Create Survey" visible nhưng disabled
- Tooltip: "Vui lòng nâng cấp lên Creator"
- Khi click: Hiện upgrade prompt

---

## 5. Xem Analytics ✅

### Trạng thái: **CHO PHÉP (Read-Only)**

**Endpoint:**
```
GET /api/modules/analytics/
GET /api/modules/analytics/:surveyId/stats
```

**Middleware:** Chỉ cần `authenticate` (không cần Creator)

**Kết quả:**
```json
{
  "success": true,
  "data": {
    "surveys": [...],
    "responses": [...],
    "charts": [...]
  }
}
```

**UI sẽ hiển thị:**
- Đầy đủ dashboard analytics
- Biểu đồ, thống kê
- KHÔNG có nút "Request New AI Analysis" (chỉ Creator mới có)

---

## 6. Yêu Cầu AI Phân Tích Nâng Cao ❌

### Trạng thái: **BỊ CHẶN**

**Giả sử có endpoint:**
```
POST /api/modules/analytics/ai-analysis
```

**Kết quả:**
```json
{
  "success": false,
  "message": "Yêu cầu nâng cấp để sử dụng tính năng AI Analytics",
  "reason": "CREATOR_ROLE_REQUIRED"
}
```

**UI sẽ hiển thị:**
- Nút "Request AI Analysis" disabled
- Lock icon 🔒
- Tooltip: "Yêu cầu nâng cấp để sử dụng tính năng AI Analytics"

---

## 7. Giao Diện Sidebar

### Trạng thái: **HIỂN THỊ GIỚI HẠN**

```javascript
// API response từ /api/modules/permissions/ui-config
{
  "sidebar": {
    "showCreateWorkspace": false,        // ❌ Ẩn
    "showTemplates": true,               // ✅ Hiện (nhưng chỉ xem)
    "showSurveys": true,                 // ✅ Hiện (nhưng chỉ xem)
    "showAIFeatures": true,              // ✅ Hiện (vì có quyền AI)
    "showAnalytics": true,               // ✅ Hiện
    "workspaceMenusEnabled": false       // ❌ Menu mờ
  }
}
```

**Visual:**
```
┌─ Sidebar ─────────────┐
│                        │
│  📊 Dashboard          │  ✅ Enabled
│  🏢 Workspaces (mờ)    │  ⚠️  Disabled
│  📝 Templates (mờ)     │  ⚠️  View only
│  📋 Surveys (mờ)       │  ⚠️  View only
│  🤖 AI Tools           │  ✅ Enabled
│  📈 Analytics          │  ✅ Enabled
│                        │
│  [Upgrade Banner]      │  ⚠️  "Nâng cấp lên Creator"
│                        │
└────────────────────────┘
```

---

## 8. Matrix Tổng Hợp

| Tính năng | System: User + Workspace: Collaborator | Có AI Permission? | UI State |
|-----------|---------------------------------------|-------------------|----------|
| **Tạo Workspace** | ❌ Chặn | N/A | Hidden |
| **Tạo Template** | ❌ Chặn | N/A | Disabled + Tooltip |
| **Tạo Survey** | ❌ Chặn | N/A | Disabled + Tooltip |
| **Generate AI Questions** | ✅ **Cho phép** | ✅ Yes | Enabled |
| **Predict Category (AI)** | ✅ **Cho phép** | ✅ Yes | Enabled |
| **Xem Analytics** | ✅ Cho phép | N/A | Enabled (Read-only) |
| **Request AI Analysis** | ❌ Chặn | N/A | Disabled + Lock |
| **Xem Templates** | ✅ Cho phép | N/A | Enabled (View only) |
| **Xem Surveys** | ✅ Cho phép | N/A | Enabled (View only) |

---

## 9. Luồng Hoạt Động Thực Tế

### Scenario 1: User muốn tạo câu hỏi bằng AI
```
1. User login → Token JWT
2. Navigate to "AI Tools" page
3. Click "Generate Questions with AI"
4. Input keyword: "Cloud Computing"
5. Frontend gọi: POST /api/llm/generate-questions
6. Backend check permissions:
   ✅ User authenticated
   ✅ User có workspace_members.role = 'collaborator'
   ✅ Pass AI permission check
7. Backend gọi AI service (port 8001)
8. ✅ SUCCESS - Trả về questions cho user
9. Log: "User 101 successfully used AI features"
```

### Scenario 2: User muốn tạo Template mới
```
1. User navigate to "Templates" page
2. Frontend gọi: GET /api/modules/permissions/ui-config
3. Response: createTemplate.enabled = false
4. UI render: Button disabled với tooltip
5. User click button (disabled)
6. Frontend hiện modal:
   "⚠️  Cảnh báo: Vui lòng nâng cấp lên Creator để thiết kế Template"
7. Modal có 2 options:
   - "Upgrade Now" → Navigate to upgrade page
   - "Cancel" → Close modal
8. Nếu user cố gắng bypass và gọi API trực tiếp:
   POST /api/modules/templates/
9. Backend response: 403 Forbidden
10. Log ghi vào audit_logs và workspace_activities
```

### Scenario 3: User xem Analytics
```
1. User navigate to "Analytics" page
2. Frontend gọi: GET /api/modules/analytics/
3. ✅ Backend cho phép (không cần Creator)
4. UI hiển thị:
   - ✅ Charts và statistics
   - ✅ Response data
   - ❌ "Request AI Analysis" button (disabled)
5. User có thể xem nhưng không thể request phân tích mới
```

---

## 10. Messages & Cảnh Báo

### Banner trên UI
```javascript
{
  "upgradePrompt": "Nâng cấp lên Creator để mở khóa đầy đủ tính năng AI và quản lý",
  "viewerNote": null  // Chỉ hiện với Viewer role
}
```

### Toast/Alert Messages
```javascript
// Khi click vào disabled button
"Vui lòng nâng cấp lên Creator để sử dụng tính năng này"

// Khi AI access denied (không nên xảy ra với Collaborator)
"Vui lòng nâng cấp lên Creator hoặc tham gia Workspace với tư cách Collaborator để sử dụng tính năng AI"

// Khi cố tạo workspace
"User không có quyền khởi tạo không gian"
```

---

## 11. Database Logs

### audit_logs
```sql
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
VALUES (
  101,
  'UNAUTHORIZED_POST',
  'Template',
  NULL,
  '{"userRole":"user","workspaceRole":"collaborator","endpoint":"/api/modules/templates/","method":"POST","reason":"CREATOR_ROLE_REQUIRED"}',
  NOW()
);
```

### workspace_activities
```sql
INSERT INTO workspace_activities (workspace_id, user_id, activity_type, description, metadata, created_at)
VALUES (
  5,
  101,
  'ACCESS_DENIED',
  'Cảnh báo: Cộng tác viên [101] chưa nâng cấp tài khoản',
  '{"feature":"Survey","action":"POST","userRole":"user","workspaceRole":"collaborator"}',
  NOW()
);
```

---

## 12. Điểm Đặc Biệt

### ✅ Ưu điểm của Collaborator
1. **Được sử dụng AI features** (khác biệt lớn so với bản thiết kế ban đầu)
2. Có thể xem toàn bộ templates và surveys trong workspace
3. Có thể xem analytics và reports
4. Có thể tương tác với AI để generate questions

### ❌ Hạn chế của Collaborator
1. **Không thể tạo Workspace mới**
2. **Không thể tạo Template** (cần upgrade Creator)
3. **Không thể tạo Survey** (cần upgrade Creator)
4. **Không thể request AI analysis mới**
5. Không thể chỉnh sửa/xóa templates hoặc surveys

### 🔄 So sánh với các roles khác

| Tính năng | User (No Workspace) | User + Collaborator | Creator | Admin |
|-----------|---------------------|---------------------|---------|-------|
| AI Features | ❌ | ✅ | ✅ | ✅ |
| Create Template | ❌ | ❌ | ✅ | ✅ |
| Create Survey | ❌ | ❌ | ✅ | ✅ |
| Create Workspace | ❌ | ❌ | ✅ | ✅ |
| View Analytics | ✅ | ✅ | ✅ | ✅ |

---

## Tổng Kết

**User mới với Workspace Role = Collaborator** sẽ:

1. ✅ **Được phép sử dụng AI** để generate questions (nhờ logic mới trong trained-model.service.js)
2. ❌ **Bị chặn tạo Template/Survey** (cần System Role = creator)
3. ❌ **Bị chặn tạo Workspace** (cần System Role = creator)
4. ✅ **Xem được Analytics** (read-only)
5. ⚠️  **UI sẽ hiện upgrade prompts** khuyến khích nâng cấp lên Creator
6. 📝 **Mọi hành động bị chặn đều được log** vào audit_logs và workspace_activities

**Khuyến nghị cho User:**
> "Bạn đang có quyền Collaborator trong Workspace, cho phép sử dụng AI features. Tuy nhiên, để mở khóa đầy đủ tính năng quản lý (tạo Template, Survey, Workspace), vui lòng nâng cấp lên Creator."
