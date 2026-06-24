"""
Seed script — tạo dữ liệu mẫu cho admin dashboard
Chạy: docker exec drugpred-backend python seed_data.py
"""
import asyncio
import uuid
import random
from datetime import datetime, timedelta, date
from decimal import Decimal

import bcrypt
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://admin:secret@db:5432/pj_medicine"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def rnd_date(days_ago_max=365*5, days_ago_min=30) -> date:
    delta = random.randint(days_ago_min, days_ago_max)
    return (datetime.now() - timedelta(days=delta)).date()

def rnd_ts(days_ago_max=30, days_ago_min=0) -> datetime:
    delta = random.uniform(days_ago_min, days_ago_max)
    return datetime.now() - timedelta(days=delta)

DRUG_GROUPS = [
    ("Kháng sinh", "KS", "Antibiotics", ["Amoxicillin", "Azithromycin", "Ciprofloxacin", "Doxycycline"],
     ["Dị ứng Penicillin"], ["Tiêu chảy", "Buồn nôn"]),
    ("Kháng viêm không Steroid (NSAID)", "NSAID", "Anti-inflammatory",
     ["Ibuprofen", "Diclofenac", "Naproxen", "Meloxicam"], ["Loét dạ dày"], ["Đau dạ dày", "Chóng mặt"]),
    ("Corticosteroid", "CS", "Anti-inflammatory",
     ["Prednisolone", "Dexamethasone", "Methylprednisolone"], ["Nhiễm trùng nặng"], ["Tăng đường huyết", "Mất ngủ"]),
    ("Thuốc tim mạch", "TM", "Cardiovascular",
     ["Amlodipine", "Atorvastatin", "Metoprolol", "Lisinopril"], ["Huyết áp thấp"], ["Phù chân", "Ho khan"]),
    ("Thuốc hô hấp", "HH", "Respiratory",
     ["Salbutamol", "Budesonide", "Montelukast", "Theophylline"], ["Nhịp tim nhanh"], ["Run tay", "Đánh trống ngực"]),
    ("Thuốc tiêu hóa", "TH", "Gastrointestinal",
     ["Omeprazole", "Metoclopramide", "Domperidone", "Lactulose"], [], ["Táo bón", "Đau đầu"]),
    ("Thuốc thần kinh", "TK", "Neurology",
     ["Gabapentin", "Pregabalin", "Carbamazepine", "Levetiracetam"], ["Suy thận nặng"], ["Buồn ngủ", "Chóng mặt"]),
    ("Thuốc tâm thần", "TT", "Psychiatry",
     ["Sertraline", "Fluoxetine", "Quetiapine", "Lorazepam"], ["Thai kỳ"], ["Mất ngủ", "Khô miệng"]),
    ("Thuốc nội tiết & Đái tháo đường", "NT", "Endocrinology",
     ["Metformin", "Insulin glargine", "Glibenclamide", "Sitagliptin"], ["Suy thận"], ["Hạ đường huyết", "Buồn nôn"]),
    ("Thuốc giảm đau", "GD", "Analgesics",
     ["Paracetamol", "Tramadol", "Codeine", "Morphine"], ["Suy gan nặng"], ["Buồn ngủ", "Táo bón"]),
    ("Vitamin & Khoáng chất", "VK", "Vitamins",
     ["Vitamin C", "Vitamin D3", "Zinc", "Calcium"], [], ["Đau dạ dày nếu uống lúc đói"]),
    ("Thuốc kháng nấm & kháng virus", "KNV", "Antifungals/Antivirals",
     ["Fluconazole", "Acyclovir", "Oseltamivir", "Metronidazole"], ["Suy gan"], ["Buồn nôn", "Phát ban"]),
    ("Thuốc ung thư & miễn dịch", "UT", "Oncology",
     ["Tamoxifen", "Methotrexate", "Cyclophosphamide"], ["Thai kỳ", "Nhiễm trùng"], ["Rụng tóc", "Buồn nôn"]),
]

