# Bảng Tương Quan: Hậu Quả Khi Rời Khỏi/Bị Xóa Khỏi Workspace

## Tổng Quan

Khi một member rời khỏi hoặc bị xóa khỏi workspace, hệ thống thực hiện 3 bước cleanup tự động qua phương thức `_cleanupMemberExit`:

1. **Asset Retention** - Chuyển quyền sở hữu survey
2. **Role Restoration** - Hạ cấp role user nếu cần
3. **Socket Termination** - Thông báo real-time cho frontend

---

## Bảng Tương Quan Chi Tiết

| **Khía Cạnh** | **Trường Hợp: Leave Workspace** | **Trường Hợp: Bị Remove** | **Ghi Chú** |
|---------------|--------------------------------|---------------------------|-------------|
| **Điều kiện tiên quyết** | User phải là member (không phải owner) | Only owner có quyền remove | Owner không thể leave, phải transfer ownership trước |
| **1️⃣ Survey Ownership** | Tất cả surveys do user tạo trong workspace được chuyển về Owner | Tất cả surveys do user tạo trong workspace được chuyển về Owner | ✅ **Asset Retention**: Workspace không mất dữ liệu |
| **2️⃣ User Role Downgrade** | Kiểm tra: Nếu user không còn sở hữu workspace nào → hạ role về `user` | Kiểm tra: Nếu user không còn sở hữu workspace nào → hạ role về `user` | ⚠️ **Automatic Demotion**: Role `creator` chỉ hợp lệ khi sở hữu ≥1 workspace |
| **3️⃣ Database Changes** | Xóa record trong `workspace_members` | Xóa record trong `workspace_members` | Permanent removal |
| **4️⃣ Real-time Notification** | Emit Socket.IO: `workspace:member_removed` | Emit Socket.IO: `workspace:member_removed` | Frontend redirect user khỏi workspace page |
| **5️⃣ Activity Log** | Log: `"left"` action | Log: `"member_removed"` action | Ghi lại lịch sử cho audit trail |
| **6️⃣ Workspace Access** | ❌ Mất toàn bộ quyền truy cập workspace | ❌ Mất toàn bộ quyền truy cập workspace | Không thể view surveys, settings, members |
| **7️⃣ Survey Access** | Surveys mà user tạo: Vẫn tồn tại nhưng thuộc về Owner | Surveys mà user tạo: Vẫn tồn tại nhưng thuộc về Owner | User không còn quyền edit/delete surveys của mình |
| **8️⃣ Invitations** | Không ảnh hưởng đến invitations đã gửi/nhận trước đó | Không ảnh hưởng đến invitations đã gửi/nhận trước đó | Invitations vẫn valid cho đến khi expire |
| **9️⃣ Analytics/Responses** | Dữ liệu response vẫn giữ nguyên trong surveys | Dữ liệu response vẫn giữ nguyên trong surveys | Response data không bị xóa |
| **🔟 Rollback Possibility** | ❌ Không tự động rollback. Phải được invite lại | ❌ Không tự động rollback. Phải được invite lại | Owner phải gửi invitation mới |

---

## Luồng Xử Lý Chi Tiết

### 📍 Code Flow: Leave Workspace

```javascript
// File: workspace.service.js - Line 523-560
async leaveWorkspace(workspaceId, userId, io = null) {
  // 1. Validate workspace tồn tại
  // 2. Kiểm tra user không phải owner
  // 3. Kiểm tra user là member
  // 4. ⚡ CLEANUP: _cleanupMemberExit
  // 5. Xóa record WorkspaceMember
  // 6. Log activity: 'left'
}
```

### 📍 Code Flow: Remove Member

```javascript
// File: workspace.service.js - Line 421-459
async removeMember(workspaceId, memberId, currentUserId, io = null) {
  // 1. Validate workspace tồn tại
  // 2. Kiểm tra currentUser là owner
  // 3. Kiểm tra member tồn tại
  // 4. ⚡ CLEANUP: _cleanupMemberExit
  // 5. Xóa record WorkspaceMember
  // 6. Log activity: 'member_removed'
}
```

### 🔧 Cleanup Process: `_cleanupMemberExit`

```javascript
// File: workspace.service.js - Line 1674-1712
async _cleanupMemberExit(workspace, userId, io = null) {
  
  // BƯỚC 1: Asset Retention
  await Survey.update(
    { created_by: ownerId },  // Chuyển về Owner
    { where: { workspace_id: workspaceId, created_by: userId } }
  );
  
  // BƯỚC 2: Role Restoration
  const ownedWorkspacesCount = await Workspace.count({
    where: { owner_id: userId }
  });
  
  if (ownedWorkspacesCount === 0) {
    const user = await User.findByPk(userId);
    if (user && user.role === 'creator') {
      await user.update({ role: 'user' });  // Hạ cấp
    }
  }
  
  // BƯỚC 3: Socket Termination
  if (io) {
    io.to(`user_${userId}`).emit('workspace:member_removed', {
      workspace_id: workspaceId,
      message: `You are no longer a member of "${workspace.name}"`
    });
  }
}
```

