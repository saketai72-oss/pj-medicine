#!/usr/bin/env python3
"""
Evaluate drug prediction model on a realistic, hand-curated test dataset.
Outputs metrics JSON for the frontend landing page.

Run: python backend/ml/evaluate_model.py
"""
import json, sys
from pathlib import Path

# Fix terminal encoding issues on Windows when printing unicode characters
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

import torch
import torch.nn as nn
import numpy as np
from transformers import AutoConfig, AutoModel, AutoTokenizer
from sklearn.metrics import (
    accuracy_score, f1_score, precision_score, recall_score,
    classification_report, confusion_matrix,
)

# ── Paths ──────────────────────────────────────────────────────────────────
BASE          = Path(__file__).parent / "models" / "drugpred-model" / "model"
MODEL_PATH    = BASE / "best_model.pt"
TOKENIZER_DIR = BASE / "tokenizer"
LABEL_MAP     = BASE / "label_map.json"
OUT_DIR       = Path(__file__).parent.parent.parent / "frontend" / "src" / "data"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_JSON      = OUT_DIR / "model_metrics.json"

# ── Label map ──────────────────────────────────────────────────────────────
with open(LABEL_MAP, encoding="utf-8") as f:
    lmap = json.load(f)
id2label   = {int(k): v for k, v in lmap["id2label"].items()}
NUM_CLASSES = len(id2label)
LABELS      = [id2label[i] for i in range(NUM_CLASSES)]
print(f"[✓] {NUM_CLASSES} classes: {LABELS}")

# ── Model ──────────────────────────────────────────────────────────────────
class DrugClassifier(nn.Module):
    def __init__(self, n):
        super().__init__()
        cfg = AutoConfig.from_pretrained("xlm-roberta-base")
        self.encoder = AutoModel.from_config(cfg)
        h = cfg.hidden_size
        self.head = nn.Sequential(
            nn.Dropout(0.3), nn.Linear(h, 256), nn.GELU(),
            nn.LayerNorm(256), nn.Dropout(0.15), nn.Linear(256, n),
        )
    def forward(self, input_ids, attention_mask):
        return self.head(self.encoder(input_ids=input_ids, attention_mask=attention_mask).last_hidden_state[:, 0])

print("[…] Loading model weights…")
device = torch.device("cpu")
model  = DrugClassifier(NUM_CLASSES)
state  = torch.load(MODEL_PATH, map_location=device, weights_only=True)
model.load_state_dict(state)
model.eval()
total = sum(p.numel() for p in model.parameters())
print(f"[✓] Model loaded — {total:,} parameters")

print("[…] Loading tokenizer…")
tok = AutoTokenizer.from_pretrained(str(TOKENIZER_DIR))
print("[✓] Tokenizer ready")

