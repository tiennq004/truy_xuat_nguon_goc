# He thong truy xuat nguon goc duoc pham (Blockchain)

Du an gom 3 phan:
- `frontend`: React dashboard + verify QR
- `backend`: Node.js/Express API, hash SHA-256, QR generation
- `blockchain`: Hardhat + Solidity smart contract

## 1) Chay nhanh (demo mode - khong can Firebase/Blockchain that)

### Backend
```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

### Frontend
```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Mo: `http://localhost:5173`

Trong demo mode:
- du lieu full luu trong bo nho backend
- hash "blockchain" duoc mo phong trong bo nho

## 2) Chay voi blockchain local Ganache/Hardhat node

### Compile contract
```bash
cd blockchain
npm install
npm run compile
```

### Chay local chain
```bash
cd blockchain
npm run node
```

Mo terminal moi, deploy:
```bash
cd blockchain
npm run deploy:local
```

Sau khi deploy:
1. Lay `CONTRACT_ADDRESS` tu output deploy.
2. Lay ABI trong:
   `blockchain/artifacts/contracts/PharmaTrace.sol/PharmaTrace.json`
3. Cap nhat `backend/.env`:
   - `RPC_URL=http://127.0.0.1:8545`
   - `WALLET_PRIVATE_KEY=<private key account deployer>`
   - `CONTRACT_ADDRESS=<dia chi contract>`
   - `CONTRACT_ABI_FILE=../blockchain/artifacts/contracts/PharmaTrace.sol/PharmaTrace.json`

Restart backend de bat che do Ethereum that.

## 3) Chay voi vi Sepolia co san (MetaMask)

### Deploy contract len Sepolia
1. Tao `blockchain/.env` tu file mau:
```bash
cd blockchain
copy .env.example .env
```
2. Dien bien trong `blockchain/.env`:
   - `DEPLOY_RPC_URL=<sepolia rpc url>`
   - `DEPLOY_PRIVATE_KEY=<private key cua vi MetaMask>`
3. Deploy:
```bash
npm run compile
npm run deploy:sepolia
```

### Cap nhat backend theo Sepolia
Cap nhat `backend/.env`:
- `RPC_URL=<sepolia rpc url>`
- `WALLET_PRIVATE_KEY=<private key hop le bat ky de doc chain>`
- `CONTRACT_ADDRESS=<dia chi contract vua deploy>`
- `CONTRACT_ABI_FILE=../blockchain/artifacts/contracts/PharmaTrace.sol/PharmaTrace.json`

Sau do restart backend va frontend.
Trong UI bam `Connect MetaMask` de ky giao dich on-chain truc tiep bang vi cua ban.

## 4) API chinh

- `POST /api/materials`
  - Dang ky nguyen lieu + hash + ghi chain
- `POST /api/drugs`
  - Tao serial thuoc + hash + QR + ghi chain
- `POST /api/drugs/:serial/transfer`
  - Chuyen giao thuoc va cap nhat owner/status
- `GET /api/verify/:serial`
  - Verify hash Firestore/du lieu voi blockchain

## 5) Firebase

Neu muon bat Firebase that, dien cac bien sau trong `backend/.env`:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Khi du bien, backend se tu dong chuyen tu memory mode sang Firebase mode.

## 6) Quet QR bang dien thoai (demo trong mang LAN)

Chi dung cho demo/lab: may tinh + dien thoai **cung Wi-Fi**.

Neu QR chua `localhost`, dien thoai se khong mo duoc trang xac minh.

1. Lay IP LAN cua may tinh (vi du `192.168.1.50`).
2. Chay frontend/backend, mo app bang IP:
   - Frontend: `http://192.168.1.50:5173`
   - Backend: `http://192.168.1.50:4000`
3. Cap nhat `backend/.env`:
   - `FRONTEND_VERIFY_BASE=http://192.168.1.50:5173/verify`
4. Tao lai thuoc de sinh QR moi (QR cu van tro ve localhost).
5. Quet QR: trang `/verify/<ma-thuoc>` se tu dong hien thong tin thuoc.

## 7) Nguoi dung cuoi (quet QR o bat ky dau) — can deploy cong khai

Nguoi mua thuoc **khong the** cung Wi-Fi voi may ban. QR phai tro toi **link internet cong khai** (uu tien HTTPS).

### Kien truc khuyen nghi

| Thanh phan | Vi tri | Vi du |
|------------|--------|-------|
| Frontend (Vite) | Vercel / Netlify / Firebase Hosting | `https://tracuuthuoc.vercel.app` |
| Backend API | Render / Railway / VPS | `https://api-tracuuthuoc.onrender.com` |
| Du lieu | Firebase (da co) | Firestore |
| Hash | Blockchain (Sepolia/mainnet) | Contract da deploy |

### Bien moi truong production

**Backend** (`backend/.env` tren server):
```env
FRONTEND_VERIFY_BASE=https://tracuuthuoc.vercel.app/verify
PORT=4000
# Firebase + RPC + CONTRACT_ADDRESS nhu hien tai
```

**Frontend** (build production):
```env
VITE_API_BASE=https://api-tracuuthuoc.onrender.com/api
VITE_VERIFY_BASE=https://tracuuthuoc.vercel.app/verify
```

Build va deploy frontend:
```bash
cd frontend
npm run build
# upload thu muc dist len hosting
```

### Luong nguoi dung cuoi

1. Nha san xuat tao thuoc tren web da deploy.
2. QR chua: `https://domain.com/verify/MA_THUOC`
3. Khach quet bang camera dien thoai (4G/5G/Wi-Fi bat ky) -> mo trang -> tu dong hien thong tin.

### Demo nhanh khong deploy (chi test ngoai LAN)

Dung **ngrok** (hoac Cloudflare Tunnel) de mo backend + frontend ra internet tam thoi, roi dat `FRONTEND_VERIFY_BASE` bang URL ngrok.
