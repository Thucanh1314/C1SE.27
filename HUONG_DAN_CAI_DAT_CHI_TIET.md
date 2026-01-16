# HƯỚNG DẪN CÀI ĐẶT DỰ ÁN (CHI TIẾT)

Tài liệu này hướng dẫn chi tiết cách cài đặt và chạy dự án trên máy tính cá nhân (Localhost).

## 1. Yêu cầu hệ thống (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt các phần mềm sau:

*   **Node.js**: Phiên bản 18.x hoặc mới hơn. [Tải tại đây](https://nodejs.org/)
*   **MySQL**: Phiên bản 8.0 trở lên. (Hoặc có thể sử dụng Docker để chạy MySQL).
*   **Git**: Để quản lý mã nguồn.
*   **Trình duyệt web**: Chrome, Firefox, Edge...

## 2. Cấu trúc dự án

Sau khi giải nén, bạn sẽ thấy cấu trúc thư mục như sau:

*   `Backend/`: Chứa mã nguồn phía Server (API, Database logic).
*   `Frontend/`: Chứa mã nguồn phía Client (Giao diện người dùng).
*   `Docker/`: Chứa cấu hình để chạy Database bằng Docker (tùy chọn).
*   `TAI_KHOAN_DEMO.md`: Thông tin tài khoản để đăng nhập thử nghiệm.

---

## 3. Cài đặt Backend (Server)

### Bước 1: Cài đặt thư viện
Mở Terminal (hoặc Command Prompt/PowerShell) và chạy các lệnh sau:

```bash
cd Backend
npm install
```

### Bước 2: Cấu hình môi trường (.env)
1.  Trong thư mục `Backend`, tìm file `.env.example`.
2.  Copy file này và đổi tên thành `.env`.
3.  Mở file `.env` bằng Text Editor (Notepad, VS Code...) và chỉnh sửa các thông tin kết nối Database:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root          # Tên đăng nhập MySQL của bạn
DB_PASSWORD=          # Mật khẩu MySQL của bạn
DB_NAME=allmtags_survey_db  # Tên Database muốn tạo
```

### Bước 3: Khởi tạo Database
Bạn cần tạo Database trong MySQL trước khi chạy ứng dụng.
1.  Mở công cụ quản lý MySQL (như MySQL Workbench, phpMyAdmin, DBeaver...).
2.  Tạo một database mới với tên giống trong file `.env` (ví dụ: `allmtags_survey_db`).
    ```sql
    CREATE DATABASE allmtags_survey_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    ```

### Bước 4: Chạy Migration và Seed dữ liệu
Quay lại Terminal (đang ở thư mục `Backend`), chạy lệnh sau để tạo bảng và dữ liệu mẫu:

```bash
# Tạo các bảng trong database
npm run migrate

# Thêm dữ liệu mẫu (Admin, User test...)
npm run seed
```

### Bước 5: Khởi động Server
```bash
npm run dev
```
Nếu thấy thông báo "Server running on port 5000" và "Database connected" là thành công.

---

## 4. Cài đặt Frontend (Giao diện)

Mở một cửa sổ Terminal **mới** (giữ nguyên Terminal đang chạy Backend).

### Bước 1: Cài đặt thư viện
```bash
cd Frontend
npm install
```

### Bước 2: Cấu hình môi trường (.env)
1.  Trong thư mục `Frontend`, tìm file `.env.example`.
2.  Copy file này và đổi tên thành `.env`.
3.  Đảm bảo `REACT_APP_API_URL` trỏ đúng đến địa chỉ Backend:
    ```env
    REACT_APP_API_URL=http://localhost:5000/api/modules
    ```

### Bước 3: Khởi động Frontend
```bash
npm start
```
Trình duyệt sẽ tự động mở địa chỉ `http://localhost:3000`.

---

## 5. Sử dụng Docker (Tùy chọn cho Database)

Nếu bạn không muốn cài đặt MySQL trực tiếp trên máy, bạn có thể dùng Docker.

1.  Cài đặt Docker Desktop.
2.  Mở Terminal, đi vào thư mục `Docker`:
    ```bash
    cd Docker
    docker-compose up -d
    ```
3.  Lúc này MySQL sẽ chạy ở cổng **3307** (theo cấu hình mặc định trong file docker-compose).
4.  Cập nhật lại file `Backend/.env`:
    ```env
    DB_PORT=3307
    DB_USER=llm_survey_user
    DB_PASSWORD=password123
    DB_NAME=llm_survey_db
    ```

---

## 6. Đăng nhập

Sau khi cài đặt xong, bạn có thể đăng nhập bằng các tài khoản mẫu.
Vui lòng xem file **`TAI_KHOAN_DEMO.md`** để lấy thông tin đăng nhập (Admin, Giảng viên, Sinh viên).

## 7. Khắc phục lỗi thường gặp

*   **Lỗi kết nối Database**: Kiểm tra kỹ `DB_USER`, `DB_PASSWORD` trong file `.env` xem đã đúng với MySQL trên máy bạn chưa. Đảm bảo MySQL Service đang chạy.
*   **Lỗi `npm install`**: Hãy thử xóa thư mục `node_modules` và file `package-lock.json` rồi chạy lại `npm install`.
*   **Lỗi Port in use**: Đảm bảo không có ứng dụng nào khác đang chạy chiếm dụng port 3000 hoặc 5000.
