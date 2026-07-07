// Seeds master data + sample cases into the cms database.
// Data is ported verbatim from the design prototype (cms-design/project/data.js)
// so SLA badges stay "live" (dates are anchored relative to today).
require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../db");

// ---------- date helpers (same as data.js) ----------
const today = new Date();
const toIso = (d) => (typeof d === "string" ? d : d.toISOString().slice(0, 10));
const offsetDays = (base, days) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return toIso(d);
};
const TODAY = toIso(today);

// ---------- master data ----------
const MASTER = {
  channels: ["Line FDANont", "E-complain", "Mail", "ไปรษณีย์", "มาด้วยตนเอง", "โทร 029503112"],
  laws: [
    { id: "drug", label: "ยา" },
    { id: "food", label: "อาหาร" },
    { id: "cosm", label: "เครื่องสำอาง" },
    { id: "hosp", label: "สถานพยาบาล" },
    { id: "heal", label: "สถานประกอบการเพื่อสุขภาพ" },
    { id: "haz", label: "วัตถุอันตราย" },
    { id: "med", label: "เครื่องมือแพทย์" },
    { id: "herb", label: "ผลิตภัณฑ์สมุนไพร" },
    { id: "narc", label: "ยาเสพติด/วัตถุออกฤทธิ์" },
  ],
  sources: [
    "โฆษณา(โซเชียลมีเดีย)", "โฆษณา(ใบปลิว/TV/วิทยุ)", "ออกบูท",
    "แนะนำจากผู้เคยใช้บริการ", "เข้าใช้,เลือกบริการด้วยตนเอง", "แจ้งเบาะแส",
    "เฝ้าระวัง", "ขอความร่วมมือ", "สินบนนำจับ",
  ],
  problems: [
    "ไม่พบผู้ประกอบวิชาชีพ", "โฆษณาเกินจริง", "พฤติกรรมพนักงาน", "มาตรฐานคลินิก",
    "การรักษา", "การแสดงฉลากไม่ถูกต้อง", "ไม่มีเลขสารบบ", "คุณภาพผลิตภัณฑ์และบริการ",
    "สถานที่ผลิตไม่ได้มาตรฐาน", "อาหารไม่บริสุทธิ์ (มีสารอันตราย)", "ให้ตรวจสอบการอนุญาต",
    "ผลิตภัณฑ์ปลอม/ผิดกฎหมาย", "ไม่ได้รับอนุญาต", "โภชนาการ (GDA)",
  ],
  officers: [
    { id: "off-1", name: "นายพันธ์เทพ เพชรผึ้ง" },
    { id: "off-2", name: "นายณรงค์เดช นนทเบญจวรรณ" },
    { id: "off-3", name: "นางณัฐสิรี เปี้ยปลูก" },
    { id: "off-4", name: "นางสาวโสภิฏดา สิรยากร" },
    { id: "off-5", name: "นางวิมลรัตน์ อ่อนชุลี" },
    { id: "off-6", name: "นายกรกฤษณ์ สิงห์ป้อง" },
  ],
  committees: [
    "คณะกรรมการพิจารณาคดี", "คณะกรรมการเปรียบเทียบคดี",
    "คณะกรรมการองค์คณะปรับพินัย", "คณะกรรมการกลั่นกรองฯ",
  ],
  resolutions: [
    "เปรียบเทียบปรับ", "ยุติเรื่อง", "ดำเนินคดี (ส่งตำรวจ)", "ส่งอัยการ", "ออกคำสั่งปรับพินัย",
  ],
  districts: ["เมืองนนทบุรี", "บางกรวย", "บางใหญ่", "บางบัวทอง", "ไทรน้อย", "ปากเกร็ด"],
  // (subdistricts are seeded from SUBDISTRICTS below)
  sections: [
    { id: "sec-25", law: "drug", text: "มาตรา 25(3) ผลิต/ขายยาแผนปัจจุบันโดยไม่ได้รับอนุญาต", fines: [20000, 40000, 60000] },
    { id: "sec-72", law: "food", text: "มาตรา 6(7) ฉลากอาหารไม่ถูกต้อง", fines: [10000, 20000, 30000] },
    { id: "sec-26", law: "cosm", text: "มาตรา 27 เครื่องสำอางไม่ได้จดแจ้ง", fines: [15000, 30000, 50000] },
    { id: "sec-43", law: "hosp", text: "มาตรา 16 ประกอบสถานพยาบาลโดยไม่ได้รับอนุญาต", fines: [25000, 50000, 80000] },
    { id: "sec-30", law: "heal", text: "มาตรา 22 ประกอบกิจการเพื่อสุขภาพโดยไม่ได้รับอนุญาต", fines: [15000, 30000, 45000] },
    { id: "sec-15", law: "med", text: "มาตรา 6 เครื่องมือแพทย์ไม่ได้รับอนุญาต", fines: [20000, 40000, 60000] },
  ],
  roles: [
    { id: "admin",   name: "ปวีณา จันทกานต์",      role: "Admin",                  initials: "ปจ", desc: "ผู้ดูแลระบบ", officer: null,    username: "paweena.j" },
    { id: "head",    name: "อรุณ สุขสวัสดิ์",        role: "หัวหน้ากลุ่มงาน คบส.",   initials: "อส", desc: "หัวหน้ากลุ่มงานคุ้มครองผู้บริโภค", officer: null, username: "arun.s" },
    { id: "officer", name: "นางณัฐสิรี เปี้ยปลูก",  role: "พนักงานเจ้าหน้าที่",     initials: "ณป", desc: "Officer", officer: "off-3", username: "natsiri.p" },
    { id: "exec",    name: "นพ.สมชาย วงศ์ไพศาล",    role: "ผู้บริหาร / นพ.สสจ.",     initials: "สว", desc: "Nayok / View only", officer: null, username: "drsomchai.w" },
  ],
};

