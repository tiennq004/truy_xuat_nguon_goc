import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useParams } from "react-router-dom";
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
  transferDrugOffchain,
  verifyDrug,
} from "./api";
import { buildVerifyUrl, canPhoneScanQr, getApiBase, getVerifyBase } from "./utils/url";
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

function Header({ connectWallet, loadHealth, wallet, health, message, loading, darkMode, toggleDarkMode }) {
  return (
    <header className="header-card">
      <span className="badge">Pharma Commerce</span>
      <h1>Hệ thống truy xuất dược phẩm</h1>
      <p className="muted subtitle">Quản lý nguyên liệu, sản xuất thuốc, phân phối và xác minh bằng QR.</p>
      <div className="toolbar">
        <button className="btn-primary" onClick={connectWallet} disabled={loading}>
          {wallet.connected ? `Ví: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : "Kết nối MetaMask"}
        </button>
        <button className="btn-secondary" onClick={loadHealth}>Kiểm tra hệ thống</button>
        <button className="btn-secondary" onClick={toggleDarkMode}>
          {darkMode ? "☀️ Chế độ sáng" : "🌙 Chế độ tối"}
        </button>
      </div>
      {health && <p className="status-pill">Lưu trữ: {health.storageMode} | Blockchain: {health.chainMode}</p>}
      <p className="muted">{wallet.connected ? "Chế độ: Ký giao dịch bằng MetaMask" : "Chế độ: Ký giao dịch bằng backend"}</p>
      {message && <p className="message-line">{message}</p>}
      <nav className="tabs">
        <NavLink to="/" end>🏠 Trang chủ</NavLink>
        <NavLink to="/nguyen-lieu">🧪 Nguyên liệu</NavLink>
        <NavLink to="/san-xuat">💊 Sản xuất thuốc</NavLink>
        <NavLink to="/phan-phoi">🚚 Phân phối</NavLink>
        <NavLink to="/kho-qr">📱 Kho QR</NavLink>
        <NavLink to="/xac-minh">🔎 Xác minh QR</NavLink>
      </nav>
    </header>
  );
}

function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    listDrugs()
      .then((res) => {
        if (!active) return;
        setFeaturedProducts((res.items || []).slice(0, 8));
        setLoadError("");
      })
      .catch((err) => {
        if (!active) return;
        setFeaturedProducts([]);
        setLoadError(err.response?.data?.error || err.message || "Không tải được danh sách thuốc.");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="home-shell">
      <div className="card home-banner">
        <div className="banner-main">
          <p className="muted">
            <span className="tiny-icon">🛍️</span>
            Nền tảng chuỗi cung ứng dược
          </p>
          <h2 className="home-title">Theo dõi sản xuất, phân phối và xác minh thuốc theo thời gian thực</h2>
          <p className="muted">Mô hình giao diện dạng sàn: rõ luồng, nổi bật trạng thái, thao tác nhanh theo từng bước.</p>
          <div className="banner-tags">
            <span>Realtime trạng thái</span>
            <span>Chuẩn hóa QR</span>
            <span>Giảm thao tác tay</span>
          </div>
        </div>
        <div className="home-stats">
          <article>
            <b>{featuredProducts.length}</b>
            <span>Sản phẩm đã tạo</span>
          </article>
          <article>
            <b>4</b>
            <span>Bước truy xuất</span>
          </article>
          <article>
            <b>QR</b>
            <span>Xác minh tức thì</span>
          </article>
        </div>
        <div className="floating-icon floating-icon-a">💊</div>
        <div className="floating-icon floating-icon-b">🔎</div>
      </div>

      <div className="grid home-grid">
        <div className="card diagram-card">
          <h2><span className="section-icon">🧭</span>Sơ đồ quy trình</h2>
          <div className="diagram-flow">
            <div className="diagram-step">🧪 Đăng ký nguyên liệu</div>
            <span>➜</span>
            <div className="diagram-step">💊 Tạo serial thuốc</div>
            <span>➜</span>
            <div className="diagram-step">🚚 Chuyển giao</div>
            <span>➜</span>
            <div className="diagram-step">🔎 Quét QR xác minh</div>
          </div>
        </div>

        <div className="card diagram-card">
          <h2><span className="section-icon">✨</span>Sơ đồ thao tác gợi ý</h2>
          <div className="diagram-columns">
            <article>
              <h3>B1: Nhập nguyên liệu</h3>
              <p>Mã, xuất xứ, chứng nhận, ảnh.</p>
            </article>
            <article>
              <h3>B2: Chọn nguyên liệu</h3>
              <p>Gán vào lô thuốc và số lượng serial.</p>
            </article>
            <article>
              <h3>B3: Theo dõi phân phối</h3>
              <p>Cập nhật trạng thái và chủ sở hữu.</p>
            </article>
          </div>
        </div>

        <div className="card diagram-card highlight">
          <h2><span className="section-icon">🎬</span>Sơ đồ trải nghiệm người dùng</h2>
          <div className="experience-track">
            <div>🦊 MetaMask ký giao dịch</div>
            <div>☁️ Firebase lưu dữ liệu đầy đủ</div>
            <div>⛓️ Blockchain lưu hash chống sửa</div>
            <div>📱 QR check tại điểm bán</div>
          </div>
        </div>
      </div>

      <div className="card featured-wide">
        <h2><span className="section-icon">🔥</span>Sản phẩm nổi bật (dữ liệu thật)</h2>
        {loadError && <p className="bad">Không kết nối API ({getApiBase()}): {loadError}</p>}
        {featuredProducts.length === 0 ? (
          <div className="empty-products">
            <p>Chưa có sản phẩm nào để hiển thị.</p>
            <p className="muted">Khi bạn tạo thuốc ở trang Sản xuất thuốc, mục này sẽ tự động cập nhật.</p>
          </div>
        ) : (
          <div className="product-grid">
            {featuredProducts.map((product) => (
              <article className="product-item" key={product.serial}>
                {product.drugImageUrl ? (
                  <img src={product.drugImageUrl} alt={product.drugName || product.drugId} className="product-image" />
                ) : (
                  <div className="product-image product-image-placeholder">NO IMAGE</div>
                )}
                <div className="product-content">
                  <span className={`product-badge ${normalizeStatus(product.status) === "Sold" ? "" : "pending"}`}>
                    {getStatusLabel(product.status)}
                  </span>
                  <h3>{product.drugName || product.drugId}</h3>
                  <p>Serial: {product.serial}</p>
                  <p>Lô: {product.batch || "N/A"} • HSD: {product.expiry || "N/A"}</p>
                  <p>Nhà SX: {product.manufacturer || "N/A"}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
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
    <form onSubmit={onSubmit} className="card form-card">
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

function DrugPage({ submitDrug, createdDrug, phoneScanReady }) {
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
    <div className="grid">
      <form onSubmit={onSubmit} className="card form-card">
        <h2><span className="section-icon">🏭</span>Sản xuất thuốc</h2>
        <input value={drug.drugId} onChange={(e) => setDrug({ ...drug, drugId: e.target.value })} placeholder="Mã thuốc" />
        <input value={drug.drugName} onChange={(e) => setDrug({ ...drug, drugName: e.target.value })} placeholder="Tên thuốc" />
        <input value={drug.batch} onChange={(e) => setDrug({ ...drug, batch: e.target.value })} placeholder="Lô sản xuất" />
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
          Tạo thuốc và QR
        </button>
      </form>
      <div className="card qr-card">
        <h2><span className="section-icon">📦</span>QR quét bằng điện thoại</h2>
        {createdDrug ? (
          <>
            <QRCodeSVG value={buildVerifyUrl(createdDrug.serial)} size={220} />
            <p className="mono">{buildVerifyUrl(createdDrug.serial)}</p>
            <p className="ok">Quét mã này bằng camera điện thoại để xem thông tin thuốc ngay.</p>
          </>
        ) : (
          <p className="muted">Tạo thuốc xong sẽ có QR để in/dán hoặc quét trực tiếp.</p>
        )}
      </div>
    </div>
  );
}

function DistributionPage({ submitTransfer }) {
  const [transfer, setTransfer] = useState({ serial: "", from: "", to: "", status: "Distributor" });

  async function onSubmit(e) {
    e.preventDefault();
    await submitTransfer(transfer);
  }

  return (
    <form onSubmit={onSubmit} className="card form-card">
      <h2><span className="section-icon">🚚</span>Phân phối</h2>
      <input value={transfer.serial} onChange={(e) => setTransfer({ ...transfer, serial: e.target.value })} placeholder="Nhập mã serial" />
      <input value={transfer.from} onChange={(e) => setTransfer({ ...transfer, from: e.target.value })} placeholder="Nhập bên gửi" />
      <input value={transfer.to} onChange={(e) => setTransfer({ ...transfer, to: e.target.value })} placeholder="Nhập bên nhận / địa chỉ ví" />
      <select value={transfer.status} onChange={(e) => setTransfer({ ...transfer, status: e.target.value })}>
        <option value="Manufacturer">Nhà sản xuất</option>
        <option value="Distributor">Nhà phân phối</option>
        <option value="Hospital">Bệnh viện</option>
        <option value="Pharmacy">Nhà thuốc</option>
        <option value="Sold">Đã bán</option>
      </select>
      <button className="btn-primary" type="submit">Chuyển giao thuốc</button>
    </form>
  );
}

function QrLibraryPage() {
  const [drugs, setDrugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");

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

  return (
    <div className="qr-library-page">
      <div className="card">
        <h2><span className="section-icon">📱</span>Kho QR thuốc</h2>
        <p className="muted">Mỗi thẻ là một mã thuốc và QR tương ứng. Quét QR để mở trang xác minh đúng mã đó.</p>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm theo mã thuốc, serial, tên..."
        />
      </div>

      {loading && <p className="muted">Đang tải danh sách QR...</p>}
      {error && <p className="bad">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="card empty-products">
          <p>Chưa có QR nào trong hệ thống.</p>
          <p className="muted">Vào trang Sản xuất thuốc để tạo mã và QR mới.</p>
        </div>
      )}

      <div className="qr-library-grid">
        {filtered.map((drug) => (
          <article className="card qr-library-item" key={drug.serial}>
            <div className="qr-library-head">
              <span className="product-badge">{getStatusLabel(drug.status)}</span>
              <h3>{drug.drugName || drug.drugId}</h3>
              <p><b>Mã thuốc:</b> {drug.drugId}</p>
              <p><b>Serial / QR code:</b> {drug.serial}</p>
              <p><b>Lô:</b> {drug.batch || "—"}</p>
            </div>
            <div className="qr-library-code-wrap">
              <QRCodeSVG value={buildVerifyUrl(drug.serial)} size={180} />
            </div>
            <p className="mono">{buildVerifyUrl(drug.serial)}</p>
            <Link to={`/verify/${drug.serial}`}>Mở trang xác minh</Link>
          </article>
        ))}
      </div>
    </div>
  );
}

function VerifyHubPage({ createdDrug }) {
  const verifyLink = useMemo(() => {
    return createdDrug ? buildVerifyUrl(createdDrug.serial) : buildVerifyUrl("MAU_THUOC");
  }, [createdDrug]);
  return (
    <div className="card qr-card">
      <h2><span className="section-icon">🔐</span>Xác minh QR</h2>
      <p>Quét mã QR hoặc mở trang xác minh chi tiết.</p>
      <QRCodeSVG value={verifyLink} size={150} />
      <p className="mono">{verifyLink}</p>
      <Link to={createdDrug ? `/verify/${createdDrug.serial}` : "/verify/MAU_THUOC"}>Mở trang xác minh</Link>
    </div>
  );
}

function Dashboard() {
  const location = useLocation();
  const [health, setHealth] = useState(null);
  const [wallet, setWallet] = useState({ address: "", connected: false });
  const [loading, setLoading] = useState(false);
  const [createdDrug, setCreatedDrug] = useState(null);
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
      const availability = await checkDrugSerials(drug.drugId, 1);
      if (!availability.available) {
        setMessage(
          `Mã thuốc đã tồn tại QR/serial: ${availability.existingSerials.join(", ")}. Vui lòng đổi mã thuốc khác.`
        );
        return;
      }

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
        setMessage("Chưa sẵn sàng quét điện thoại. Đợi IP Wi-Fi hiện ở banner hoặc mở app bằng http://<IP>:5173.");
        return;
      }
      if (wallet.connected) {
        const { contract, address } = await getSignerAndContract();
        const serial = String(drug.drugId || "").trim();
        const drugHash = await sha256Hex(`${drug.drugId}|${materialsUsed.join(",")}|${drug.batch}`);
        const tx = await contract.registerDrug(serial, drugHash, address);
        await tx.wait();
        const offchain = await createDrugOffchain({
          serial,
          drugId: drug.drugId,
          drugName: drug.drugName,
          batch: drug.batch,
          materialsUsed,
          expiry: drug.expiry,
          manufacturer: drug.manufacturer,
          owner: address,
            status: "Manufacturer",
          drugHash,
          txHash: tx.hash,
          verifyBase: getVerifyBase(),
        });
        setCreatedDrug(offchain);
        setMessage(`Đã tạo QR riêng cho thuốc ${serial}. Tx: ${offchain?.txHash || tx.hash}`);
      } else {
        const data = await createDrug({ ...drug, materialsUsed, verifyBase: getVerifyBase() });
        setCreatedDrug(data.items[0]);
        setMessage(`Đã tạo QR riêng cho thuốc ${data.items[0].serial} bằng backend signer.`);
      }
    } catch (error) {
      const text = String(error?.message || "");
      if (text.includes("Drug already exists")) {
        setMessage("Mã thuốc/serial đã tồn tại trên blockchain. Vui lòng đổi mã thuốc khác.");
      } else {
        setMessage(`Tạo thuốc thất bại: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitTransfer(transfer) {
    try {
      setLoading(true);
      if (wallet.connected) {
        const { contract } = await getSignerAndContract();
        const tx = await contract.transferDrug(transfer.serial, transfer.to, transfer.status);
        await tx.wait();
        const data = await transferDrugOffchain(transfer.serial, { ...transfer, txHash: tx.hash });
        setMessage(`Cập nhật trạng thái thành công: ${getStatusLabel(data.status)} (${data.currentOwner})`);
      } else {
        const data = await transferDrug(transfer.serial, transfer);
        setMessage(`Cập nhật trạng thái thành công: ${getStatusLabel(data.status)} (${data.currentOwner})`);
      }
    } catch (error) {
      setMessage(`Chuyển giao thất bại: ${error.message}`);
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
    <div className="container">
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
      <div className="page-transition" key={location.pathname}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/nguyen-lieu" element={<MaterialPage submitMaterial={submitMaterial} />} />
          <Route path="/san-xuat" element={<DrugPage submitDrug={submitDrug} createdDrug={createdDrug} phoneScanReady={phoneScanReady} />} />
          <Route path="/phan-phoi" element={<DistributionPage submitTransfer={submitTransfer} />} />
          <Route path="/kho-qr" element={<QrLibraryPage />} />
          <Route path="/xac-minh" element={<VerifyHubPage createdDrug={createdDrug} />} />
        </Routes>
      </div>
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
      const message = e.response?.data?.message || e.response?.data?.error || e.message;
      if (String(message).includes("Network Error")) {
        setError(
          `Không kết nối được backend (${getApiBase()}). Kiểm tra: (1) backend đang chạy: cd backend && npm run dev, (2) restart frontend sau khi sửa, (3) điện thoại mở đúng ${window.location.origin}`
        );
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
    <div className="container verify-page">
      <h1>Xác minh thuốc</h1>
      <p className="status-pill">Serial / mã thuốc: {serial}</p>
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
          <div className={`card verify-status ${data.authentic ? "is-authentic" : "is-fake"}`}>
            <h2>{data.result}</h2>
            <p>{data.authentic ? "Dữ liệu khớp với blockchain." : "Hash dữ liệu không khớp blockchain."}</p>
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
