# User Story - Database Design Mapping
# Dự án: Drug-Pred AI — Hệ thống dự đoán nhóm thuốc từ mô tả bệnh án tiếng Việt

---

## 1. Giới thiệu

Tài liệu này mô tả mối liên hệ giữa các User Story của hệ thống Drug-Pred AI và thiết kế cơ sở dữ liệu PostgreSQL tương ứng. Mục đích là giúp nhóm phát triển, QA và BA hiểu rõ từng chức năng nghiệp vụ được hỗ trợ bởi bảng nào, cột nào trong schema, từ đó đảm bảo tính nhất quán giữa yêu cầu sản phẩm và triển khai kỹ thuật.

---

## 2. Bảng tổng hợp Mapping

| User Story | Bảng DB liên quan | Cột / Field chính |
|---|---|---|
| Người dùng đăng ký tài khoản mới | `users` | `username`, `email`, `password_hash`, `full_name`, `role` |
| Người dùng đăng nhập vào hệ thống | `users` | `email`, `password_hash`, `is_active` |
| Admin phân quyền vai trò cho tài khoản | `users` | `role`, `is_active` |
| Admin kích hoạt / vô hiệu hóa tài khoản | `users` | `is_active`, `updated_at` |
| Nhân viên y tế tạo hồ sơ bệnh nhân mới | `patients`, `users` | `patient_code`, `full_name`, `date_of_birth`, `gender`, `allergies`, `chronic_diseases`, `created_by` |
| Nhân viên y tế tìm kiếm bệnh nhân | `patients` | `patient_code`, `full_name`, `date_of_birth` |
| Bác sĩ / y tá tạo bệnh án cho bệnh nhân | `medical_records`, `patients`, `users` | `record_code`, `patient_id`, `chief_complaint`, `description`, `vital_signs`, `severity`, `status`, `created_by` |
| Y tá ghi nhận triệu chứng vào bệnh án | `record_symptoms`, `symptoms`, `medical_records` | `record_id`, `symptom_id`, `severity`, `notes` |
| Bác sĩ tra cứu danh mục triệu chứng chuẩn | `symptoms` | `name`, `category`, `description` |
| Bác sĩ yêu cầu AI dự đoán nhóm thuốc | `predictions`, `medical_records`, `model_configs` | `record_id`, `model_config_id`, `predicted_groups`, `top1_group_id`, `top1_confidence`, `processing_time_ms` |
| Bác sĩ xem Top-3 nhóm thuốc được đề xuất | `predictions`, `drug_groups` | `predicted_groups`, `top1_group_id`, `top1_confidence` |
| Bác sĩ xác nhận hoặc chỉnh sửa kết quả dự đoán | `predictions`, `medical_records` | `is_confirmed`, `confirmed_group_id`, `confirmed_by`, `confirmed_at`, `doctor_feedback`, `feedback_rating`; `medical_records.status` |
| Admin / Researcher xem tổng quan thống kê dự đoán | `predictions`, `medical_records` | `is_confirmed`, `top1_group_id`, `created_at` |
| Admin xem phân phối nhóm thuốc được dự đoán | `predictions`, `drug_groups` | `top1_group_id`, `confirmed_group_id`, `predicted_groups` |
| Admin / Researcher xem độ chính xác mô hình | `model_metrics`, `model_configs` | `accuracy`, `f1_macro`, `precision_macro`, `recall_macro`, `per_class_metrics`, `dataset_split` |
| Researcher quản lý phiên bản mô hình AI | `model_configs` | `name`, `version`, `architecture`, `optimizer`, `hyperparameters`, `model_path`, `status`, `is_active` |
| Researcher kích hoạt phiên bản mô hình mới | `model_configs` | `is_active`, `status` |

---

## 3. Chi tiết từng chức năng

---

### 3.1. Quản lý người dùng

#### User Stories

- **US-01**: As an **anonymous user**, I want to register a new account with username, email and password so that I can access the system.
- **US-02**: As a **registered user**, I want to log in with my email and password so that I can use the system's features according to my role.
- **US-03**: As an **admin**, I want to assign or change a user's role (admin / doctor / nurse / researcher) so that each person has the appropriate access permissions.
- **US-04**: As an **admin**, I want to activate or deactivate a user account so that I can control access to the system without permanently deleting accounts.
- **US-05**: As a **registered user**, I want to update my personal information (full name, password) so that my profile stays up to date.

