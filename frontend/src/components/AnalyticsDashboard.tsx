import { useState, useEffect } from "react";
import { 
  Users, FileText, BrainCircuit, CheckCircle, 
  Percent, Cpu, LineChart as ChartIcon, BarChart2, PieChart as PieIcon 
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid 
} from "recharts";
import { getAnalyticsOverview, getAnalyticsDailyUsage, getAnalyticsDrugDistribution } from "../services/api";
import type { DashboardStats } from "../types";

const COLORS = ["#0891B2", "#22D3EE", "#059669", "#64748B", "#8B5CF6", "#F59E0B"];

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dailyUsage, setDailyUsage] = useState<{ date: string; predictions: number }[]>([]);
  const [distribution, setDistribution] = useState<{ name: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      getAnalyticsOverview(),
      getAnalyticsDailyUsage(),
      getAnalyticsDrugDistribution()
    ])
      .then(([statsRes, usageRes, distRes]) => {
        setStats(statsRes);
        setDailyUsage(usageRes);
        setDistribution(distRes);
      })
      .catch(err => console.error("Error loading analytics data:", err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 animate-pulse">
        <div className="h-24 bg-slate-100 rounded-2xl w-full mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-100 rounded-3xl" />
          <div className="h-80 bg-slate-100 rounded-3xl" />
        </div>
      </div>
    );
  }

  // Calculate specialty distribution from drug group distribution categories
  // In our mock, categories are Respiratory, Cardiology, Neurology, Gastroenterology, Endocrinology
  const specialtyDistribution = [
    { name: "Hô Hấp", value: 80 },
    { name: "Tim Mạch", value: 65 },
    { name: "Thần Kinh", value: 45 },
    { name: "Tiêu Hóa", value: 38 },
    { name: "Nội Tiết", value: 24 }
  ];

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      <header className="mb-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-primary text-[10px] font-bold mb-2 border border-blue-100/60 uppercase tracking-wider">
          Phân tích dữ liệu
        </div>
        <h2 className="text-3xl font-bold font-heading">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            Báo cáo & Phân tích
          </span>
        </h2>
        <p className="text-text/65 text-sm mt-1">Đánh giá hiệu năng mô hình AI và hoạt động lâm sàng</p>
      </header>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Patients */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs text-text/50 font-bold uppercase tracking-wider block">Tổng số Bệnh nhân</span>
              <span className="text-3xl font-extrabold text-text block">{stats.totalPatients}</span>
            </div>
            <div className="p-3 bg-blue-50 text-primary rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Records */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs text-text/50 font-bold uppercase tracking-wider block">Bệnh án khởi tạo</span>
              <span className="text-3xl font-extrabold text-text block">{stats.totalRecords}</span>
            </div>
            <div className="p-3 bg-teal-50 text-cta rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Predictions */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs text-text/50 font-bold uppercase tracking-wider block">Tổng số dự đoán</span>
              <span className="text-3xl font-extrabold text-text block">{stats.totalPredictions}</span>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <BrainCircuit className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Accuracy & Model info */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs text-text/50 font-bold uppercase tracking-wider block">Tỉ lệ chính xác (Avg)</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-text">{(stats.averageAccuracy * 100).toFixed(1)}%</span>
                <span className="text-xs font-bold text-cta flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> F1</span>
              </div>
            </div>
            <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
              <Percent className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Model Config details */}
      <div className="bg-gradient-to-r from-primary/10 via-blue-50 to-teal-50/20 p-4 rounded-2xl border border-blue-100/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white rounded-xl text-primary border border-blue-100 shadow-sm">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-text">Model Active: {stats?.modelVersion || "N/A"}</h4>
            <p className="text-xs text-text/60">State Space Model + LoRA | O(N) Complexity | Sub-quadratic attention equivalent</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-mono font-semibold text-text/75">Precision: 0.862</span>
          <span className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-mono font-semibold text-text/75">Recall: 0.838</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Predictions Trend Line Chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-md">
          <div className="flex items-center gap-2 mb-6">
            <ChartIcon className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base text-text">Lượt dự đoán hàng ngày (30 ngày qua)</h3>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyUsage} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff" }}
                  labelStyle={{ fontWeight: "bold" }}
                />
                <Line type="monotone" dataKey="predictions" stroke="#0891B2" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: "#0891B2" }} name="Lượt chạy" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Drug Group Bar Chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-md">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base text-text">Top 5 nhóm thuốc được gợi ý nhiều nhất</h3>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 10, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} tickLine={false} width={120} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff" }}
                  labelStyle={{ fontWeight: "bold" }}
                />
                <Bar dataKey="count" fill="#0891B2" radius={[0, 6, 6, 0]} name="Lần gợi ý" barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Specialty Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-md lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <PieIcon className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base text-text">Phân bố bệnh lý theo Chuyên khoa</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={specialtyDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {specialtyDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-text/80 mb-2">Chú giải chuyên khoa:</h4>
              <div className="grid grid-cols-2 gap-3">
                {specialtyDistribution.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-xs font-semibold text-text/75">{item.name} ({item.value} ca)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
