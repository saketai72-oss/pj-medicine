import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Cell,
} from "recharts";
import metricsRaw from "../data/model_metrics.json";

// ── Typed data ─────────────────────────────────────────────────────────────
const M = metricsRaw as typeof metricsRaw & {
  overall: { accuracy: number; precision_macro: number; recall_macro: number; f1_macro: number };
  per_class: Array<{ label: string; precision: number; recall: number; f1: number; support: number }>;
  confusion_matrix: number[][];
  confidence_distribution: Array<{ bucket: string; count: number }>;
};

// ── Label abbreviations for confusion matrix axes ──────────────────────────
const ABBR: Record<string, string> = {
  "Chuyển hóa":    "CH",
  "Chống viêm":    "CV",
  "Cơ xương khớp":"CXK",
  "Da liễu":       "DL",
  "Dị ứng":        "DU",
  "Giảm đau":      "GD",
  "Huyết học":     "HH",
  "Hô hấp":        "HP",
  "Kháng sinh":    "KS",
  "Nội tiết":      "NT",
  "Thần kinh":     "TK",
  "Tim mạch":      "TM",
  "Tiêu hóa":      "TH",
};

// ── Tooltip ────────────────────────────────────────────────────────────────
const CHART_TOOLTIP = {
  contentStyle: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    color: "#164E63",
    fontSize: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,.08)",
  },
};

// ── F1 colour ramp (low → high) ────────────────────────────────────────────
function f1Color(v: number): string {
  if (v >= 0.95) return "#059669";
  if (v >= 0.88) return "#10b981";
  if (v >= 0.82) return "#0891B2";
  if (v >= 0.78) return "#f59e0b";
  return "#ef4444";
}

// ── Confusion-matrix cell colour (0 → white, max → primary) ───────────────
function cmColor(v: number, max: number, isDiag: boolean): string {
  const t = max > 0 ? v / max : 0;
  if (isDiag) {
    // diagonal: white → emerald
    const r = Math.round(255 - t * (255 - 5));
    const g = Math.round(255 - t * (255 - 150));
    const b = Math.round(255 - t * (255 - 105));
    return `rgb(${r},${g},${b})`;
  }
  if (v === 0) return "#f8fafc";
  // off-diag errors: very light red
  return `rgba(239,68,68,${0.12 + t * 0.5})`;
}

// ── KPI card ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col items-center text-center gap-1">
      <span className="text-xs font-bold uppercase tracking-wider text-[#164E63]/45">{label}</span>
      <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-[#0891B2] to-[#22D3EE] leading-tight">
        {value}
      </span>
      {sub && <span className="text-[11px] text-[#164E63]/40 font-medium">{sub}</span>}
    </div>
  );
}