USERS_EXTRA = [
    ("bsnguyenvana", "nguyenvana@benhvien.vn", "BS. Nguyễn Văn A", "doctor"),
    ("bstranthib",   "tranthib@benhvien.vn",   "BS. Trần Thị B",   "doctor"),
    ("bslevanc",     "levanc@benhvien.vn",      "BS. Lê Văn C",     "doctor"),
    ("bsphamthid",   "phamthid@benhvien.vn",    "BS. Phạm Thị D",   "doctor"),
    ("bshoangvane",  "hoangvane@benhvien.vn",   "BS. Hoàng Văn E",  "doctor"),
    ("ytavof",       "vof@benhvien.vn",          "YT. Vũ Thị F",    "nurse"),
    ("ytangg",       "ngg@benhvien.vn",          "YT. Ngô Gia G",   "nurse"),
    ("ncvhh",        "hvh@benhvien.vn",          "NCV. Hà Văn H",   "researcher"),
    ("ncvtni",       "tni@benhvien.vn",          "NCV. Tô Nhã I",   "researcher"),
]

PATIENTS_DATA = [
    ("Nguyễn Văn An",    "1975-03-15", "male",   "0901234501", "O+",  ["Penicillin"],    ["Tăng huyết áp"]),
    ("Trần Thị Bình",    "1982-07-22", "female", "0912345602", "A+",  [],                ["Đái tháo đường type 2"]),
    ("Lê Văn Cường",     "1968-11-08", "male",   "0923456703", "B+",  ["Aspirin"],       ["Bệnh tim mạch"]),
    ("Phạm Thị Dung",    "1990-04-30", "female", "0934567804", "AB+", [],                []),
    ("Hoàng Văn Đức",    "1955-09-12", "male",   "0945678905", "O-",  ["Sulfonamide"],   ["Tăng huyết áp", "Suy thận"]),
    ("Vũ Thị Oanh",      "1988-01-25", "female", "0956789006", "A-",  [],                ["Hen phế quản"]),
    ("Đặng Minh Phúc",   "1972-06-18", "male",   "0967890107", "B-",  ["Codeine"],       ["Viêm khớp dạng thấp"]),
    ("Bùi Thị Quỳnh",    "1995-12-03", "female", "0978901208", "AB-", [],                []),
    ("Ngô Văn Hùng",     "1963-08-27", "male",   "0989012309", "O+",  [],                ["Đái tháo đường type 2", "Tăng huyết áp"]),
    ("Mai Thị Lan",      "1998-02-14", "female", "0990123410", "A+",  ["NSAIDs"],        []),
    ("Đinh Văn Nam",     "1945-05-20", "male",   "0901234511", "B+",  [],                ["COPD", "Suy tim"]),
    ("Lương Thị Hoa",    "1985-10-09", "female", "0912345612", "O+",  ["Metformin"],     ["Đái tháo đường type 2"]),
    ("Trương Văn Sơn",   "1979-07-16", "male",   "0923456713", "AB+", ["Latex"],         ["Hen phế quản"]),
    ("Vũ Thị Thu",       "1992-03-28", "female", "0934567814", "A-",  [],                []),
    ("Đỗ Văn Tuấn",      "1961-12-05", "male",   "0945678915", "B+",  ["Ibuprofen"],     ["Tăng huyết áp", "Bệnh tim mạch"]),
    ("Hà Thị Vân",       "1987-09-21", "female", "0956789016", "O-",  [],                ["Viêm đại tràng"]),
    ("Chu Văn Xuân",     "1953-04-07", "male",   "0967890117", "A+",  ["Penicillin", "Sulfonamide"], ["Tiểu đường", "Thận"]),
    ("Lê Thị Yến",       "2000-11-30", "female", "0978901218", "B-",  [],                []),
    ("Trần Văn Bảo",     "1971-01-17", "male",   "0989012319", "AB-", ["Aspirin"],       ["Cao huyết áp"]),
    ("Nguyễn Thị Cẩm",   "1983-08-04", "female", "0990123420", "O+",  [],                []),
    ("Phạm Văn Dũng",    "1948-06-23", "male",   "0901234521", "A+",  ["Codeine"],       ["COPD", "Tăng huyết áp"]),
    ("Hoàng Thị Hiền",   "1996-02-19", "female", "0912345622", "B+",  [],                ["Hen phế quản"]),
    ("Đặng Văn Long",    "1967-10-11", "male",   "0923456723", "O+",  ["NSAIDs"],        ["Viêm loét dạ dày"]),
    ("Bùi Thị Minh",     "1991-05-26", "female", "0934567824", "AB+", [],                []),
    ("Ngô Văn Nam",      "1958-03-08", "male",   "0945678925", "A-",  ["Penicillin"],    ["Đái tháo đường", "Suy tim"]),
    ("Mai Văn Phong",    "1977-12-15", "male",   "0956789026", "O+",  [],                ["Tăng huyết áp"]),
    ("Đinh Thị Quế",     "1993-07-02", "female", "0967890127", "B+",  ["Latex"],         []),
    ("Lương Văn Sáng",   "1960-09-19", "male",   "0978901228", "AB+", [],                ["Bệnh mạch vành", "Đái tháo đường"]),
    ("Trương Thị Tâm",   "1986-04-13", "female", "0989012329", "O-",  ["Aspirin"],       ["Viêm khớp"]),
    ("Đỗ Văn Uy",        "1974-11-28", "male",   "0990123430", "A+",  [],                ["Suy thận mạn"]),
]

