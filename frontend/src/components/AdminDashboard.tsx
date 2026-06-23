/**
 * AdminDashboard — giao diện quản trị Drug-Pred AI
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  BrainCircuit,
  FileText,
  Pill,
  Zap,
  RefreshCw,
  ArrowLeft,
  LogOut,
  Eye,
  EyeOff,
  Trash2,
  UserPlus,
  ChevronDown,
} from "lucide-react";
import { api } from "../services/api";

// ============================================================================
// TYPES
// ============================================================================

interface AdminDashboardProps {
  onBack: () => void;
  onLogout: () => void;
}

interface AdminStats {
  total_users: number;
}

interface AnalyticsOverview {
  total_predictions: number;
  total_records: number;
  total_drug_groups: number;
}

interface PredictionSummary {
  average_confidence: number;
}

interface DailyUsageItem {
  date: string;
  count: number;
}

interface DrugGroupDistItem {
  group: string;
  count: number;
}

interface SeverityItem {
  severity: string;
  count: number;
}

interface StatusItem {
  status: string;
  count: number;
}

interface SymptomItem {
  symptom: string;
  count: number;
}

interface AdminUser {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface HealthStatus {
  online: boolean;
  latencyMs: number | null;
  mlModel: string;
  dbStatus: string;
}

interface NewUserForm {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-rose-50 text-rose-600 border border-rose-200",
  doctor: "bg-blue-50 text-primary border border-blue-200",
  nurse: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  researcher: "bg-amber-50 text-amber-600 border border-amber-200",
};

const SEVERITY_COLORS: Record<string, string> = {
  mild: "#22c55e",
  moderate: "#f59e0b",
  severe: "#f97316",
  critical: "#ef4444",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  predicted: "#06b6d4",
  confirmed: "#22c55e",
  archived: "#64748b",
};

const RECHARTS_TOOLTIP_STYLE = {
  background: "#FFFFFF",
  border: "1px solid #e2e8f0",
  color: "#164E63",
  borderRadius: "10px",
  fontSize: "12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Chấm nhấp nháy trạng thái */
function PulseDot({ color = "green" }: { color?: "green" | "red" | "amber" }) {
  const colorMap = {
    green: "bg-green-500",
    red: "bg-rose-500",
    amber: "bg-amber-500",
  };
  return (
    <span className="relative flex h-2 w-2">
      <span
        className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colorMap[color]} opacity-75`}
      />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${colorMap[color]}`} />
    </span>
  );
}

/** Skeleton loading dành cho từng panel */
function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-100 rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
      ))}
    </div>
  );
}