---

## Kịch Bản Cụ Thể

### ✅ Kịch Bản 1: Member Leave Workspace

**Tình huống**: User A (creator, member của Workspace X) quyết định leave

**Trước khi leave**:
- User A role: `creator`
- User A owns: Workspace Y (là owner)
- Workspace X có 3 surveys do User A tạo

**Sau khi leave**:
- ✅ User A role: `creator` (vẫn giữ vì còn own Workspace Y)
- ✅ 3 surveys trong Workspace X: `created_by` → Owner của Workspace X
- ✅ User A không còn access Workspace X
- ✅ Frontend nhận Socket.IO event → redirect ra khỏi workspace page

---

### ⚠️ Kịch Bản 2: Member Leave → Role Downgrade

**Tình huống**: User B (creator, chỉ là member của 2 workspaces, không own workspace nào)

**Trước khi leave Workspace Z**:
- User B role: `creator`
- User B owns: 0 workspaces
- Member of: Workspace Z, Workspace W

**Sau khi leave Workspace Z**:
- ⚠️ User B role: `user` (bị hạ cấp vì `ownedWorkspacesCount === 0`)
- ✅ Surveys trong Workspace Z: chuyển về Owner
- ✅ User B vẫn còn là member của Workspace W
- ✅ Frontend nhận event → redirect + refetch user context (role thay đổi)

---

### 🚫 Kịch Bản 3: Owner Bị Remove (Không Cho Phép)

**Tình huống**: User C là owner của Workspace ABC, một admin cố gắng remove User C

**Kết quả**:
- ❌ Operation sẽ fail
- ❌ Error: "Only the workspace owner can remove members"
- ℹ️ Owner chỉ có thể leave sau khi transfer ownership

---

## So Sánh: Leave vs Remove

| **Khác Biệt** | **Leave** | **Remove** |
|---------------|-----------|------------|
| **Quyền thực hiện** | Chính user đó | Chỉ Owner |
| **Activity Log Type** | `"left"` | `"member_removed"` |
| **User Intent** | Tự nguyện | Bị bắt buộc |
| **Cleanup Process** | ✅ Giống nhau (`_cleanupMemberExit`) | ✅ Giống nhau (`_cleanupMemberExit`) |
| **Hậu quả** | ✅ Giống hệt nhau | ✅ Giống hệt nhau |

---

## Điểm Cần Lưu Ý

### 🔴 Critical Points

1. **Survey Ownership Transfer**
   - Surveys CỦA user bị chuyển về Owner
   - User mất quyền edit/delete surveys của chính mình
   - Response data trong surveys vẫn giữ nguyên

2. **Automatic Role Downgrade**
   - Logic: `if (ownedWorkspacesCount === 0 && user.role === 'creator')`
   - Chỉ áp dụng khi user không còn own bất kỳ workspace nào
   - Role `creator` ràng buộc với việc sở hữu workspace

3. **Socket.IO Real-time Update**
   - Event: `workspace:member_removed`
   - Frontend PHẢI lắng nghe để redirect user
   - Nếu không có Socket.IO → user vẫn thấy workspace page (stale state)

### 🟢 Good Practices

- ✅ **Asset Retention**: Không mất dữ liệu survey
- ✅ **Atomic Operations**: Cleanup xong mới xóa member
- ✅ **Audit Trail**: Activity logs cho transparency
- ✅ **Graceful Degradation**: Socket.IO fail không crash API

### 🟡 Edge Cases

- Owner không thể leave → Phải transfer ownership trước
- User có thể bị remove nhiều lần (nếu được invite lại)
- Invitations cũ vẫn valid sau khi user leave/removed

---

## Frontend Integration Requirements

Frontend cần xử lý Socket.IO event:

```javascript
// Trong AuthContext hoặc WorkspaceContext
socket.on('workspace:member_removed', (data) => {
  const { workspace_id, message } = data;
  
  // 1. Show notification
  toast.info(message);
  
  // 2. Redirect nếu đang ở workspace page
  if (currentWorkspaceId === workspace_id) {
    navigate('/workspaces');
  }
  
  // 3. Refetch user context (role có thể đã thay đổi)
  refetchUserData();
});
```

---

## Tóm Tắt Hậu Quả

| **Đối Tượng** | **Hậu Quả** |
|---------------|-------------|
| **Workspace** | Giữ nguyên surveys, chuyển ownership về Owner |
| **User** | Mất access, có thể bị downgrade role |
| **Surveys** | Ownership chuyển về Owner, data giữ nguyên |
| **Responses** | Không bị ảnh hưởng |
| **Frontend** | Nhận event → redirect + refetch context |
| **Database** | Xóa `workspace_members`, update `surveys.created_by` |

---

**Tài liệu tham khảo code**:
- [workspace.service.js](file:///d:/NCKH/Backend/src/modules/workspaces/service/workspace.service.js)
- `leaveWorkspace` (Line 523-560)
- `removeMember` (Line 421-459)  
- `_cleanupMemberExit` (Line 1674-1712)