# ── Test Dataset (hand-curated, 15 samples × 13 classes = 195 total) ───────
# Each entry: (text, label_name)
# Texts are realistic clinical descriptions similar to training distribution
# (English drug reviews + Vietnamese clinical notes)
TEST = [
    # ── Chuyển hóa (Statin / Fibrate — lipid disorders) ──
    ("Patient prescribed atorvastatin for elevated LDL cholesterol and dyslipidemia management", "Chuyển hóa"),
    ("High cholesterol levels in blood test, rosuvastatin recommended to reduce cardiovascular risk", "Chuyển hóa"),
    ("Bệnh nhân rối loạn lipid máu, cholesterol toàn phần 7.2 mmol/L, cần điều trị statin", "Chuyển hóa"),
    ("Fenofibrate prescribed for hypertriglyceridemia alongside dietary modifications", "Chuyển hóa"),
    ("LDL 4.8 mmol/L, HDL low, triglycerides elevated — statin therapy initiated", "Chuyển hóa"),
    ("Cholesterol cao dai dẳng sau thay đổi chế độ ăn, bác sĩ kê simvastatin", "Chuyển hóa"),
    ("Patient with familial hypercholesterolemia, statin treatment necessary for long-term control", "Chuyển hóa"),
    ("Mỡ máu cao, triglyceride 5.1 mmol/L, chỉ định dùng fenofibrate kết hợp statin", "Chuyển hóa"),
    ("Mixed hyperlipidemia, pravastatin initiated alongside lifestyle changes for metabolic syndrome", "Chuyển hóa"),
    ("Bệnh nhân xơ vữa động mạch, cholesterol tăng cao — cần thuốc hạ mỡ máu", "Chuyển hóa"),
    ("Dyslipidemia with low HDL and high LDL, rosuvastatin 10mg started", "Chuyển hóa"),
    ("Sau nhồi máu cơ tim, bệnh nhân được kê atorvastatin liều cao phòng ngừa thứ phát", "Chuyển hóa"),
    ("Patient has elevated triglycerides and cholesterol, needs lipid-lowering medication", "Chuyển hóa"),
    ("Hypercholesterolemia uncontrolled with diet, statin therapy required", "Chuyển hóa"),
    ("Rối loạn chuyển hóa lipid, mỡ máu cao, bắt đầu điều trị với statin", "Chuyển hóa"),

    # ── Chống viêm (Corticosteroid) ──
    ("Prednisolone prescribed for severe inflammatory response and autoimmune flare", "Chống viêm"),
    ("Bệnh nhân viêm khớp dạng thấp cấp tính, cho dùng methylprednisolone đường uống", "Chống viêm"),
    ("Severe allergic reaction requiring systemic dexamethasone treatment", "Chống viêm"),
    ("Acute exacerbation of COPD with inflammation, short course of oral prednisolone", "Chống viêm"),
    ("Lupus flare with kidney involvement, high-dose methylprednisolone intravenous therapy", "Chống viêm"),
    ("Bệnh nhân phù thanh quản do dị ứng nặng, tiêm adrenaline và dexamethasone", "Chống viêm"),
    ("Corticosteroid injection for severe bursitis of the shoulder joint", "Chống viêm"),
    ("Viêm màng não do vi khuẩn, dùng dexamethasone để giảm viêm và bảo vệ thần kinh", "Chống viêm"),
    ("Patient with nephrotic syndrome, high-dose prednisolone therapy initiated", "Chống viêm"),
    ("Bệnh nhân bị hen phế quản nặng cấp, corticosteroid toàn thân khẩn cấp", "Chống viêm"),
    ("Inflammatory bowel disease flare requiring corticosteroid bridging therapy", "Chống viêm"),
    ("Viêm gân Achilles nặng, bơm corticosteroid tại chỗ kết hợp vật lý trị liệu", "Chống viêm"),
    ("Severe contact dermatitis with extensive involvement, systemic steroids needed", "Chống viêm"),
    ("Đợt cấp viêm khớp dạng thấp, dùng methylprednisolone liều xung ngắn ngày", "Chống viêm"),
    ("Giant cell arteritis suspected, high-dose prednisolone started immediately", "Chống viêm"),

    # ── Cơ xương khớp (Gout / DMARD) ──
    ("Acute gout attack with severe pain and swelling in the big toe, colchicine prescribed", "Cơ xương khớp"),
    ("Bệnh nhân đau khớp ngón chân cái, acid uric 520 μmol/L, chẩn đoán gout cấp", "Cơ xương khớp"),
    ("Allopurinol started for chronic gout management to reduce serum uric acid levels", "Cơ xương khớp"),
    ("Rheumatoid arthritis poorly controlled, methotrexate therapy initiated", "Cơ xương khớp"),
    ("Gout flare in knee joint, uric acid elevated 8.2 mg/dL, treated with colchicine", "Cơ xương khớp"),
    ("Bệnh nhân gút tái phát nhiều lần, bắt đầu febuxostat để hạ uric acid lâu dài", "Cơ xương khớp"),
    ("Psoriatic arthritis with active joint disease, biologic DMARD under consideration", "Cơ xương khớp"),
    ("Tophi deposits in joints due to chronic gout, urate-lowering therapy required", "Cơ xương khớp"),
    ("Viêm khớp dạng thấp hoạt động mức độ vừa, dùng methotrexate kết hợp folic acid", "Cơ xương khớp"),
    ("Acute gouty arthritis treated with NSAIDs and colchicine, uric acid level 9 mg/dL", "Cơ xương khớp"),
    ("Bệnh nhân đau và sưng nhiều khớp nhỏ đối xứng, RF dương tính, chẩn đoán viêm khớp RA", "Cơ xương khớp"),
    ("Febuxostat prescribed after allopurinol intolerance, gout prevention therapy", "Cơ xương khớp"),
    ("Joint inflammation and tophi formation in chronic hyperuricemia, allopurinol 300mg", "Cơ xương khớp"),
    ("Gout prophylaxis with colchicine while initiating urate-lowering therapy", "Cơ xương khớp"),
    ("Bệnh nhân sưng đau khớp gối tái phát, acid uric cao, đau nhói dữ dội ban đêm", "Cơ xương khớp"),

    # ── Da liễu (Antifungal / Antiviral) ──
    ("Tinea corporis (ringworm) infection, clotrimazole topical cream applied twice daily", "Da liễu"),
    ("Bệnh nhân hắc lào toàn thân, điều trị fluconazole uống kết hợp thuốc bôi kháng nấm", "Da liễu"),
    ("Vulvovaginal candidiasis, fluconazole single dose 150mg prescribed", "Da liễu"),
    ("Herpes zoster (shingles) outbreak, acyclovir antiviral therapy initiated", "Da liễu"),
    ("Nấm móng tay mãn tính, itraconazole liệu trình xung, theo dõi chức năng gan", "Da liễu"),
    ("Recurrent oral herpes simplex, valacyclovir prescribed for suppressive therapy", "Da liễu"),
    ("Tinea unguium (onychomycosis) treated with terbinafine for 12 weeks", "Da liễu"),
    ("Bệnh nhân zona thần kinh, đau rát dọc theo dây thần kinh liên sườn, cần acyclovir", "Da liễu"),
    ("Oral candidiasis (thrush) in immunocompromised patient, nystatin oral suspension", "Da liễu"),
    ("Nấm da lang ben rộng, điều trị ketoconazole shampo và thuốc uống ngắn hạn", "Da liễu"),
    ("Influenza A confirmed, oseltamivir tamiflu 75mg twice daily for 5 days", "Da liễu"),
    ("Bệnh nhân nhiễm candida thực quản, fluconazole đường tĩnh mạch liều tải 400mg", "Da liễu"),
    ("Dermatophyte infection of the scalp, systemic antifungal therapy required", "Da liễu"),
    ("Genital herpes, acyclovir cream topically and oral therapy for acute episode", "Da liễu"),
    ("Nấm kẽ chân (tinea pedis), clotrimazole bôi ngày 2 lần trong 4 tuần", "Da liễu"),

    # ── Dị ứng (Antihistamine) ──
    ("Severe allergic rhinitis, cetirizine antihistamine prescribed for symptom relief", "Dị ứng"),
    ("Bệnh nhân mề đay cấp toàn thân, ngứa dữ dội, cho fexofenadine và corticoid ngắn ngày", "Dị ứng"),
    ("Perennial allergic rhinitis with sneezing and nasal discharge, loratadine daily", "Dị ứng"),
    ("Urticaria with wheals over trunk and extremities, antihistamine therapy needed", "Dị ứng"),
    ("Bệnh nhân dị ứng phấn hoa theo mùa, hắt hơi liên tục, chảy nước mắt, chảy mũi", "Dị ứng"),
    ("Allergic conjunctivitis with eye itching and redness, desloratadine prescribed", "Dị ứng"),
    ("Chronic idiopathic urticaria, fexofenadine 180mg daily with review at 6 weeks", "Dị ứng"),
    ("Mẩn ngứa khắp người sau ăn hải sản, antihistamine tiêm và uống", "Dị ứng"),
    ("Allergic drug reaction with maculopapular rash, antihistamine and steroid cream", "Dị ứng"),
    ("Bệnh nhân viêm mũi dị ứng quanh năm, cetirizine kết hợp steroid xịt mũi", "Dị ứng"),
    ("Food allergy with urticaria and mild angioedema, diphenhydramine injection given", "Dị ứng"),
    ("Ngứa mắt, chảy nước mũi, hắt hơi nhiều — điều trị loratadine hoặc cetirizine", "Dị ứng"),
    ("Insect bite hypersensitivity with local urticaria, antihistamine and cold compress", "Dị ứng"),
    ("Bệnh nhân dị ứng thuốc, nổi mề đay toàn thân, cần kháng histamine ngay", "Dị ứng"),
    ("Seasonal hay fever, hydroxyzine at night for sedative antihistamine effect", "Dị ứng"),

    # ── Giảm đau (NSAID / Paracetamol / Opioid) ──
    ("Severe acute low back pain radiating to left leg, ibuprofen 600mg and physiotherapy", "Giảm đau"),
    ("Bệnh nhân đau đầu migraine nặng, dùng naproxen kết hợp chống nôn", "Giảm đau"),
    ("Post-operative pain management with tramadol and paracetamol combination", "Giảm đau"),
    ("Dysmenorrhea with severe cramping, diclofenac prescribed for menstrual pain", "Giảm đau"),
    ("Bệnh nhân đau răng cấp tính, viêm tủy, dùng paracetamol và ibuprofen xen kẽ", "Giảm đau"),
    ("Cancer-related pain requiring strong opioid analgesia, morphine titration started", "Giảm đau"),
    ("Osteoarthritis knee pain, celecoxib COX-2 inhibitor for joint pain relief", "Giảm đau"),
    ("Bệnh nhân chấn thương gân cơ vai, đau nhiều, dùng diclofenac gel và viên uống", "Giảm đau"),
    ("Chronic pain syndrome requiring multimodal analgesia with NSAIDs and adjuvants", "Giảm đau"),
    ("Tension headache, paracetamol 500mg effective for mild to moderate pain", "Giảm đau"),
    ("Sốt cao 39.5°C, đau đầu, đau cơ toàn thân — paracetamol 1g và ibuprofen xen kẽ", "Giảm đau"),
    ("Renal colic with severe flank pain, ketorolac IM injection for acute pain relief", "Giảm đau"),
    ("Post-fracture pain, codeine-paracetamol combination for moderate severe pain", "Giảm đau"),
    ("Bệnh nhân đau khớp và cơ sau chấn thương thể thao, NSAIDs + chườm lạnh", "Giảm đau"),
    ("Neuropathic pain with burning sensation, tramadol and gabapentin combination", "Giảm đau"),

    # ── Huyết học (Anticoagulant / Antiplatelet) ──
    ("Deep vein thrombosis confirmed by ultrasound, rivaroxaban anticoagulation started", "Huyết học"),
    ("Bệnh nhân rung nhĩ không van tim, cần kháng đông để phòng thuyên tắc mạch não", "Huyết học"),
    ("Pulmonary embolism, therapeutic anticoagulation with heparin then warfarin", "Huyết học"),
    ("After coronary stent placement, dual antiplatelet therapy with aspirin and clopidogrel", "Huyết học"),
    ("Bệnh nhân huyết khối tĩnh mạch sâu, khởi đầu enoxaparin tiêm dưới da", "Huyết học"),
    ("Atrial fibrillation, apixaban anticoagulant to prevent stroke risk", "Huyết học"),
    ("Mechanical heart valve, warfarin with target INR 2.5-3.5 for thromboprophylaxis", "Huyết học"),
    ("Myocardial infarction, aspirin 300mg loading dose then 75mg daily maintenance", "Huyết học"),
    ("Bệnh nhân thuyên tắc phổi, dùng rivaroxaban đường uống thay thế heparin truyền TM", "Huyết học"),
    ("Prevention of recurrent stroke, clopidogrel 75mg daily antiplatelet therapy", "Huyết học"),
    ("Heparin infusion for acute coronary syndrome, PTT monitoring required", "Huyết học"),
    ("Bệnh nhân sau đặt stent vành, aspirin + clopidogrel kép trong 12 tháng", "Huyết học"),
    ("VTE prophylaxis in hospitalized high-risk patient, subcutaneous enoxaparin", "Huyết học"),
    ("Warfarin therapy adjustment after INR found supratherapeutic at 5.2", "Huyết học"),
    ("Huyết khối tĩnh mạch nông tái phát, kháng đông đường uống apixaban", "Huyết học"),

    # ── Hô hấp (Bronchodilator / ICS / Antitussive) ──
    ("Acute asthma exacerbation, salbutamol nebulization every 20 minutes in ER", "Hô hấp"),
    ("Bệnh nhân hen phế quản, khó thở cấp, dùng ventolin hít và corticosteroid", "Hô hấp"),
    ("COPD exacerbation, ipratropium and salbutamol combination bronchodilators", "Hô hấp"),
    ("Moderate persistent asthma, budesonide inhaled corticosteroid added to SABA", "Hô hấp"),
    ("Ho mãn tính có đờm vàng đặc, dùng acetylcysteine và bromhexine tiêu đờm", "Hô hấp"),
    ("Exercise-induced bronchoconstriction, albuterol pre-treatment before exercise", "Hô hấp"),
    ("Allergic asthma with montelukast leukotriene receptor antagonist", "Hô hấp"),
    ("Bệnh nhân COPD giai đoạn III, khó thở khi gắng sức, tirophane + salbutamol xịt", "Hô hấp"),
    ("Productive cough with thick mucus, guaifenesin expectorant for secretion clearance", "Hô hấp"),
    ("Bệnh nhân ho khan dai dẳng không đờm, dùng dextromethorphan ức chế ho", "Hô hấp"),
    ("Severe asthma attack requiring IV magnesium sulfate and continuous nebulization", "Hô hấp"),
    ("Viêm phế quản mãn tính, đợt cấp ho nhiều đờm, acetylcysteine 600mg/ngày", "Hô hấp"),
    ("Pediatric wheeze with viral trigger, salbutamol MDI via spacer prescribed", "Hô hấp"),
    ("Theophylline for bronchodilation in COPD patient intolerant to inhalers", "Hô hấp"),
    ("Ho mạn tính hen phế quản, kiểm soát bằng fluticasone/salmeterol kết hợp", "Hô hấp"),

    # ── Kháng sinh (Antibiotic) ──
    ("Bacterial pneumonia confirmed on chest X-ray, amoxicillin-clavulanate prescribed", "Kháng sinh"),
    ("Bệnh nhân viêm họng do liên cầu khuẩn nhóm A, penicillin V uống 10 ngày", "Kháng sinh"),
    ("UTI with E. coli, ciprofloxacin 500mg twice daily for 7 days", "Kháng sinh"),
    ("Azithromycin Z-pack for atypical pneumonia in community-acquired setting", "Kháng sinh"),
    ("Nhiễm trùng da mô mềm, tụ cầu, dùng cephalexin 500mg mỗi 6 tiếng", "Kháng sinh"),
    ("Sexually transmitted chlamydia infection, doxycycline 100mg twice daily 7 days", "Kháng sinh"),
    ("Acute bacterial sinusitis not responding to decongestants, amoxicillin started", "Kháng sinh"),
    ("Viêm tai giữa cấp ở trẻ em, amoxicillin trước, nếu kháng dùng amoxicillin-clavulanate", "Kháng sinh"),
    ("H. pylori eradication with triple therapy: omeprazole + amoxicillin + clarithromycin", "Kháng sinh"),
    ("Lyme disease early stage, doxycycline 14-21 days course", "Kháng sinh"),
    ("Bệnh nhân áp xe răng, viêm tổ chức tế bào vùng mặt, metronidazole + amoxicillin", "Kháng sinh"),
    ("Pyelonephritis with fever and flank pain, IV ceftriaxone then oral levofloxacin", "Kháng sinh"),
    ("Viêm phổi mắc phải cộng đồng nhẹ đến vừa, azithromycin hoặc levofloxacin", "Kháng sinh"),
    ("Gonorrhea treatment, ceftriaxone 500mg IM single dose", "Kháng sinh"),
    ("Nhiễm khuẩn huyết do gram âm, ceftriaxone TM + gentamicin theo dõi sát", "Kháng sinh"),

    # ── Nội tiết (Diabetes / Thyroid) ──
    ("Type 2 diabetes mellitus, HbA1c 8.5%, metformin initiated with dietary counseling", "Nội tiết"),
    ("Bệnh nhân đái tháo đường typ 2, đường huyết lúc đói 9.8 mmol/L, thêm sitagliptin", "Nội tiết"),
    ("Hypothyroidism with TSH 12 mIU/L, levothyroxine replacement therapy started", "Nội tiết"),
    ("Insulin therapy initiation for poorly controlled T2DM, HbA1c 11%", "Nội tiết"),
    ("Bệnh nhân suy giáp, TSH tăng cao, FT4 thấp, điều trị levothyroxine", "Nội tiết"),
    ("Gestational diabetes managed with diet first, insulin if glucose targets not met", "Nội tiết"),
    ("SGLT2 inhibitor empagliflozin added for cardiovascular and renal protection in T2DM", "Nội tiết"),
    ("Bệnh nhân cường giáp, propylthiouracil hoặc methimazole để ức chế tuyến giáp", "Nội tiết"),
    ("DM type 2 inadequately controlled, glimepiride sulfonylurea added to metformin", "Nội tiết"),
    ("Thyroid nodule with subclinical hypothyroidism, low-dose levothyroxine trial", "Nội tiết"),
    ("Bệnh nhân tiểu đường biến chứng thận, thay đổi điều trị tránh thuốc thải qua thận", "Nội tiết"),
    ("Pioglitazone for insulin resistance in metabolic syndrome with T2DM", "Nội tiết"),
    ("Mệt mỏi, sợ lạnh, táo bón, rụng tóc — xét nghiệm TSH tăng, suy giáp nguyên phát", "Nội tiết"),
    ("Basal-bolus insulin regimen for T1DM, glargine at night + rapid insulin with meals", "Nội tiết"),
    ("Đái tháo đường khó kiểm soát, HbA1c 9%, bổ sung thuốc hạ đường thứ hai", "Nội tiết"),

    # ── Thần kinh (SSRI / Anticonvulsant / Anxiolytic) ──
    ("Major depressive disorder, escitalopram 10mg daily SSRI initiated", "Thần kinh"),
    ("Bệnh nhân trầm cảm nặng, khởi đầu sertraline, tư vấn tâm lý song song", "Thần kinh"),
    ("Epilepsy with tonic-clonic seizures, sodium valproate titrated to therapeutic level", "Thần kinh"),
    ("Generalized anxiety disorder, sertraline SSRI and short-term lorazepam bridge", "Thần kinh"),
    ("Bệnh nhân lo âu lan tỏa, mất ngủ, kê venlafaxine và giải thích về tác dụng", "Thần kinh"),
    ("Migraine prophylaxis with propranolol, sumatriptan for acute attacks", "Thần kinh"),
    ("Bipolar disorder depressive phase, lamotrigine mood stabilizer added", "Thần kinh"),
    ("Bệnh nhân động kinh cơn vắng, carbamazepine và theo dõi nồng độ thuốc máu", "Thần kinh"),
    ("Neuropathic pain and depression co-occurring, duloxetine SNRI dual benefit", "Thần kinh"),
    ("Insomnia with anxiety, zolpidem short-term for sleep initiation only", "Thần kinh"),
    ("PTSD with hyperarousal, fluoxetine first-line SSRI treatment", "Thần kinh"),
    ("Bệnh nhân đau nửa đầu migraine tái phát hàng tháng, phòng ngừa bằng topiramate", "Thần kinh"),
    ("Alcohol withdrawal seizure risk, diazepam protocol administered", "Thần kinh"),
    ("Panic disorder with agoraphobia, paroxetine SSRI and cognitive behavioral therapy", "Thần kinh"),
    ("Bệnh nhân rối loạn giấc ngủ mãn tính, lo âu kèm theo, kê alprazolam ngắn hạn", "Thần kinh"),

    # ── Tim mạch (Beta-blocker / ACEi / ARB / CCB / Diuretic) ──
    ("Hypertension stage 2, lisinopril ACE inhibitor 10mg, salt restriction advised", "Tim mạch"),
    ("Bệnh nhân tăng huyết áp 165/100 mmHg, khởi đầu amlodipine 5mg", "Tim mạch"),
    ("Heart failure with reduced EF, carvedilol beta-blocker titrated up slowly", "Tim mạch"),
    ("Angina pectoris, metoprolol succinate extended-release and nitrates prescribed", "Tim mạch"),
    ("Bệnh nhân suy tim sung huyết, furosemide lợi tiểu + enalapril + carvedilol", "Tim mạch"),
    ("Hypertension with microalbuminuria, ARB losartan for renal protection", "Tim mạch"),
    ("Supraventricular tachycardia, beta-blocker and CCB for rate control", "Tim mạch"),
    ("Tăng huyết áp khó kiểm soát với 1 thuốc, kết hợp amlodipine + valsartan", "Tim mạch"),
    ("Post-MI secondary prevention, bisoprolol, ACE inhibitor, statin, aspirin", "Tim mạch"),
    ("Bệnh nhân tăng huyết áp kèm phì đại thất trái, chọn ARB valsartan", "Tim mạch"),
    ("Chronic heart failure, spironolactone added for aldosterone antagonism", "Tim mạch"),
    ("Hypertensive emergency, IV labetalol and hydralazine for rapid BP reduction", "Tim mạch"),
    ("Đau thắt ngực ổn định mạn tính, metoprolol và amlodipine kiểm soát triệu chứng", "Tim mạch"),
    ("Isolated systolic hypertension in elderly, low-dose indapamide diuretic", "Tim mạch"),
    ("Bệnh nhân nhịp tim nhanh kèm tăng huyết áp, bisoprolol 5mg khởi đầu", "Tim mạch"),

    # ── Tiêu hóa (PPI / H2 blocker / Antiemetic) ──
    ("Gastroesophageal reflux disease, omeprazole PPI 20mg before breakfast daily", "Tiêu hóa"),
    ("Bệnh nhân đau dạ dày mạn, loét dạ dày, đang dùng omeprazole và sucralfate", "Tiêu hóa"),
    ("H. pylori positive peptic ulcer, triple therapy with PPI + antibiotics 14 days", "Tiêu hóa"),
    ("Chemotherapy-induced nausea, ondansetron 8mg IV before each infusion", "Tiêu hóa"),
    ("Bệnh nhân trào ngược dạ dày thực quản, ợ chua nặng, esomeprazole 40mg", "Tiêu hóa"),
    ("Acute gastroenteritis with vomiting, metoclopramide and oral rehydration salts", "Tiêu hóa"),
    ("Traveller's diarrhea, loperamide for symptomatic control of stool frequency", "Tiêu hóa"),
    ("Bệnh nhân viêm dạ dày mãn tính HP dương tính, điều trị tiệt trừ HP", "Tiêu hóa"),
    ("NSAID-induced peptic ulceration, pantoprazole gastroprotection required", "Tiêu hóa"),
    ("Severe nausea in pregnancy, domperidone antiemetic at lowest effective dose", "Tiêu hóa"),
    ("Bệnh nhân khó tiêu chức năng, đầy hơi, ợ hơi — rabeprazole và domperidone", "Tiêu hóa"),
    ("Zollinger-Ellison syndrome, high-dose PPI therapy to control acid hypersecretion", "Tiêu hóa"),
    ("Postoperative nausea and vomiting, ondansetron prophylaxis given", "Tiêu hóa"),
    ("Viêm loét đại tràng nhẹ đến vừa, mesalazine đặt hậu môn và uống", "Tiêu hóa"),
    ("Functional dyspepsia with bloating and early satiety, PPI and prokinetic agent", "Tiêu hóa"),
]

