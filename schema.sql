-- ============================================================
-- pj-medicine — Database Schema (PostgreSQL 15+)
-- Hệ thống dự đoán nhóm thuốc từ mô tả bệnh án ngắn
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ============================================================
-- 1. USERS — Người dùng hệ thống
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(50)  UNIQUE NOT NULL,
    email           VARCHAR(100) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'doctor'
                    CHECK (role IN ('admin', 'doctor', 'nurse', 'researcher')),
    is_active       BOOLEAN      DEFAULT TRUE,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role   ON users(role);
CREATE INDEX idx_users_email  ON users(email);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- ============================================================
-- 2. PATIENTS — Bệnh nhân
-- ============================================================
CREATE TABLE patients (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_code     VARCHAR(20) UNIQUE NOT NULL,          -- BN-00001
    full_name        VARCHAR(100) NOT NULL,
    date_of_birth    DATE         NOT NULL,
    gender           VARCHAR(10)  NOT NULL
                     CHECK (gender IN ('male', 'female', 'other')),
    phone            VARCHAR(15),
    address          TEXT,
    blood_type       VARCHAR(5)
                     CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    allergies        TEXT[],
    chronic_diseases TEXT[],
    created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_patients_code ON patients(patient_code);
CREATE INDEX idx_patients_name ON patients(full_name);
CREATE INDEX idx_patients_dob  ON patients(date_of_birth);
CREATE INDEX idx_patients_created_by ON patients(created_by);

-- ============================================================
-- 3. SYMPTOMS — Danh mục triệu chứng
-- ============================================================
CREATE TABLE symptoms (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(100) UNIQUE NOT NULL,             -- "sốt cao"
    category     VARCHAR(50)  NOT NULL,                    -- "toàn thân", "hô hấp"
    description  TEXT,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_symptoms_category ON symptoms(category);

-- ============================================================
-- 4. MEDICAL_RECORDS — Bệnh án
-- ============================================================
CREATE TABLE medical_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_code         VARCHAR(30) UNIQUE NOT NULL,       -- BA-2026-00001
    patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    created_by          UUID NOT NULL REFERENCES users(id),

    -- Mô tả bệnh án
    chief_complaint     TEXT NOT NULL,                     -- Triệu chứng chính
    description         TEXT,                              -- Mô tả chi tiết
    symptoms_duration   VARCHAR(50),                       -- "3 ngày", "1 tuần"

    -- Sinh hiệu (JSONB linh hoạt)
    vital_signs         JSONB,
    -- {
    --   "temperature": 38.5,
    --   "blood_pressure": "120/80",
    --   "heart_rate": 85,
    --   "respiratory_rate": 20,
    --   "spo2": 98
    -- }

    diagnosis           VARCHAR(200),
    diagnosis_icd       VARCHAR(10),                       -- Mã ICD-10
    severity            VARCHAR(20) DEFAULT 'mild'
                        CHECK (severity IN ('mild', 'moderate', 'severe', 'critical')),
    status              VARCHAR(20) DEFAULT 'pending'
                        CHECK (status IN ('pending', 'predicted', 'confirmed', 'archived')),

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_records_patient ON medical_records(patient_id);
CREATE INDEX idx_records_creator ON medical_records(created_by);
CREATE INDEX idx_records_status  ON medical_records(status);
CREATE INDEX idx_records_icd     ON medical_records(diagnosis_icd);
CREATE INDEX idx_records_created ON medical_records(created_at DESC);

-- ============================================================
-- 5. RECORD_SYMPTOMS — Bệnh án ↔ Triệu chứng (N:N)
-- ============================================================
CREATE TABLE record_symptoms (
    record_id   UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    symptom_id  UUID NOT NULL REFERENCES symptoms(id)        ON DELETE CASCADE,
    severity    VARCHAR(20) DEFAULT 'moderate'
                CHECK (severity IN ('mild', 'moderate', 'severe')),
    notes       TEXT,
    PRIMARY KEY (record_id, symptom_id)
);

CREATE INDEX idx_record_symptoms_symptom ON record_symptoms(symptom_id);

-- ============================================================
-- 6. DRUG_GROUPS — Nhóm thuốc
-- ============================================================
CREATE TABLE drug_groups (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(100) UNIQUE NOT NULL,        -- "Kháng sinh - Penicillin"
    code              VARCHAR(20)  UNIQUE NOT NULL,        -- "ATC-J01CA04"
    category          VARCHAR(100) NOT NULL,               -- "Kháng sinh", "Giảm đau"
    description       TEXT,
    common_drugs      TEXT[],                              -- ["Amoxicillin", "Ampicillin"]
    contraindications TEXT[],                              -- Chống chỉ định
    side_effects      TEXT[],                              -- Tác dụng phụ
    is_active         BOOLEAN   DEFAULT TRUE,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_drug_groups_category ON drug_groups(category);
CREATE INDEX idx_drug_groups_code     ON drug_groups(code);
CREATE INDEX idx_drug_groups_active   ON drug_groups(is_active) WHERE is_active = TRUE;

-- ============================================================
-- 7. MODEL_CONFIGS — Cấu hình mô hình ML
-- ============================================================
CREATE TABLE model_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,                 -- "Mamba-v1-classifier"
    version         VARCHAR(20)  NOT NULL,                 -- "1.0.0"
    architecture    VARCHAR(50)  NOT NULL,                 -- "mamba", "transformer", "lstm"
    optimizer       VARCHAR(50)  NOT NULL,                 -- "adamw", "lion", "soap"
    hyperparameters JSONB        NOT NULL,
    -- {
    --   "learning_rate": 0.0001,
    --   "batch_size": 32,
    --   "epochs": 50,
    --   "hidden_dim": 256,
    --   "num_layers": 4,
    --   "dropout": 0.1
    -- }
    model_path      VARCHAR(255),                          -- Đường dẫn file weights
    training_dataset VARCHAR(255),                         -- Dataset dùng để train
    status          VARCHAR(20) DEFAULT 'draft'
                    CHECK (status IN ('draft', 'training', 'ready', 'deprecated')),
    is_active       BOOLEAN   DEFAULT FALSE,
    trained_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_model_name_version UNIQUE (name, version)
);

CREATE INDEX idx_model_configs_arch    ON model_configs(architecture);
CREATE INDEX idx_model_configs_status  ON model_configs(status);
-- Chỉ 1 model active tại 1 thời điểm
CREATE UNIQUE INDEX idx_model_configs_active
    ON model_configs(is_active) WHERE is_active = TRUE;

-- ============================================================
-- 8. PREDICTIONS — Kết quả dự đoán
-- ============================================================
CREATE TABLE predictions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id           UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    model_config_id     UUID NOT NULL REFERENCES model_configs(id),

    -- Top-N dự đoán
    predicted_groups    JSONB NOT NULL,
    -- [
    --   {"drug_group_id": "uuid-1", "confidence": 0.87, "rank": 1},
    --   {"drug_group_id": "uuid-2", "confidence": 0.45, "rank": 2},
    --   {"drug_group_id": "uuid-3", "confidence": 0.12, "rank": 3}
    -- ]

    top1_group_id       UUID REFERENCES drug_groups(id),
    top1_confidence     DECIMAL(5,4),                     -- 0.0000 → 1.0000
    processing_time_ms  INTEGER,                          -- Thời gian xử lý

    -- Xác nhận bởi bác sĩ
    is_confirmed        BOOLEAN DEFAULT FALSE,
    confirmed_group_id  UUID REFERENCES drug_groups(id),
    confirmed_by        UUID REFERENCES users(id),
    confirmed_at        TIMESTAMP,
    doctor_feedback     TEXT,
    feedback_rating     SMALLINT CHECK (feedback_rating BETWEEN 1 AND 5),

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_predictions_record    ON predictions(record_id);
CREATE INDEX idx_predictions_model     ON predictions(model_config_id);
CREATE INDEX idx_predictions_top1      ON predictions(top1_group_id);
CREATE INDEX idx_predictions_confirmed ON predictions(is_confirmed);
CREATE INDEX idx_predictions_created   ON predictions(created_at DESC);

-- ============================================================
-- 9. MODEL_METRICS — Kết quả đánh giá mô hình
-- ============================================================
CREATE TABLE model_metrics (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_config_id     UUID NOT NULL REFERENCES model_configs(id) ON DELETE CASCADE,
    dataset_split       VARCHAR(20) NOT NULL
                        CHECK (dataset_split IN ('train', 'validation', 'test')),
    accuracy            DECIMAL(5,4),
    precision_macro     DECIMAL(5,4),
    recall_macro        DECIMAL(5,4),
    f1_macro            DECIMAL(5,4),
    confusion_matrix    JSONB,
    per_class_metrics   JSONB,
    -- {
    --   "Kháng sinh":   {"precision": 0.92, "recall": 0.88, "f1": 0.90},
    --   "Giảm đau":     {"precision": 0.85, "recall": 0.91, "f1": 0.88},
    --   "Chống viêm":   {"precision": 0.80, "recall": 0.75, "f1": 0.77}
    -- }
    evaluated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_metrics_model ON model_metrics(model_config_id);
CREATE INDEX idx_metrics_split ON model_metrics(dataset_split);

-- ============================================================
-- TRIGGERS — Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_patients_updated
    BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_records_updated
    BEFORE UPDATE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_model_configs_updated
    BEFORE UPDATE ON model_configs
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- COMMENTS — Ghi chú mô tả bảng & cột
-- ============================================================
COMMENT ON TABLE users             IS 'Người dùng hệ thống';
COMMENT ON TABLE patients          IS 'Thông tin bệnh nhân';
COMMENT ON TABLE symptoms          IS 'Danh mục triệu chứng';
COMMENT ON TABLE medical_records   IS 'Bệnh án — mô tả bệnh án ngắn';
COMMENT ON TABLE record_symptoms   IS 'Quan hệ N:N giữa bệnh án và triệu chứng';
COMMENT ON TABLE drug_groups       IS 'Nhóm thuốc (classification targets)';
COMMENT ON TABLE model_configs     IS 'Cấu hình & siêu tham số mô hình ML';
COMMENT ON TABLE predictions       IS 'Kết quả dự đoán nhóm thuốc từ mô hình ML';
COMMENT ON TABLE model_metrics     IS 'Metrics đánh giá mô hình trên từng split';

COMMENT ON COLUMN medical_records.vital_signs     IS 'Sinh hiệu dạng JSONB';
COMMENT ON COLUMN predictions.predicted_groups    IS 'Top-N dự đoán dạng JSONB';
COMMENT ON COLUMN model_configs.hyperparameters   IS 'Siêu tham số dạng JSONB';
COMMENT ON COLUMN model_metrics.per_class_metrics IS 'Metrics từng lớp dạng JSONB';