#### Mapping vào Database

**Bảng chính: `users`**

| User Story | Cột được sử dụng | Ghi chú |
|---|---|---|
| US-01 Đăng ký | `username`, `email`, `password_hash`, `full_name`, `role` | `role` mặc định là `'doctor'`; `password_hash` lưu bcrypt hash |
| US-02 Đăng nhập | `email`, `password_hash`, `is_active` | Kiểm tra `is_active = TRUE` trước khi xác thực |
| US-03 Phân quyền | `role`, `updated_at` | Constraint: `CHECK (role IN ('admin', 'doctor', 'nurse', 'researcher'))` |
| US-04 Kích hoạt / vô hiệu hóa | `is_active`, `updated_at` | Index `idx_users_active` hỗ trợ lọc tài khoản đang hoạt động |
| US-05 Cập nhật thông tin | `full_name`, `password_hash`, `updated_at` | Trigger `trg_users_updated` tự động cập nhật `updated_at` |

**Index hỗ trợ nghiệp vụ:**
- `idx_users_email` — tra cứu nhanh khi đăng nhập
- `idx_users_role` — lọc danh sách theo vai trò trong trang quản trị
- `idx_users_active` (partial index WHERE is_active = TRUE) — tối ưu truy vấn danh sách tài khoản hoạt động

---

### 3.2. Quản lý bệnh nhân và hồ sơ bệnh án

#### User Stories

- **US-10**: As a **nurse**, I want to create a new patient profile with basic personal information so that the patient is registered in the system.
- **US-11**: As a **doctor or nurse**, I want to search for a patient by patient code, name, or date of birth so that I can quickly find the right patient record.
- **US-12**: As a **doctor or nurse**, I want to update a patient's allergy and chronic disease information so that the system always has accurate medical history.
- **US-13**: As a **doctor**, I want to create a new medical record for a patient including chief complaint, description, and vital signs so that the clinical encounter is documented.
- **US-14**: As a **nurse**, I want to select symptoms from a standardized symptom catalog and attach them to a medical record with severity level so that the record contains structured symptom data.
- **US-15**: As a **doctor**, I want to view the full list of medical records for a patient in chronological order so that I can track the patient's medical history.
- **US-16**: As a **doctor**, I want to update the status of a medical record (pending / predicted / confirmed / archived) so that the workflow state is clearly tracked.

#### Mapping vào Database

**Bảng liên quan: `patients`, `medical_records`, `symptoms`, `record_symptoms`, `users`**

**Bảng `patients`:**

| User Story | Cột được sử dụng | Ghi chú |
|---|---|---|
| US-10 Tạo hồ sơ BN | `patient_code`, `full_name`, `date_of_birth`, `gender`, `phone`, `address`, `blood_type`, `allergies`, `chronic_diseases`, `created_by` | `patient_code` dạng `BN-00001`; `allergies` và `chronic_diseases` là `TEXT[]` |
| US-11 Tìm kiếm BN | `patient_code`, `full_name`, `date_of_birth` | Index `idx_patients_code`, `idx_patients_name`, `idx_patients_dob` |
| US-12 Cập nhật BN | `allergies`, `chronic_diseases`, `updated_at` | Trigger `trg_patients_updated` |

**Bảng `medical_records`:**

| User Story | Cột được sử dụng | Ghi chú |
|---|---|---|
| US-13 Tạo bệnh án | `record_code`, `patient_id`, `created_by`, `chief_complaint`, `description`, `symptoms_duration`, `vital_signs`, `diagnosis`, `diagnosis_icd`, `severity` | `vital_signs` là JSONB: `temperature`, `blood_pressure`, `heart_rate`, `respiratory_rate`, `spo2` |
| US-15 Lịch sử bệnh án | `patient_id`, `created_at` | Index `idx_records_patient`, `idx_records_created` |
| US-16 Cập nhật status | `status`, `updated_at` | Constraint: `CHECK (status IN ('pending', 'predicted', 'confirmed', 'archived'))` |

**Bảng `symptoms` và `record_symptoms`:**

| User Story | Cột được sử dụng | Ghi chú |
|---|---|---|
| US-14 Gắn triệu chứng | `symptoms.name`, `symptoms.category`; `record_symptoms.record_id`, `record_symptoms.symptom_id`, `record_symptoms.severity`, `record_symptoms.notes` | Quan hệ N:N; PK composite `(record_id, symptom_id)` |