COMPLAINTS = [
    ("Sốt cao 39°C, ho có đờm đặc màu vàng, đau tức ngực phải khi ho", "Viêm phổi", "J18.9", "moderate", 0),
    ("Đau thượng vị dữ dội, ợ chua, buồn nôn sau ăn", "Viêm loét dạ dày", "K25.0", "moderate", 5),
    ("Tăng huyết áp 165/100, đau đầu vùng chẩm, chóng mặt", "Tăng huyết áp kỳ 2", "I10", "severe", 3),
    ("Ho khan kéo dài 3 tuần, khó thở khi gắng sức, không sốt", "COPD giai đoạn II", "J44.1", "moderate", 4),
    ("Đường huyết 18 mmol/L, khát nước, tiểu nhiều, mờ mắt", "Đái tháo đường type 2 kiểm soát kém", "E11.65", "severe", 9),
    ("Đau khớp gối hai bên, sưng, cứng khớp buổi sáng >30 phút", "Viêm khớp dạng thấp", "M05.9", "moderate", 6),
    ("Co giật tay chân 2 lần trong ngày, mất ý thức thoáng qua", "Động kinh cục bộ", "G40.1", "severe", 7),
    ("Buồn bã, mất ngủ, không hứng thú với mọi thứ kéo dài 2 tháng", "Trầm cảm vừa", "F32.1", "mild", 7),
    ("Phát ban đỏ toàn thân, ngứa, sau khi dùng Amoxicillin", "Dị ứng thuốc kháng sinh", "L27.0", "moderate", 0),
    ("Đau ngực điển hình lan lên vai trái, vã mồ hôi lạnh", "Nhồi máu cơ tim", "I21.9", "critical", 3),
    ("Ho ra máu lượng vừa, sốt về chiều, sút cân 5kg/3 tháng", "Lao phổi nghi ngờ", "A16.2", "severe", 11),
    ("Tiêu chảy 8 lần/ngày, nôn, sốt 38°C sau ăn hải sản", "Ngộ độc thực phẩm cấp", "A05.9", "moderate", 5),
    ("Viêm họng đỏ, nuốt đau, sốt 38.5°C, hạch cổ to", "Viêm họng cấp do liên cầu", "J02.0", "mild", 0),
    ("Tiểu buốt, tiểu rắt, nước tiểu đục, đau lưng vùng thận", "Viêm đường tiết niệu", "N39.0", "mild", 0),
    ("Nhức đầu dữ dội khởi phát đột ngột như 'sét đánh'", "Xuất huyết dưới nhện nghi ngờ", "I60.9", "critical", 7),
    ("Khó thở khi nằm, phù hai chân, mệt mỏi khi leo cầu thang", "Suy tim sung huyết NYHA III", "I50.0", "severe", 3),
    ("Đau bụng quanh rốn sau đó khu trú hố chậu phải, sốt 37.8", "Viêm ruột thừa cấp nghi ngờ", "K37", "severe", 5),
    ("Vàng da, vàng mắt, đau hạ sườn phải, nước tiểu sẫm màu", "Viêm gan siêu vi cấp", "B19.9", "moderate", 11),
    ("Ngã gãy cổ xương đùi, đau dữ dội, không đi lại được", "Gãy cổ xương đùi", "S72.0", "severe", 10),
    ("Mề đay lan rộng, phù môi, khó thở sau tiêm thuốc", "Sốc phản vệ", "T78.2", "critical", 0),
    ("Sốt 40°C, đau đầu, ban xuất huyết điểm, đau cơ", "Sốt xuất huyết Dengue", "A97.1", "severe", 0),
    ("Tê bì tay chân, yếu cơ nửa người phải, khó nói", "Đột quỵ thiếu máu não", "I63.9", "critical", 3),
    ("Đau bụng âm ỉ kinh kỳ, ra huyết âm đạo bất thường", "Viêm phần phụ", "N70.9", "moderate", 5),
    ("Khó nuốt đặc và lỏng, sút cân nhanh, khàn tiếng", "Ung thư thực quản nghi ngờ", "C15.9", "severe", 8),
    ("Chóng mặt, ù tai, nghe kém một bên, buồn nôn", "Hội chứng tiền đình", "H81.3", "mild", 7),
]

