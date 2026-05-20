# Deploy cong khai (nguoi dung quet QR bat ky dau)

Huong dan deploy **Backend: Render** + **Frontend: Vercel** (mien phi).

## Buoc 0: Day code len GitHub

```bash
git init
git add .
git commit -m "Prepare production deploy"
git branch -M main
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

## Buoc 1: Deploy Backend (Render)

1. Vao https://dashboard.render.com -> **New +** -> **Blueprint** (hoac Web Service).
2. Ket noi repo GitHub, chon repo nay.
3. Neu dung `render.yaml`: Render tu tao service `pharma-trace-api`.
4. Trong **Environment** cua service, them cac bien (copy tu `backend/.env` local):

| Bien | Vi du |
|------|-------|
| `FIREBASE_PROJECT_ID` | `txngdp-81566` |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-...` |
| `FIREBASE_PRIVATE_KEY` | `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` |
| `RPC_URL` | Sepolia RPC URL |
| `WALLET_PRIVATE_KEY` | private key backend signer |
| `CONTRACT_ADDRESS` | dia chi contract da deploy |
| `CONTRACT_ABI_FILE` | `abi/PharmaTrace.json` |
| `FRONTEND_VERIFY_BASE` | tam: `https://TEN-VERCEL.vercel.app/verify` (sua sau buoc 2) |
| `CORS_ORIGIN` | `https://TEN-VERCEL.vercel.app` (sua sau buoc 2) |

5. Deploy xong, lay URL API, vi du: `https://pharma-trace-api.onrender.com`

Kiem tra: mo `https://<api-url>/api/health` -> `{"ok":true,...}`

## Buoc 2: Deploy Frontend (Vercel)

1. Vao https://vercel.com -> **Add New Project** -> import repo GitHub.
2. **Root Directory**: chon `frontend`
3. **Environment Variables** (Production):

| Bien | Gia tri |
|------|---------|
| `VITE_API_BASE` | `https://pharma-trace-api.onrender.com/api` |
| `VITE_VERIFY_BASE` | `https://<ten-ban>.vercel.app/verify` |

4. Deploy.

Sau deploy, lay URL frontend, vi du: `https://truy-xuat-duoc-pham.vercel.app`

## Buoc 3: Cap nhat lai Backend

Quay lai Render -> Environment:

- `FRONTEND_VERIFY_BASE` = `https://truy-xuat-duoc-pham.vercel.app/verify`
- `CORS_ORIGIN` = `https://truy-xuat-duoc-pham.vercel.app`

**Redeploy** backend (Manual Deploy).

## Buoc 4: Tao thuoc moi de co QR public

1. Mo frontend Vercel tren may tinh.
2. Tao thuoc moi o trang **San xuat thuoc**.
3. QR se chua link `https://...vercel.app/verify/<ma-thuoc>`.
4. Quet bang dien thoai (4G/Wi-Fi bat ky) -> hien thong tin ngay.

## Luu y

- Render free tier co the **ngu** sau ~15 phut khong dung; lan quet dau co the cho 30-60 giay.
- QR cu (localhost/LAN) phai tao lai sau khi deploy.
- Khong commit file `.env` len GitHub.

## Deploy bang CLI (tuy chon)

```bash
# Frontend
cd frontend
npm i -g vercel
vercel login
vercel --prod

# Backend: uu tien ket noi GitHub + render.yaml tren dashboard
```
