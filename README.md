<h2 align="center">
    <a href="https://dainam.edu.vn/vi/khoa-cong-nghe-thong-tin">
    🎓 Faculty of Information Technology (DaiNam University)
    </a>
</h2>

<h2 align="center">  
   HỆ THỐNG TRUY XUẤT NGUỒN GỐC DƯỢC PHẨM VÀ THUỐC ĐẶC TRỊ
</h2>

<div align="center">
    <p align="center">
        <img src="https://github.com/tiennq004/cds_nha_tro-sinh_vien_ai/blob/main/img/aiotlab_logo.png" alt="AIoTLab Logo" width="170"/>
        <img src="https://github.com/tiennq004/cds_nha_tro-sinh_vien_ai/blob/main/img/fitdnu_logo.png" alt="FIT DNU Logo" width="180"/>
        <img src="https://github.com/tiennq004/cds_nha_tro-sinh_vien_ai/blob/main/img/dnu_logo.png" alt="DaiNam University Logo" width="200"/>
    </p>

[![AIoTLab](https://img.shields.io/badge/AIoTLab-green?style=for-the-badge)](https://www.facebook.com/DNUAIoTLab)
[![Faculty of Information Technology](https://img.shields.io/badge/Faculty%20of%20Information%20Technology-blue?style=for-the-badge)](https://dainam.edu.vn/vi/khoa-cong-nghe-thong-tin)
[![DaiNam University](https://img.shields.io/badge/DaiNam%20University-orange?style=for-the-badge)](https://dainam.edu.vn)
</div>

---

## 1. Mục tiêu của hệ thống

* Xây dựng hệ thống truy xuất nguồn gốc dược phẩm minh bạch và đáng tin cậy.
* Quản lý thông tin nguyên liệu, thuốc thành phẩm và quá trình phân phối.
* Ứng dụng Blockchain để đảm bảo dữ liệu không thể bị chỉnh sửa hoặc giả mạo.
* Hỗ trợ người dùng xác minh nguồn gốc thuốc thông qua mã QR.

### ⚙️ Thành phần hệ thống

🔹 1. Quản lý nguyên liệu

* Đăng ký thông tin nguyên liệu đầu vào.
* Lưu thông tin nhà cung cấp, số lô và ngày nhập kho.
* Tạo mã định danh cho từng nguyên liệu.

🔹 2. Quản lý thuốc thành phẩm

* Đăng ký thông tin thuốc sản xuất.
* Liên kết thuốc với nguyên liệu sử dụng.
* Sinh mã QR cho từng sản phẩm.

🔹 3. Blockchain & Smart Contract

* Ghi nhận dữ liệu hash SHA-256 lên Blockchain.
* Lưu lịch sử thay đổi và chuyển giao sản phẩm.
* Đảm bảo tính toàn vẹn dữ liệu.

🔹 4. Truy xuất nguồn gốc

* Quét mã QR để xem thông tin thuốc.
* Kiểm tra lịch sử sản xuất và phân phối.
* Xác minh dữ liệu với Blockchain.

💡 Điểm nổi bật

* Minh bạch toàn bộ chuỗi cung ứng dược phẩm.
* Chống giả mạo dữ liệu bằng Blockchain.
* Truy xuất nguồn gốc nhanh chóng bằng QR Code.
* Dễ dàng mở rộng cho nhiều loại dược phẩm khác nhau.

---

## ⚙️ 2. Công nghệ và công cụ sử dụng

```text
Nguyên liệu
      ↓
Đăng ký dữ liệu
      ↓
SHA-256 Hash
      ↓
Blockchain
      ↓
QR Code
      ↓
Người dùng truy xuất
```

### 🖥️ Công nghệ chính

* ReactJS: Xây dựng giao diện người dùng.
* NodeJS + ExpressJS: Xử lý nghiệp vụ hệ thống.
* Firebase: Lưu trữ dữ liệu.
* Solidity: Xây dựng Smart Contract.
* Hardhat: Triển khai và kiểm thử Blockchain.
* MetaMask: Kết nối ví Blockchain.
* SHA-256: Mã hóa và xác minh dữ liệu.
* QR Code: Truy xuất nguồn gốc sản phẩm.

### 🛠️ Công cụ phát triển

* Visual Studio Code.
* NodeJS.
* GitHub.
* Firebase Console.
* MetaMask.

---

## 🧩 3. Hình ảnh các chức năng

<p align="center">
  <img src="https://github.com/tiennq004/truy_xuat_nguon_goc/blob/main/img/so_do_kien_truc_he_thong.png" alt="Ảnh 1" width="800"/>
</p> 
<p align="center">
  <em>Hình 1: Sơ đồ kiến trúc hệ thống  </em>
</p>

<p align="center">
  <img src="https://github.com/tiennq004/truy_xuat_nguon_goc/blob/main/img/giao_dien_chinh.png" alt="Ảnh 2" width="800"/>
</p> 
<p align="center">
  <em>Hình 2: Giao diện chính của hệ thống  </em>
</p>

<p align="center">
  <img src="https://github.com/tiennq004/truy_xuat_nguon_goc/blob/main/img/giao_dien_dang_ky_nguyen_lieu.png" alt="Ảnh 3" width="800"/>
</p> 
<p align="center">
  <em>Hình 3: Giao diện đăng ký nguyên liệu  </em>
</p>

<p align="center">
  <img src="https://github.com/tiennq004/truy_xuat_nguon_goc/blob/main/img/giao_dien_dang_ky_san_xuat_thuoc.png" alt="Ảnh 4" width="800"/>
</p> 
<p align="center">
  <em>Hình 4: Giao diện đăng ký sản xuất thuốc  </em>
</p>

<p align="center">
  <img src="https://github.com/tiennq004/truy_xuat_nguon_goc/blob/main/img/giao_dien_phan_phoi_thuoc.png" alt="Ảnh 5" width="800"/>
</p> 
<p align="center">
  <em>Hình 5: Giao diện phân phối thuốc  </em>
</p>

<p align="center">
  <img src="https://github.com/tiennq004/truy_xuat_nguon_goc/blob/main/img/giao_dien_kho_qr.png" alt="Ảnh 6" width="800"/>
</p> 
<p align="center">
  <em>Hình 6: Giao diện Kho QR  </em>
</p>

<p align="center">
  <img src="https://github.com/tiennq004/truy_xuat_nguon_goc/blob/main/img/giao_dien_nguoi_ban.png" alt="Ảnh 7" width="800"/>
</p> 
<p align="center">
  <em>Hình 7: Giao diện Người bán  </em>
</p>

<p align="center">
  <img src="https://github.com/tiennq004/truy_xuat_nguon_goc/blob/main/img/giao_dien_thong_tin_thuoc_khi_quet_ma_qr.png" alt="Ảnh 8" width="800"/>
</p> 
<p align="center">
  <em>Hình 7: Giao diện thông tin thuốc khi quét mã QR  </em>
</p>

<p align="center">
  <img src="https://github.com/tiennq004/truy_xuat_nguon_goc/blob/main/img/poster.png" alt="Ảnh 1" width="800"/>
</p> 
<p align="center">
  <em>Hình 8: Poster  </em>
</p>
---

## ⚙️ 4. Các bước cài đặt

### Bước 1. Clone dự án

```bash
git clone https://github.com/tiennq004/truy_xuat_nguon_goc.git
```

### Bước 2. Cài đặt thư viện

```bash
npm install
```

### Bước 3. Cấu hình môi trường

Tạo file .env và cấu hình:

```env
FIREBASE_API_KEY=your_key
FIREBASE_PROJECT_ID=your_project
PRIVATE_KEY=your_private_key
```

### Bước 4. Chạy Frontend

```bash
npm run dev
```

### Bước 5. Chạy Smart Contract

```bash
npx hardhat node
npx hardhat run scripts/deploy.js
```

### Bước 6. Kết nối MetaMask

* Import ví.
* Kết nối mạng Blockchain.
* Xác nhận giao dịch.

---

## 👥 5. Thực hiện

* Nguyễn Quang Tiến

* Lớp: CNTT 16-03

* Khoa: Công nghệ thông tin

* Trường: Đại học Đại Nam

**Giảng viên hướng dẫn:** ThS. Trần Đăng Công

© 2026 – Khoa Công Nghệ Thông Tin, Trường Đại học Đại Nam.