---

### 3.3. Dự đoán nhóm thuốc AI

#### User Stories

- **US-20**: As a **doctor**, I want to submit a medical record to the AI model and receive a prediction of the Top-3 drug groups so that I have data-driven recommendations to support my clinical decision.
- **US-21**: As a **doctor**, I want to see each predicted drug group displayed with its confidence score and rank so that I can evaluate the reliability of each recommendation.
- **US-22**: As a **doctor**, I want to confirm the correct drug group from the Top-3 suggestions (or enter a different one) so that the confirmed result is saved for training data and audit purposes.
- **US-23**: As a **doctor**, I want to leave written feedback and a quality rating (1–5) on the AI prediction so that the team can track model quality and patient safety issues.
- **US-24**: As a **researcher**, I want to view details of each prediction including which model version was used so that I can trace results to a specific model configuration.
- **US-25**: As a **doctor**, I want the system to record how long the AI took to process each prediction so that latency issues can be monitored and reported.

#### Mapping vào Database

**Bảng chính: `predictions`**
**Bảng hỗ trợ: `medical_records`, `model_configs`, `drug_groups`, `users`**

| User Story | Cột được sử dụng | Ghi chú |
|---|---|---|
| US-20 Gửi yêu cầu dự đoán | `record_id`, `model_config_id`, `predicted_groups`, `top1_group_id`, `top1_confidence` | `predicted_groups` là JSONB: `[{"drug_group_id": "...", "confidence": 0.87, "rank": 1}, ...]` |
| US-21 Hiển thị Top-3 + confidence | `predicted_groups`, `top1_group_id`, `top1_confidence` | Join với `drug_groups` để lấy tên và mô tả nhóm thuốc |
| US-22 Bác sĩ xác nhận kết quả | `is_confirmed`, `confirmed_group_id`, `confirmed_by`, `confirmed_at` | `confirmed_group_id` có thể khác `top1_group_id` nếu bác sĩ chọn khác |
| US-23 Phản hồi và đánh giá | `doctor_feedback`, `feedback_rating` | `feedback_rating`: SMALLINT 1–5 |
| US-24 Truy vết phiên bản mô hình | `model_config_id` | FK tới `model_configs`; join để lấy `name`, `version`, `architecture` |
| US-25 Ghi nhận thời gian xử lý | `processing_time_ms` | Đơn vị milliseconds; dùng cho giám sát latency |

**Quan hệ giữa `medical_records.status` và `predictions`:**

Khi một dự đoán mới được tạo, `medical_records.status` chuyển từ `'pending'` sang `'predicted'`. Sau khi bác sĩ xác nhận (`is_confirmed = TRUE`), status chuyển sang `'confirmed'`. Đây là luồng trạng thái quan trọng nối hai bảng.

**Bảng `drug_groups` — vai trò trong chức năng dự đoán:**

| Cột | Vai trò |
|---|---|
| `id` | FK trong `predictions.top1_group_id` và `predictions.confirmed_group_id` |
| `name`, `code` | Hiển thị tên nhóm thuốc cho bác sĩ |
| `common_drugs` | Gợi ý các thuốc cụ thể thuộc nhóm được đề xuất |
| `contraindications`, `side_effects` | Cảnh báo lâm sàng đi kèm kết quả dự đoán |

---

### 3.4. Thống kê và Analytics

#### User Stories

- **US-30**: As an **admin**, I want to see a dashboard showing total number of predictions, total patients, and total medical records so that I have an overview of system usage.
- **US-31**: As an **admin or researcher**, I want to see a breakdown of predictions by drug group so that I can understand which drug groups are most frequently recommended.
- **US-32**: As an **admin or researcher**, I want to see the model's accuracy, F1-score, precision, and recall for each dataset split (train / validation / test) so that I can assess model quality.
- **US-33**: As a **researcher**, I want to compare metrics across different model versions so that I can determine which version performs best before activating it.
- **US-34**: As an **admin**, I want to see confirmation rates (what percentage of predictions were confirmed as correct by doctors) so that I can monitor the model's clinical utility.
- **US-35**: As a **researcher**, I want to view per-class metrics (precision, recall, F1 for each drug group) so that I can identify which drug groups the model predicts poorly.

#### Mapping vào Database

