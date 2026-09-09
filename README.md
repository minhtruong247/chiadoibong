# ⚽ Football Team Maker (Chia Đội Bóng Đá Ghép Cặp Tương Đương)

Ứng dụng web chia đội đá banh cho nhóm 10 - 14 người (mặc định 12 người), tự động ghép cặp 2 người có trình độ ngang ngửa nhau rồi chia đều sang 2 bên (Đội Xanh vs Đội Đỏ) nhằm tạo ra trận cầu cân tài cân sức nhất!

---

## 🌟 Tính Năng Nổi Bật

1. **Ghép cặp tương đương (Pair Matching):**
   - Thuật toán sắp xếp trình độ (sao/điểm Elo) và ghép 2 người sàn sàn nhau thành 1 cặp đối kháng (Cặp 1, Cặp 2,...).
   - Mỗi cặp được bốc thăm ngẫu nhiên: 1 người sang **Đội Xanh**, 1 người sang **Đội Đỏ**.
2. **Khóa cặp thủ công (Custom Pair):**
   - Cho phép chỉ định trước các cặp đối đầu (ví dụ: 2 người hay nhất nhóm hoặc 2 thủ môn bắt buộc phải chia ra 2 bên).
3. **Mô phỏng sân bóng cỏ 2D:**
   - Trực quan hóa đội hình 2 đội trên mặt cỏ với vạch kẻ sân bóng sống động.
4. **Thước đo cân bằng (Balance Meter):**
   - Thống kê tổng điểm, độ chênh lệch và đánh giá chất lượng kèo đấu (Kèo cực cân, Kèo lệch,...).
5. **Nút "Copy Gửi Zalo" trong 1 click:**
   - Định dạng văn bản cực đẹp với đầy đủ emoji, danh sách 2 đội và chi tiết ai kèm ai để dán thẳng vào nhóm chat Zalo/Messenger.
6. **Lưu trữ tự động:**
   - Tự động lưu danh sách cầu thủ vào trình duyệt (`localStorage`), không bị mất khi F5.

---

## 🚀 HƯỚNG DẪN ĐƯA LÊN GITHUB PAGES TRONG 2 PHÚT (HOÀN TOÀN MIỄN PHÍ)

### Cách 1: Sử dụng giao diện web GitHub (Đơn giản nhất, không cần cài gì)

1. Đăng nhập vào [GitHub](https://github.com/) và bấm nút **"New"** (hoặc dấu `+` góc phải) để tạo một Repository mới:
   - Đặt tên Repository (ví dụ: `chia-doi-da-banh` hoặc `football-team-maker`).
   - Chọn chế độ **Public**.
   - Bấm nút **Create repository**.

2. Trong trang repository vừa tạo, bấm vào link **"uploading an existing file"**:
   - Kéo thả toàn bộ các file trong thư mục này vào:
     - `index.html`
     - `style.css`
     - `app.js`
     - `README.md`
   - Bấm nút xanh **"Commit changes"** ở dưới cùng.

3. **Bật GitHub Pages để lấy link web:**
   - Vào tab **Settings** của repository (bên phải tab Pull requests).
   - Ở thanh menu bên trái, cuộn xuống chọn mục **Pages**.
   - Tại phần **Build and deployment** -> **Branch**:
     - Chọn nhánh: **main** (hoặc master).
     - Chọn thư mục: **/ (root)**.
     - Bấm nút **Save**.
   - Đợi khoảng 30 - 60 giây, tải lại trang sẽ thấy một dòng thông báo xanh lá:
     > *"Your site is live at https://&lt;username&gt;.github.io/&lt;repo-name&gt;/"*
   - Bạn chỉ cần bấm vào link đó là trang web đã online trên toàn cầu, lưu bookmark lại trên điện thoại để mang ra sân bấm chia đội!

---

### Cách 2: Đẩy lên bằng lệnh Git (Nếu máy tính đã cài Git)

Mở terminal tại thư mục này và chạy các lệnh:

```bash
git init
git add .
git commit -m "feat: Football team pair matcher web app"
git branch -M main
git remote add origin https://github.com/<tai-khoan-cua-ban>/<ten-repo>.git
git push -u origin main
```

Sau đó vào **Settings -> Pages** trên GitHub và bật Pages từ nhánh `main` như hướng dẫn ở Cách 1.

---

## 🛠 Cấu Trúc Mã Nguồn

```text
football-team-maker/
│
├── index.html       # Giao diện chính (semantic HTML5, chuẩn SEO)
├── style.css        # Thiết kế đồ họa sân bóng, dark theme & glassmorphism
├── app.js           # Thuật toán ghép cặp tương đương & logic điều khiển
└── README.md        # Hướng dẫn chi tiết triển khai
```
