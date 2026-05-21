import { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { ethers } from "ethers";
import {
  createDrug,
  checkDrugSerials,
  createDrugOffchain,
  createMaterial,
  createMaterialOffchain,
  getChainConfig,
  healthCheck,
  listMaterials,
  listDrugs,
  transferDrug,
  transferDrugBulk,
  transferDrugOffchain,
  sellDrugBoxOffchain,
  verifyDrug,
} from "./api";
import { buildVerifyUrl, canPhoneScanQr, getApiBase, getVerifyBase } from "./utils/url";
import { buildLotSerial, groupDrugsByLot, lotHashInput } from "./utils/lot";
import { groupDrugsByProduct, normalizeQuantity } from "./utils/serials";
import {
  SUPPLY_CHAIN_STEPS,
  getReachedStepIndex,
  getSaleStatus,
  getStatusLabel,
  normalizeStatus,
} from "./utils/status";

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function fileToDataUrl(file) {
  if (!file) return "";
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Không thể đọc tệp ảnh."));
    reader.readAsDataURL(file);
  });
}

function Footer() {
  const footerLinks = [
    { to: "/nguyen-lieu", icon: "🧪", label: "Nguyên liệu" },
    { to: "/san-xuat", icon: "💊", label: "Sản xuất" },
    { to: "/phan-phoi", icon: "🚚", label: "Phân phối" },
    { to: "/kho-qr", icon: "📱", label: "Kho QR" },
    { to: "/nguoi-ban", icon: "🛒", label: "Người bán" },
  ];

  return (
    <footer className="lc-footer">
      <div className="lc-footer-glow" aria-hidden="true" />
      <div className="lc-footer-inner">
        <div className="lc-footer-brand">
          <span className="lc-footer-logo">+</span>
          <div>
            <b>Truy xuất dược phẩm</b>
            <p>Chuỗi cung ứng minh bạch · Blockchain Sepolia · QR truy xuất</p>
            <div className="lc-footer-badges">
              <span>⛓️ On-chain</span>
              <span>🔎 Tra cứu QR</span>
              <span>📦 Theo lô</span>
            </div>
          </div>
        </div>
        <nav className="lc-footer-nav" aria-label="Điều hướng chân trang">
          {footerLinks.map((item) => (
            <Link key={item.to} to={item.to} className="lc-footer-nav-item">
              <span className="lc-footer-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="lc-footer-bottom">
        <p className="lc-footer-copy">© {new Date().getFullYear()} Hệ thống truy xuất nguồn gốc dược phẩm</p>
        <Link to="/" className="lc-footer-home">
          Về trang chủ →
        </Link>
      </div>
    </footer>
  );
}

function Header({ connectWallet, loadHealth, wallet, health, message, loading, darkMode, toggleDarkMode }) {
  const navigate = useNavigate();
  const [searchSerial, setSearchSerial] = useState("");

  function onSearch(e) {
    e.preventDefault();
    const serial = searchSerial.trim();
    if (serial) navigate(`/verify/${encodeURIComponent(serial)}`);
  }

  return (
    <header className="lc-header">
      <div className="lc-topbar">
        <span>⛓️ Truy xuất nguồn gốc thuốc — Blockchain Sepolia</span>
        <span className="lc-topbar-right">
          {health ? `Lưu trữ: ${health.storageMode} · Chain: ${health.chainMode}` : "Đang kết nối hệ thống..."}
        </span>
      </div>
      <div className="lc-mainbar">
        <Link to="/" className="lc-brand">
          <span className="lc-logo">+</span>
          <div>
            <b>Truy xuất</b>
            <small>Dược phẩm</small>
          </div>
        </Link>
        <form className="lc-search" onSubmit={onSearch}>
          <span className="lc-search-icon">🔍</span>
          <input
            value={searchSerial}
            onChange={(e) => setSearchSerial(e.target.value)}
            placeholder="Nhập mã thuốc / serial để xác minh..."
          />
          <button type="submit" className="lc-search-btn">
            Tra cứu
          </button>
        </form>
        <div className="lc-actions">
          <button type="button" className="lc-action-btn" onClick={connectWallet} disabled={loading}>
            <span>👤</span>
            {wallet.connected ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : "MetaMask"}
          </button>
          <button type="button" className="lc-action-btn" onClick={loadHealth}>
            <span>⚙️</span>
            Hệ thống
          </button>
          <button type="button" className="lc-action-btn lc-cart" onClick={toggleDarkMode} title="Đổi giao diện">
            <span>{darkMode ? "☀️" : "🌙"}</span>
          </button>
        </div>
      </div>
      <nav className="lc-nav">
        <NavLink to="/" end>Trang chủ</NavLink>
        <NavLink to="/nguyen-lieu">Nguyên liệu</NavLink>
        <NavLink to="/san-xuat">Sản xuất thuốc</NavLink>
        <NavLink to="/phan-phoi">Phân phối</NavLink>
        <NavLink to="/kho-qr">Kho QR</NavLink>
        <NavLink to="/nguoi-ban">Người bán</NavLink>
      </nav>
      <div className="lc-header-meta">
        {message && <div className="lc-alert">{message}</div>}
        <p className="lc-mode-hint muted">
          {wallet.connected ? "Chế độ: Ký giao dịch bằng MetaMask" : "Chế độ: Ký giao dịch bằng backend"}
        </p>
      </div>
    </header>
  );
}

function HomePage() {
  const [productGroups, setProductGroups] = useState([]);
  const [totalBoxes, setTotalBoxes] = useState(0);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    listDrugs()
      .then((res) => {
        if (!active) return;
        const groups = groupDrugsByProduct(res.items || []);
        setProductGroups(groups.slice(0, 8));
        setTotalBoxes((res.items || []).length);
        setLoadError("");
      })
      .catch((err) => {
        if (!active) return;
        setProductGroups([]);
        setTotalBoxes(0);
        setLoadError(err.response?.data?.error || err.message || "Không tải được danh sách thuốc.");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="home-shell">
      <section className="lc-hero-row">
        <div className="lc-hero-banner">
          <span className="lc-hero-tag">Chuỗi cung ứng minh bạch</span>
          <h2>Theo dõi sản xuất, phân phối và xác minh thuốc theo thời gian thực</h2>
          <p>Quản lý nguyên liệu, lô thuốc, QR truy xuất và xác thực blockchain — một nền tảng thống nhất.</p>
          <div className="lc-hero-stats">
            <article>
              <b>{productGroups.length}</b>
              <span>Loại thuốc</span>
            </article>
            <article>
              <b>{totalBoxes}</b>
              <span>Hộp / mã QR</span>
            </article>
            <article>
              <b>5</b>
              <span>Bước truy xuất</span>
            </article>
          </div>
        </div>
        <div className="lc-quick-actions">
          <Link to="/san-xuat" className="lc-quick-card">
            <span className="lc-quick-icon">💊</span>
            <div>
              <b>Tạo thuốc & QR</b>
              <p>Đăng ký lô sản xuất mới</p>
            </div>
          </Link>
          <Link to="/phan-phoi" className="lc-quick-card">
            <span className="lc-quick-icon">🚚</span>
            <div>
              <b>Cập nhật phân phối</b>
              <p>Trạng thái chuỗi cung ứng</p>
            </div>
          </Link>
        </div>
      </section>

      <section className="lc-section">
        <div className="lc-section-head">
          <h2 className="lc-tab-title">Sản phẩm đã đăng ký</h2>
          <Link to="/kho-qr" className="lc-see-all">Xem kho QR →</Link>
        </div>
        {loadError && <p className="bad">Không kết nối API ({getApiBase()}): {loadError}</p>}
        {productGroups.length === 0 ? (
          <div className="empty-products">
            <p>Chưa có sản phẩm nào để hiển thị.</p>
            <p className="muted">Vào <Link to="/san-xuat">Sản xuất thuốc</Link> để tạo mã và QR mới.</p>
          </div>
        ) : (
          <div className="lc-product-grid">
            {productGroups.map((group) => (
              <article className="lc-product-card" key={group.drugId}>
                <div className="lc-product-img-wrap">
                  {group.drugImageUrl ? (
                    <img src={group.drugImageUrl} alt={group.drugName || group.drugId} />
                  ) : (
                    <div className="product-image-placeholder">💊</div>
                  )}
                </div>
                <h3>{group.drugName || group.drugId}</h3>
                <p className="lc-product-price">{group.total || group.boxes.length} hộp · {group.soldCount || 0} đã bán</p>
                <Link to="/kho-qr" className="lc-product-link">
                  Xem QR từng hộp →
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="lc-health-block">
        <div className="lc-health-text">
          <h2>Kiểm tra nguồn gốc thuốc</h2>
          <p>Quét mã QR trên bao bì để xem lịch sử phân phối, nguyên liệu và xác thực blockchain.</p>
        </div>
        <div className="lc-health-cards">
          <Link to="/nguyen-lieu" className="lc-health-item">
            <span>🧪</span>
            <b>Nguyên liệu</b>
            <small>Đăng ký & quản lý</small>
          </Link>
          <Link to="/kho-qr" className="lc-health-item">
            <span>📱</span>
            <b>Kho QR</b>
            <small>In & quét mã</small>
          </Link>
        </div>
      </section>

      <section className="lc-process-row card">
        <h2>Quy trình truy xuất</h2>
        <div className="diagram-flow">
          <div className="diagram-step">🧪 Nguyên liệu</div>
          <span>➜</span>
          <div className="diagram-step">💊 Sản xuất</div>
          <span>➜</span>
          <div className="diagram-step">🚚 Phân phối</div>
          <span>➜</span>
          <div className="diagram-step">🛒 Bán hàng</div>
        </div>
      </section>
    </div>
  );
}

function MaterialPage({ submitMaterial }) {
  const [material, setMaterial] = useState({
    materialId: "",
    name: "",
    origin: "",
    certificate: "",
    expiry: "",
    supplier: "",
    materialImageUrl: "",
  });

  async function onSubmit(e) {
    e.preventDefault();
    await submitMaterial(material);
  }

  return (
    <form onSubmit={onSubmit} className="card form-card page-panel">
      <h2><span className="section-icon">🧪</span>Nguyên liệu</h2>
      <input value={material.materialId} onChange={(e) => setMaterial({ ...material, materialId: e.target.value })} placeholder="Mã nguyên liệu" />
      <input value={material.name} onChange={(e) => setMaterial({ ...material, name: e.target.value })} placeholder="Tên nguyên liệu" />
      <input value={material.origin} onChange={(e) => setMaterial({ ...material, origin: e.target.value })} placeholder="Xuất xứ" />
      <input value={material.certificate} onChange={(e) => setMaterial({ ...material, certificate: e.target.value })} placeholder="Chứng nhận" />
      <input value={material.expiry} onChange={(e) => setMaterial({ ...material, expiry: e.target.value })} placeholder="Hạn sử dụng" />
      <input type="file" accept="image/*" onChange={async (e) => setMaterial({ ...material, materialImageUrl: await fileToDataUrl(e.target.files?.[0]) })} />
      {material.materialImageUrl && <img className="preview" src={material.materialImageUrl} alt="Nguyên liệu" />}
      <button className="btn-primary" type="submit">Đăng ký nguyên liệu</button>
    </form>
  );
}

function DrugPage({ submitDrug, phoneScanReady }) {
  const [materialOptions, setMaterialOptions] = useState([]);
  const [materialsLoadError, setMaterialsLoadError] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [drug, setDrug] = useState({
    drugId: "",
    drugName: "",
    batch: "",
    materialsUsed: [],
    expiry: "",
    manufacturer: "",
    drugImageUrl: "",
    quantity: 1,
  });

  useEffect(() => {
    let active = true;
    setMaterialsLoadError("");
    listMaterials()
      .then((res) => {
        if (!active) return;
        setMaterialOptions(res.items || []);
        if ((res.items || []).length === 0) {
          setMaterialsLoadError("Chưa có nguyên liệu nào. Hãy vào trang Nguyên liệu để đăng ký trước.");
        }
      })
      .catch((error) => {
        if (!active) return;
        setMaterialOptions([]);
        const message = error.response?.data?.error || error.message || "Không thể tải danh sách nguyên liệu.";
        setMaterialsLoadError(
          message.includes("Network Error") || message.includes("ECONNREFUSED")
            ? "Không kết nối được backend (http://localhost:4000). Hãy chạy: cd backend && npm run dev"
            : `Lỗi tải nguyên liệu: ${message}`
        );
      });
    return () => {
      active = false;
    };
  }, []);

  function addMaterial() {
    if (!selectedMaterialId) return;
    setDrug((prev) => {
      if (prev.materialsUsed.includes(selectedMaterialId)) return prev;
      return { ...prev, materialsUsed: [...prev.materialsUsed, selectedMaterialId] };
    });
    setSelectedMaterialId("");
  }

  function removeMaterial(materialId) {
    setDrug((prev) => ({
      ...prev,
      materialsUsed: prev.materialsUsed.filter((m) => m !== materialId),
    }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    await submitDrug(drug);
  }

  return (
    <div className="seller-page-wrap">
      <form onSubmit={onSubmit} className="card form-card page-panel">
        <h2><span className="section-icon">🏭</span>Sản xuất thuốc</h2>
        <input value={drug.drugId} onChange={(e) => setDrug({ ...drug, drugId: e.target.value })} placeholder="Mã thuốc" />
        <input value={drug.drugName} onChange={(e) => setDrug({ ...drug, drugName: e.target.value })} placeholder="Tên thuốc" />
        <input value={drug.batch} onChange={(e) => setDrug({ ...drug, batch: e.target.value })} placeholder="Lô sản xuất" />
        <input
          type="number"
          min={1}
          step={1}
          value={drug.quantity}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              setDrug({ ...drug, quantity: 1 });
              return;
            }
            const n = Math.max(1, Math.floor(Number(raw) || 1));
            setDrug({ ...drug, quantity: n });
          }}
          onBlur={() => {
            setDrug((prev) => ({
              ...prev,
              quantity: Math.max(1, normalizeQuantity(prev.quantity)),
            }));
          }}
          placeholder="Số lượng hộp mới (tối thiểu 1, không giới hạn)"
        />
        <div className="material-picker">
          <label>Nguyên liệu sử dụng</label>
          {materialsLoadError ? (
            <p className="bad">{materialsLoadError}</p>
          ) : materialOptions.length === 0 ? (
            <p className="muted">Chưa có nguyên liệu nào được đăng ký.</p>
          ) : (
            <div className="material-select-wrap">
              <select
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
              >
                <option value="">▼ Chọn nguyên liệu đã đăng ký</option>
                {materialOptions.map((material) => (
                  <option key={material.materialId} value={material.materialId}>
                    {material.materialId} - {material.name}
                  </option>
                ))}
              </select>
              <button type="button" className="btn-secondary" onClick={addMaterial}>
                Thêm nguyên liệu
              </button>
            </div>
          )}
          {drug.materialsUsed.length > 0 && (
            <div className="material-chips">
              {drug.materialsUsed.map((materialId) => (
                <button
                  type="button"
                  className="material-chip"
                  key={materialId}
                  onClick={() => removeMaterial(materialId)}
                  title="Bấm để bỏ nguyên liệu này"
                >
                  {materialId} ×
                </button>
              ))}
            </div>
          )}
        </div>
        <input value={drug.expiry} onChange={(e) => setDrug({ ...drug, expiry: e.target.value })} placeholder="Hạn sử dụng" />
        <input type="file" accept="image/*" onChange={async (e) => setDrug({ ...drug, drugImageUrl: await fileToDataUrl(e.target.files?.[0]) })} />
        {drug.drugImageUrl && <img className="preview" src={drug.drugImageUrl} alt="Thuốc" />}
        {!phoneScanReady && (
          <p className="bad">Đang dùng localhost: chưa quét được trên điện thoại. Chờ hệ thống lấy IP Wi-Fi hoặc mở app bằng IP LAN.</p>
        )}
        <button className="btn-primary" type="submit" disabled={!phoneScanReady}>
          Tạo {drug.quantity || 1} mã QR
        </button>
      </form>
    </div>
  );
}

function DistributionPage({ submitTransferBulk, loading }) {
  const [groups, setGroups] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [transfer, setTransfer] = useState({
    lotSerial: "",
    from: "",
    to: "",
    status: "Distributor",
    fromStatus: "",
  });

  useEffect(() => {
    let active = true;
    listDrugs()
      .then((res) => {
        if (!active) return;
        setGroups(groupDrugsByLot(res.items || []));
        setLoadError("");
      })
      .catch((err) => {
        if (!active) return;
        setGroups([]);
        setLoadError(err.response?.data?.error || err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedGroup = groups.find((g) => g.lotSerial === transfer.lotSerial);
  const pendingBoxes = (selectedGroup?.boxes || []).filter((b) => {
    if (b.status === "Sold") return false;
    if (transfer.fromStatus && normalizeStatus(b.status) !== transfer.fromStatus) return false;
    return true;
  });

  async function onSubmit(e) {
    e.preventDefault();
    if (!transfer.lotSerial) return;
    await submitTransferBulk({
      lotSerial: transfer.lotSerial,
      batch: selectedGroup?.batch,
      drugId: selectedGroup?.drugId,
      from: transfer.from,
      to: transfer.to,
      status: transfer.status,
      fromStatus: transfer.fromStatus || undefined,
      serials: pendingBoxes.map((b) => b.serial),
    });
  }

  return (
    <form onSubmit={onSubmit} className="card form-card page-panel">
      <h2><span className="section-icon">🚚</span>Phân phối theo lô</h2>
      <p className="muted">Chọn lô sản xuất — 1 lần Confirm MetaMask cho cả lô.</p>
      {loadError && <p className="bad">{loadError}</p>}
      <select
        value={transfer.lotSerial}
        onChange={(e) => setTransfer({ ...transfer, lotSerial: e.target.value })}
        required
      >
        <option value="">▼ Chọn lô sản xuất</option>
        {groups.map((g) => (
          <option key={g.lotSerial} value={g.lotSerial}>
            {g.drugName || g.drugId} · Lô {g.batch || "—"} — {g.boxes.length} hộp · {g.soldCount || 0} đã bán
          </option>
        ))}
      </select>
      <select
        value={transfer.fromStatus}
        onChange={(e) => setTransfer({ ...transfer, fromStatus: e.target.value })}
      >
        <option value="">Tất cả hộp chưa bán</option>
        <option value="Manufacturer">Nhà sản xuất</option>
        <option value="Distributor">Nhà phân phối</option>
        <option value="Hospital">Bệnh viện</option>
        <option value="Pharmacy">Nhà thuốc</option>
      </select>
      {transfer.lotSerial && (
        <p className="status-pill">
          Sẽ chuyển giao: <b>{pendingBoxes.length}</b> hộp
        </p>
      )}
      <input value={transfer.from} onChange={(e) => setTransfer({ ...transfer, from: e.target.value })} placeholder="Bên gửi" />
      <input
        value={transfer.to}
        onChange={(e) => setTransfer({ ...transfer, to: e.target.value })}
        placeholder="Bên nhận — địa chỉ ví 0x..."
        required
      />
      <select value={transfer.status} onChange={(e) => setTransfer({ ...transfer, status: e.target.value })}>
        <option value="Distributor">→ Nhà phân phối</option>
        <option value="Hospital">→ Bệnh viện</option>
        <option value="Pharmacy">→ Nhà thuốc</option>
      </select>
      <button
        className="btn-primary"
        type="submit"
        disabled={loading || !transfer.lotSerial || pendingBoxes.length === 0 || !transfer.to.trim()}
      >
        Chuyển giao cả lô — {pendingBoxes.length || 0} hộp
      </button>
    </form>
  );
}

function QrLibraryPage() {
  const [drugs, setDrugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listDrugs()
      .then((res) => {
        if (!active) return;
        setDrugs(res.items || []);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setDrugs([]);
        setError(err.response?.data?.error || err.message || "Không tải được danh sách QR.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = drugs.filter((drug) => {
    const key = keyword.trim().toLowerCase();
    if (!key) return true;
    return (
      String(drug.serial || "").toLowerCase().includes(key) ||
      String(drug.drugId || "").toLowerCase().includes(key) ||
      String(drug.drugName || "").toLowerCase().includes(key)
    );
  });

  const groups = groupDrugsByLot(filtered);

  return (
    <div className="qr-library-page page-full">
      <div className="card page-toolbar">
        <h2><span className="section-icon">📱</span>Kho QR thuốc</h2>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm theo mã thuốc, serial hộp, tên..."
        />
      </div>

      {loading && <p className="muted">Đang tải danh sách QR...</p>}
      {error && <p className="bad">{error}</p>}

      {!loading && !error && groups.length === 0 && (
        <div className="card empty-products">
          <p>Chưa có QR nào trong hệ thống.</p>
          <p className="muted">Vào trang Sản xuất thuốc để tạo mã và QR mới.</p>
        </div>
      )}

      <div className="qr-group-list">
        {groups.map((group) => {
          const open = expandedId === group.lotSerial;
          const lotSerial = group.lotSerial || buildLotSerial(group.drugId, group.batch);
          return (
            <div className="card qr-group-card" key={group.lotSerial}>
              <button
                type="button"
                className="qr-group-header"
                onClick={() => setExpandedId(open ? null : group.lotSerial)}
              >
                <div>
                  <h3>{group.drugName || group.drugId}</h3>
                  <p className="muted">
                    Mã lô <b>{lotSerial}</b> · {group.boxes.length} hộp · {group.soldCount || 0} đã bán
                  </p>
                </div>
                <span className="qr-group-chevron">{open ? "▲" : "▼"}</span>
              </button>
              {open && (
                <div className="qr-group-boxes">
                  <article className="qr-box-item qr-lot-master">
                    <div className="qr-box-meta">
                      <span className="product-badge pending">Mã lô tổng</span>
                      <b className="mono">{lotSerial}</b>
                    </div>
                    <QRCodeSVG value={buildVerifyUrl(lotSerial)} size={140} />
                    <Link to={`/verify/${encodeURIComponent(lotSerial)}`}>Tra cứu lô</Link>
                  </article>
                  {group.boxes.map((box) => (
                    <article className="qr-box-item" key={box.serial}>
                      <div className="qr-box-meta">
                        <span className={`product-badge ${box.status === "Sold" ? "" : "pending"}`}>
                          {getStatusLabel(box.status)}
                        </span>
                        <b>{box.serial}</b>
                      </div>
                      <QRCodeSVG value={buildVerifyUrl(box.serial)} size={140} />
                      <Link to={`/verify/${box.serial}`}>Xác minh hộp này</Link>
                    </article>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SellerPage({ wallet, connectWallet, submitSale, loading }) {
  const [serial, setSerial] = useState("");
  const [sellerLabel, setSellerLabel] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    await submitSale({ serial: serial.trim(), sellerLabel: sellerLabel.trim() });
  }

  return (
    <div className="seller-page-wrap">
      <form onSubmit={onSubmit} className="card form-card page-panel seller-card">
        <div className="page-title-row">
          <h2><span className="section-icon">🛒</span>Người bán — Xác nhận đã bán</h2>
          <button
            type="button"
            className="guide-icon-btn"
            onClick={() => setShowGuide((v) => !v)}
            title="Hướng dẫn"
            aria-label="Hướng dẫn"
            aria-expanded={showGuide}
          >
            ?
          </button>
        </div>
        {showGuide && (
          <div className="guide-panel">
            <ol className="seller-steps">
              <li>Phân phối chuyển hộp tới ví nhà thuốc (địa chỉ 0x...).</li>
              <li>Khách mua 1 hộp → quét QR trên hộp đó.</li>
              <li>Nhập đúng mã hộp → Xác nhận → Confirm MetaMask.</li>
              <li>
                Quét lại QR → hiển thị <b>Đã bán</b> (chỉ hộp đó).
              </li>
            </ol>
            <Link to="/kho-qr">Xem Kho QR</Link>
          </div>
        )}
        <input
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          placeholder="Mã QR hộp"
        />
        <input
          value={sellerLabel}
          onChange={(e) => setSellerLabel(e.target.value)}
          placeholder="Tên điểm bán"
        />
        <button className="btn-primary" type="submit" disabled={loading || !serial.trim()}>
          Xác nhận đã bán
        </button>
      </form>
    </div>
  );
}

function Dashboard() {
  const location = useLocation();
  const [health, setHealth] = useState(null);
  const [wallet, setWallet] = useState({ address: "", connected: false });
  const [loading, setLoading] = useState(false);
  const [createdBatch, setCreatedBatch] = useState(null);
  const [message, setMessage] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [phoneScanReady] = useState(canPhoneScanQr());

  useEffect(() => {
    document.body.classList.toggle("dark-theme", darkMode);
    return () => document.body.classList.remove("dark-theme");
  }, [darkMode]);

  useEffect(() => {
    healthCheck()
      .then((data) => {
        setHealth(data);
      })
      .catch((error) => {
        setMessage(
          `Không kết nối API (${getApiBase()}): ${error.response?.data?.error || error.message}`
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleDarkMode() {
    setDarkMode((prev) => !prev);
  }

  async function getSignerAndContract() {
    if (!window.ethereum) {
      throw new Error("Chưa cài MetaMask trong trình duyệt này.");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const chainConfig = await getChainConfig();
    if (!chainConfig?.contractAddress) {
      throw new Error(
        "Backend chưa trả về CONTRACT_ADDRESS. Kiểm tra Render env và mở /api/chain-config."
      );
    }
    const contract = new ethers.Contract(chainConfig.contractAddress, chainConfig.abi, signer);
    setWallet({ address, connected: true });
    return { signer, contract, address };
  }

  async function connectWallet() {
    try {
      setLoading(true);
      await getSignerAndContract();
      setMessage("Đã kết nối MetaMask.");
    } catch (error) {
      setMessage(`Kết nối thất bại: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function submitMaterial(material) {
    try {
      setLoading(true);
      if (wallet.connected) {
        const { contract, address } = await getSignerAndContract();
        const materialHash = await sha256Hex(`${material.materialId}|${material.origin}|${material.certificate}`);
        const tx = await contract.registerMaterial(material.materialId, materialHash, address);
        await tx.wait();
        const data = await createMaterialOffchain({ ...material, supplier: address, materialHash, txHash: tx.hash });
        setMessage(`Đã đăng ký nguyên liệu ${data.materialId} lên blockchain. Tx: ${tx.hash}`);
      } else {
        const data = await createMaterial(material);
        setMessage(`Đã tạo nguyên liệu ${data.materialId} bằng backend signer. Tx: ${data.txHash}`);
      }
    } catch (error) {
      setMessage(`Tạo nguyên liệu thất bại: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function submitDrug(drug) {
    try {
      setLoading(true);
      const quantity = normalizeQuantity(drug.quantity);
      const availability = await checkDrugSerials(drug.drugId, quantity);

      const materialsUsed = Array.isArray(drug.materialsUsed)
        ? drug.materialsUsed
        : String(drug.materialsUsed || "")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);
      if (materialsUsed.length === 0) {
        setMessage("Vui lòng chọn ít nhất một nguyên liệu đã đăng ký.");
        return;
      }
      if (!canPhoneScanQr()) {
        setMessage("Chưa sẵn sàng quét điện thoại. Đợi IP Wi-Fi hiện ở banner hoặc mở app bằng IP LAN.");
        return;
      }

      const serials = availability.plannedSerials || [];
      if (serials.length === 0) {
        setMessage("Không xác định được mã hộp mới. Kiểm tra mã thuốc và thử lại.");
        return;
      }
      const items = [];

      if (wallet.connected) {
        const { contract, address } = await getSignerAndContract();
        const lotSerial = buildLotSerial(drug.drugId, drug.batch);
        const lotHash = await sha256Hex(lotHashInput(drug.drugId, materialsUsed, drug.batch));
        setMessage(`MetaMask: đăng ký lô ${lotSerial}...`);
        let txHash = "";
        try {
          const tx = await contract.registerDrug(lotSerial, lotHash, address);
          await tx.wait();
          txHash = tx.hash;
        } catch (err) {
          if (!String(err?.message || "").includes("Drug already exists")) throw err;
        }
        for (let i = 0; i < serials.length; i += 1) {
          const serial = serials[i];
          setMessage(`Đang lưu QR hộp ${i + 1}/${serials.length}...`);
          const offchain = await createDrugOffchain({
            serial,
            drugId: drug.drugId,
            drugName: drug.drugName,
            batch: drug.batch,
            lotSerial,
            materialsUsed,
            expiry: drug.expiry,
            manufacturer: drug.manufacturer,
            owner: address,
            status: "Manufacturer",
            drugHash: lotHash,
            txHash,
            verifyBase: getVerifyBase(),
          });
          items.push(offchain);
        }
        setCreatedBatch({ drugId: drug.drugId, lotSerial, count: items.length, items });
        const cont =
          availability.isContinuation && availability.existingBoxCount > 0
            ? ` · tiếp tục sau ${availability.existingBoxCount} hộp cũ`
            : "";
        setMessage(`Đã đăng ký lô ${lotSerial} và ${items.length} QR hộp${cont}.`);
      } else {
        const data = await createDrug({ ...drug, materialsUsed, quantity, verifyBase: getVerifyBase() });
        setCreatedBatch({ drugId: data.drugId, count: data.count, items: data.items });
        const cont =
          data.isContinuation && data.existingBoxCount > 0
            ? ` · tiếp tục từ hộp ${String(data.startIndex).padStart(4, "0")}`
            : "";
        setMessage(`Đã tạo lô ${data.lotSerial || buildLotSerial(drug.drugId, drug.batch)} và ${data.count} QR hộp${cont}.`);
      }
    } catch (error) {
      const text = String(error?.message || "");
      if (text.includes("Drug already exists") || text.includes("already exist")) {
        setMessage("Một số mã hộp đã tồn tại trên blockchain. Thử lại — hệ thống sẽ tự nhảy sang số hộp trống tiếp theo.");
      } else if (text.includes("user denied") || text.includes("ACTION_REJECTED")) {
        setMessage("Đã hủy trên MetaMask. Bấm tạo lại và Confirm từng lô (hoặc dùng chế độ backend).");
      } else {
        setMessage(`Tạo thuốc thất bại: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitSale({ serial, sellerLabel }) {
    try {
      setLoading(true);
      if (!serial) {
        setMessage("Nhập mã QR hộp đã bán.");
        return;
      }

      const address = wallet.connected ? (await getSignerAndContract()).address : "";
      const data = await sellDrugBoxOffchain({
        serial,
        sellerAddress: address,
        sellerLabel: sellerLabel || "Điểm bán",
        buyerAddress: address,
        txHash: "",
      });
      setMessage(`Đã xác nhận bán hộp ${serial}. Trạng thái: ${getStatusLabel(data.status)}.`);
    } catch (error) {
      const text = String(error?.message || "");
      if (text.includes("Only current owner")) {
        setMessage("Ví MetaMask không phải chủ hộp này. Chuyển giao tới ví nhà thuốc trước khi bán.");
      } else if (text.includes("đã được đánh dấu") || text.includes("Sold")) {
        setMessage("Hộp này đã được đánh dấu đã bán.");
      } else if (text.includes("Invalid address")) {
        setMessage("Địa chỉ ví không hợp lệ.");
      } else if (text.includes("user denied") || text.includes("ACTION_REJECTED")) {
        setMessage("Bạn đã hủy trên MetaMask. Bấm xác nhận lại và chọn Confirm.");
      } else {
        setMessage(`Xác nhận bán thất bại: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitTransferBulk(transfer) {
    const { lotSerial, drugId, from, to, status, fromStatus, serials } = transfer;
    const list = Array.isArray(serials) ? serials.filter(Boolean) : [];
    const lotKey = lotSerial || buildLotSerial(drugId, transfer.batch);
    if (!lotKey || list.length === 0) {
      setMessage("Không có hộp nào để chuyển giao. Kiểm tra lô hoặc bộ lọc trạng thái.");
      return;
    }
    try {
      setLoading(true);
      let ok = 0;
      const failed = [];
      if (wallet.connected) {
        const { contract } = await getSignerAndContract();
        setMessage(`MetaMask: chuyển giao lô ${lotKey}...`);
        try {
          const tx = await contract.transferDrug(lotKey, to, status);
          await tx.wait();
          for (let i = 0; i < list.length; i += 1) {
            const serial = list[i];
            setMessage(`Đang cập nhật hộp ${i + 1}/${list.length}...`);
            await transferDrugOffchain(serial, { from, to, status, txHash: tx.hash });
            ok += 1;
          }
        } catch (err) {
          failed.push({ serial: lotKey, error: err.message });
        }
      } else {
        const data = await transferDrugBulk({ drugId, from, to, status, fromStatus, serials: list });
        ok = data.updated || 0;
        if (data.errors?.length) failed.push(...data.errors);
      }
      if (failed.length > 0) {
        setMessage(`Chuyển giao lô ${lotKey}: ${ok}/${list.length} hộp · lỗi ${failed[0].error}`);
      } else {
        setMessage(`Đã chuyển giao lô ${lotKey}: ${ok} hộp → ${getStatusLabel(status)}.`);
      }
    } catch (error) {
      setMessage(`Chuyển giao lô thất bại: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadHealth() {
    try {
      setLoading(true);
      const data = await healthCheck();
      setHealth(data);
      setMessage("Đã cập nhật trạng thái hệ thống.");
    } catch (error) {
      setMessage(`Không thể kiểm tra hệ thống: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <Header
        connectWallet={connectWallet}
        loadHealth={loadHealth}
        wallet={wallet}
        health={health}
        message={message}
        loading={loading}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />
      <main className="lc-main container page-transition" key={location.pathname}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/nguyen-lieu" element={<MaterialPage submitMaterial={submitMaterial} />} />
          <Route path="/san-xuat" element={<DrugPage submitDrug={submitDrug} phoneScanReady={phoneScanReady} />} />
          <Route
            path="/phan-phoi"
            element={<DistributionPage submitTransferBulk={submitTransferBulk} loading={loading} />}
          />
          <Route path="/kho-qr" element={<QrLibraryPage />} />
          <Route
            path="/nguoi-ban"
            element={
              <SellerPage
                wallet={wallet}
                connectWallet={connectWallet}
                submitSale={submitSale}
                loading={loading}
              />
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function SupplyChainTracker({ status, history }) {
  const reached = getReachedStepIndex(status, history);
  return (
    <div className="supply-chain">
      {SUPPLY_CHAIN_STEPS.map((step, index) => {
        const active = index <= reached;
        const current = normalizeStatus(status) === step.key;
        return (
          <div className={`supply-step ${active ? "active" : ""} ${current ? "current" : ""}`} key={step.key}>
            <span className="supply-icon">{step.icon}</span>
            <b>{step.label}</b>
          </div>
        );
      })}
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN");
}

function VerifyPage() {
  const { serial } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function runVerify() {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const result = await verifyDrug(serial);
      setData(result);
    } catch (e) {
      const status = e.response?.status;
      const raw = e.response?.data?.message || e.response?.data?.error || e.message;
      const message = String(raw || "");
      if (status === 404) {
        setError(`Không có mã ${serial} trong hệ thống. Tạo thuốc mới hoặc quét mã hộp / mã lô trên QR in từ Kho QR.`);
      } else if (message.includes("Network Error")) {
        setError(`Không kết nối backend (${getApiBase()}). Kiểm tra Render đang chạy.`);
      } else if (message.includes("Drug not found") || message.includes("CALL_EXCEPTION")) {
        setError("Backend chưa cập nhật. Deploy lại Render, hoặc quét mã hộp TNDD001-0001 / mã lô trên Kho QR.");
      } else if (message.length > 120) {
        setError("Lỗi tra cứu. Thử mã hộp cụ thể hoặc deploy lại backend.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!serial) return;
    runVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serial]);

  return (
    <div className="verify-page-wrap">
      <div className="lc-topbar-verify">
        <Link to="/" className="lc-brand-mini">
          <span className="lc-logo">+</span> Truy xuất dược phẩm
        </Link>
      </div>
    <div className="container verify-page">
      <h1>Xác minh thuốc</h1>
      <p className="status-pill">Mã quét: {serial}</p>
      {data?.drug?.serial && data.scannedCode !== data.drug.serial && (
        <p className="muted">Hộp tham chiếu: <b>{data.drug.serial}</b>{data.lotSerial ? ` · Lô chain: ${data.lotSerial}` : ""}</p>
      )}
      <div className="toolbar">
        <button className="btn-primary" onClick={runVerify} disabled={loading}>
          {loading ? "Đang kiểm tra..." : "Kiểm tra lại"}
        </button>
        <Link to="/">Quay lại trang quản lý</Link>
      </div>
      {loading && (
        <div className="card verify-loading">
          <p>Đang tải thông tin thuốc...</p>
          <div className="loading-dots"><span /><span /><span /></div>
        </div>
      )}
      {error && <p className="bad">{error}</p>}
      {data && (
        <div className="verify-layout">
          <div className={`card verify-status ${data.authentic ? "is-authentic" : data.chainHash ? "is-fake" : "is-pending"}`}>
            <h2>{data.result}</h2>
            <p>
              {data.authentic
                ? "Dữ liệu khớp với blockchain."
                : data.chainHash
                  ? "Hash dữ liệu không khớp blockchain."
                  : "Đã tìm thấy trong hệ thống. Mã quét là mã thuốc chung — dùng QR từng hộp để xác thực đầy đủ."}
            </p>
            {data.hint && <p className="muted">{data.hint}</p>}
            {data.relatedBoxes?.length > 1 && (
              <p className="muted">
                {data.boxCount} hộp · ví dụ:{" "}
                {data.relatedBoxes.slice(0, 3).map((s, i) => (
                  <span key={s}>
                    {i > 0 ? ", " : ""}
                    <Link to={`/verify/${encodeURIComponent(s)}`}>{s}</Link>
                  </span>
                ))}
              </p>
            )}
            {data.lotSerial && (
              <p className="muted">
                Mã lô: <Link to={`/verify/${encodeURIComponent(data.lotSerial)}`}>{data.lotSerial}</Link>
              </p>
            )}
            <p className="muted">Thời gian kiểm tra: {formatDateTime(data.verifiedAt)}</p>
          </div>

          <div className="card">
            <h3>Trạng thái lưu thông & bán hàng</h3>
            <div className="verify-status-row">
              <span className={`sale-badge ${getSaleStatus(data.drug.status).className}`}>
                {getSaleStatus(data.drug.status).label}
              </span>
              <span className="status-pill">{getStatusLabel(data.drug.status)}</span>
            </div>
            <SupplyChainTracker status={data.drug.status} history={data.drug.history} />
            <p className="muted">Luồng: Nhà sản xuất → Nhà phân phối → Bệnh viện / Nhà thuốc → Đã bán</p>
          </div>

          <div className="card verify-product">
            <h3>Thông tin thuốc</h3>
            <div className="verify-product-grid">
              {data.drug.drugImageUrl ? (
                <img className="verify-hero-image" src={data.drug.drugImageUrl} alt={data.drug.drugName || data.drug.drugId} />
              ) : (
                <div className="verify-hero-image verify-hero-placeholder">Chưa có ảnh thuốc</div>
              )}
              <div className="verify-fields">
                <p><span>Mã thuốc / Serial</span><b>{data.drug.drugId}</b></p>
                <p><span>Tên thuốc</span><b>{data.drug.drugName || "Chưa cập nhật"}</b></p>
                <p><span>Lô sản xuất</span><b>{data.drug.batch || "—"}</b></p>
                <p><span>Hạn sử dụng</span><b>{data.drug.expiry || "—"}</b></p>
                <p><span>Nhà sản xuất</span><b>{data.drug.manufacturer || "—"}</b></p>
                <p><span>Đơn vị giữ hàng hiện tại</span><b>{data.drug.currentOwner || "—"}</b></p>
                <p><span>Vị trí chuỗi cung ứng</span><b>{getStatusLabel(data.drug.status)}</b></p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Nguyên liệu sử dụng ({(data.materialsDetail || []).length})</h3>
            <div className="verify-materials-grid">
              {(data.materialsDetail || []).map((material) => (
                <article className="verify-material-card" key={material.materialId}>
                  {material.materialImageUrl ? (
                    <img src={material.materialImageUrl} alt={material.name || material.materialId} />
                  ) : (
                    <div className="verify-material-placeholder">Chưa có ảnh</div>
                  )}
                  <div>
                    <b>{material.materialId}</b>
                    <p>{material.name || "—"}</p>
                    <p>Xuất xứ: {material.origin || "—"}</p>
                    <p>Chứng nhận: {material.certificate || "—"}</p>
                    <p>HSD: {material.expiry || "—"}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Lịch sử phân phối ({data.drug.history?.length || 0} mốc)</h3>
            <div className="verify-history">
              {(data.drug.history || []).map((item, index) => (
                <div className="verify-history-item" key={`${item.at}-${index}`}>
                  <b>{getStatusLabel(item.status)}</b>
                  <p>Chủ sở hữu: {item.owner || "—"}</p>
                  <p className="muted">{formatDateTime(item.at)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/*" element={<Dashboard />} />
      <Route path="/verify/:serial" element={<VerifyPage />} />
    </Routes>
  );
}