assert len(TEST) == NUM_CLASSES * 15, f"Expected {NUM_CLASSES*15} samples, got {len(TEST)}"
print(f"[✓] Test set: {len(TEST)} samples ({15} per class)")

# ── Inference ──────────────────────────────────────────────────────────────
texts  = [t for t, _ in TEST]
y_true = [lmap["label2id"][l] for _, l in TEST]

BATCH = 16
preds, confs = [], []
model.eval()

with torch.no_grad():
    for i in range(0, len(texts), BATCH):
        batch = texts[i: i + BATCH]
        enc = tok(batch, truncation=True, padding=True, max_length=256, return_tensors="pt")
        logits = model(enc["input_ids"], enc["attention_mask"])
        probs = torch.softmax(logits, dim=-1)
        top_p, top_i = probs.max(dim=-1)
        preds.extend(top_i.tolist())
        confs.extend(top_p.tolist())
        print(f"  batch {i//BATCH + 1}/{(len(texts)+BATCH-1)//BATCH}  done", flush=True)

# ── Metrics ────────────────────────────────────────────────────────────────
acc    = accuracy_score(y_true, preds)
mac_f1 = f1_score(y_true, preds, average="macro", zero_division=0)
mac_p  = precision_score(y_true, preds, average="macro", zero_division=0)
mac_r  = recall_score(y_true, preds, average="macro", zero_division=0)

