import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

// ── Data ───────────────────────────────────────────────────────────────────
const SOURCES = [
  {
    name: "UCI Drug Review",
    slug: "jessicali9530/kuc-hackathon-winter-2018",
    schema: "review + drug_name + rating",
    lang: "EN",
    highlight: "Lọc rating ≥ 7, review của bệnh nhân thực tế",
    icon: "⭐",
    color: "#0891B2",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
  {
    name: "11k Medicine Details",
    slug: "singhnavjot2062001/11000-medicine-details",
    schema: "name + uses + composition",
    lang: "EN",
    highlight: "Mô tả công dụng + ánh xạ thành phần hoạt chất",
    icon: "💊",
    color: "#0891B2",
    bg: "bg-cyan-50",
    border: "border-cyan-100",
  },
  {
    name: "Medicine Recommendation",
    slug: "saisumanthv/medicine-recommendation-system-dataset",
    schema: "symptom1..5 + drug",
    lang: "EN",
    highlight: "Bộ triệu chứng → thuốc, phù hợp pattern lâm sàng",
    icon: "🩺",
    color: "#059669",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
  },
  {
    name: "OpenFDA Drug Labeling",
    slug: "ddrbcn/openfda-drug-labeling",
    schema: "indications_and_usage + openfda.generic_name",
    lang: "EN",
    highlight: "Nhãn thuốc FDA chính thức, ~1.7GB JSON",
    icon: "🏥",
    color: "#7c3aed",
    bg: "bg-violet-50",
    border: "border-violet-100",
  },
  {
    name: "HoangHa Medical (VI)",
    slug: "HoangHa/medical-data · HuggingFace",
    schema: "messages (patient/doctor) + target_disease",
    lang: "VI",
    highlight: "Hội thoại bệnh nhân tiếng Việt, keyword mapping → category",
    icon: "🇻🇳",
    color: "#dc2626",
    bg: "bg-red-50",
    border: "border-red-100",
  },
];

const PIPELINE = [
  { step: "01", label: "Raw Datasets", desc: "5 nguồn · CSV + JSON + HuggingFace" },
  { step: "02", label: "Auto-detect Schema", desc: "Tự dò cột (review/uses/symptom/indications)" },
  { step: "03", label: "Drug → Group", desc: "DRUG_TO_GROUP: 180 tên thuốc → 13 nhóm" },
  { step: "04", label: "VI Keyword Map", desc: "VI_KEYWORD_TO_CATEGORY: 13 danh sách từ khóa VI" },
  { step: "05", label: "Clean + Dedup", desc: "Strip HTML/URL, bỏ text < 12 ký tự, dedup exact" },
  { step: "06", label: "Balance", desc: "Tối đa 1 500 mẫu/lớp, bỏ lớp < 20 mẫu" },
  { step: "07", label: "Split 70/15/15", desc: "Stratified · train / val / test" },
];

const CLASSES = [
  "Kháng sinh", "Giảm đau", "Tim mạch", "Tiêu hóa",
  "Nội tiết", "Hô hấp", "Thần kinh", "Dị ứng",
  "Chống viêm", "Cơ xương khớp", "Da liễu", "Chuyển hóa", "Huyết học",
];

const LANG_PIE = [
  { name: "Tiếng Anh (EN)", value: 85, color: "#0891B2" },
  { name: "Tiếng Việt (VI)", value: 15, color: "#ef4444" },
];

const SPLIT_BARS = [
  { label: "Train", pct: 70, color: "#0891B2" },
  { label: "Val",   pct: 15, color: "#22D3EE" },
  { label: "Test",  pct: 15, color: "#059669" },
];

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

// ── Component ──────────────────────────────────────────────────────────────
export default function DatasetSection() {
  return (
    <section id="dataset" className="py-24 bg-gray-50/60 border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-14">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#0891B2] text-[10px] font-bold mb-3 border border-blue-100/60 uppercase tracking-wider">
            Dữ liệu Huấn luyện
          </div>
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-3">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0891B2] to-[#22D3EE]">
              5 nguồn · 13 nhóm thuốc · Song ngữ EN + VI
            </span>
          </h2>
          <p className="text-[#164E63]/60 text-lg max-w-2xl">
            Dữ liệu từ Kaggle + HuggingFace được chuẩn hóa tự động, ánh xạ taxonomy
            thống nhất và cân bằng trước khi đưa vào huấn luyện XLM-RoBERTa + LoRA.
          </p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Nguồn dataset",     value: "5",    sub: "Kaggle + HuggingFace" },
            { label: "Thuốc được ánh xạ", value: "180+", sub: "DRUG_TO_GROUP taxonomy" },
            { label: "Mẫu tối đa/lớp",    value: "1 500",sub: "Balanced cap" },
            { label: "Split",             value: "70/15/15", sub: "Train / Val / Test" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col items-center text-center gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#164E63]/40">{label}</span>
              <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-[#0891B2] to-[#22D3EE] leading-tight">{value}</span>
              <span className="text-[11px] text-[#164E63]/40 font-medium">{sub}</span>
            </div>
          ))}
        </div>

        {/* 2-col: Sources + Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Data Source Cards */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col gap-4">
            <h3 className="font-bold text-[#164E63] text-base mb-1">Nguồn dữ liệu</h3>
            <div className="flex flex-col gap-3">
              {SOURCES.map((s) => (
                <div key={s.name} className={`flex items-start gap-3 p-3 rounded-xl border ${s.bg} ${s.border}`}>
                  <span className="text-xl shrink-0 mt-0.5">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#164E63] text-sm">{s.name}</span>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                        style={{ background: s.color, color: "#fff" }}
                      >{s.lang}</span>
                    </div>
                    <p className="text-[10px] font-mono text-[#164E63]/45 mt-0.5 truncate">{s.slug}</p>
                    <p className="text-[11px] text-[#164E63]/65 mt-1">{s.highlight}</p>
                    <p className="text-[9px] text-[#164E63]/35 mt-0.5 font-mono">schema: {s.schema}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Processing Pipeline */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-[#164E63] text-base mb-5">Pipeline xử lý dữ liệu</h3>
            <div className="flex flex-col gap-0">
              {PIPELINE.map((p, i) => (
                <div key={p.step} className="flex gap-3">
                  {/* Connector */}
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0"
                      style={{ background: i === PIPELINE.length - 1 ? "#059669" : "#0891B2" }}
                    >
                      {p.step}
                    </div>
                    {i < PIPELINE.length - 1 && (
                      <div className="w-px flex-1 bg-blue-100 my-1" style={{ minHeight: 20 }} />
                    )}
                  </div>
                  {/* Content */}
                  <div className="pb-4">
                    <p className="font-bold text-[#164E63] text-sm leading-tight">{p.label}</p>
                    <p className="text-[11px] text-[#164E63]/55 mt-0.5">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom 3-col: Language + Split + Classes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Language distribution pie */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-[#164E63] text-sm mb-1">Ngôn ngữ</h3>
            <p className="text-[10px] text-[#164E63]/40 mb-3">XLM-RoBERTa xử lý cả EN lẫn VI không cần dịch</p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={LANG_PIE}
                    cx="50%" cy="50%"
                    innerRadius={38} outerRadius={58}
                    dataKey="value"
                    paddingAngle={3}
                    label={({ value }) => `${value}%`}
                    labelLine={false}
                  >
                    {LANG_PIE.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    {...CHART_TOOLTIP}
                    formatter={(v) => [`${v}%`, "Tỷ lệ"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1.5 mt-1">
              {LANG_PIE.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
                  <span className="text-[#164E63]/65">{d.name}</span>
                  <span className="ml-auto font-mono font-bold" style={{ color: d.color }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Train/Val/Test split */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-[#164E63] text-sm mb-1">Phân chia tập dữ liệu</h3>
            <p className="text-[10px] text-[#164E63]/40 mb-4">Stratified split theo nhãn</p>
            <div className="flex gap-1 h-36 items-end mb-3">
              {SPLIT_BARS.map((b) => (
                <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold font-mono" style={{ color: b.color }}>{b.pct}%</span>
                  <div
                    className="w-full rounded-t-lg transition-all"
                    style={{ background: b.color, height: `${b.pct * 1.4}%`, opacity: 0.85 }}
                  />
                  <span className="text-[10px] font-bold text-[#164E63]/55">{b.label}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1 pt-3 border-t border-gray-50 text-[11px]">
              <div className="flex justify-between text-[#164E63]/50">
                <span>Seed</span><span className="font-mono font-bold text-[#164E63]/65">42</span>
              </div>
              <div className="flex justify-between text-[#164E63]/50">
                <span>Min mẫu/lớp</span><span className="font-mono font-bold text-[#164E63]/65">20</span>
              </div>
              <div className="flex justify-between text-[#164E63]/50">
                <span>Max mẫu/lớp</span><span className="font-mono font-bold text-[#164E63]/65">1 500</span>
              </div>
            </div>
          </div>

          {/* 13 classes */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-[#164E63] text-sm mb-1">13 nhóm thuốc</h3>
            <p className="text-[10px] text-[#164E63]/40 mb-3">LABEL_LEVEL = "category" · khớp với drug_groups.category trong DB</p>
            <div className="flex flex-wrap gap-1.5">
              {CLASSES.map((c, i) => (
                <span
                  key={c}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold border"
                  style={{
                    background: i % 4 === 0 ? "#eff6ff" : i % 4 === 1 ? "#f0fdf4" : i % 4 === 2 ? "#faf5ff" : "#fff7ed",
                    borderColor: i % 4 === 0 ? "#bfdbfe" : i % 4 === 1 ? "#bbf7d0" : i % 4 === 2 ? "#e9d5ff" : "#fed7aa",
                    color: i % 4 === 0 ? "#1d4ed8" : i % 4 === 1 ? "#15803d" : i % 4 === 2 ? "#7e22ce" : "#c2410c",
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-50 space-y-1 text-[11px] text-[#164E63]/55">
              <div className="flex justify-between">
                <span>Taxonomy entries</span>
                <span className="font-mono font-bold text-[#164E63]/70">180 tên thuốc</span>
              </div>
              <div className="flex justify-between">
                <span>VI keyword sets</span>
                <span className="font-mono font-bold text-[#164E63]/70">13 danh sách</span>
              </div>
              <div className="flex justify-between">
                <span>Subgroups (chi tiết)</span>
                <span className="font-mono font-bold text-[#164E63]/70">~45 subgroups</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
