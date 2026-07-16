-- =========================================================
-- ระบบจัดการเรื่องร้องเรียน (CMS) — สสจ.นนทบุรี
-- Normalized schema for MySQL (database: cms)
-- =========================================================
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS case_decisions;
DROP TABLE IF EXISTS case_investigations;
DROP TABLE IF EXISTS case_timeline;
DROP TABLE IF EXISTS case_fines;
DROP TABLE IF EXISTS case_board_meeting_sections;
DROP TABLE IF EXISTS case_board_meeting_committees;
DROP TABLE IF EXISTS case_board_meetings;
DROP TABLE IF EXISTS case_board_sections;
DROP TABLE IF EXISTS case_board_committees;
DROP TABLE IF EXISTS case_attachments;
DROP TABLE IF EXISTS case_assignees;
DROP TABLE IF EXISTS case_problems;
DROP TABLE IF EXISTS case_laws;
DROP TABLE IF EXISTS cases;
DROP TABLE IF EXISTS law_sections;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS laws;
DROP TABLE IF EXISTS channels;
DROP TABLE IF EXISTS sources;
DROP TABLE IF EXISTS problems;
DROP TABLE IF EXISTS committees;
DROP TABLE IF EXISTS resolutions;
DROP TABLE IF EXISTS districts;
DROP TABLE IF EXISTS statuses;
DROP TABLE IF EXISTS sla_config;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------- SLA configuration (admin-editable) ----------------
CREATE TABLE sla_config (
  stage VARCHAR(8)  PRIMARY KEY,   -- assign | invest | board | fine
  label VARCHAR(64) NOT NULL,
  days  INT NOT NULL,
  ord   INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------- Master / lookup ----------------
CREATE TABLE statuses (
  code        VARCHAR(2)  PRIMARY KEY,
  label       VARCHAR(64) NOT NULL,
  css_class   VARCHAR(16) NOT NULL,
  ord         INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE channels (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  name   VARCHAR(128) NOT NULL UNIQUE,
  ord    INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sources (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  name   VARCHAR(128) NOT NULL UNIQUE,
  ord    INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE problems (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  name   VARCHAR(191) NOT NULL UNIQUE,
  ord    INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE committees (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  name   VARCHAR(191) NOT NULL UNIQUE,
  ord    INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE resolutions (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  name   VARCHAR(128) NOT NULL UNIQUE,
  ord    INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE districts (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  name   VARCHAR(128) NOT NULL UNIQUE,
  ord    INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE subdistricts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  district_id INT NOT NULL,
  name        VARCHAR(128) NOT NULL,
  ord         INT NOT NULL DEFAULT 0,
  active      TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_subdistrict (district_id, name),
  CONSTRAINT fk_subdistrict_district FOREIGN KEY (district_id) REFERENCES districts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE laws (
  id     VARCHAR(16)  PRIMARY KEY,
  label  VARCHAR(128) NOT NULL,
  ord    INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE law_sections (
  id     VARCHAR(16)  PRIMARY KEY,
  law_id VARCHAR(16)  NOT NULL,
  text   VARCHAR(255) NOT NULL,
  fine1  INT NOT NULL DEFAULT 0,
  fine2  INT NOT NULL DEFAULT 0,
  fine3  INT NOT NULL DEFAULT 0,
  ord    INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_section_law FOREIGN KEY (law_id) REFERENCES laws(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- workflow roles: admin | head | supply (พัสดุ สร้างเคส) | officer (ดำเนินการ ผู้รับมอบหมาย)
--                 | fine (ค่าปรับ เฉพาะขั้นชำระ) | exec (view only)
CREATE TABLE roles (
  id         VARCHAR(16)  PRIMARY KEY,
  name       VARCHAR(128) NOT NULL,
  role_label VARCHAR(128) NOT NULL,             -- job title shown in UI
  initials   VARCHAR(8)   NOT NULL,
  descr      VARCHAR(191),
  ord        INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id       VARCHAR(16) NOT NULL,
  name          VARCHAR(128),
  initials      VARCHAR(8),
  email         VARCHAR(128),
  phone         VARCHAR(32),
  active        TINYINT(1) NOT NULL DEFAULT 1,
  last_login    DATETIME,
  CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------- Cases ----------------
CREATE TABLE cases (
  id                   VARCHAR(32) PRIMARY KEY,
  etracking            VARCHAR(64) UNIQUE,
  letter_no            VARCHAR(64),
  letter_date          DATE,
  post_no              VARCHAR(64),
  post_date            DATE,
  title                VARCHAR(255) NOT NULL,
  source_id            INT,
  product              VARCHAR(191),
  product_license      VARCHAR(128),
  bounty_amount        VARCHAR(191),
  bounty_requested     TINYINT(1) NOT NULL DEFAULT 0,
  bounty_first_name    VARCHAR(128),
  bounty_last_name     VARCHAR(128),
  bounty_no            VARCHAR(128),
  description          TEXT,
  status_code          VARCHAR(2) NOT NULL DEFAULT '01',

  complainant_name     VARCHAR(191),
  complainant_phone    VARCHAR(32),
  complainant_email    VARCHAR(128),
  complainant_address  VARCHAR(255),
  complainant_anonymous TINYINT(1) NOT NULL DEFAULT 0,
  complainant_channel_id INT,

  respondent_licensee  VARCHAR(191),
  respondent_business  VARCHAR(191),
  respondent_address   VARCHAR(255),
  respondent_license_no VARCHAR(128),
  respondent_district_id INT,
  respondent_subdistrict_id INT,

  inv_site_visit_date  DATE,
  inv_site_place       VARCHAR(191),
  inv_site_result      TEXT,
  inv_meeting_date     DATE,
  inv_meeting_place    VARCHAR(191),
  inv_meeting_summary  TEXT,

  board_meeting_no     INT,
  board_year           INT,
  board_meeting_date   DATE,
  board_resolution     VARCHAR(128),
  board_notes          TEXT,
  has_board            TINYINT(1) NOT NULL DEFAULT 0,

  lock_overridden      TINYINT(1) NOT NULL DEFAULT 0,
  -- cumulative days the head extended this case's SLA (added to every stage window)
  sla_extension_days   INT NOT NULL DEFAULT 0,
  cancel_reason        VARCHAR(255),
  -- statuses 06/07/09 stay active (follow-up) until explicitly closed
  closed_at            DATE,
  returned             TINYINT(1) NOT NULL DEFAULT 0,
  return_reason        VARCHAR(255),
  is_draft             TINYINT(1) NOT NULL DEFAULT 0,

  created_by           VARCHAR(16),
  created_by_user_id   INT,
  created_at           DATE,
  assigned_at          DATE,
  assigned_by          VARCHAR(16),

  INDEX idx_cases_status (status_code),
  INDEX idx_cases_post_date (post_date),
  INDEX idx_cases_created_at (created_at),
  CONSTRAINT fk_case_status   FOREIGN KEY (status_code) REFERENCES statuses(code),
  CONSTRAINT fk_case_source   FOREIGN KEY (source_id) REFERENCES sources(id),
  CONSTRAINT fk_case_channel  FOREIGN KEY (complainant_channel_id) REFERENCES channels(id),
  CONSTRAINT fk_case_district FOREIGN KEY (respondent_district_id) REFERENCES districts(id),
  CONSTRAINT fk_case_subdistrict FOREIGN KEY (respondent_subdistrict_id) REFERENCES subdistricts(id),
  CONSTRAINT fk_case_created  FOREIGN KEY (created_by) REFERENCES roles(id),
  CONSTRAINT fk_case_creator_user FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  CONSTRAINT fk_case_assigned FOREIGN KEY (assigned_by) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE case_laws (
  case_id VARCHAR(32) NOT NULL,
  law_id  VARCHAR(16) NOT NULL,
  PRIMARY KEY (case_id, law_id),
  CONSTRAINT fk_cl_case FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  CONSTRAINT fk_cl_law  FOREIGN KEY (law_id)  REFERENCES laws(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE case_problems (
  case_id    VARCHAR(32) NOT NULL,
  problem_id INT NOT NULL,
  PRIMARY KEY (case_id, problem_id),
  CONSTRAINT fk_cp_case    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  CONSTRAINT fk_cp_problem FOREIGN KEY (problem_id) REFERENCES problems(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- assignees are real user accounts (role "officer") so they can log in and act
CREATE TABLE case_assignees (
  case_id VARCHAR(32) NOT NULL,
  user_id INT NOT NULL,
  PRIMARY KEY (case_id, user_id),
  CONSTRAINT fk_ca_case FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  CONSTRAINT fk_ca_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE case_attachments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  case_id     VARCHAR(32) NOT NULL,
  name        VARCHAR(255) NOT NULL,       -- original filename
  size        VARCHAR(32),                 -- human-readable ("3.2 MB")
  type        VARCHAR(16),                 -- image | pdf | other
  stored_name VARCHAR(255),                -- filename on disk (NULL = legacy metadata-only)
  mime        VARCHAR(128),
  bytes       INT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_att_case FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE case_board_committees (
  case_id      VARCHAR(32) NOT NULL,
  committee_id INT NOT NULL,
  PRIMARY KEY (case_id, committee_id),
  CONSTRAINT fk_bc_case      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  CONSTRAINT fk_bc_committee FOREIGN KEY (committee_id) REFERENCES committees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE case_board_sections (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  case_id    VARCHAR(32) NOT NULL,
  section_id VARCHAR(16) NOT NULL,
  count      INT NOT NULL DEFAULT 1,
  fine       INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_bs_case    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  CONSTRAINT fk_bs_section FOREIGN KEY (section_id) REFERENCES law_sections(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Repeatable board meetings — each save appends a history row (no status change)
CREATE TABLE case_board_meetings (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  case_id      VARCHAR(32) NOT NULL,
  meeting_no   INT,
  year         INT,
  meeting_date DATE,
  resolution   VARCHAR(128),
  notes        TEXT,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  seq          INT NOT NULL DEFAULT 0,
  INDEX idx_bm_case (case_id, seq),
  CONSTRAINT fk_bm_case FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE case_board_meeting_committees (
  meeting_id   INT NOT NULL,
  committee_id INT NOT NULL,
  PRIMARY KEY (meeting_id, committee_id),
  CONSTRAINT fk_bmc_meeting   FOREIGN KEY (meeting_id) REFERENCES case_board_meetings(id) ON DELETE CASCADE,
  CONSTRAINT fk_bmc_committee FOREIGN KEY (committee_id) REFERENCES committees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE case_board_meeting_sections (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  meeting_id INT NOT NULL,
  section_id VARCHAR(16) NOT NULL,
  count      INT NOT NULL DEFAULT 1,
  fine       INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_bms_meeting FOREIGN KEY (meeting_id) REFERENCES case_board_meetings(id) ON DELETE CASCADE,
  CONSTRAINT fk_bms_section FOREIGN KEY (section_id) REFERENCES law_sections(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE case_fines (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  case_id     VARCHAR(32) NOT NULL,
  section_id  VARCHAR(16) NOT NULL,
  count       INT NOT NULL DEFAULT 1,
  amount      INT NOT NULL DEFAULT 0,
  paid        TINYINT(1) NOT NULL DEFAULT 0,
  paid_date   DATE,
  paid_amount INT NOT NULL DEFAULT 0,
  seq         INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_fine_case    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  CONSTRAINT fk_fine_section FOREIGN KEY (section_id) REFERENCES law_sections(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE case_timeline (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  case_id   VARCHAR(32) NOT NULL,
  date      DATE,
  time      VARCHAR(5),
  title     VARCHAR(255) NOT NULL,
  user_name VARCHAR(128),
  kind      VARCHAR(24),
  status    VARCHAR(24),
  seq       INT NOT NULL DEFAULT 0,
  INDEX idx_tl_case (case_id, seq),
  CONSTRAINT fk_tl_case FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- repeatable follow-up records for statuses 06 (ส่งต่อ), 07 (ดำเนินคดี), 09 (เสนอนายแพทย์)
CREATE TABLE case_followups (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  case_id     VARCHAR(32) NOT NULL,
  date        DATE,
  destination VARCHAR(255),
  detail      TEXT,
  user_name   VARCHAR(128),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  seq         INT NOT NULL DEFAULT 0,
  INDEX idx_followup_case (case_id, seq),
  CONSTRAINT fk_followup_case FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- การเลือกแนวทาง/เปลี่ยนแนวทางดำเนินการ (บันทึกจากการ์ด 4 ปุ่ม พร้อมเหตุผล)
CREATE TABLE case_decisions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  case_id     VARCHAR(32) NOT NULL,
  path        VARCHAR(16) NOT NULL,          -- board | forward | stop | police
  from_status VARCHAR(2),
  to_status   VARCHAR(2),
  reason      TEXT,
  user_name   VARCHAR(128),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  seq         INT NOT NULL DEFAULT 0,
  INDEX idx_decision_case (case_id, seq),
  CONSTRAINT fk_decision_case FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE case_investigations (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  case_id    VARCHAR(32) NOT NULL,
  kind       VARCHAR(8) NOT NULL,       -- site | meeting
  date       DATE,
  place      VARCHAR(191),
  result     TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  seq        INT NOT NULL DEFAULT 0,
  INDEX idx_inv_case (case_id, seq),
  CONSTRAINT fk_inv_case FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
  id                VARCHAR(24) PRIMARY KEY,
  icon              VARCHAR(16),
  title             VARCHAR(255) NOT NULL,
  time_text         VARCHAR(64),
  unread            TINYINT(1) NOT NULL DEFAULT 1,
  case_id           VARCHAR(32),
  recipient_user_id INT,                    -- target user; NULL = broadcast (legacy/seed only)
  ord               INT NOT NULL DEFAULT 0,
  INDEX idx_notif_recipient (recipient_user_id),
  CONSTRAINT fk_notif_case FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL,
  CONSTRAINT fk_notif_user FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
