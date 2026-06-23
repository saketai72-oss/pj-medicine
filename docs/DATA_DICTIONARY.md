# Data Dictionary — Drug-Pred AI

**Dự án:** Drug-Pred AI — Hệ thống dự đoán nhóm thuốc từ mô tả bệnh án tiếng Việt  
**Cơ sở dữ liệu:** PostgreSQL  
**Ngày cập nhật:** 2026-06-23  
**Phiên bản schema:** 1.0

---

## Giới thiệu

Tài liệu này mô tả chi tiết cấu trúc dữ liệu của hệ thống Drug-Pred AI, bao gồm toàn bộ các bảng trong cơ sở dữ liệu PostgreSQL, ý nghĩa nghiệp vụ của từng cột, các ràng buộc dữ liệu, và danh sách indexes. Hệ thống xử lý quy trình từ tiếp nhận bệnh nhân, ghi nhận triệu chứng, đến dự đoán nhóm thuốc phù hợp bằng mô hình học máy, và lưu trữ kết quả đánh giá phản hồi từ bác sĩ.

Schema được khởi tạo trực tiếp từ file `schema.sql`, không sử dụng Alembic migration.

---

## Danh sách bảng

1. [users](#1-bảng-users)
2. [patients](#2-bảng-patients)
3. [symptoms](#3-bảng-symptoms)
4. [medical_records](#4-bảng-medical_records)
5. [record_symptoms](#5-bảng-record_symptoms)
6. [drug_groups](#6-bảng-drug_groups)
7. [model_configs](#7-bảng-model_configs)
8. [predictions](#8-bảng-predictions)
9. [model_metrics](#9-bảng-model_metrics)

---

## 1. Bảng `users`

Lưu trữ thông tin tài khoản người dùng hệ thống. Người dùng có thể là quản trị viên, bác sĩ, điều dưỡng hoặc nhà nghiên cứu, mỗi vai trò có phân quyền truy cập khác nhau.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Giá trị mặc định | Mô tả nghiệp vụ |
|---|---|---|---|---|
| `id` | UUID | PRIMARY KEY | gen_random_uuid() | Định danh duy nhất của tài khoản người dùng |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | — | Tên đăng nhập, dùng để xác thực; không phân biệt hoa thường theo quy ước |
| `email` | VARCHAR(100) | UNIQUE, NOT NULL | — | Địa chỉ email, dùng để thông báo và khôi phục mật khẩu |
| `password_hash` | VARCHAR(255) | NOT NULL | — | Chuỗi băm mật khẩu (bcrypt); không lưu mật khẩu dạng thô |
| `full_name` | VARCHAR(100) | NOT NULL | — | Họ và tên đầy đủ của người dùng, hiển thị trên giao diện |
| `role` | VARCHAR(20) | CHECK (admin / doctor / nurse / researcher) | doctor | Vai trò xác định phân quyền: admin quản trị toàn hệ thống; doctor xem và xác nhận dự đoán; nurse nhập liệu bệnh án; researcher xem báo cáo và chỉ số mô hình |
| `is_active` | BOOLEAN | — | TRUE | Trạng thái hoạt động; FALSE khi tài khoản bị vô hiệu hóa (không xóa cứng) |
| `created_at` | TIMESTAMP | — | NOW() | Thời điểm tạo tài khoản (UTC) |
| `updated_at` | TIMESTAMP | — | NOW() | Thời điểm cập nhật thông tin tài khoản gần nhất (UTC) |

---

## 2. Bảng `patients`

Lưu trữ hồ sơ nhân khẩu học của bệnh nhân. Mỗi bệnh nhân có một mã định danh riêng theo quy tắc của cơ sở y tế.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Giá trị mặc định | Mô tả nghiệp vụ |
|---|---|---|---|---|
| `id` | UUID | PRIMARY KEY | gen_random_uuid() | Định danh duy nhất nội bộ của bệnh nhân |
| `patient_code` | VARCHAR(20) | UNIQUE, NOT NULL | — | Mã bệnh nhân theo định dạng BN-00001; sinh tự động tuần tự khi tạo mới |
| `full_name` | VARCHAR(100) | NOT NULL | — | Họ và tên đầy đủ của bệnh nhân theo giấy tờ tùy thân |
| `date_of_birth` | DATE | NOT NULL | — | Ngày sinh; dùng để tính tuổi và hỗ trợ cảnh báo liều lượng theo độ tuổi |
| `gender` | VARCHAR(10) | CHECK (male / female / other) | — | Giới tính sinh học; ảnh hưởng đến một số phác đồ điều trị |
| `phone` | VARCHAR(15) | — | NULL | Số điện thoại liên hệ; lưu theo định dạng quốc tế hoặc nội địa |
| `address` | TEXT | — | NULL | Địa chỉ thường trú đầy đủ |
| `blood_type` | VARCHAR(5) | CHECK (A+ / A- / B+ / B- / AB+ / AB- / O+ / O-) | NULL | Nhóm máu theo hệ ABO kết hợp Rh; quan trọng trong xử lý cấp cứu |
| `allergies` | TEXT[] | — | NULL | Danh sách các dị ứng đã biết (thuốc, thực phẩm, hóa chất); mỗi phần tử là một chuỗi mô tả |
| `chronic_diseases` | TEXT[] | — | NULL | Danh sách bệnh mãn tính (ví dụ: tiểu đường type 2, tăng huyết áp); hỗ trợ bộ lọc chống chỉ định |
| `created_by` | UUID | FOREIGN KEY -> users(id) | — | ID người dùng đã tạo hồ sơ bệnh nhân |
| `created_at` | TIMESTAMP | — | NOW() | Thời điểm tạo hồ sơ (UTC) |
| `updated_at` | TIMESTAMP | — | NOW() | Thời điểm cập nhật hồ sơ gần nhất (UTC) |

---

## 3. Bảng `symptoms`

Danh mục triệu chứng chuẩn hóa dùng chung toàn hệ thống. Các triệu chứng được phân loại theo nhóm cơ quan hoặc hội chứng lâm sàng.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Giá trị mặc định | Mô tả nghiệp vụ |
|---|---|---|---|---|
| `id` | UUID | PRIMARY KEY | gen_random_uuid() | Định danh duy nhất của triệu chứng |
| `name` | VARCHAR(100) | UNIQUE, NOT NULL | — | Tên triệu chứng bằng tiếng Việt, ví dụ: "sốt cao", "đau ngực"; chuẩn hóa để tránh trùng lặp |
| `category` | VARCHAR(50) | NOT NULL | — | Nhóm phân loại triệu chứng theo hệ cơ quan, ví dụ: "toàn thân", "hô hấp", "tim mạch", "tiêu hóa" |
| `description` | TEXT | — | NULL | Mô tả lâm sàng chi tiết về triệu chứng, cách nhận biết và đặc điểm phân biệt |
| `created_at` | TIMESTAMP | — | NOW() | Thời điểm thêm triệu chứng vào danh mục (UTC) |

---

## 4. Bảng `medical_records`

Bảng trung tâm của hệ thống, lưu trữ bệnh án của từng lần khám. Mỗi bệnh án gắn với một bệnh nhân và chứa toàn bộ thông tin lâm sàng cần thiết để mô hình thực hiện dự đoán.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Giá trị mặc định | Mô tả nghiệp vụ |
|---|---|---|---|---|
| `id` | UUID | PRIMARY KEY | gen_random_uuid() | Định danh duy nhất của bệnh án |
| `record_code` | VARCHAR(30) | UNIQUE, NOT NULL | — | Mã bệnh án theo định dạng BA-2026-00001; bao gồm năm để dễ tra cứu và phân loại theo kỳ |
| `patient_id` | UUID | FOREIGN KEY -> patients(id) ON DELETE CASCADE, NOT NULL | — | Bệnh nhân mà bệnh án này thuộc về |
| `created_by` | UUID | FOREIGN KEY -> users(id) | — | Người dùng (bác sĩ/điều dưỡng) đã tạo bệnh án |
| `chief_complaint` | TEXT | NOT NULL | — | Lý do khám chính do bệnh nhân trình bày; đây là đầu vào ngôn ngữ tự nhiên tiếng Việt chủ yếu cho mô hình AI |
| `description` | TEXT | — | NULL | Mô tả chi tiết bổ sung về tình trạng bệnh, tiền sử liên quan, diễn biến |
| `symptoms_duration` | VARCHAR(50) | — | NULL | Thời gian xuất hiện triệu chứng tính đến khi khám, ví dụ: "3 ngày", "2 tuần" |
| `vital_signs` | JSONB | — | NULL | Dấu hiệu sinh tồn đo tại thời điểm khám; cấu trúc: `{"temperature": float, "blood_pressure": "120/80", "heart_rate": int, "respiratory_rate": int, "spo2": float}` |
| `diagnosis` | VARCHAR(200) | — | NULL | Chẩn đoán lâm sàng bằng văn bản tự do, điền sau khi bác sĩ xem xét kết quả |
| `diagnosis_icd` | VARCHAR(10) | — | NULL | Mã bệnh theo tiêu chuẩn ICD-10 (ví dụ: J06.9); dùng để tích hợp với hệ thống báo cáo y tế quốc gia |
| `severity` | VARCHAR(20) | CHECK (mild / moderate / severe / critical) | mild | Mức độ nặng của bệnh theo đánh giá lâm sàng: nhẹ / trung bình / nặng / nguy kịch |
| `status` | VARCHAR(20) | CHECK (pending / predicted / confirmed / archived) | pending | Trạng thái xử lý bệnh án: pending (chờ dự đoán), predicted (đã có kết quả AI), confirmed (bác sĩ đã xác nhận), archived (lưu trữ) |
| `created_at` | TIMESTAMP | — | NOW() | Thời điểm tạo bệnh án (UTC) |
| `updated_at` | TIMESTAMP | — | NOW() | Thời điểm cập nhật bệnh án gần nhất (UTC) |

---

## 5. Bảng `record_symptoms`

Bảng liên kết nhiều-nhiều (N:N) giữa bệnh án và triệu chứng. Cho phép một bệnh án ghi nhận nhiều triệu chứng và mỗi triệu chứng có thể có mức độ biểu hiện khác nhau.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Giá trị mặc định | Mô tả nghiệp vụ |
|---|---|---|---|---|
| `record_id` | UUID | PRIMARY KEY (cùng symptom_id), FOREIGN KEY -> medical_records(id) ON DELETE CASCADE | — | ID bệnh án chứa triệu chứng này |
| `symptom_id` | UUID | PRIMARY KEY (cùng record_id), FOREIGN KEY -> symptoms(id) ON DELETE CASCADE | — | ID triệu chứng được ghi nhận trong bệnh án |
| `severity` | VARCHAR(20) | CHECK (mild / moderate / severe) | moderate | Mức độ biểu hiện của triệu chứng cụ thể trong bệnh án này; có thể khác với severity của bệnh án tổng thể |
| `notes` | TEXT | — | NULL | Ghi chú bổ sung về biểu hiện cụ thể của triệu chứng, ví dụ: "sốt về chiều, kèm rét run" |

---

## 6. Bảng `drug_groups`

Danh mục nhóm thuốc chuẩn hóa theo phân loại ATC (Anatomical Therapeutic Chemical). Đây là tập nhãn (labels) mà mô hình AI dự đoán ra.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Giá trị mặc định | Mô tả nghiệp vụ |
|---|---|---|---|---|
| `id` | UUID | PRIMARY KEY | gen_random_uuid() | Định danh duy nhất nội bộ của nhóm thuốc |
| `name` | VARCHAR(100) | UNIQUE, NOT NULL | — | Tên đầy đủ của nhóm thuốc bằng tiếng Việt, ví dụ: "Kháng sinh - Penicillin" |
| `code` | VARCHAR(20) | UNIQUE, NOT NULL | — | Mã ATC chuẩn quốc tế, ví dụ: ATC-J01CA04; dùng để đối chiếu với cơ sở dữ liệu thuốc quốc tế |
| `category` | VARCHAR(100) | NOT NULL | — | Nhóm điều trị cấp cao hơn, ví dụ: "Kháng sinh", "Giảm đau", "Hạ áp", "Chống viêm" |
| `description` | TEXT | — | NULL | Mô tả cơ chế tác dụng, chỉ định điều trị và nguyên tắc sử dụng của nhóm thuốc |
| `common_drugs` | TEXT[] | — | NULL | Danh sách tên hoạt chất hoặc biệt dược phổ biến thuộc nhóm, ví dụ: ["Amoxicillin", "Ampicillin"] |
| `contraindications` | TEXT[] | — | NULL | Danh sách chống chỉ định quan trọng; dùng để đối chiếu với dữ liệu dị ứng và bệnh mãn tính của bệnh nhân |
| `side_effects` | TEXT[] | — | NULL | Danh sách tác dụng phụ thường gặp và nghiêm trọng cần theo dõi |
| `is_active` | BOOLEAN | — | TRUE | Trạng thái hoạt động; FALSE khi nhóm thuốc không còn được sử dụng hoặc đã thay thế |
| `created_at` | TIMESTAMP | — | NOW() | Thời điểm thêm nhóm thuốc vào danh mục (UTC) |

---

## 7. Bảng `model_configs`

Lưu trữ cấu hình và siêu tham số của các phiên bản mô hình học máy. Cho phép quản lý vòng đời mô hình (lifecycle), so sánh hiệu suất giữa các phiên bản, và rollback khi cần.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Giá trị mặc định | Mô tả nghiệp vụ |
|---|---|---|---|---|
| `id` | UUID | PRIMARY KEY | gen_random_uuid() | Định danh duy nhất của cấu hình mô hình |
| `name` | VARCHAR(100) | NOT NULL | — | Tên mô tả của cấu hình, ví dụ: "Mamba-v2-ViMedNLP" |
| `version` | VARCHAR(20) | NOT NULL | — | Số phiên bản theo quy tắc semantic versioning, ví dụ: "2.1.0" |
| `architecture` | VARCHAR(50) | NOT NULL | — | Kiến trúc mạng nơ-ron sử dụng: mamba (State Space Model), transformer, hoặc lstm |
| `optimizer` | VARCHAR(50) | NOT NULL | — | Thuật toán tối ưu hóa dùng trong huấn luyện, ví dụ: AdamW, SGD, Adam |
| `hyperparameters` | JSONB | — | NULL | Siêu tham số huấn luyện đầy đủ; cấu trúc: `{"learning_rate": float, "batch_size": int, "epochs": int, "hidden_dim": int, "num_layers": int, "dropout": float}` |
| `model_path` | VARCHAR(255) | — | NULL | Đường dẫn tuyệt đối hoặc URI S3/MinIO đến file checkpoint đã huấn luyện (.pt / .ckpt) |
| `training_dataset` | VARCHAR(255) | — | NULL | Tên hoặc đường dẫn đến tập dữ liệu huấn luyện; giúp truy xuất nguồn gốc mô hình (provenance) |
| `status` | VARCHAR(20) | CHECK (draft / training / ready / deprecated) | draft | Trạng thái vòng đời: draft (cấu hình mới), training (đang huấn luyện), ready (sẵn sàng suy luận), deprecated (đã lỗi thời) |
| `is_active` | BOOLEAN | — | FALSE | Đánh dấu mô hình đang được dùng để dự đoán thực tế; tại một thời điểm chỉ có một mô hình is_active = TRUE |
| `trained_by` | UUID | FOREIGN KEY -> users(id) | — | ID người dùng (researcher/admin) đã khởi tạo quá trình huấn luyện |
| `created_at` | TIMESTAMP | — | NOW() | Thời điểm tạo cấu hình (UTC) |
| `updated_at` | TIMESTAMP | — | NOW() | Thời điểm cập nhật cấu hình hoặc trạng thái gần nhất (UTC) |

---

## 8. Bảng `predictions`

Lưu kết quả dự đoán nhóm thuốc của mô hình AI cho từng bệnh án. Bao gồm danh sách nhóm thuốc được đề xuất theo thứ tự ưu tiên, kết quả xác nhận của bác sĩ, và phản hồi đánh giá chất lượng dự đoán.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Giá trị mặc định | Mô tả nghiệp vụ |
|---|---|---|---|---|
| `id` | UUID | PRIMARY KEY | gen_random_uuid() | Định danh duy nhất của lần dự đoán |
| `record_id` | UUID | FOREIGN KEY -> medical_records(id) ON DELETE CASCADE, NOT NULL | — | Bệnh án mà dự đoán này được thực hiện cho |
| `model_config_id` | UUID | FOREIGN KEY -> model_configs(id) | — | Phiên bản mô hình đã tạo ra dự đoán này; cho phép truy vết kết quả theo phiên bản |
| `predicted_groups` | JSONB | — | — | Danh sách đầy đủ các nhóm thuốc được đề xuất, xếp hạng theo độ tin cậy; cấu trúc mảng: `[{"drug_group_id": UUID, "confidence": float, "rank": int}]` |
| `top1_group_id` | UUID | FOREIGN KEY -> drug_groups(id) | — | ID nhóm thuốc được xếp hạng 1 (độ tin cậy cao nhất); lưu riêng để truy vấn nhanh |
| `top1_confidence` | DECIMAL(5,4) | — | — | Điểm tin cậy của dự đoán hạng 1; giá trị từ 0.0000 đến 1.0000 (ví dụ: 0.9234 = 92.34%) |
| `processing_time_ms` | INTEGER | — | NULL | Thời gian xử lý suy luận của mô hình tính bằng millisecond; dùng để giám sát hiệu năng |
| `is_confirmed` | BOOLEAN | — | FALSE | Đánh dấu bác sĩ đã xem xét và xác nhận kết quả dự đoán |
| `confirmed_group_id` | UUID | FOREIGN KEY -> drug_groups(id) | NULL | Nhóm thuốc bác sĩ lựa chọn sau xem xét; có thể trùng hoặc khác với top1_group_id |
| `confirmed_by` | UUID | FOREIGN KEY -> users(id) | NULL | ID bác sĩ đã thực hiện xác nhận |
| `confirmed_at` | TIMESTAMP | — | NULL | Thời điểm bác sĩ xác nhận kết quả (UTC) |
| `doctor_feedback` | TEXT | — | NULL | Nhận xét định tính của bác sĩ về chất lượng dự đoán; dùng làm dữ liệu cải thiện mô hình |
| `feedback_rating` | SMALLINT | CHECK (1 den 5) | NULL | Điểm đánh giá của bác sĩ theo thang 1-5: 1 (rất kém) đến 5 (rất tốt); dùng để tính chỉ số hài lòng |
| `created_at` | TIMESTAMP | — | NOW() | Thời điểm mô hình hoàn thành dự đoán (UTC) |

---

## 9. Bảng `model_metrics`

Lưu trữ kết quả đánh giá hiệu suất của từng phiên bản mô hình trên các tập dữ liệu khác nhau. Hỗ trợ so sánh khách quan giữa các phiên bản và theo dõi hiện tượng model drift.

| Tên cột | Kiểu dữ liệu | Ràng buộc | Giá trị mặc định | Mô tả nghiệp vụ |
|---|---|---|---|---|
| `id` | UUID | PRIMARY KEY | gen_random_uuid() | Định danh duy nhất của bộ chỉ số đánh giá |
| `model_config_id` | UUID | FOREIGN KEY -> model_configs(id) ON DELETE CASCADE, NOT NULL | — | Phiên bản mô hình được đánh giá |
| `dataset_split` | VARCHAR(20) | CHECK (train / validation / test) | — | Tập dữ liệu dùng để đánh giá: train (huấn luyện), validation (kiểm định siêu tham số), test (đánh giá cuối cùng) |
| `accuracy` | DECIMAL(5,4) | — | NULL | Tỷ lệ dự đoán đúng tổng thể; giá trị từ 0.0000 đến 1.0000 |
| `precision_macro` | DECIMAL(5,4) | — | NULL | Precision trung bình đều trọng số (macro average) trên tất cả nhóm thuốc |
| `recall_macro` | DECIMAL(5,4) | — | NULL | Recall trung bình đều trọng số (macro average) trên tất cả nhóm thuốc |
| `f1_macro` | DECIMAL(5,4) | — | NULL | F1-score trung bình đều trọng số (macro average); chỉ số tổng hợp cân bằng giữa precision và recall |
| `confusion_matrix` | JSONB | — | NULL | Ma trận nhầm lẫn dạng mảng 2 chiều; hàng là nhãn thực tế, cột là nhãn dự đoán; dùng để phân tích lỗi chi tiết |
| `per_class_metrics` | JSONB | — | NULL | Chỉ số precision, recall, f1 cho từng nhóm thuốc riêng lẻ; cấu trúc: `{"drug_group_id": {"precision": float, "recall": float, "f1": float, "support": int}}` |
| `evaluated_at` | TIMESTAMP | — | NOW() | Thời điểm hoàn thành đánh giá (UTC) |

---

## Indexes

Danh sách các indexes khuyến nghị cho hệ thống Drug-Pred AI, bao gồm các indexes ngầm định (implicit) từ ràng buộc và các indexes bổ sung phục vụ hiệu năng truy vấn.

### Indexes ngầm định (tự động tạo bởi ràng buộc)

| Tên index | Bảng | Cột | Mục đích |
|---|---|---|---|
| `users_pkey` | users | id | Tra cứu người dùng theo khóa chính |
| `users_username_key` | users | username | Đảm bảo duy nhất và tăng tốc xác thực đăng nhập |
| `users_email_key` | users | email | Đảm bảo duy nhất và tăng tốc tra cứu theo email |
| `patients_pkey` | patients | id | Tra cứu bệnh nhân theo khóa chính |
| `patients_patient_code_key` | patients | patient_code | Đảm bảo duy nhất và tăng tốc tra cứu theo mã bệnh nhân |
| `symptoms_pkey` | symptoms | id | Tra cứu triệu chứng theo khóa chính |
| `symptoms_name_key` | symptoms | name | Đảm bảo duy nhất tên triệu chứng |
| `medical_records_pkey` | medical_records | id | Tra cứu bệnh án theo khóa chính |
| `medical_records_record_code_key` | medical_records | record_code | Đảm bảo duy nhất và tăng tốc tra cứu theo mã bệnh án |
| `record_symptoms_pkey` | record_symptoms | (record_id, symptom_id) | Khóa chính phức hợp cho bảng liên kết |
| `drug_groups_pkey` | drug_groups | id | Tra cứu nhóm thuốc theo khóa chính |
| `drug_groups_name_key` | drug_groups | name | Đảm bảo duy nhất tên nhóm thuốc |
| `drug_groups_code_key` | drug_groups | code | Đảm bảo duy nhất mã ATC |
| `model_configs_pkey` | model_configs | id | Tra cứu cấu hình mô hình theo khóa chính |
| `predictions_pkey` | predictions | id | Tra cứu kết quả dự đoán theo khóa chính |
| `model_metrics_pkey` | model_metrics | id | Tra cứu chỉ số đánh giá theo khóa chính |

### Indexes bổ sung (khuyến nghị tạo thêm)

| Tên index | Bảng | Cột | Loại | Mục đích |
|---|---|---|---|---|
| `idx_patients_created_by` | patients | created_by | B-tree | Lọc danh sách bệnh nhân do một người dùng cụ thể tạo |
| `idx_medical_records_patient_id` | medical_records | patient_id | B-tree | Tra cứu toàn bộ bệnh án của một bệnh nhân; truy vấn rất thường xuyên |
| `idx_medical_records_created_by` | medical_records | created_by | B-tree | Lọc bệnh án theo người tạo (bác sĩ/điều dưỡng trực) |
| `idx_medical_records_status` | medical_records | status | B-tree | Lọc bệnh án theo trạng thái xử lý (ví dụ: lấy toàn bộ bệnh án pending) |
| `idx_medical_records_created_at` | medical_records | created_at | B-tree | Truy vấn bệnh án theo khoảng thời gian; cần thiết cho báo cáo và dashboard |
| `idx_record_symptoms_symptom_id` | record_symptoms | symptom_id | B-tree | Tra cứu các bệnh án có chứa một triệu chứng nhất định |
| `idx_predictions_record_id` | predictions | record_id | B-tree | Tra cứu kết quả dự đoán của một bệnh án; thường dùng khi hiển thị chi tiết bệnh án |
| `idx_predictions_model_config_id` | predictions | model_config_id | B-tree | Lọc dự đoán theo phiên bản mô hình; dùng cho phân tích so sánh hiệu năng |
| `idx_predictions_is_confirmed` | predictions | is_confirmed | B-tree | Lọc dự đoán chờ xác nhận; dùng cho queue công việc của bác sĩ |
| `idx_predictions_confirmed_by` | predictions | confirmed_by | B-tree | Thống kê số lượng xác nhận theo bác sĩ |
| `idx_predictions_created_at` | predictions | created_at | B-tree | Truy vấn dự đoán theo khoảng thời gian; dùng cho báo cáo và phát hiện model drift |
| `idx_model_metrics_model_config_id` | model_metrics | model_config_id | B-tree | Tra cứu tất cả chỉ số của một phiên bản mô hình |
| `idx_model_configs_is_active` | model_configs | is_active | B-tree | Tìm nhanh mô hình đang hoạt động; truy vấn thực hiện trước mỗi lần suy luận |
| `idx_symptoms_category` | symptoms | category | B-tree | Lọc triệu chứng theo nhóm cơ quan; dùng trong giao diện nhập liệu |
| `idx_drug_groups_category` | drug_groups | category | B-tree | Lọc nhóm thuốc theo nhóm điều trị; dùng trong báo cáo và giao diện |
| `idx_drug_groups_is_active` | drug_groups | is_active | B-tree | Lọc chỉ các nhóm thuốc đang hoạt động khi hiển thị danh sách lựa chọn |

---

*Tài liệu này phản ánh schema phiên bản 1.0. Mọi thay đổi schema cần cập nhật đồng thời vào file này và file `schema.sql`.*