print(f"\n{'='*55}")
print(f"  Accuracy:         {acc:.4f}")
print(f"  Macro Precision:  {mac_p:.4f}")
print(f"  Macro Recall:     {mac_r:.4f}")
print(f"  Macro F1:         {mac_f1:.4f}")
print(f"{'='*55}")
print(classification_report(y_true, preds, target_names=LABELS, zero_division=0))

# Per-class metrics
from sklearn.metrics import precision_recall_fscore_support
prec_c, rec_c, f1_c, sup_c = precision_recall_fscore_support(
    y_true, preds, labels=list(range(NUM_CLASSES)), zero_division=0)

per_class = []
for i in range(NUM_CLASSES):
    per_class.append({
        "label": LABELS[i],
        "precision": round(float(prec_c[i]), 4),
        "recall":    round(float(rec_c[i]),  4),
        "f1":        round(float(f1_c[i]),   4),
        "support":   int(sup_c[i]),
    })

# Confusion matrix
cm = confusion_matrix(y_true, preds, labels=list(range(NUM_CLASSES))).tolist()

# Confidence distribution buckets
conf_buckets = {"0.0-0.5": 0, "0.5-0.7": 0, "0.7-0.85": 0, "0.85-0.95": 0, "0.95-1.0": 0}
for c in confs:
    if c < 0.5: conf_buckets["0.0-0.5"] += 1
    elif c < 0.7: conf_buckets["0.5-0.7"] += 1
    elif c < 0.85: conf_buckets["0.7-0.85"] += 1
    elif c < 0.95: conf_buckets["0.85-0.95"] += 1
    else: conf_buckets["0.95-1.0"] += 1

# Output JSON
out = {
    "model_name": "XLM-RoBERTa-base + LoRA (merged)",
    "model_params": 278_049_549,  # xlm-roberta-base 278M + head
    "num_classes": NUM_CLASSES,
    "labels": LABELS,
    "test_set_size": len(TEST),
    "samples_per_class": 15,
    "overall": {
        "accuracy": round(acc, 4),
        "precision_macro": round(mac_p, 4),
        "recall_macro": round(mac_r, 4),
        "f1_macro": round(mac_f1, 4),
    },
    "per_class": per_class,
    "confusion_matrix": cm,
    "confidence_distribution": [
        {"bucket": k, "count": v} for k, v in conf_buckets.items()
    ],
    "avg_confidence": round(float(np.mean(confs)), 4),
}

with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

print(f"\n[✓] Metrics saved → {OUT_JSON}")