// ตำบลจริงของ จ.นนทบุรี (52 ตำบล) — key = ชื่ออำเภอใน MASTER.districts
const SUBDISTRICTS = {
  "เมืองนนทบุรี": ["สวนใหญ่", "ตลาดขวัญ", "บางเขน", "บางกระสอ", "ท่าทราย", "บางไผ่", "บางศรีเมือง", "บางกร่าง", "ไทรม้า", "บางรักน้อย"],
  "บางกรวย": ["วัดชลอ", "บางกรวย", "บางสีทอง", "บางขนุน", "บางขุนกอง", "บางคูเวียง", "มหาสวัสดิ์", "ปลายบาง", "ศาลากลาง"],
  "บางใหญ่": ["บางม่วง", "บางแม่นาง", "บางเลน", "เสาธงหิน", "บ้านใหม่", "บางใหญ่"],
  "บางบัวทอง": ["โสนลอย", "บางบัวทอง", "บางรักใหญ่", "บางคูรัด", "ละหาร", "ลำโพ", "พิมลราช", "บางรักพัฒนา"],
  "ไทรน้อย": ["ไทรน้อย", "ราษฎร์นิยม", "หนองเพรางาย", "ไทรใหญ่", "ขุนศรี", "คลองขวาง", "ทวีวัฒนา"],
  "ปากเกร็ด": ["ปากเกร็ด", "บางตลาด", "บ้านใหม่", "บางพูด", "บางตะไนย์", "คลองพระอุดม", "ท่าอิฐ", "เกาะเกร็ด", "อ้อมเกร็ด", "คลองข่อย", "บางพลับ", "คลองเกลือ"],
};

const STATUS = {
  "01": { label: "รอมอบหมาย", cls: "s01" },
  "02": { label: "ดำเนินการตรวจสอบ", cls: "s02" },
  "03": { label: "รอเข้าคณะกรรมการ", cls: "s03" },
  "04": { label: "เปรียบเทียบปรับ", cls: "s04" },
  "05": { label: "ยุติคดี", cls: "s05" },
  "06": { label: "ส่งต่อ", cls: "s06" },
  "07": { label: "ดำเนินคดี", cls: "s07" },
  "08": { label: "ยกเลิก", cls: "s08" },
  "09": { label: "อยู่ระหว่างเสนอนายแพทย์ยุติ", cls: "s03" },
};

