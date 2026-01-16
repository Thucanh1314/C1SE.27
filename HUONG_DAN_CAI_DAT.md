# HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY DỰ ÁN (LLM SURVEY)

Tài liệu này hướng dẫn cách cài đặt môi trường và chạy dự án (Frontend + Backend) trên máy local.

## 1. Yêu cầu hệ thống (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo máy tính đã cài đặt:

*   **Node.js**: Phiên bản 18.x hoặc 20.x (Khuyên dùng bản LTS). Tải tại: [https://nodejs.org/](https://nodejs.org/)
*   **MySQL**: Có thể dùng XAMPP, MySQL Workbench hoặc Docker. Đảm bảo MySQL Service đang chạy ở port 3306.
*   **Git Bash** (trên Windows) hoặc Terminal (Mac/Linux).

## 2. Cấu trúc thư mục

```
/ (Root)
├── Backend/        # Chứa mã nguồn server (Node.js/Express)
├── Frontend/       # Chứa mã nguồn giao diện (React.js)
├── TAI_KHOAN_DEMO.md # Danh sách tài khoản mẫu để test
└── ...
```

---

## 3. Cài đặt Backend

### Bước 3.1: Chuẩn bị cơ sở dữ liệu
1.  Mở công cụ quản lý MySQL (phpMyAdmin, Workbench, HeidiSQL...).
2.  Tạo một database mới tên là `llm_survey_db` (hoặc tên tùy thích, nhớ cập nhật vào file .env).
    ```sql
    CREATE DATABASE llm_survey_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    ```

### Bước 3.2: Cài đặt thư viện và cấu hình
1.  Mở Terminal và di chuyển vào thư mục Backend:
    ```bash
    cd Backend
    ```
2.  Cài đặt các gói phụ thuộc (dependencies):
    ```bash
    npm install
    ```
3.  Tạo file cấu hình môi trường `.env`:
    *   Copy file `.env.example` thành `.env`:
        ```bash
        cp .env.example .env
        ```
    *   Mở file `.env` vừa tạo và chỉnh sửa các thông số kết nối Database nếu cần (Ví dụ password của MySQL):
        ```env
        DB_HOST=localhost
        DB_USER=root
        DB_PASSWORD=YOUR_PASSWORD_HERE  <-- Điền pass MySQL của bạn
        DB_NAME=llm_survey_db
        PORT=5000
        ...
        ```

### Bước 3.3: Khởi tạo dữ liệu (Migration & Seeding)
Chạy các lệnh sau để tạo bảng và dữ liệu mẫu:
1.  **Tạo bảng (Migration)**:
    ```bash
    npm run migrate
    ```
2.  **Đổ dữ liệu mẫu (Seeding)**:
    ```bash
    npm run seed
    ```
    *(Lệnh này sẽ tạo sẵn tài khoản Admin, User và các mẫu khảo sát demo)*

### Bước 3.4: Chạy Server
Tại thư mục `Backend`, chạy lệnh:
```bash
npm start
```
Nếu thành công, bạn sẽ thấy thông báo:
> Server running on port 5000
> Database connection established successfully.

---

## 4. Cài đặt Frontend

### Bước 4.1: Cài đặt thư viện
1.  Mở một Terminal **mới** (giữ nguyên terminal Backend đang chạy).
2.  Di chuyển vào thư mục Frontend:
    ```bash
    cd Frontend
    ```
3.  Cài đặt các gói phụ thuộc:
    ```bash
    npm install
    ```

### Bước 4.2: Cấu hình môi trường
1.  Tạo file `.env`:
    ```bash
    cp .env.example .env
    ```
2.  Đảm bảo file `.env` trỏ đúng về port của Backend (thường là 5000):
    ```env
    REACT_APP_API_URL=http://localhost:5000/api
    ```

### Bước 4.3: Chạy Web App
Tại thư mục `Frontend`, chạy lệnh:
```bash
npm start
```
Trình duyệt sẽ tự động mở địa chỉ: `http://localhost:3000`.

---

## 5. Đăng nhập hệ thống

Sử dụng thông tin trong file `TAI_KHOAN_DEMO.md` hoặc các tài khoản mặc định sau khi seed:

*   **Trang quản trị (Admin/Creator)**: `http://localhost:3000/login`
*   **Tài khoản Admin**:
    *   Email: `admin@example.com`
    *   Password: `password123`

---

## 6. Các lỗi thường gặp

1.  **Lỗi `EADDRINUSE :::5000`**:
    *   Nguyên nhân: Port 5000 đang bị chiếm dụng (do chạy server nhiều lần).
    *   Cách sửa: Tắt terminal cũ hoặc kill process node.

2.  **Lỗi kết nối Database (`ECONNREFUSED` hoặc `ER_ACCESS_DENIED_ERROR`)**:
    *   Kiểm tra lại username/password trong file `Backend/.env`.
    *   Đảm bảo MySQL Service đã được bật (XAMPP Start MySQL).

3.  **Lỗi `npm install` quá lâu hoặc treo**:
    *   Thử xóa folder `node_modules` và chạy lại `npm install`.

Chúc bạn thành công!