**Bảng liên quan: `predictions`, `medical_records`, `patients`, `drug_groups`, `model_metrics`, `model_configs`**

**Thống kê tổng quan (US-30):**

| Chỉ số | Bảng | Cột / Phép tính |
|---|---|---|
| Tổng dự đoán | `predictions` | `COUNT(id)` |
| Tổng bệnh nhân | `patients` | `COUNT(id)` |
| Tổng bệnh án | `medical_records` | `COUNT(id)` |
| Dự đoán đã xác nhận | `predictions` | `COUNT(*) WHERE is_confirmed = TRUE` |

**Phân phối nhóm thuốc (US-31):**

| Phân tích | Bảng | Cột / Phép tính |
|---|---|---|
| Nhóm thuốc được dự đoán nhiều nhất | `predictions`, `drug_groups` | `GROUP BY top1_group_id`, join tên qua `drug_groups.name` |
| Nhóm thuốc được xác nhận nhiều nhất | `predictions`, `drug_groups` | `GROUP BY confirmed_group_id WHERE is_confirmed = TRUE` |

**Độ chính xác mô hình (US-32, US-33, US-35):**

| Chỉ số | Bảng | Cột |
|---|---|---|
| Accuracy, F1, Precision, Recall | `model_metrics` | `accuracy`, `f1_macro`, `precision_macro`, `recall_macro` |
| Lọc theo split | `model_metrics` | `dataset_split` (train / validation / test) |
| So sánh theo phiên bản | `model_metrics`, `model_configs` | Join qua `model_config_id`; lấy `model_configs.name`, `version` |
| Metrics từng nhóm thuốc | `model_metrics` | `per_class_metrics` (JSONB) |
| Confusion matrix | `model_metrics` | `confusion_matrix` (JSONB) |

**Tỷ lệ xác nhận (US-34):**

| Phân tích | Bảng | Cột / Phép tính |
|---|---|---|
| Tỷ lệ xác nhận đúng (top1 = confirmed) | `predictions` | `COUNT(*) WHERE is_confirmed = TRUE AND top1_group_id = confirmed_group_id` / `COUNT(*) WHERE is_confirmed = TRUE` |
| Điểm đánh giá trung bình của bác sĩ | `predictions` | `AVG(feedback_rating) WHERE feedback_rating IS NOT NULL` |

---

## 4. Biểu đồ luồng nghiệp vụ

---

### 4.1. Luồng Quản lý người dùng

```
[Anonymous User]
    |
    v
Nhập username / email / password
    |
    v
[POST /auth/register]
    |
    +--> INSERT INTO users (username, email, password_hash, full_name, role='doctor')
    |
    v
Đăng nhập: [POST /auth/login]
    |
    +--> SELECT * FROM users WHERE email = ? AND is_active = TRUE
    |         |
    |    Khớp password_hash?
    |         |-- Không --> Trả lỗi 401
    |         |-- Có   --> Trả JWT token
    |
    v
[Admin] Phân quyền
    |
    +--> UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?
    |
    v
[Admin] Vô hiệu hóa tài khoản
    |
    +--> UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = ?
```

---

### 4.2. Luồng Quản lý bệnh nhân và hồ sơ bệnh án

```
[Nurse / Doctor]
    |
    v
Tạo hồ sơ bệnh nhân
    |
    +--> INSERT INTO patients (patient_code, full_name, date_of_birth, gender,
    |                          allergies, chronic_diseases, created_by)
    |
    v
Tìm kiếm bệnh nhân (theo code / tên / ngày sinh)
    |
    +--> SELECT * FROM patients WHERE patient_code = ? OR full_name ILIKE ?
    |
    v
Tạo bệnh án mới
    |
    +--> INSERT INTO medical_records (record_code, patient_id, created_by,
    |                                 chief_complaint, vital_signs, severity,
    |                                 status='pending')
    |
    v
Gắn triệu chứng vào bệnh án
    |
    +--> Chọn từ SELECT * FROM symptoms WHERE category = ?
    |
    +--> INSERT INTO record_symptoms (record_id, symptom_id, severity, notes)
    |
    v
Bệnh án sẵn sàng để dự đoán (status = 'pending')
```

---

### 4.3. Luồng Dự đoán nhóm thuốc AI