const SAMPLE_CASES = [
  {
    id: "case-001", etracking: "ECP-2569-00123", letterNo: "นบ 0032.2/345", letterDate: offsetDays(today, -8),
    postNo: "POST-2569-0421", postDate: offsetDays(today, -7),
    title: "ร้านขายยาแผนปัจจุบันไม่มีเภสัชกรประจำ", laws: ["drug"],
    problems: ["ไม่พบผู้ประกอบวิชาชีพ", "ไม่ได้รับอนุญาต"], source: "แจ้งเบาะแส",
    complainant: { name: "นายสมหมาย ใจดี", phone: "081-234-5678", email: "somm@gmail.com", channel: "Line FDANont", anonymous: false },
    respondent: { licensee: "นายอนุชา สังข์ทอง", business: "ร้านยาดีใจเภสัช", address: "85/1 ม.5 ต.บางเลน", district: "บางใหญ่", licenseNo: "ขย.1-นบ-0123" },
    product: "ยาแผนปัจจุบัน", productLicense: "—", bountyAmount: null,
    description: "ผู้ร้องพบว่าร้านขายยาเปิดทำการแต่ไม่มีเภสัชกรประจำตามที่กฎหมายกำหนด มีการขายยาควบคุมพิเศษให้กับลูกค้า",
    assignees: ["off-1", "off-3"], assignedAt: offsetDays(today, -5), assignedBy: "head", status: "02",
    attachments: [
      { name: "หลักฐานภาพถ่ายร้าน.jpg", size: "2.4 MB", type: "image" },
      { name: "บันทึกร้องเรียน.pdf", size: "180 KB", type: "pdf" },
    ],
    investigation: { siteVisitDate: null, sitePlace: "", siteResult: "", meetingDate: null, meetingPlace: "", meetingSummary: "" },
    board: null, fines: [], createdBy: "officer", createdAt: offsetDays(today, -7),
    timeline: [
      { date: offsetDays(today, -7), time: "09:14", title: "สร้างเคสในระบบ", user: "นางณัฐสิรี เปี้ยปลูก", kind: "create", status: "in-time" },
      { date: offsetDays(today, -5), time: "14:02", title: "มอบหมายให้เจ้าหน้าที่ 2 คน", user: "อรุณ สุขสวัสดิ์", kind: "assign", status: "in-time" },
    ],
  },
  {
    id: "case-002", etracking: "ECP-2569-00124", letterNo: "นบ 0032.2/346", letterDate: offsetDays(today, -45),
    postNo: "POST-2569-0422", postDate: offsetDays(today, -44),
    title: "คลินิกเสริมความงามโฆษณาเกินจริง", laws: ["hosp", "cosm"],
    problems: ["โฆษณาเกินจริง", "มาตรฐานคลินิก"], source: "โฆษณา(โซเชียลมีเดีย)",
    complainant: { name: "ไม่ระบุ/นิรนาม", phone: "", email: "", channel: "E-complain", anonymous: true },
    respondent: { licensee: "พญ.ศิริพร อินทอง", business: "คลินิก Beauty Beyond", address: "200 ม.2 ต.บางพูด", district: "ปากเกร็ด", licenseNo: "พบ.61-นบ-0089" },
    product: "บริการเสริมความงาม (Botox/Filler)", productLicense: "—", bountyAmount: null,
    description: "ผู้ร้องพบโฆษณาบน Facebook อ้างว่าฉีดฟิลเลอร์เห็นผลทันที 100% ปลอดภัยไม่ต้องพักฟื้น และใช้รูป before/after ที่อาจเป็นภาพปลอม",
    assignees: ["off-3", "off-5"], assignedAt: offsetDays(today, -43), assignedBy: "head", status: "03",
    attachments: [
      { name: "screenshot-facebook.png", size: "1.1 MB", type: "image" },
      { name: "ลิงก์โฆษณา.pdf", size: "92 KB", type: "pdf" },
    ],
    investigation: {
      siteVisitDate: offsetDays(today, -25), sitePlace: "คลินิก Beauty Beyond ปากเกร็ด",
      siteResult: "พบโฆษณาตามที่ร้องเรียน ขอเอกสารใบอนุญาตและทะเบียนยา ตรวจสอบเครื่องมือ",
      meetingDate: offsetDays(today, -18), meetingPlace: "สสจ.นนทบุรี",
      meetingSummary: "คลินิกชี้แจงว่าโฆษณาทำโดยทีมการตลาดภายนอก ยอมรับว่าควรปรับปรุง",
    },
    board: { committees: ["คณะกรรมการพิจารณาคดี"], meetingNo: 5, year: 2569, meetingDate: null, resolution: null, sections: [], notes: "" },
    fines: [], createdBy: "officer", createdAt: offsetDays(today, -44),
    timeline: [
      { date: offsetDays(today, -44), time: "10:30", title: "สร้างเคสในระบบ", user: "นางณัฐสิรี เปี้ยปลูก", kind: "create", status: "in-time" },
      { date: offsetDays(today, -43), time: "09:00", title: "มอบหมายให้เจ้าหน้าที่", user: "อรุณ สุขสวัสดิ์", kind: "assign", status: "in-time" },
      { date: offsetDays(today, -25), time: "13:00", title: "ลงพื้นที่ตรวจสอบ", user: "นางณัฐสิรี เปี้ยปลูก", kind: "investigate", status: "in-time" },
      { date: offsetDays(today, -18), time: "10:00", title: "เชิญพบเพื่อชี้แจง", user: "นางวิมลรัตน์ อ่อนชุลี", kind: "investigate", status: "in-time" },
      { date: offsetDays(today, -10), time: "16:00", title: "เลือกแนวทาง: เข้าคณะกรรมการ", user: "นางณัฐสิรี เปี้ยปลูก", kind: "decision", status: "in-time" },
    ],
  },
  {
    id: "case-003", etracking: "ECP-2569-00125", letterNo: "นบ 0032.2/348", letterDate: offsetDays(today, -90),
    postNo: "POST-2569-0423", postDate: offsetDays(today, -89),
    title: "อาหารเสริมไม่มีเลข อย. ขายผ่านโซเชียล", laws: ["food"],
    problems: ["ไม่มีเลขสารบบ", "โฆษณาเกินจริง"], source: "เฝ้าระวัง",
    complainant: { name: "ทีมเฝ้าระวัง สสจ.", phone: "029503112", email: "", channel: "เฝ้าระวัง", anonymous: false },
    respondent: { licensee: "นางสาวกุลธิดา ผ่องใส", business: "Slim Kuru by Kook", address: "12/4 ม.1 ต.บางกร่าง", district: "เมืองนนทบุรี", licenseNo: "" },
    product: "ผลิตภัณฑ์ลดน้ำหนัก", productLicense: "—", bountyAmount: 5000,
    description: "พบขายอาหารเสริมลดน้ำหนักผ่าน TikTok/Shopee อ้างสรรพคุณลดน้ำหนัก 10 กก. ใน 7 วัน ไม่มีเลข อย. และไม่แจ้งสถานที่ผลิต",
    assignees: ["off-2", "off-6"], assignedAt: offsetDays(today, -88), assignedBy: "head", status: "04",
    attachments: [
      { name: "หลักฐาน-tiktok.mp4", size: "12 MB", type: "video" },
      { name: "ตัวอย่างผลิตภัณฑ์.jpg", size: "3.2 MB", type: "image" },
    ],
    investigation: {
      siteVisitDate: offsetDays(today, -70), sitePlace: "บ้านผู้ผลิต ต.บางกร่าง",
      siteResult: "พบสถานที่ผลิตอยู่ในบ้าน ไม่ได้มาตรฐาน GMP",
      meetingDate: offsetDays(today, -65), meetingPlace: "สสจ.นนทบุรี", meetingSummary: "ยอมรับว่าผลิตเอง",
    },
    board: {
      committees: ["คณะกรรมการพิจารณาคดี"], meetingNo: 4, year: 2569, meetingDate: offsetDays(today, -30),
      resolution: "เปรียบเทียบปรับ", sections: [{ secId: "sec-72", count: 1, fine: 10000 }], notes: "มีหลักฐานชัดเจน ยอมรับผิด",
    },
    fines: [{ secId: "sec-72", count: 1, amount: 10000, paid: false, paidDate: null, paidAmount: 0 }],
    createdBy: "officer", createdAt: offsetDays(today, -89),
    timeline: [
      { date: offsetDays(today, -89), time: "09:00", title: "สร้างเคส (เคสเฝ้าระวัง)", user: "นางณัฐสิรี เปี้ยปลูก", kind: "create", status: "in-time" },
      { date: offsetDays(today, -88), time: "11:00", title: "มอบหมาย", user: "อรุณ สุขสวัสดิ์", kind: "assign", status: "in-time" },
      { date: offsetDays(today, -70), time: "13:30", title: "ลงพื้นที่ตรวจสอบ", user: "นายณรงค์เดช นนทเบญจวรรณ", kind: "investigate", status: "in-time" },
      { date: offsetDays(today, -65), time: "14:00", title: "เชิญพบเพื่อชี้แจง", user: "นายกรกฤษณ์ สิงห์ป้อง", kind: "investigate", status: "in-time" },
      { date: offsetDays(today, -30), time: "09:00", title: "ประชุมคณะกรรมการพิจารณาคดี ครั้งที่ 4/2569", user: "—", kind: "board", status: "in-time" },
      { date: offsetDays(today, -30), time: "12:00", title: "บันทึกมติ: เปรียบเทียบปรับ 10,000 บาท", user: "นางณัฐสิรี เปี้ยปลูก", kind: "board", status: "in-time" },
    ],
  },
  {
    id: "case-004", etracking: "ECP-2569-00126", letterNo: "นบ 0032.2/349", letterDate: offsetDays(today, -2),
    postNo: "POST-2569-0424", postDate: offsetDays(today, -1),
    title: "ขายเครื่องสำอางปลอมในตลาดนัด", laws: ["cosm"],
    problems: ["ผลิตภัณฑ์ปลอม/ผิดกฎหมาย"], source: "มาด้วยตนเอง",
    complainant: { name: "นางสาวสุดา รัตนพันธ์", phone: "089-987-6543", email: "suda.r@hotmail.com", channel: "มาด้วยตนเอง", anonymous: false },
    respondent: { licensee: "", business: "ร้านสวยสะดุดตา ตลาดนัด ต.บางรักใหญ่", address: "ตลาดนัด ต.บางรักใหญ่", district: "บางบัวทอง", licenseNo: "" },
    product: "ครีมหน้าขาว แบรนด์ไม่ระบุ", productLicense: "—", bountyAmount: null,
    description: "ผู้ร้องซื้อครีมจากตลาดนัดแล้วเกิดอาการแพ้ ผื่นแดง คันทั่วใบหน้า สงสัยว่าเป็นเครื่องสำอางปลอม",
    assignees: [], assignedAt: null, assignedBy: null, status: "01",
    attachments: [
      { name: "รูปผลิตภัณฑ์.jpg", size: "1.8 MB", type: "image" },
      { name: "ใบรับรองแพทย์.pdf", size: "320 KB", type: "pdf" },
    ],
    investigation: { siteVisitDate: null, sitePlace: "", siteResult: "", meetingDate: null, meetingPlace: "", meetingSummary: "" },
    board: null, fines: [], createdBy: "officer", createdAt: offsetDays(today, -1),
    timeline: [
      { date: offsetDays(today, -1), time: "15:20", title: "สร้างเคส (รับเรื่องด้วยตนเอง)", user: "นางณัฐสิรี เปี้ยปลูก", kind: "create", status: "in-time" },
    ],
  },
  {
    id: "case-005", etracking: "ECP-2569-00127", letterNo: "นบ 0032.2/350", letterDate: offsetDays(today, -120),
    postNo: "POST-2569-0425", postDate: offsetDays(today, -119),
    title: "ขายยาเสพติดให้โทษประเภท 4 โดยไม่ได้รับอนุญาต", laws: ["narc"],
    problems: ["ไม่ได้รับอนุญาต"], source: "สินบนนำจับ",
    complainant: { name: "ไม่ระบุ/นิรนาม", phone: "", email: "", channel: "Line FDANont", anonymous: true },
    respondent: { licensee: "นายธนา ขาวขำ", business: "บ้านพัก ต.ไทรน้อย", address: "44/2 ม.3 ต.ไทรน้อย", district: "ไทรน้อย", licenseNo: "" },
    product: "ยาเคทามีน", productLicense: "—", bountyAmount: 50000,
    description: "ผู้ร้องแจ้งเบาะแสว่ามีการลักลอบขายยาเคทามีนในย่านดังกล่าว",
    assignees: ["off-1"], assignedAt: offsetDays(today, -118), assignedBy: "head", status: "07",
    attachments: [],
    investigation: {
      siteVisitDate: offsetDays(today, -110), sitePlace: "ที่เกิดเหตุ",
      siteResult: "พบของกลางและจับกุมผู้ต้องสงสัย", meetingDate: null, meetingPlace: "", meetingSummary: "",
    },
    board: {
      committees: ["คณะกรรมการพิจารณาคดี"], meetingNo: 3, year: 2569, meetingDate: offsetDays(today, -90),
      resolution: "ดำเนินคดี (ส่งตำรวจ)", sections: [], notes: "ส่งสำนวนให้ตำรวจ บก.ปคบ. แล้ว",
    },
    fines: [], createdBy: "officer", createdAt: offsetDays(today, -119),
    timeline: [
      { date: offsetDays(today, -119), time: "08:00", title: "สร้างเคส (แจ้งเบาะแส)", user: "นางณัฐสิรี เปี้ยปลูก", kind: "create", status: "in-time" },
      { date: offsetDays(today, -118), time: "09:00", title: "มอบหมาย", user: "อรุณ สุขสวัสดิ์", kind: "assign", status: "in-time" },
      { date: offsetDays(today, -110), time: "16:00", title: "ลงพื้นที่ + จับกุม", user: "นายพันธ์เทพ เพชรผึ้ง", kind: "investigate", status: "in-time" },
      { date: offsetDays(today, -90), time: "10:00", title: "บันทึกมติ: ดำเนินคดี", user: "นางณัฐสิรี เปี้ยปลูก", kind: "board", status: "in-time" },
      { date: offsetDays(today, -88), time: "14:00", title: "ปิดเคส: ดำเนินคดี/ส่งตำรวจ", user: "—", kind: "close", status: "in-time" },
    ],
  },
  {
    id: "case-006", etracking: "ECP-2569-00128", letterNo: "นบ 0032.2/352", letterDate: offsetDays(today, -180),
    postNo: "POST-2569-0426", postDate: offsetDays(today, -179),
    title: "ผลิตน้ำดื่มไม่ได้มาตรฐาน", laws: ["food"],
    problems: ["สถานที่ผลิตไม่ได้มาตรฐาน", "อาหารไม่บริสุทธิ์ (มีสารอันตราย)"], source: "เฝ้าระวัง",
    complainant: { name: "ทีมเฝ้าระวัง สสจ.", phone: "", email: "", channel: "เฝ้าระวัง", anonymous: false },
    respondent: { licensee: "นายโชคชัย สุขสวัสดิ์", business: "โรงงานน้ำดื่ม ฉัตรชัย", address: "120 ม.6 ต.บางใหญ่", district: "บางใหญ่", licenseNo: "อย. 13-1-12345" },
    product: "น้ำดื่มบรรจุขวด", productLicense: "อย. 13-1-12345", bountyAmount: null,
    description: "พบเชื้อแบคทีเรียในน้ำดื่มเกินมาตรฐาน จากการสุ่มตรวจ",
    assignees: ["off-2"], assignedAt: offsetDays(today, -178), assignedBy: "head", status: "05",
    attachments: [],
    investigation: {
      siteVisitDate: offsetDays(today, -160), sitePlace: "โรงงานน้ำดื่ม ฉัตรชัย",
      siteResult: "พบสถานที่ผลิตไม่ได้มาตรฐาน GMP ผู้ประกอบการตกลงปรับปรุง",
      meetingDate: offsetDays(today, -155), meetingPlace: "สสจ.นนทบุรี", meetingSummary: "ตกลงปิดสถานที่ปรับปรุง 30 วัน",
    },
    board: {
      committees: ["คณะกรรมการพิจารณาคดี"], meetingNo: 2, year: 2569, meetingDate: offsetDays(today, -130),
      resolution: "เปรียบเทียบปรับ", sections: [{ secId: "sec-72", count: 1, fine: 10000 }], notes: "ยอมรับผิด, ยอมจ่ายค่าปรับ",
    },
    fines: [{ secId: "sec-72", count: 1, amount: 10000, paid: true, paidDate: offsetDays(today, -100), paidAmount: 10000 }],
    createdBy: "officer", createdAt: offsetDays(today, -179),
    timeline: [
      { date: offsetDays(today, -179), time: "09:00", title: "สร้างเคส", user: "นางณัฐสิรี เปี้ยปลูก", kind: "create", status: "in-time" },
      { date: offsetDays(today, -178), time: "10:00", title: "มอบหมาย", user: "อรุณ สุขสวัสดิ์", kind: "assign", status: "in-time" },
      { date: offsetDays(today, -160), time: "13:00", title: "ลงพื้นที่", user: "นายณรงค์เดช นนทเบญจวรรณ", kind: "investigate", status: "in-time" },
      { date: offsetDays(today, -155), time: "14:00", title: "เชิญพบ", user: "นายณรงค์เดช นนทเบญจวรรณ", kind: "investigate", status: "in-time" },
      { date: offsetDays(today, -130), time: "10:00", title: "บันทึกมติ: เปรียบเทียบปรับ", user: "นางณัฐสิรี เปี้ยปลูก", kind: "board", status: "in-time" },
      { date: offsetDays(today, -100), time: "11:00", title: "บันทึกการชำระเงิน (ครบ)", user: "นางณัฐสิรี เปี้ยปลูก", kind: "fine", status: "in-time" },
      { date: offsetDays(today, -100), time: "11:01", title: "ปิดเคส: ยุติคดี", user: "—", kind: "close", status: "in-time" },
    ],
  },
  {
    id: "case-007", etracking: "ECP-2569-00129", letterNo: "นบ 0032.2/355", letterDate: offsetDays(today, -25),
    postNo: "POST-2569-0427", postDate: offsetDays(today, -24),
    title: "สปาเปิดบริการโดยไม่มีใบอนุญาต", laws: ["heal"],
    problems: ["ไม่ได้รับอนุญาต", "พฤติกรรมพนักงาน"], source: "ขอความร่วมมือ",
    complainant: { name: "นายเอกชัย วาณิช", phone: "086-555-1212", email: "", channel: "ไปรษณีย์", anonymous: false },
    respondent: { licensee: "", business: "Pure Massage & Spa", address: "ห้างสรรพสินค้า ปากเกร็ด", district: "ปากเกร็ด", licenseNo: "" },
    product: "บริการนวดสปา", productLicense: "—", bountyAmount: null,
    description: "เปิดให้บริการนวดสปาโดยไม่มีใบอนุญาตประกอบกิจการเพื่อสุขภาพ",
    assignees: ["off-5"], assignedAt: offsetDays(today, -22), assignedBy: "head", status: "02",
    attachments: [{ name: "ภาพหน้าร้าน.jpg", size: "1.2 MB", type: "image" }],
    investigation: { siteVisitDate: null, sitePlace: "", siteResult: "", meetingDate: null, meetingPlace: "", meetingSummary: "" },
    board: null, fines: [], createdBy: "officer", createdAt: offsetDays(today, -24),
    timeline: [
      { date: offsetDays(today, -24), time: "10:00", title: "สร้างเคส", user: "นางณัฐสิรี เปี้ยปลูก", kind: "create", status: "in-time" },
      { date: offsetDays(today, -22), time: "09:30", title: "มอบหมาย", user: "อรุณ สุขสวัสดิ์", kind: "assign", status: "in-time" },
    ],
  },
  {
    id: "case-008", etracking: "ECP-2569-00130", letterNo: "นบ 0032.2/360", letterDate: offsetDays(today, -65),
    postNo: "POST-2569-0428", postDate: offsetDays(today, -64),
    title: "ขายสมุนไพรอ้างรักษามะเร็ง", laws: ["herb", "drug"],
    problems: ["โฆษณาเกินจริง", "ผลิตภัณฑ์ปลอม/ผิดกฎหมาย"], source: "โฆษณา(ใบปลิว/TV/วิทยุ)",
    complainant: { name: "นายมานพ มณีรัตน์", phone: "081-111-2222", email: "manop@gmail.com", channel: "โทร 029503112", anonymous: false },
    respondent: { licensee: "นางจิรา ธรรมรักษ์", business: "บ้านสมุนไพรเจ้าแม่จิรา", address: "5/2 ม.4 ต.บางกรวย", district: "บางกรวย", licenseNo: "" },
    product: "สมุนไพรลูกกลอน", productLicense: "—", bountyAmount: null,
    description: "ผู้ร้องระบุว่ามีโฆษณาในวิทยุชุมชนอ้างรักษามะเร็งด้วยสมุนไพร",
    assignees: ["off-3", "off-4"], assignedAt: offsetDays(today, -62), assignedBy: "head", status: "03",
    attachments: [{ name: "ใบปลิว.jpg", size: "0.8 MB", type: "image" }],
    investigation: {
      siteVisitDate: offsetDays(today, -50), sitePlace: "บ้านสมุนไพร ต.บางกรวย",
      siteResult: "พบผลิตภัณฑ์ตามที่ร้องเรียน เก็บตัวอย่างส่งตรวจ",
      meetingDate: offsetDays(today, -40), meetingPlace: "สสจ.นนทบุรี", meetingSummary: "ผู้ประกอบการรับทราบ ยอมหยุดโฆษณาทันที",
    },
    board: { committees: ["คณะกรรมการพิจารณาคดี"], meetingNo: null, year: 2569, meetingDate: null, resolution: null, sections: [], notes: "" },
    fines: [], createdBy: "officer", createdAt: offsetDays(today, -64),
    timeline: [
      { date: offsetDays(today, -64), time: "09:00", title: "สร้างเคส", user: "นางณัฐสิรี เปี้ยปลูก", kind: "create", status: "in-time" },
      { date: offsetDays(today, -62), time: "10:00", title: "มอบหมาย", user: "อรุณ สุขสวัสดิ์", kind: "assign", status: "in-time" },
      { date: offsetDays(today, -50), time: "13:30", title: "ลงพื้นที่", user: "นางณัฐสิรี เปี้ยปลูก", kind: "investigate", status: "in-time" },
      { date: offsetDays(today, -40), time: "10:00", title: "เชิญพบ", user: "นางสาวโสภิฏดา สิรยากร", kind: "investigate", status: "in-time" },
    ],
  },
  {
    id: "case-009", etracking: "ECP-2569-00131", letterNo: "นบ 0032.2/362", letterDate: offsetDays(today, -3),
    postNo: "POST-2569-0429", postDate: offsetDays(today, -2),
    title: "แอบขายสารเคมีอันตรายในร้านขายของชำ", laws: ["haz"],
    problems: ["ไม่ได้รับอนุญาต"], source: "แจ้งเบาะแส",
    complainant: { name: "ไม่ระบุ/นิรนาม", phone: "", email: "", channel: "Line FDANont", anonymous: true },
    respondent: { licensee: "นายไพรัช จันทร์ฉาย", business: "ร้านขายของชำ ลุงรัช", address: "9/1 ม.2 ต.บางพลับ", district: "ปากเกร็ด", licenseNo: "" },
    product: "สารเคมีกำจัดศัตรูพืช", productLicense: "—", bountyAmount: 3000,
    description: "ขายสารเคมีฆ่าหญ้าและฆ่าแมลงโดยไม่มีใบอนุญาต",
    assignees: [], assignedAt: null, assignedBy: null, status: "01",
    attachments: [],
    investigation: { siteVisitDate: null, sitePlace: "", siteResult: "", meetingDate: null, meetingPlace: "", meetingSummary: "" },
    board: null, fines: [], createdBy: "officer", createdAt: offsetDays(today, -2),
    timeline: [
      { date: offsetDays(today, -2), time: "16:00", title: "สร้างเคส", user: "นางณัฐสิรี เปี้ยปลูก", kind: "create", status: "in-time" },
    ],
  },
];