/** KPI card */
function KpiCard({
  icon,
  value,
  label,
  sub,
  accentClass,
  loading,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sub?: string;
  accentClass: string;
  loading: boolean;
}) {
  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5 flex flex-col gap-2">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accentClass}`}>
        {icon}
      </div>
      {loading ? (
        <PanelSkeleton rows={2} />
      ) : (
        <>
          <span className="text-2xl font-extrabold text-[#164E63]">{value}</span>
          <span className="text-xs text-[#164E63]/50 font-bold uppercase tracking-wider">{label}</span>
          {sub && <span className="text-xs text-[#164E63]/35">{sub}</span>}
        </>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminDashboard({ onBack, onLogout }: AdminDashboardProps) {
  // --- Clock ---
  const [clock, setClock] = useState<string>("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString("vi-VN", { hour12: false }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // --- Data states ---
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [predSummary, setPredSummary] = useState<PredictionSummary | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsageItem[]>([]);
  const [drugDist, setDrugDist] = useState<DrugGroupDistItem[]>([]);
  const [severityData, setSeverityData] = useState<SeverityItem[]>([]);
  const [statusData, setStatusData] = useState<StatusItem[]>([]);
  const [symptomsData, setSymptomsData] = useState<SymptomItem[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);

  // --- Loading states per panel ---
  const [loadingKpi, setLoadingKpi] = useState(true);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [loadingDrug, setLoadingDrug] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingSeverity, setLoadingSeverity] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingSymptoms, setLoadingSymptoms] = useState(true);

  // --- Health ---
  const [health, setHealth] = useState<HealthStatus>({
    online: false,
    latencyMs: null,
    mlModel: "—",
    dbStatus: "—",
  });

  // --- User management ---
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>({
    username: "",
    email: "",
    password: "",
    full_name: "",
    role: "doctor",
  });
  const [addingUser, setAddingUser] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [roleChanging, setRoleChanging] = useState<string | null>(null);

  // --- Refresh counter ---
  const [refreshKey, setRefreshKey] = useState(0);
  const healthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Fetch helpers ----
  const fetchKpi = useCallback(async () => {
    setLoadingKpi(true);
    try {
      const [statsRes, ovRes, sumRes] = await Promise.allSettled([
        api.get<AdminStats>("/admin/stats"),
        api.get<AnalyticsOverview>("/analytics/overview"),
        api.get<PredictionSummary>("/analytics/predictions/summary"),
      ]);
      if (statsRes.status === "fulfilled") setAdminStats(statsRes.value.data);
      if (ovRes.status === "fulfilled") setOverview(ovRes.value.data);
      if (sumRes.status === "fulfilled") setPredSummary(sumRes.value.data);
    } catch (e) {
      console.error("fetchKpi error", e);
    } finally {
      setLoadingKpi(false);
    }
  }, []);

  const fetchDaily = useCallback(async () => {
    setLoadingDaily(true);
    try {
      const res = await api.get<DailyUsageItem[]>("/analytics/search_logs/daily-usage", {
        params: { days: 30 },
      });
      setDailyUsage(res.data);
    } catch (e) {
      console.error("fetchDaily error", e);
    } finally {
      setLoadingDaily(false);
    }
  }, []);

  const fetchDrug = useCallback(async () => {
    setLoadingDrug(true);
    try {
      const res = await api.get<DrugGroupDistItem[]>("/analytics/search_logs/drug-group-distribution");
      setDrugDist(res.data);
    } catch (e) {
      console.error("fetchDrug error", e);
    } finally {
      setLoadingDrug(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get<AdminUser[]>("/admin/users");
      setUsers(res.data);
    } catch (e) {
      console.error("fetchUsers error", e);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchSeverity = useCallback(async () => {
    setLoadingSeverity(true);
    try {
      const res = await api.get<SeverityItem[]>("/analytics/records/severity");
      setSeverityData(res.data);
    } catch (e) {
      console.error("fetchSeverity error", e);
    } finally {
      setLoadingSeverity(false);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await api.get<StatusItem[]>("/analytics/records/status");
      setStatusData(res.data);
    } catch (e) {
      console.error("fetchStatus error", e);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const fetchSymptoms = useCallback(async () => {
    setLoadingSymptoms(true);
    try {
      const res = await api.get<SymptomItem[]>("/analytics/search_logs/popular-symptoms");
      setSymptomsData(res.data);
    } catch (e) {
      console.error("fetchSymptoms error", e);
    } finally {
      setLoadingSymptoms(false);
    }
  }, []);

  const pingHealth = useCallback(async () => {
    const start = performance.now();
    try {
      const res = await api.get<{ ml_model?: string; database?: string }>("/health");
      const ms = Math.round(performance.now() - start);
      setHealth({
        online: true,
        latencyMs: ms,
        mlModel: res.data?.ml_model ?? "ĐÃ TẢI",
        dbStatus: res.data?.database ?? "KẾT NỐI",
      });
    } catch {
      setHealth({ online: false, latencyMs: null, mlModel: "—", dbStatus: "—" });
    }
  }, []);

  // ---- Initial + Refresh ----
  const fetchAll = useCallback(() => {
    fetchKpi();
    fetchDaily();
    fetchDrug();
    fetchUsers();
    fetchSeverity();
    fetchStatus();
    fetchSymptoms();
    pingHealth();
  }, [fetchKpi, fetchDaily, fetchDrug, fetchUsers, fetchSeverity, fetchStatus, fetchSymptoms, pingHealth]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll, refreshKey]);

  // Health ping every 10s
  useEffect(() => {
    if (healthTimerRef.current) clearInterval(healthTimerRef.current);
    healthTimerRef.current = setInterval(pingHealth, 10000);
    return () => {
      if (healthTimerRef.current) clearInterval(healthTimerRef.current);
    };
  }, [pingHealth]);

  // ---- User management actions ----
  const handleToggleActive = useCallback(
    async (user: AdminUser) => {
      try {
        await api.patch(`/admin/users/${user.id}`, { is_active: !user.is_active });
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, is_active: !u.is_active } : u))
        );
      } catch (e) {
        console.error("toggleActive error", e);
      }
    },
    []
  );

  const handleChangeRole = useCallback(async (userId: string, newRole: string) => {
    setRoleChanging(userId);
    try {
      await api.patch(`/admin/users/${userId}`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (e) {
      console.error("changeRole error", e);
    } finally {
      setRoleChanging(null);
    }
  }, []);

  const handleDeleteUser = useCallback(async (userId: string) => {
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setDeleteConfirm(null);
    } catch (e) {
      console.error("deleteUser error", e);
    }
  }, []);

  const handleAddUser = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setAddingUser(true);
      try {
        const res = await api.post<AdminUser>("/admin/users", newUser);
        setUsers((prev) => [res.data, ...prev]);
        setNewUser({ username: "", email: "", password: "", full_name: "", role: "doctor" });
        setShowAddForm(false);
      } catch (e) {
        console.error("addUser error", e);
      } finally {
        setAddingUser(false);
      }
    },
    [newUser]
  );

  // ---- Derived values ----
  const totalStatusCount = statusData.reduce((s, d) => s + d.count, 0);

  const severityPieData = severityData.map((d) => ({
    name: d.severity,
    value: d.count,
    color: SEVERITY_COLORS[d.severity] ?? "#64748b",
  }));

  const drugBarData = drugDist.map((d) => ({ name: d.group, count: d.count }));

  const dailyLineData = dailyUsage.map((d) => ({
    date: d.date,
    "Dự đoán": d.count,
  }));

  const avgConf = predSummary?.average_confidence;
  const avgConfDisplay = avgConf != null ? `${(avgConf * 100).toFixed(1)}%` : "—";

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      {/* ------------------------------------------------------------------ */}
      {/* HEADER BAR */}
      {/* ------------------------------------------------------------------ */}
      <div className="h-0.5 w-full bg-gradient-to-r from-[#0891B2] to-[#22D3EE]" aria-hidden="true" />
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-100 px-6 py-3.5 flex items-center gap-3 sticky top-0 z-50 shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[#164E63]/60 hover:text-[#164E63] text-sm transition-colors"
        >
          <ArrowLeft size={15} />
          <span>Quay lại</span>
        </button>

        <div className="flex-1 flex items-center justify-center gap-3">
          <span className="text-xs font-bold tracking-[0.2em] text-[#164E63]/40 uppercase">
            Admin
          </span>
          <span className="text-[#164E63]/20">·</span>
          <span
            className="text-sm font-bold tracking-tight"
            style={{ background: 'linear-gradient(to right, #0891B2, #22D3EE)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Drug-Pred AI
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs">
            <PulseDot color={health.online ? "green" : "red"} />
            <span className={health.online ? "text-emerald-600 font-semibold" : "text-rose-500 font-semibold"}>
              {health.online ? "Hệ thống hoạt động" : "Mất kết nối"}
            </span>
          </div>

          <span className="font-mono text-sm text-[#164E63]/60 tabular-nums">{clock}</span>

          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="flex items-center gap-1.5 text-[#164E63]/50 hover:text-[#0891B2] text-xs transition-colors border border-gray-200 hover:border-[#0891B2]/30 rounded-lg px-2.5 py-1.5"
          >
            <RefreshCw size={13} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-[#164E63]/50 hover:text-rose-500 text-xs transition-colors"
          >
            <LogOut size={14} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-[1800px] mx-auto">
        {/* ---------------------------------------------------------------- */}
        {/* KPI ROW */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard
            icon={<Users size={16} className="text-emerald-600" />}
            value={adminStats?.total_users ?? "—"}
            label="Người dùng"
            sub="Tổng tài khoản"
            accentClass="bg-emerald-50"
            loading={loadingKpi}
          />
          <KpiCard
            icon={<BrainCircuit size={16} className="text-[#0891B2]" />}
            value={overview?.total_predictions ?? "—"}
            label="Dự đoán"
            sub="Từ hệ thống AI"
            accentClass="bg-blue-50"
            loading={loadingKpi}
          />
          <KpiCard
            icon={<FileText size={16} className="text-amber-600" />}
            value={overview?.total_records ?? "—"}
            label="Bệnh án"
            sub="Hồ sơ đã tạo"
            accentClass="bg-amber-50"
            loading={loadingKpi}
          />
          <KpiCard
            icon={<Pill size={16} className="text-violet-600" />}
            value={overview?.total_drug_groups ?? "—"}
            label="Nhóm thuốc"
            sub="Được phân loại"
            accentClass="bg-violet-50"
            loading={loadingKpi}
          />
          <KpiCard
            icon={<Zap size={16} className="text-[#0891B2]" />}
            value={avgConfDisplay}
            label="Độ tin cậy TB"
            sub="Trung bình mô hình"
            accentClass="bg-[#0891B2]/8"
            loading={loadingKpi}
          />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* MAIN 2-COLUMN GRID */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT COLUMN */}
          <div className="space-y-4">
            {/* Panel: Dự đoán 30 ngày */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-[#164E63]">
                  Dự đoán 30 ngày qua
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-[#0891B2] rounded-full border border-blue-100">REALTIME</span>
              </div>
              {loadingDaily ? (
                <div className="h-52 flex items-center justify-center">
                  <PanelSkeleton rows={6} />
                </div>
              ) : dailyLineData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-[#164E63]/40 text-sm">
                  Không có dữ liệu
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dailyLineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="primaryGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0891B2" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#0891B2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      axisLine={{ stroke: "#f1f5f9" }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={RECHARTS_TOOLTIP_STYLE}
                      itemStyle={{ color: "#0891B2" }}
                      labelStyle={{ color: "#164E63", fontWeight: "bold" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Dự đoán"
                      stroke="#0891B2"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4, fill: "#0891B2", strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Panel: Drug Group Distribution */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-[#164E63]">Phân phối nhóm thuốc</h2>
              </div>
              {loadingDrug ? (
                <div className="h-52 flex items-center justify-center">
                  <PanelSkeleton rows={5} />
                </div>
              ) : drugBarData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-[#164E63]/40 text-sm">
                  Không có dữ liệu
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={drugBarData}
                    layout="vertical"
                    margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 22) + "…" : v)}
                    />
                    <Tooltip
                      contentStyle={RECHARTS_TOOLTIP_STYLE}
                      itemStyle={{ color: "#8b5cf6" }}
                      labelStyle={{ color: "#164E63", fontWeight: "bold" }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: User Management */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-[#164E63]">Quản lý người dùng</h2>
              <button
                onClick={() => setShowAddForm((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-[#0891B2] border border-[#0891B2]/25 rounded-lg px-2.5 py-1.5 hover:bg-blue-50 transition-colors font-semibold"
              >
                <UserPlus size={13} />
                <span>Thêm người dùng</span>
              </button>
            </div>

            {/* Add user form */}
            {showAddForm && (
              <form
                onSubmit={handleAddUser}
                className="mb-5 p-4 bg-blue-50/40 border border-blue-100 rounded-xl space-y-3"
              >
                <div className="grid grid-cols-2 gap-2">
                  <input
                    required
                    placeholder="Tên đăng nhập"
                    value={newUser.username}
                    onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value }))}
                    className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-[#164E63] placeholder-gray-400 focus:outline-none focus:border-[#0891B2] focus:ring-1 focus:ring-[#0891B2]/20"
                  />
                  <input
                    required
                    type="email"
                    placeholder="Email"
                    value={newUser.email}
                    onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                    className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-[#164E63] placeholder-gray-400 focus:outline-none focus:border-[#0891B2] focus:ring-1 focus:ring-[#0891B2]/20"
                  />
                  <input
                    required
                    type="password"
                    placeholder="Mật khẩu"
                    value={newUser.password}
                    onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                    className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-[#164E63] placeholder-gray-400 focus:outline-none focus:border-[#0891B2] focus:ring-1 focus:ring-[#0891B2]/20"
                  />
                  <input
                    placeholder="Họ và tên"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser((p) => ({ ...p, full_name: e.target.value }))}
                    className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-[#164E63] placeholder-gray-400 focus:outline-none focus:border-[#0891B2] focus:ring-1 focus:ring-[#0891B2]/20"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
                      className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-[#164E63] focus:outline-none focus:border-[#0891B2]"
                    >
                      <option value="doctor">Bác sĩ</option>
                      <option value="nurse">Y tá</option>
                      <option value="researcher">Nghiên cứu viên</option>
                      <option value="admin">Quản trị viên</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <button
                    type="submit"
                    disabled={addingUser}
                    className="flex-1 bg-[#0891B2] text-white rounded-lg px-3 py-1.5 text-xs hover:bg-[#0891B2]/90 transition-colors disabled:opacity-50 font-semibold"
                  >
                    {addingUser ? "Đang tạo..." : "Tạo tài khoản"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-[#164E63]/40 hover:text-[#164E63]/70 text-xs px-2"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            )}

            {/* User table */}
            {loadingUsers ? (
              <PanelSkeleton rows={6} />
            ) : (
              <div className="flex-1 overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-[#164E63]/45 font-bold pb-2.5 pr-2 uppercase tracking-wider text-[10px]">Tài khoản</th>
                      <th className="text-left text-[#164E63]/45 font-bold pb-2.5 pr-2 uppercase tracking-wider text-[10px]">Vai trò</th>
                      <th className="text-left text-[#164E63]/45 font-bold pb-2.5 pr-2 uppercase tracking-wider text-[10px]">Trạng thái</th>
                      <th className="text-left text-[#164E63]/45 font-bold pb-2.5 pr-2 uppercase tracking-wider text-[10px]">Ngày tạo</th>
                      <th className="text-left text-[#164E63]/45 font-bold pb-2.5 uppercase tracking-wider text-[10px]">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((user) => (
                      <tr key={user.id} className="group hover:bg-gray-50/70 transition-colors">
                        <td className="py-2.5 pr-2">
                          <div className="font-semibold text-[#164E63]">{user.username}</div>
                          <div className="text-[#164E63]/45 truncate max-w-[120px]">{user.full_name}</div>
                        </td>
                        <td className="py-2.5 pr-2">
                          {deleteConfirm !== user.id && (
                            <div className="relative">
                              <select
                                value={user.role}
                                disabled={roleChanging === user.id}
                                onChange={(e) => handleChangeRole(user.id, e.target.value)}
                                className={`appearance-none text-xs rounded-full px-2 py-0.5 pr-5 font-semibold border focus:outline-none cursor-pointer ${
                                  ROLE_COLORS[user.role] ?? "bg-gray-100 text-[#164E63]/70 border-gray-200"
                                } bg-transparent`}
                              >
                                <option value="doctor">Bác sĩ</option>
                                <option value="nurse">Y tá</option>
                                <option value="researcher">Nghiên cứu viên</option>
                                <option value="admin">Quản trị viên</option>
                              </select>
                              <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-[#164E63]/30" />
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 pr-2">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold ${
                              user.is_active ? "text-emerald-600" : "text-[#164E63]/35"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                user.is_active ? "bg-emerald-500" : "bg-gray-300"
                              }`}
                            />
                            {user.is_active ? "Hoạt động" : "Khóa"}
                          </span>
                        </td>
                        <td className="py-2.5 pr-2 text-[#164E63]/45 font-mono">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString("vi-VN")
                            : "—"}
                        </td>
                        <td className="py-2.5">
                          {deleteConfirm === user.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-rose-600 hover:text-rose-700 text-xs border border-rose-200 rounded px-1.5 py-0.5 bg-rose-50"
                              >
                                Xác nhận
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-[#164E63]/40 hover:text-[#164E63]/70 text-xs"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleToggleActive(user)}
                                title={user.is_active ? "Khóa tài khoản" : "Kích hoạt"}
                                className="text-[#164E63]/35 hover:text-amber-500 transition-colors"
                              >
                                {user.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(user.id)}
                                title="Xóa tài khoản"
                                className="text-[#164E63]/35 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#164E63]/35">
                          Chưa có người dùng nào
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* BOTTOM 3-COLUMN GRID */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Panel 4: Severity Pie */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5">
            <h2 className="text-sm font-bold text-[#164E63] mb-4">Phân bố mức độ</h2>
            {loadingSeverity ? (
              <PanelSkeleton rows={4} />
            ) : severityPieData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-[#164E63]/35 text-sm">
                Không có dữ liệu
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={severityPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {severityPieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={RECHARTS_TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5">
                  {severityPieData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                        <span className="text-[#164E63]/65 capitalize">
                          {d.name === "mild" ? "Nhẹ" : d.name === "moderate" ? "Vừa" : d.name === "severe" ? "Nặng" : d.name === "critical" ? "Nguy kịch" : d.name}
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-[#164E63]">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Panel 5: Record Status */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5">
            <h2 className="text-sm font-bold text-[#164E63] mb-4">Trạng thái bệnh án</h2>
            {loadingStatus ? (
              <PanelSkeleton rows={4} />
            ) : statusData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-[#164E63]/35 text-sm">
                Không có dữ liệu
              </div>
            ) : (
              <div className="space-y-3.5">
                {statusData.map((d, i) => {
                  const color = STATUS_COLORS[d.status] ?? "#64748b";
                  const pct = totalStatusCount > 0 ? (d.count / totalStatusCount) * 100 : 0;
                  const label =
                    d.status === "pending" ? "Chờ dự đoán"
                    : d.status === "predicted" ? "Đã dự đoán"
                    : d.status === "confirmed" ? "Đã xác nhận"
                    : d.status === "archived" ? "Lưu trữ"
                    : d.status;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-[#164E63]/65">{label}</span>
                        <span className="font-mono font-semibold text-[#164E63]">{d.count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Panel 6: Popular Symptoms */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5">
            <h2 className="text-sm font-bold text-[#164E63] mb-4">Triệu chứng phổ biến</h2>
            {loadingSymptoms ? (
              <PanelSkeleton rows={5} />
            ) : symptomsData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-[#164E63]/35 text-sm">
                Không có dữ liệu
              </div>
            ) : (
              <div className="space-y-2">
                {symptomsData.slice(0, 8).map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-5 h-5 rounded bg-blue-50 border border-blue-100/60 flex items-center justify-center font-mono text-[#0891B2] flex-shrink-0 text-[10px] font-bold">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-[#164E63]/75 truncate">{d.symptom}</span>
                    <span className="font-mono text-[#0891B2] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100/60 flex-shrink-0 font-semibold">
                      {d.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* FOOTER: SYSTEM HEALTH */}
        {/* ---------------------------------------------------------------- */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-xl px-5 py-3 flex items-center gap-6 flex-wrap text-xs">
          <span className="font-bold tracking-widest text-[#164E63]/40 uppercase text-[10px]">
            Trạng thái hệ thống
          </span>

          <div className="flex items-center gap-1.5">
            <PulseDot color={health.online ? "green" : "red"} />
            <span className="text-[#164E63]/65">Backend API</span>
            <span className={`font-mono font-bold ${health.online ? "text-emerald-600" : "text-rose-500"}`}>
              {health.online ? "ONLINE" : "LỖI"}
            </span>
            {health.latencyMs !== null && (
              <span className="text-[#164E63]/35 font-mono">{health.latencyMs}ms</span>
            )}
          </div>

          <span className="text-gray-200">|</span>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
            <span className="text-[#164E63]/65">Redis Cache</span>
            <span className="font-mono text-[#164E63]/35">—</span>
          </div>

          <span className="text-gray-200">|</span>

          <div className="flex items-center gap-1.5">
            <PulseDot color={health.online ? "green" : "amber"} />
            <span className="text-[#164E63]/65">ML Model</span>
            <span className={`font-mono font-bold ${health.online ? "text-emerald-600" : "text-amber-500"}`}>
              {health.online ? health.mlModel : "—"}
            </span>
          </div>

          <span className="text-gray-200">|</span>

          <div className="flex items-center gap-1.5">
            <PulseDot color={health.online ? "green" : "amber"} />
            <span className="text-[#164E63]/65">Cơ sở dữ liệu</span>
            <span className={`font-mono font-bold ${health.online ? "text-emerald-600" : "text-amber-500"}`}>
              {health.online ? health.dbStatus : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