// ── Main section ───────────────────────────────────────────────────────────
export default function ModelPerformanceSection() {
  const { overall, per_class, confusion_matrix, confidence_distribution, labels } = M;

  // Sort per-class by F1 descending for chart
  const perClassSorted = [...per_class].sort((a, b) => b.f1 - a.f1);

  // Confusion matrix max value (for colour scaling)
  const cmMax = Math.max(...confusion_matrix.flat());

  // Confidence dist sorted
  const confDist = confidence_distribution.map(d => ({
    ...d,
    pct: Math.round((d.count / M.test_set_size) * 100),
  }));

  return (
    <section id="performance" className="py-24 bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-14">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#0891B2] text-[10px] font-bold mb-3 border border-blue-100/60 uppercase tracking-wider">
            Đánh giá mô hình AI
          </div>
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-3">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0891B2] to-[#22D3EE]">
              Kết quả đánh giá thực tế
            </span>
          </h2>
          <p className="text-[#164E63]/60 text-lg max-w-2xl">
            195 mẫu lâm sàng song ngữ (Anh + Việt) · 13 nhóm thuốc · XLM-RoBERTa-base + LoRA (278M params)
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4 text-[11px]">
            {[
              { k: "Kiến trúc", v: "XLM-RoBERTa-base + LoRA" },
              { k: "Tham số", v: "278M" },
              { k: "Tokenizer", v: "SentencePiece" },
              { k: "Test size", v: "195 mẫu (15/class)" },
              { k: "Ngôn ngữ", v: "EN + VI" },
            ].map(({ k, v }) => (
              <span key={k} className="px-2.5 py-1 rounded-full bg-gray-100 text-[#164E63]/55 font-medium">
                <span className="text-[#164E63]/35">{k}: </span>{v}
              </span>
            ))}
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <KpiCard label="Accuracy"   value={`${(overall.accuracy * 100).toFixed(1)}%`}    sub="Test set" />
          <KpiCard label="Precision"  value={`${(overall.precision_macro * 100).toFixed(1)}%`} sub="Macro avg" />
          <KpiCard label="Recall"     value={`${(overall.recall_macro * 100).toFixed(1)}%`}    sub="Macro avg" />
          <KpiCard label="F1-Score"   value={`${(overall.f1_macro * 100).toFixed(1)}%`}        sub="Macro avg" />
        </div>

        {/* 2-col: F1 bar + Confidence */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Per-class F1 bar chart */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <div className="mb-5">
              <h3 className="font-bold text-[#164E63] text-base">F1-Score theo từng lớp</h3>
              <p className="text-xs text-[#164E63]/45 mt-0.5">Sắp xếp giảm dần — càng cao càng tốt</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={perClassSorted}
                  layout="vertical"
                  margin={{ top: 0, right: 50, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number" domain={[0.5, 1]} tickCount={5}
                    tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                    stroke="#94a3b8" fontSize={10} tickLine={false}
                  />
                  <YAxis
                    dataKey="label" type="category" width={90}
                    stroke="#94a3b8" fontSize={10} tickLine={false}
                  />
                  <Tooltip
                    {...CHART_TOOLTIP}
                    formatter={(v) => [`${(Number(v) * 100).toFixed(1)}%`, "F1"]}
                  />
                  <Bar dataKey="f1" radius={[0, 4, 4, 0]} barSize={16} label={{ position: "right", fontSize: 10, fill: "#94a3b8", formatter: (v: unknown) => `${(Number(v) * 100).toFixed(1)}%` }}>
                    {perClassSorted.map((e) => (
                      <Cell key={e.label} fill={f1Color(e.f1)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-3 justify-center text-[10px]">
              {[
                { color: "#059669", label: "≥ 95%" },
                { color: "#10b981", label: "88-95%" },
                { color: "#0891B2", label: "82-88%" },
                { color: "#f59e0b", label: "78-82%" },
                { color: "#ef4444", label: "< 78%" },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
                  <span className="text-[#164E63]/50 font-medium">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column: Precision/Recall table + Confidence dist */}
          <div className="flex flex-col gap-4">
            {/* Precision / Recall / F1 compact table */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex-1 overflow-auto">
              <h3 className="font-bold text-[#164E63] text-base mb-4">Precision · Recall · F1 theo lớp</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Nhóm thuốc", "P", "R", "F1"].map(h => (
                      <th key={h} className={`pb-2 text-[#164E63]/40 font-bold uppercase tracking-wider text-[10px] ${h === "Nhóm thuốc" ? "text-left" : "text-right"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {per_class.map(d => (
                    <tr key={d.label} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-1.5 text-[#164E63]/75 font-medium">{d.label}</td>
                      <td className="py-1.5 text-right font-mono" style={{ color: f1Color(d.precision) }}>{(d.precision * 100).toFixed(0)}%</td>
                      <td className="py-1.5 text-right font-mono" style={{ color: f1Color(d.recall) }}>{(d.recall * 100).toFixed(0)}%</td>
                      <td className="py-1.5 text-right font-mono font-bold" style={{ color: f1Color(d.f1) }}>{(d.f1 * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Confidence distribution */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-[#164E63] text-sm mb-1">Phân bố độ tin cậy</h3>
              <p className="text-[10px] text-[#164E63]/40 mb-3">Avg confidence: <strong>{(M.avg_confidence * 100).toFixed(1)}%</strong> · 149/195 mẫu có confidence &gt; 95%</p>
              <div className="space-y-1.5">
                {confDist.map(d => (
                  <div key={d.bucket} className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-[#164E63]/50 text-[10px] w-20 shrink-0">{d.bucket}</span>
                    <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${d.pct}%`,
                          background: d.pct > 50 ? "#0891B2" : d.pct > 15 ? "#22D3EE" : "#f59e0b",
                        }}
                      />
                    </div>
                    <span className="font-mono text-[#164E63]/55 text-[10px] w-12 text-right shrink-0">{d.count} ({d.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Confusion Matrix heatmap */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <div className="mb-5">
            <h3 className="font-bold text-[#164E63] text-base">Ma trận nhầm lẫn (Confusion Matrix)</h3>
            <p className="text-xs text-[#164E63]/45 mt-0.5">
              Hàng = nhãn thực · Cột = nhãn dự đoán · Đường chéo xanh = dự đoán đúng · Ô đỏ nhạt = nhầm lẫn
            </p>
          </div>
          <div className="overflow-auto">
            <div style={{ minWidth: "640px" }}>
              {/* Col headers */}
              <div className="flex ml-14 mb-1">
                {labels.map(l => (
                  <div key={l} className="flex-1 text-center text-[9px] font-bold text-[#0891B2]/70 font-mono" style={{ minWidth: 42 }}>
                    {ABBR[l] ?? l.slice(0, 3)}
                  </div>
                ))}
              </div>
              {/* Rows */}
              {confusion_matrix.map((row, ri) => (
                <div key={ri} className="flex items-center mb-px">
                  <div className="w-14 text-right pr-2 text-[9px] font-bold text-[#164E63]/60 font-mono shrink-0">
                    {ABBR[labels[ri]] ?? labels[ri].slice(0, 3)}
                  </div>
                  {row.map((val, ci) => {
                    const isDiag = ri === ci;
                    const bg = cmColor(val, cmMax, isDiag);
                    return (
                      <div
                        key={ci}
                        className="flex-1 flex items-center justify-center rounded-sm transition-all"
                        style={{ minWidth: 42, height: 36, background: bg, border: isDiag ? "1.5px solid rgba(5,150,105,0.3)" : "1px solid rgba(0,0,0,0.04)" }}
                        title={`Thực: ${labels[ri]} → Dự đoán: ${labels[ci]} = ${val}`}
                      >
                        <span className={`text-[11px] font-mono font-bold ${isDiag && val > 0 ? "text-emerald-800" : val > 0 ? "text-red-600" : "text-gray-300"}`}>
                          {val > 0 ? val : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
              {/* Bottom axis label */}
              <div className="flex ml-14 mt-2">
                {labels.map(l => (
                  <div key={l} className="flex-1 text-center text-[8px] text-[#164E63]/30 truncate px-0.5" style={{ minWidth: 42 }}>
                    {l.split(" ")[0]}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Confusion matrix legend */}
          <div className="flex flex-wrap gap-6 mt-5 pt-4 border-t border-gray-50 text-xs text-[#164E63]/55">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm border border-emerald-300" style={{ background: "rgb(5,150,105)" }} />
              <span>Đường chéo — dự đoán đúng (tối = nhiều)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm" style={{ background: "rgba(239,68,68,0.4)" }} />
              <span>Ô đỏ nhạt — nhầm lẫn</span>
            </div>
            <div className="flex items-center gap-2 ml-auto font-mono text-[10px] bg-gray-50 px-2 py-1 rounded-lg">
              {Object.entries(ABBR).slice(0, 7).map(([full, ab]) => `${ab}=${full.split(" ")[0]}`).join(" · ")}
            </div>
          </div>
          <div className="text-right mt-1">
            <span className="text-[10px] font-mono text-[#164E63]/30">
              {Object.entries(ABBR).slice(7).map(([full, ab]) => `${ab}=${full}`).join(" · ")}
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