const NOTIFICATIONS = [
  { id: "n1", icon: "warn",    title: "เคส ECP-2569-00124 เหลือ 2 วันก่อนครบ SLA เข้ากรรมการ", time: "วันนี้ 08:00", unread: true,  caseId: "case-002" },
  { id: "n2", icon: "info",    title: "ได้รับมอบหมายเคสใหม่: คลินิกเสริมความงาม...",            time: "วันนี้ 09:14", unread: true,  caseId: "case-002" },
  { id: "n3", icon: "success", title: "บันทึกมติคณะกรรมการเคส ECP-2569-00125 สำเร็จ",            time: "เมื่อวาน",     unread: false, caseId: "case-003" },
  { id: "n4", icon: "danger",  title: "เคส ECP-2569-00126 ยังไม่มอบหมาย (เกินเวลา 1 วัน)",       time: "เมื่อวาน",     unread: true,  caseId: "case-004" },
  { id: "n5", icon: "info",    title: "ค่าปรับเคส ECP-2569-00125 ค้างชำระ ครบ 30 วัน",          time: "3 วันก่อน",   unread: false, caseId: "case-003" },
];

// ---------- insert logic ----------
async function seedListReturningMap(conn, table, names) {
  const map = {};
  for (let i = 0; i < names.length; i++) {
    const [res] = await conn.query(`INSERT INTO ${table} (name, ord) VALUES (?, ?)`, [names[i], i]);
    map[names[i]] = res.insertId;
  }
  return map;
}