```
[Doctor]
    |
    v
Chọn bệnh án (medical_records.status = 'pending')
    |
    v
Gửi yêu cầu dự đoán
    |
    +--> Lấy model đang active:
    |    SELECT * FROM model_configs WHERE is_active = TRUE
    |
    +--> AI xử lý chief_complaint + symptoms (từ record_symptoms)
    |
    +--> INSERT INTO predictions (
    |        record_id, model_config_id,
    |        predicted_groups,        -- JSONB Top-3
    |        top1_group_id,
    |        top1_confidence,
    |        processing_time_ms
    |    )
    |
    +--> UPDATE medical_records SET status = 'predicted' WHERE id = ?
    |
    v
Bác sĩ xem kết quả Top-3
    |
    +--> SELECT p.predicted_groups, dg.name, dg.common_drugs, dg.contraindications
    |    FROM predictions p
    |    JOIN drug_groups dg ON dg.id = p.top1_group_id
    |    WHERE p.record_id = ?
    |
    v
Bác sĩ xác nhận kết quả
    |
    +--> UPDATE predictions SET
    |        is_confirmed = TRUE,
    |        confirmed_group_id = ?,     -- Có thể là top1 hoặc nhóm khác
    |        confirmed_by = ?,
    |        confirmed_at = NOW(),
    |        doctor_feedback = ?,
    |        feedback_rating = ?
    |    WHERE id = ?
    |
    +--> UPDATE medical_records SET status = 'confirmed' WHERE id = ?
    |
    v
Bệnh án hoàn tất
```

---

### 4.4. Luồng Thống kê và Analytics

```
[Admin / Researcher]
    |
    v
Truy cập Dashboard
    |
    +-- Tổng quan -------------------------------------------------+
    |   SELECT COUNT(*) FROM predictions                           |
    |   SELECT COUNT(*) FROM patients                              |
    |   SELECT COUNT(*) FROM medical_records                       |
    |   SELECT COUNT(*) FROM predictions WHERE is_confirmed = TRUE |
    +--------------------------------------------------------------+
    |
    +-- Phân phối nhóm thuốc --------------------------------+
    |   SELECT dg.name, COUNT(p.id) AS total                 |
    |   FROM predictions p                                   |
    |   JOIN drug_groups dg ON dg.id = p.top1_group_id       |
    |   GROUP BY dg.name ORDER BY total DESC                 |
    +--------------------------------------------------------+
    |
    +-- Độ chính xác mô hình -------------------------------------------+
    |   SELECT mc.name, mc.version, mm.dataset_split,                   |
    |          mm.accuracy, mm.f1_macro, mm.precision_macro,            |
    |          mm.recall_macro, mm.per_class_metrics                    |
    |   FROM model_metrics mm                                           |
    |   JOIN model_configs mc ON mc.id = mm.model_config_id            |
    |   ORDER BY mc.version DESC, mm.dataset_split                     |
    +-------------------------------------------------------------------+
    |
    +-- Tỷ lệ xác nhận -----------------------------------------------+
    |   SELECT                                                          |
    |     SUM(CASE WHEN is_confirmed THEN 1 ELSE 0 END)::FLOAT         |
    |       / COUNT(*) AS confirmation_rate,                            |
    |     AVG(feedback_rating) AS avg_rating                           |
    |   FROM predictions                                               |
    +------------------------------------------------------------------+
```

---

## 5. Tóm tắt quan hệ giữa các bảng theo chức năng

```
QUAN LY NGUOI DUNG
    users
        |
        |-- created_by --> patients
        |-- created_by --> medical_records
        |-- trained_by --> model_configs
        |-- confirmed_by --> predictions

QUAN LY BENH NHAN & BENH AN
    patients
        |
        +-- patient_id --> medical_records
                              |
                              +-- record_id --> record_symptoms <-- symptom_id -- symptoms
                              |
                              +-- record_id --> predictions

DU DOAN AI
    model_configs (is_active = TRUE)
        |
        +-- model_config_id --> predictions
                                    |
                                    +-- top1_group_id -------> drug_groups
                                    +-- confirmed_group_id --> drug_groups

THONG KE & ANALYTICS
    model_configs
        |
        +-- model_config_id --> model_metrics
                                    (accuracy, f1_macro, precision_macro,
                                     recall_macro, per_class_metrics, confusion_matrix)

    predictions --> drug_groups  (phan phoi nhom thuoc)
    predictions                  (ti le xac nhan, feedback_rating)
```