SYMPTOMS_POPULAR = [
    "sốt cao", "ho có đờm", "khó thở", "đau ngực", "đau bụng",
    "đau đầu", "chóng mặt", "buồn nôn", "mệt mỏi", "đau họng",
    "tiêu chảy", "sưng khớp", "đau lưng", "phát ban", "tê bì",
    "vàng da", "ho ra máu", "khàn tiếng", "phù chân", "mất ngủ",
]

async def run():
    async with AsyncSessionLocal() as db:
        # ── 1. Lấy admin user ID ──────────────────────────────────────────────
        r = await db.execute(text("SELECT id FROM users WHERE username = 'admin'"))
        admin_id = str(r.scalar())
        print(f"✓ Admin id: {admin_id}")

        # ── 2. Tạo thêm users ─────────────────────────────────────────────────
        user_ids = [admin_id]
        for uname, email, fname, role in USERS_EXTRA:
            uid = str(uuid.uuid4())
            await db.execute(text("""
                INSERT INTO users (id, username, email, password_hash, full_name, role, is_active)
                VALUES (:id, :u, :e, :h, :f, :r, true)
                ON CONFLICT (username) DO UPDATE SET id = users.id
                RETURNING id
            """), {"id": uid, "u": uname, "e": email, "h": hash_pw("Doctor@123"), "f": fname, "r": role})
            r2 = await db.execute(text("SELECT id FROM users WHERE username = :u"), {"u": uname})
            user_ids.append(str(r2.scalar()))
        await db.commit()
        print(f"✓ Users: {len(user_ids)} (admin + {len(USERS_EXTRA)} mới)")

        # ── 3. Tạo drug groups ────────────────────────────────────────────────
        drug_group_ids = []
        for name, code, cat, drugs, contra, side in DRUG_GROUPS:
            gid = str(uuid.uuid4())
            await db.execute(text("""
                INSERT INTO drug_groups (id, name, code, category, description, common_drugs, contraindications, side_effects, is_active)
                VALUES (:id, :n, :c, :cat, :desc, :drugs, :contra, :side, true)
                ON CONFLICT (code) DO UPDATE SET id = drug_groups.id
            """), {"id": gid, "n": name, "c": code, "cat": cat,
                   "desc": f"Nhóm {name} — sử dụng trong điều trị các bệnh lý liên quan.",
                   "drugs": drugs, "contra": contra, "side": side})
            r3 = await db.execute(text("SELECT id FROM drug_groups WHERE code = :c"), {"c": code})
            drug_group_ids.append(str(r3.scalar()))
        await db.commit()
        print(f"✓ Drug groups: {len(drug_group_ids)}")

        # ── 4. Tạo model_config ───────────────────────────────────────────────
        r4 = await db.execute(text("SELECT id FROM model_configs WHERE is_active = true LIMIT 1"))
        model_id = r4.scalar()
        if not model_id:
            model_id = str(uuid.uuid4())
            await db.execute(text("""
                INSERT INTO model_configs (id, name, version, architecture, optimizer, hyperparameters,
                    model_path, training_dataset, status, is_active, trained_by)
                VALUES (:id, 'XLM-RoBERTa DrugPred', 'v1.2.0', 'xlm-roberta-base', 'AdamW',
                    :hp, './ml/models/drugpred-v1.2.0/', 'MedViQA-DrugPred-v2',
                    'ready', true, :uid)
            """), {"id": model_id, "hp": '{"lr":2e-5,"batch_size":32,"epochs":10,"dropout":0.3}',
                   "uid": admin_id})
            await db.commit()
        model_id = str(model_id)
        print(f"✓ Model config: {model_id[:8]}...")

        # ── 5. Tạo patients ───────────────────────────────────────────────────
        patient_ids = []
        doctor_ids = [uid for uid in user_ids if uid != admin_id][:5] or [admin_id]
        for i, (name, dob, gender, phone, blood, allerg, chronic) in enumerate(PATIENTS_DATA):
            pid = str(uuid.uuid4())
            code = f"BN-{2024000 + i + 1}"
            creator = random.choice(doctor_ids)
            created = rnd_ts(days_ago_max=180, days_ago_min=30)
            dob_date = date.fromisoformat(dob)
            await db.execute(text("""
                INSERT INTO patients (id, patient_code, full_name, date_of_birth, gender, phone,
                    address, blood_type, allergies, chronic_diseases, created_by, created_at, updated_at)
                VALUES (:id, :code, :name, :dob, :gender, :phone,
                    :addr, :blood, :allerg, :chronic, :creator, :cat, :uat)
                ON CONFLICT (patient_code) DO UPDATE SET id = patients.id
            """), {"id": pid, "code": code, "name": name, "dob": dob_date, "gender": gender,
                   "phone": phone, "addr": f"{random.randint(1,200)} {random.choice(['Lê Lợi','Nguyễn Huệ','Trần Hưng Đạo','Đinh Tiên Hoàng'])}, TP.HCM",
                   "blood": blood, "allerg": allerg, "chronic": chronic,
                   "creator": creator, "cat": created, "uat": created})
            r5 = await db.execute(text("SELECT id FROM patients WHERE patient_code = :c"), {"c": code})
            patient_ids.append(str(r5.scalar()))
        await db.commit()
        print(f"✓ Patients: {len(patient_ids)}")

        # ── 6. Tạo medical records + predictions ──────────────────────────────
        SEVERITIES = ["mild", "moderate", "severe", "critical"]
        STATUSES   = ["pending", "predicted", "confirmed", "archived"]
        SEV_WEIGHTS  = [0.3, 0.4, 0.2, 0.1]
        STAT_WEIGHTS = [0.15, 0.35, 0.35, 0.15]

        record_count = 0
        pred_count = 0
        for idx, (complaint, diagnosis, icd, severity, dg_idx) in enumerate(COMPLAINTS * 2):
            pat_id = patient_ids[idx % len(patient_ids)]
            creator = random.choice(doctor_ids)
            record_id = str(uuid.uuid4())
            record_code = f"HS-{2024000 + idx + 1}"
            rec_severity = random.choices(SEVERITIES, SEV_WEIGHTS)[0]
            rec_status   = random.choices(STATUSES, STAT_WEIGHTS)[0]
            created_at = rnd_ts(days_ago_max=29, days_ago_min=0)
            vital = ('{"temperature":' + str(round(random.uniform(36.5, 40.0), 1)) +
                     ',"heart_rate":' + str(random.randint(60, 110)) +
                     ',"blood_pressure":"' + str(random.randint(110, 160)) + '/' + str(random.randint(70, 100)) + '"' +
                     ',"spo2":' + str(random.randint(92, 99)) + '}')
            await db.execute(text("""
                INSERT INTO medical_records (id, record_code, patient_id, created_by,
                    chief_complaint, description, symptoms_duration, vital_signs,
                    diagnosis, diagnosis_icd, severity, status, created_at, updated_at)
                VALUES (:id, :rc, :pid, :creator, :cc, :desc, :dur, CAST(:vital AS jsonb),
                    :diag, :icd, :sev, :stat, :cat, :uat)
                ON CONFLICT (record_code) DO NOTHING
            """), {"id": record_id, "rc": record_code, "pid": pat_id, "creator": creator,
                   "cc": complaint, "desc": f"Bệnh nhân nhập viện với {complaint.lower()}.",
                   "dur": f"{random.randint(1,14)} ngày", "vital": vital,
                   "diag": diagnosis, "icd": icd, "sev": rec_severity, "stat": rec_status,
                   "cat": created_at, "uat": created_at})
            record_count += 1

            if rec_status in ("predicted", "confirmed", "archived"):
                pred_id = str(uuid.uuid4())
                dg_id = drug_group_ids[dg_idx % len(drug_group_ids)]
                conf = round(random.uniform(0.55, 0.98), 4)
                pred_groups = (
                    '[{"rank":1,"drug_group_id":"' + dg_id + '","confidence":' + str(conf) + '}]'
                )
                proc_ms = random.randint(180, 1200)
                await db.execute(text("""
                    INSERT INTO predictions (id, record_id, model_config_id, predicted_groups,
                        top1_group_id, top1_confidence, processing_time_ms, is_confirmed, created_at)
                    VALUES (:id, :rid, :mid, CAST(:pg AS jsonb), :gid, :conf, :proc, :confirmed, :cat)
                """), {"id": pred_id, "rid": record_id, "mid": model_id,
                       "pg": pred_groups, "gid": dg_id, "conf": conf,
                       "proc": proc_ms, "confirmed": rec_status == "confirmed",
                       "cat": created_at})
                pred_count += 1
        await db.commit()
        print(f"✓ Medical records: {record_count}, Predictions: {pred_count}")

        # ── 7. Tạo search_logs (daily usage 30 ngày) ─────────────────────────
        log_count = 0
        drug_names = [dg[0] for dg in DRUG_GROUPS]
        for day_offset in range(30):
            n_logs = random.randint(8, 35)
            for _ in range(n_logs):
                log_id = str(uuid.uuid4())
                ts = datetime.now() - timedelta(days=day_offset, hours=random.uniform(0, 23),
                                                minutes=random.uniform(0, 59))
                symptom = random.choice(SYMPTOMS_POPULAR)
                drug = random.choice(drug_names)
                conf = round(random.uniform(0.55, 0.97), 4)
                resp_ms = random.randint(150, 1500)
                await db.execute(text("""
                    INSERT INTO search_logs (id, endpoint, query_text, predicted_group,
                        confidence, response_time_ms, created_at)
                    VALUES (:id, '/api/v1/predictions/predict', :qt, :pg, :conf, :resp, :ts)
                    ON CONFLICT (id) DO NOTHING
                """), {"id": log_id, "qt": f"Bệnh nhân có triệu chứng {symptom}, kéo dài {random.randint(1,14)} ngày",
                       "pg": drug, "conf": conf, "resp": resp_ms, "ts": ts})
                log_count += 1
        await db.commit()
        print(f"✓ Search logs: {log_count} entries (30 ngày)")

        print("\n✅ Seed hoàn tất! Reload dashboard để xem data.")

if __name__ == "__main__":
    asyncio.run(run())