async function main() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // statuses
    let ord = 0;
    for (const [code, s] of Object.entries(STATUS)) {
      await conn.query("INSERT INTO statuses (code, label, css_class, ord) VALUES (?, ?, ?, ?)", [code, s.label, s.cls, ord++]);
    }

    // SLA config (default 3 / 20 / 60 / 60 days)
    const SLA_DEFAULTS = [
      ["assign", "ขั้นมอบหมาย", 3, 0],
      ["invest", "ขั้นตรวจสอบข้อเท็จจริง", 20, 1],
      ["board", "ขั้นเข้าคณะกรรมการ", 60, 2],
      ["fine", "ขั้นชำระค่าปรับ", 60, 3],
    ];
    for (const [stage, label, days, o] of SLA_DEFAULTS) {
      await conn.query("INSERT INTO sla_config (stage, label, days, ord) VALUES (?, ?, ?, ?)", [stage, label, days, o]);
    }

    // simple lookups → name→id maps
    const channelMap = await seedListReturningMap(conn, "channels", MASTER.channels);
    // Some sample cases reuse a value (e.g. "เฝ้าระวัง") as a channel that isn't in
    // MASTER.channels — add any missing channel so the FK resolves losslessly.
    let chOrd = MASTER.channels.length;
    for (const c of SAMPLE_CASES) {
      const ch = c.complainant?.channel;
      if (ch && channelMap[ch] === undefined) {
        const [res] = await conn.query("INSERT INTO channels (name, ord) VALUES (?, ?)", [ch, chOrd++]);
        channelMap[ch] = res.insertId;
      }
    }
    const sourceMap = await seedListReturningMap(conn, "sources", MASTER.sources);
    const problemMap = await seedListReturningMap(conn, "problems", MASTER.problems);
    const committeeMap = await seedListReturningMap(conn, "committees", MASTER.committees);
    await seedListReturningMap(conn, "resolutions", MASTER.resolutions);
    const districtMap = await seedListReturningMap(conn, "districts", MASTER.districts);
    // subdistricts (ตำบลจริงของ จ.นนทบุรี) keyed by district
    for (const [dname, names] of Object.entries(SUBDISTRICTS)) {
      const did = districtMap[dname];
      if (did == null) continue;
      for (let i = 0; i < names.length; i++) {
        await conn.query("INSERT IGNORE INTO subdistricts (district_id, name, ord) VALUES (?, ?, ?)", [did, names[i], i + 1]);
      }
    }

    // laws (explicit ids)
    for (let i = 0; i < MASTER.laws.length; i++) {
      const l = MASTER.laws[i];
      await conn.query("INSERT INTO laws (id, label, ord) VALUES (?, ?, ?)", [l.id, l.label, i]);
    }
    // officers (explicit ids)
    for (let i = 0; i < MASTER.officers.length; i++) {
      const o = MASTER.officers[i];
      const first = o.name.split(" ")[0];
      await conn.query("INSERT INTO officers (id, name, phone, email, ord) VALUES (?, ?, ?, ?, ?)",
        [o.id, o.name, `081-xxx-${1000 + i * 111}`, `${first}@nbthealth.go.th`, i]);
    }
    // law_sections
    for (let i = 0; i < MASTER.sections.length; i++) {
      const s = MASTER.sections[i];
      await conn.query("INSERT INTO law_sections (id, law_id, text, fine1, fine2, fine3, ord) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [s.id, s.law, s.text, s.fines[0], s.fines[1], s.fines[2], i]);
    }
    // roles + users
    const passwordHash = bcrypt.hashSync("password123", 10);
    const userIdByRole = {};
    for (let i = 0; i < MASTER.roles.length; i++) {
      const r = MASTER.roles[i];
      await conn.query("INSERT INTO roles (id, name, role_label, initials, descr, officer_id, ord) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [r.id, r.name, r.role, r.initials, r.desc, r.officer, i]);
      const [ures] = await conn.query(
        "INSERT INTO users (username, password_hash, role_id, name, initials, email, officer_id, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
        [r.username, passwordHash, r.id, r.name, r.initials, `${r.username}@nbthealth.go.th`, r.officer]);
      userIdByRole[r.id] = ures.insertId;
    }

    // cases
    for (const c of SAMPLE_CASES) {
      await conn.query(
        `INSERT INTO cases (
          id, etracking, letter_no, letter_date, post_no, post_date, title,
          source_id, product, product_license, bounty_amount, description, status_code,
          complainant_name, complainant_phone, complainant_email, complainant_address, complainant_anonymous, complainant_channel_id,
          respondent_licensee, respondent_business, respondent_address, respondent_license_no, respondent_district_id,
          inv_site_visit_date, inv_site_place, inv_site_result, inv_meeting_date, inv_meeting_place, inv_meeting_summary,
          board_meeting_no, board_year, board_meeting_date, board_resolution, board_notes, has_board,
          created_by, created_by_user_id, created_at, assigned_at, assigned_by
        ) VALUES (?,?,?,?,?,?,?, ?,?,?,?,?,?, ?,?,?,?,?,?, ?,?,?,?,?, ?,?,?,?,?,?, ?,?,?,?,?,?, ?,?,?,?,?)`,
        [
          c.id, c.etracking, c.letterNo, c.letterDate, c.postNo, c.postDate, c.title,
          sourceMap[c.source] ?? null, c.product, c.productLicense, c.bountyAmount, c.description, c.status,
          c.complainant.name, c.complainant.phone, c.complainant.email, c.complainant.address ?? null, c.complainant.anonymous ? 1 : 0, channelMap[c.complainant.channel] ?? null,
          c.respondent.licensee, c.respondent.business, c.respondent.address, c.respondent.licenseNo, districtMap[c.respondent.district] ?? null,
          c.investigation.siteVisitDate, c.investigation.sitePlace, c.investigation.siteResult, c.investigation.meetingDate, c.investigation.meetingPlace, c.investigation.meetingSummary,
          c.board?.meetingNo ?? null, c.board?.year ?? null, c.board?.meetingDate ?? null, c.board?.resolution ?? null, c.board?.notes ?? null, c.board ? 1 : 0,
          c.createdBy, userIdByRole[c.createdBy] ?? null, c.createdAt, c.assignedAt, c.assignedBy,
        ]
      );

      for (const lawId of c.laws) {
        await conn.query("INSERT INTO case_laws (case_id, law_id) VALUES (?, ?)", [c.id, lawId]);
      }
      for (const p of c.problems) {
        if (problemMap[p]) await conn.query("INSERT INTO case_problems (case_id, problem_id) VALUES (?, ?)", [c.id, problemMap[p]]);
      }
      for (const offId of c.assignees) {
        await conn.query("INSERT INTO case_assignees (case_id, officer_id) VALUES (?, ?)", [c.id, offId]);
      }
      for (const a of c.attachments) {
        await conn.query("INSERT INTO case_attachments (case_id, name, size, type) VALUES (?, ?, ?, ?)", [c.id, a.name, a.size, a.type]);
      }
      let invSeq = 0;
      if (c.investigation?.siteVisitDate) {
        await conn.query("INSERT INTO case_investigations (case_id, kind, date, place, result, seq) VALUES (?, 'site', ?, ?, ?, ?)",
          [c.id, c.investigation.siteVisitDate, c.investigation.sitePlace || null, c.investigation.siteResult || null, invSeq++]);
      }
      if (c.investigation?.meetingDate) {
        await conn.query("INSERT INTO case_investigations (case_id, kind, date, place, result, seq) VALUES (?, 'meeting', ?, ?, ?, ?)",
          [c.id, c.investigation.meetingDate, c.investigation.meetingPlace || null, c.investigation.meetingSummary || null, invSeq++]);
      }
      if (c.board) {
        for (const com of c.board.committees) {
          if (committeeMap[com]) await conn.query("INSERT INTO case_board_committees (case_id, committee_id) VALUES (?, ?)", [c.id, committeeMap[com]]);
        }
        for (const s of c.board.sections) {
          await conn.query("INSERT INTO case_board_sections (case_id, section_id, count, fine) VALUES (?, ?, ?, ?)", [c.id, s.secId, s.count, s.fine]);
        }
        // meeting history row — no resolution yet = pending proposal (อยู่ระหว่างรอเข้าคณะกรรมการ)
        const [mr] = await conn.query(
          "INSERT INTO case_board_meetings (case_id, meeting_no, year, meeting_date, resolution, notes, created_at, seq) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
          [c.id, c.board.meetingNo, c.board.year, c.board.meetingDate, c.board.resolution || null, c.board.notes || null, (c.board.meetingDate || TODAY) + " 00:00:00"]);
        for (const com of c.board.committees) {
          if (committeeMap[com]) await conn.query("INSERT INTO case_board_meeting_committees (meeting_id, committee_id) VALUES (?, ?)", [mr.insertId, committeeMap[com]]);
        }
        for (const s of c.board.sections) {
          await conn.query("INSERT INTO case_board_meeting_sections (meeting_id, section_id, count, fine) VALUES (?, ?, ?, ?)", [mr.insertId, s.secId, s.count, s.fine]);
        }
      }
      for (let i = 0; i < c.fines.length; i++) {
        const f = c.fines[i];
        await conn.query("INSERT INTO case_fines (case_id, section_id, count, amount, paid, paid_date, paid_amount, seq) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [c.id, f.secId, f.count, f.amount, f.paid ? 1 : 0, f.paidDate, f.paidAmount, i]);
      }
      for (let i = 0; i < c.timeline.length; i++) {
        const t = c.timeline[i];
        await conn.query("INSERT INTO case_timeline (case_id, date, time, title, user_name, kind, status, seq) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [c.id, t.date, t.time, t.title, t.user, t.kind, t.status, i]);
      }
    }

    // notifications
    for (let i = 0; i < NOTIFICATIONS.length; i++) {
      const n = NOTIFICATIONS[i];
      await conn.query("INSERT INTO notifications (id, icon, title, time_text, unread, case_id, ord) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [n.id, n.icon, n.title, n.time, n.unread ? 1 : 0, n.caseId, i]);
    }

    await conn.commit();
    console.log(`✓ seeded: ${SAMPLE_CASES.length} cases, ${MASTER.officers.length} officers, ${MASTER.roles.length} roles/users, ${NOTIFICATIONS.length} notifications`);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("✗ seed failed:", e.message);
  process.exit(1);
});
