/* =========================================================
   CMS — Sample Data & LocalStorage layer
   Attaches to window.CMS
   ========================================================= */
(function () {
  const STORAGE_KEY = "cms_state_v1";

  // ---------- Master Data ----------
  const MASTER = {
    channels: [
      "Line FDANont",
      "E-complain",
      "Mail",
      "ไปรษณีย์",
      "มาด้วยตนเอง",
      "โทร 029503112",
    ],
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
      "โฆษณา(โซเชียลมีเดีย)",
      "โฆษณา(ใบปลิว/TV/วิทยุ)",
      "ออกบูท",
      "แนะนำจากผู้เคยใช้บริการ",
      "เข้าใช้,เลือกบริการด้วยตนเอง",
      "แจ้งเบาะแส",
      "เฝ้าระวัง",
      "ขอความร่วมมือ",
      "สินบนนำจับ",
    ],
    problems: [
      "ไม่พบผู้ประกอบวิชาชีพ",
      "โฆษณาเกินจริง",
      "พฤติกรรมพนักงาน",
      "มาตรฐานคลินิก",
      "การรักษา",
      "การแสดงฉลากไม่ถูกต้อง",
      "ไม่มีเลขสารบบ",
      "คุณภาพผลิตภัณฑ์และบริการ",
      "สถานที่ผลิตไม่ได้มาตรฐาน",
      "อาหารไม่บริสุทธิ์ (มีสารอันตราย)",
      "ให้ตรวจสอบการอนุญาต",
      "ผลิตภัณฑ์ปลอม/ผิดกฎหมาย",
      "ไม่ได้รับอนุญาต",
      "โภชนาการ (GDA)",
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
      "คณะกรรมการพิจารณาคดี",
      "คณะกรรมการเปรียบเทียบคดี",
      "คณะกรรมการองค์คณะปรับพินัย",
      "คณะกรรมการกลั่นกรองฯ",
    ],
    resolutions: [
      "เปรียบเทียบปรับ",
      "ยุติเรื่อง",
      "ดำเนินคดี (ส่งตำรวจ)",
      "ส่งอัยการ",
      "ออกคำสั่งปรับพินัย",
    ],
    districts: [
      "เมืองนนทบุรี",
      "บางกรวย",
      "บางใหญ่",
      "บางบัวทอง",
      "ไทรน้อย",
      "ปากเกร็ด",
    ],
    sections: [
      // มาตรา + ค่าปรับ ตามครั้ง (lookup)
      { id: "sec-25", law: "drug", text: "มาตรา 25(3) ผลิต/ขายยาแผนปัจจุบันโดยไม่ได้รับอนุญาต", fines: [20000, 40000, 60000] },
      { id: "sec-72", law: "food", text: "มาตรา 6(7) ฉลากอาหารไม่ถูกต้อง", fines: [10000, 20000, 30000] },
      { id: "sec-26", law: "cosm", text: "มาตรา 27 เครื่องสำอางไม่ได้จดแจ้ง", fines: [15000, 30000, 50000] },
      { id: "sec-43", law: "hosp", text: "มาตรา 16 ประกอบสถานพยาบาลโดยไม่ได้รับอนุญาต", fines: [25000, 50000, 80000] },
      { id: "sec-30", law: "heal", text: "มาตรา 22 ประกอบกิจการเพื่อสุขภาพโดยไม่ได้รับอนุญาต", fines: [15000, 30000, 45000] },
      { id: "sec-15", law: "med", text: "มาตรา 6 เครื่องมือแพทย์ไม่ได้รับอนุญาต", fines: [20000, 40000, 60000] },
    ],
    roles: [
      { id: "admin",    name: "ปวีณา จันทกานต์", role: "Admin", initials: "ปจ", desc: "ผู้ดูแลระบบ" },
      { id: "head",     name: "อรุณ สุขสวัสดิ์",  role: "หัวหน้ากลุ่มงาน คบส.", initials: "อส", desc: "หัวหน้ากลุ่มงานคุ้มครองผู้บริโภค" },
      { id: "officer",  name: "นางณัฐสิรี เปี้ยปลูก", role: "พนักงานเจ้าหน้าที่", initials: "ณป", desc: "Officer" },
      { id: "exec",     name: "นพ.สมชาย วงศ์ไพศาล", role: "ผู้บริหาร / นพ.สสจ.", initials: "สว", desc: "Nayok / View only" },
    ],
  };

  // ---------- Status definitions ----------
  const STATUS = {
    "01": { code: "01", label: "รอมอบหมาย",               cls: "s01" },
    "02": { code: "02", label: "ดำเนินการตรวจสอบ",         cls: "s02" },
    "03": { code: "03", label: "รอเข้าคณะกรรมการ",        cls: "s03" },
    "04": { code: "04", label: "เปรียบเทียบปรับ",          cls: "s04" },
    "05": { code: "05", label: "ยุติคดี",                    cls: "s05" },
    "06": { code: "06", label: "ส่งต่อ",                     cls: "s06" },
    "07": { code: "07", label: "ดำเนินคดี",                  cls: "s07" },
    "08": { code: "08", label: "ยกเลิก",                     cls: "s08" },
  };

  // Helper: today as YYYY-MM-DD in BE (we use AD internally)
  const today = new Date();
  const toIso = (d) => {
    if (!d) return null;
    if (typeof d === "string") return d;
    return d.toISOString().slice(0, 10);
  };
  const offsetDays = (base, days) => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return toIso(d);
  };
  const TODAY = toIso(today);

  // ---------- Sample cases ----------
  // Anchor dates relative to today so SLA badges feel live.
  const SAMPLE_CASES = [
    {
      id: "case-001",
      etracking: "ECP-2569-00123",
      letterNo: "นบ 0032.2/345",
      letterDate: offsetDays(today, -8),
      postNo: "POST-2569-0421",
      postDate: offsetDays(today, -7),
      title: "ร้านขายยาแผนปัจจุบันไม่มีเภสัชกรประจำ",
      laws: ["drug"],
      problems: ["ไม่พบผู้ประกอบวิชาชีพ", "ไม่ได้รับอนุญาต"],
      source: "แจ้งเบาะแส",
      complainant: { name: "นายสมหมาย ใจดี", phone: "081-234-5678", email: "somm@gmail.com", channel: "Line FDANont", anonymous: false },
      respondent: { licensee: "นายอนุชา สังข์ทอง", business: "ร้านยาดีใจเภสัช", address: "85/1 ม.5 ต.บางเลน", district: "บางใหญ่", licenseNo: "ขย.1-นบ-0123" },
      product: "ยาแผนปัจจุบัน",
      productLicense: "—",
      bountyAmount: null,
      description: "ผู้ร้องพบว่าร้านขายยาเปิดทำการแต่ไม่มีเภสัชกรประจำตามที่กฎหมายกำหนด มีการขายยาควบคุมพิเศษให้กับลูกค้า",
      assignees: ["off-1", "off-3"],
      assignedAt: offsetDays(today, -5),
      assignedBy: "head",
      status: "02",
      attachments: [
        { name: "หลักฐานภาพถ่ายร้าน.jpg", size: "2.4 MB", type: "image" },
        { name: "บันทึกร้องเรียน.pdf",   size: "180 KB", type: "pdf" },
      ],
      investigation: {
        siteVisitDate: null, sitePlace: "", siteResult: "",
        meetingDate: null, meetingPlace: "", meetingSummary: "",
      },
      board: null,
      fines: [],
      createdBy: "officer",
      createdAt: offsetDays(today, -7),
      timeline: [
        { date: offsetDays(today, -7), time: "09:14", title: "สร้างเคสในระบบ",  user: "นางณัฐสิรี เปี้ยปลูก",  kind: "create",  status: "in-time" },
        { date: offsetDays(today, -5), time: "14:02", title: "มอบหมายให้เจ้าหน้าที่ 2 คน", user: "อรุณ สุขสวัสดิ์", kind: "assign", status: "in-time" },
      ],
    },
    {
      id: "case-002",
      etracking: "ECP-2569-00124",
      letterNo: "นบ 0032.2/346",
      letterDate: offsetDays(today, -45),
      postNo: "POST-2569-0422",
      postDate: offsetDays(today, -44),
      title: "คลินิกเสริมความงามโฆษณาเกินจริง",
      laws: ["hosp", "cosm"],
      problems: ["โฆษณาเกินจริง", "มาตรฐานคลินิก"],
      source: "โฆษณา(โซเชียลมีเดีย)",
      complainant: { name: "ไม่ระบุ/นิรนาม", phone: "", email: "", channel: "E-complain", anonymous: true },
      respondent: { licensee: "พญ.ศิริพร อินทอง", business: "คลินิก Beauty Beyond", address: "200 ม.2 ต.บางพูด", district: "ปากเกร็ด", licenseNo: "พบ.61-นบ-0089" },
      product: "บริการเสริมความงาม (Botox/Filler)",
      productLicense: "—",
      bountyAmount: null,
      description: "ผู้ร้องพบโฆษณาบน Facebook อ้างว่าฉีดฟิลเลอร์เห็นผลทันที 100% ปลอดภัยไม่ต้องพักฟื้น และใช้รูป before/after ที่อาจเป็นภาพปลอม",
      assignees: ["off-3", "off-5"],
      assignedAt: offsetDays(today, -43),
      assignedBy: "head",
      status: "03",
      attachments: [
        { name: "screenshot-facebook.png", size: "1.1 MB", type: "image" },
        { name: "ลิงก์โฆษณา.pdf",         size: "92 KB",  type: "pdf"   },
      ],
      investigation: {
        siteVisitDate: offsetDays(today, -25), sitePlace: "คลินิก Beauty Beyond ปากเกร็ด",
        siteResult: "พบโฆษณาตามที่ร้องเรียน ขอเอกสารใบอนุญาตและทะเบียนยา ตรวจสอบเครื่องมือ",
        meetingDate: offsetDays(today, -18), meetingPlace: "สสจ.นนทบุรี",
        meetingSummary: "คลินิกชี้แจงว่าโฆษณาทำโดยทีมการตลาดภายนอก ยอมรับว่าควรปรับปรุง",
      },
      board: { committees: ["คณะกรรมการพิจารณาคดี"], meetingNo: 5, year: 2569, meetingDate: null, resolution: null, sections: [], notes: "" },
      fines: [],
      createdBy: "officer",
      createdAt: offsetDays(today, -44),
      timeline: [
        { date: offsetDays(today, -44), time: "10:30", title: "สร้างเคสในระบบ", user: "นางณัฐสิรี เปี้ยปลูก", kind: "create", status: "in-time" },
        { date: offsetDays(today, -43), time: "09:00", title: "มอบหมายให้เจ้าหน้าที่", user: "อรุณ สุขสวัสดิ์", kind: "assign", status: "in-time" },
        { date: offsetDays(today, -25), time: "13:00", title: "ลงพื้นที่ตรวจสอบ", user: "นางณัฐสิรี เปี้ยปลูก", kind: "investigate", status: "in-time" },
        { date: offsetDays(today, -18), time: "10:00", title: "เชิญพบเพื่อชี้แจง", user: "นางวิมลรัตน์ อ่อนชุลี", kind: "investigate", status: "in-time" },
        { date: offsetDays(today, -10), time: "16:00", title: "เลือกแนวทาง: เข้าคณะกรรมการ", user: "นางณัฐสิรี เปี้ยปลูก", kind: "decision", status: "in-time" },
      ],
    },
    {
      id: "case-003",
      etracking: "ECP-2569-00125",
      letterNo: "นบ 0032.2/348",
      letterDate: offsetDays(today, -90),
      postNo: "POST-2569-0423",
      postDate: offsetDays(today, -89),
      title: "อาหารเสริมไม่มีเลข อย. ขายผ่านโซเชียล",
      laws: ["food"],
      problems: ["ไม่มีเลขสารบบ", "โฆษณาเกินจริง"],
      source: "เฝ้าระวัง",
      complainant: { name: "ทีมเฝ้าระวัง สสจ.", phone: "029503112", email: "", channel: "เฝ้าระวัง", anonymous: false },
      respondent: { licensee: "นางสาวกุลธิดา ผ่องใส", business: "Slim Kuru by Kook", address: "12/4 ม.1 ต.บางกร่าง", district: "เมืองนนทบุรี", licenseNo: "" },
      product: "ผลิตภัณฑ์ลดน้ำหนัก",
      productLicense: "—",
      bountyAmount: 5000,
      description: "พบขายอาหารเสริมลดน้ำหนักผ่าน TikTok/Shopee อ้างสรรพคุณลดน้ำหนัก 10 กก. ใน 7 วัน ไม่มีเลข อย. และไม่แจ้งสถานที่ผลิต",
      assignees: ["off-2", "off-6"],
      assignedAt: offsetDays(today, -88),
      assignedBy: "head",
      status: "04",
      attachments: [
        { name: "หลักฐาน-tiktok.mp4",  size: "12 MB", type: "video" },
        { name: "ตัวอย่างผลิตภัณฑ์.jpg", size: "3.2 MB", type: "image" },
      ],
      investigation: {
        siteVisitDate: offsetDays(today, -70), sitePlace: "บ้านผู้ผลิต ต.บางกร่าง",
        siteResult: "พบสถานที่ผลิตอยู่ในบ้าน ไม่ได้มาตรฐาน GMP",
        meetingDate: offsetDays(today, -65), meetingPlace: "สสจ.นนทบุรี", meetingSummary: "ยอมรับว่าผลิตเอง",
      },
      board: {
        committees: ["คณะกรรมการพิจารณาคดี"], meetingNo: 4, year: 2569,
        meetingDate: offsetDays(today, -30),
        resolution: "เปรียบเทียบปรับ",
        sections: [{ secId: "sec-72", count: 1, fine: 10000 }],
        notes: "มีหลักฐานชัดเจน ยอมรับผิด",
      },
      fines: [
        { secId: "sec-72", count: 1, amount: 10000, paid: false, paidDate: null, paidAmount: 0 },
      ],
      createdBy: "officer",
      createdAt: offsetDays(today, -89),
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
      id: "case-004",
      etracking: "ECP-2569-00126",
      letterNo: "นบ 0032.2/349",
      letterDate: offsetDays(today, -2),
      postNo: "POST-2569-0424",
      postDate: offsetDays(today, -1),
      title: "ขายเครื่องสำอางปลอมในตลาดนัด",
      laws: ["cosm"],
      problems: ["ผลิตภัณฑ์ปลอม/ผิดกฎหมาย"],
      source: "มาด้วยตนเอง",
      complainant: { name: "นางสาวสุดา รัตนพันธ์", phone: "089-987-6543", email: "suda.r@hotmail.com", channel: "มาด้วยตนเอง", anonymous: false },
      respondent: { licensee: "", business: "ร้านสวยสะดุดตา ตลาดนัด ต.บางรักใหญ่", address: "ตลาดนัด ต.บางรักใหญ่", district: "บางบัวทอง", licenseNo: "" },
      product: "ครีมหน้าขาว แบรนด์ไม่ระบุ",
      productLicense: "—",
      bountyAmount: null,
      description: "ผู้ร้องซื้อครีมจากตลาดนัดแล้วเกิดอาการแพ้ ผื่นแดง คันทั่วใบหน้า สงสัยว่าเป็นเครื่องสำอางปลอม",
      assignees: [],
      assignedAt: null,
      assignedBy: null,
      status: "01",
      attachments: [
        { name: "รูปผลิตภัณฑ์.jpg",  size: "1.8 MB", type: "image" },
        { name: "ใบรับรองแพทย์.pdf", size: "320 KB", type: "pdf" },
      ],
      investigation: { siteVisitDate: null, sitePlace: "", siteResult: "", meetingDate: null, meetingPlace: "", meetingSummary: "" },
      board: null,
      fines: [],
      createdBy: "officer",
      createdAt: offsetDays(today, -1),
      timeline: [
        { date: offsetDays(today, -1), time: "15:20", title: "สร้างเคส (รับเรื่องด้วยตนเอง)", user: "นางณัฐสิรี เปี้ยปลูก", kind: "create", status: "in-time" },
      ],
    },
    {
      id: "case-005",
      etracking: "ECP-2569-00127",
      letterNo: "นบ 0032.2/350",
      letterDate: offsetDays(today, -120),
      postDate: offsetDays(today, -119),
      postNo: "POST-2569-0425",
      title: "ขายยาเสพติดให้โทษประเภท 4 โดยไม่ได้รับอนุญาต",
      laws: ["narc"],
      problems: ["ไม่ได้รับอนุญาต"],
      source: "สินบนนำจับ",
      complainant: { name: "ไม่ระบุ/นิรนาม", phone: "", email: "", channel: "Line FDANont", anonymous: true },
      respondent: { licensee: "นายธนา ขาวขำ", business: "บ้านพัก ต.ไทรน้อย", address: "44/2 ม.3 ต.ไทรน้อย", district: "ไทรน้อย", licenseNo: "" },
      product: "ยาเคทามีน",
      productLicense: "—",
      bountyAmount: 50000,
      description: "ผู้ร้องแจ้งเบาะแสว่ามีการลักลอบขายยาเคทามีนในย่านดังกล่าว",
      assignees: ["off-1"],
      assignedAt: offsetDays(today, -118),
      assignedBy: "head",
      status: "07",
      attachments: [],
      investigation: {
        siteVisitDate: offsetDays(today, -110), sitePlace: "ที่เกิดเหตุ",
        siteResult: "พบของกลางและจับกุมผู้ต้องสงสัย",
        meetingDate: null, meetingPlace: "", meetingSummary: "",
      },
      board: {
        committees: ["คณะกรรมการพิจารณาคดี"], meetingNo: 3, year: 2569,
        meetingDate: offsetDays(today, -90),
        resolution: "ดำเนินคดี (ส่งตำรวจ)",
        sections: [], notes: "ส่งสำนวนให้ตำรวจ บก.ปคบ. แล้ว",
      },
      fines: [],
      createdBy: "officer",
      createdAt: offsetDays(today, -119),
      timeline: [
        { date: offsetDays(today, -119), time: "08:00", title: "สร้างเคส (แจ้งเบาะแส)", user: "นางณัฐสิรี เปี้ยปลูก", kind: "create", status: "in-time" },
        { date: offsetDays(today, -118), time: "09:00", title: "มอบหมาย", user: "อรุณ สุขสวัสดิ์", kind: "assign", status: "in-time" },
        { date: offsetDays(today, -110), time: "16:00", title: "ลงพื้นที่ + จับกุม", user: "นายพันธ์เทพ เพชรผึ้ง", kind: "investigate", status: "in-time" },
        { date: offsetDays(today, -90), time: "10:00", title: "บันทึกมติ: ดำเนินคดี", user: "นางณัฐสิรี เปี้ยปลูก", kind: "board", status: "in-time" },
        { date: offsetDays(today, -88), time: "14:00", title: "ปิดเคส: ดำเนินคดี/ส่งตำรวจ", user: "—", kind: "close", status: "in-time" },
      ],
    },
    {
      id: "case-006",
      etracking: "ECP-2569-00128",
      letterNo: "นบ 0032.2/352",
      letterDate: offsetDays(today, -180),
      postNo: "POST-2569-0426",
      postDate: offsetDays(today, -179),
      title: "ผลิตน้ำดื่มไม่ได้มาตรฐาน",
      laws: ["food"],
      problems: ["สถานที่ผลิตไม่ได้มาตรฐาน", "อาหารไม่บริสุทธิ์ (มีสารอันตราย)"],
      source: "เฝ้าระวัง",
      complainant: { name: "ทีมเฝ้าระวัง สสจ.", phone: "", email: "", channel: "เฝ้าระวัง", anonymous: false },
      respondent: { licensee: "นายโชคชัย สุขสวัสดิ์", business: "โรงงานน้ำดื่ม ฉัตรชัย", address: "120 ม.6 ต.บางใหญ่", district: "บางใหญ่", licenseNo: "อย. 13-1-12345" },
      product: "น้ำดื่มบรรจุขวด",
      productLicense: "อย. 13-1-12345",
      bountyAmount: null,
      description: "พบเชื้อแบคทีเรียในน้ำดื่มเกินมาตรฐาน จากการสุ่มตรวจ",
      assignees: ["off-2"],
      assignedAt: offsetDays(today, -178),
      assignedBy: "head",
      status: "05",
      attachments: [],
      investigation: {
        siteVisitDate: offsetDays(today, -160), sitePlace: "โรงงานน้ำดื่ม ฉัตรชัย",
        siteResult: "พบสถานที่ผลิตไม่ได้มาตรฐาน GMP ผู้ประกอบการตกลงปรับปรุง",
        meetingDate: offsetDays(today, -155), meetingPlace: "สสจ.นนทบุรี",
        meetingSummary: "ตกลงปิดสถานที่ปรับปรุง 30 วัน",
      },
      board: {
        committees: ["คณะกรรมการพิจารณาคดี"], meetingNo: 2, year: 2569,
        meetingDate: offsetDays(today, -130),
        resolution: "เปรียบเทียบปรับ",
        sections: [{ secId: "sec-72", count: 1, fine: 10000 }],
        notes: "ยอมรับผิด, ยอมจ่ายค่าปรับ",
      },
      fines: [
        { secId: "sec-72", count: 1, amount: 10000, paid: true, paidDate: offsetDays(today, -100), paidAmount: 10000 },
      ],
      createdBy: "officer",
      createdAt: offsetDays(today, -179),
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
      id: "case-007",
      etracking: "ECP-2569-00129",
      letterNo: "นบ 0032.2/355",
      letterDate: offsetDays(today, -25),
      postNo: "POST-2569-0427",
      postDate: offsetDays(today, -24),
      title: "สปาเปิดบริการโดยไม่มีใบอนุญาต",
      laws: ["heal"],
      problems: ["ไม่ได้รับอนุญาต", "พฤติกรรมพนักงาน"],
      source: "ขอความร่วมมือ",
      complainant: { name: "นายเอกชัย วาณิช", phone: "086-555-1212", email: "", channel: "ไปรษณีย์", anonymous: false },
      respondent: { licensee: "", business: "Pure Massage & Spa", address: "ห้างสรรพสินค้า ปากเกร็ด", district: "ปากเกร็ด", licenseNo: "" },
      product: "บริการนวดสปา",
      productLicense: "—",
      bountyAmount: null,
      description: "เปิดให้บริการนวดสปาโดยไม่มีใบอนุญาตประกอบกิจการเพื่อสุขภาพ",
      assignees: ["off-5"],
      assignedAt: offsetDays(today, -22),
      assignedBy: "head",
      status: "02",
      attachments: [
        { name: "ภาพหน้าร้าน.jpg", size: "1.2 MB", type: "image" },
      ],
      investigation: { siteVisitDate: null, sitePlace: "", siteResult: "", meetingDate: null, meetingPlace: "", meetingSummary: "" },
      board: null,
      fines: [],
      createdBy: "officer",
      createdAt: offsetDays(today, -24),
      timeline: [
        { date: offsetDays(today, -24), time: "10:00", title: "สร้างเคส", user: "นางณัฐสิรี เปี้ยปลูก", kind: "create", status: "in-time" },
        { date: offsetDays(today, -22), time: "09:30", title: "มอบหมาย", user: "อรุณ สุขสวัสดิ์", kind: "assign", status: "in-time" },
      ],
    },
    {
      id: "case-008",
      etracking: "ECP-2569-00130",
      letterNo: "นบ 0032.2/360",
      letterDate: offsetDays(today, -65),
      postNo: "POST-2569-0428",
      postDate: offsetDays(today, -64),
      title: "ขายสมุนไพรอ้างรักษามะเร็ง",
      laws: ["herb", "drug"],
      problems: ["โฆษณาเกินจริง", "ผลิตภัณฑ์ปลอม/ผิดกฎหมาย"],
      source: "โฆษณา(ใบปลิว/TV/วิทยุ)",
      complainant: { name: "นายมานพ มณีรัตน์", phone: "081-111-2222", email: "manop@gmail.com", channel: "โทร 029503112", anonymous: false },
      respondent: { licensee: "นางจิรา ธรรมรักษ์", business: "บ้านสมุนไพรเจ้าแม่จิรา", address: "5/2 ม.4 ต.บางกรวย", district: "บางกรวย", licenseNo: "" },
      product: "สมุนไพรลูกกลอน",
      productLicense: "—",
      bountyAmount: null,
      description: "ผู้ร้องระบุว่ามีโฆษณาในวิทยุชุมชนอ้างรักษามะเร็งด้วยสมุนไพร",
      assignees: ["off-3", "off-4"],
      assignedAt: offsetDays(today, -62),
      assignedBy: "head",
      status: "03",
      attachments: [
        { name: "ใบปลิว.jpg", size: "0.8 MB", type: "image" },
      ],
      investigation: {
        siteVisitDate: offsetDays(today, -50), sitePlace: "บ้านสมุนไพร ต.บางกรวย",
        siteResult: "พบผลิตภัณฑ์ตามที่ร้องเรียน เก็บตัวอย่างส่งตรวจ",
        meetingDate: offsetDays(today, -40), meetingPlace: "สสจ.นนทบุรี",
        meetingSummary: "ผู้ประกอบการรับทราบ ยอมหยุดโฆษณาทันที",
      },
      board: { committees: ["คณะกรรมการพิจารณาคดี"], meetingNo: null, year: 2569, meetingDate: null, resolution: null, sections: [], notes: "" },
      fines: [],
      createdBy: "officer",
      createdAt: offsetDays(today, -64),
      timeline: [
        { date: offsetDays(today, -64), time: "09:00", title: "สร้างเคส", user: "นางณัฐสิรี เปี้ยปลูก", kind: "create", status: "in-time" },
        { date: offsetDays(today, -62), time: "10:00", title: "มอบหมาย", user: "อรุณ สุขสวัสดิ์", kind: "assign", status: "in-time" },
        { date: offsetDays(today, -50), time: "13:30", title: "ลงพื้นที่", user: "นางณัฐสิรี เปี้ยปลูก", kind: "investigate", status: "in-time" },
        { date: offsetDays(today, -40), time: "10:00", title: "เชิญพบ", user: "นางสาวโสภิฏดา สิรยากร", kind: "investigate", status: "in-time" },
      ],
    },
    {
      id: "case-009",
      etracking: "ECP-2569-00131",
      letterNo: "นบ 0032.2/362",
      letterDate: offsetDays(today, -3),
      postNo: "POST-2569-0429",
      postDate: offsetDays(today, -2),
      title: "แอบขายสารเคมีอันตรายในร้านขายของชำ",
      laws: ["haz"],
      problems: ["ไม่ได้รับอนุญาต"],
      source: "แจ้งเบาะแส",
      complainant: { name: "ไม่ระบุ/นิรนาม", phone: "", email: "", channel: "Line FDANont", anonymous: true },
      respondent: { licensee: "นายไพรัช จันทร์ฉาย", business: "ร้านขายของชำ ลุงรัช", address: "9/1 ม.2 ต.บางพลับ", district: "ปากเกร็ด", licenseNo: "" },
      product: "สารเคมีกำจัดศัตรูพืช",
      productLicense: "—",
      bountyAmount: 3000,
      description: "ขายสารเคมีฆ่าหญ้าและฆ่าแมลงโดยไม่มีใบอนุญาต",
      assignees: [],
      assignedAt: null,
      assignedBy: null,
      status: "01",
      attachments: [],
      investigation: { siteVisitDate: null, sitePlace: "", siteResult: "", meetingDate: null, meetingPlace: "", meetingSummary: "" },
      board: null,
      fines: [],
      createdBy: "officer",
      createdAt: offsetDays(today, -2),
      timeline: [
        { date: offsetDays(today, -2), time: "16:00", title: "สร้างเคส", user: "นางณัฐสิรี เปี้ยปลูก", kind: "create", status: "in-time" },
      ],
    },
  ];

  // ---------- Notifications ----------
  const NOTIFICATIONS = [
    { id: "n1", icon: "warn",    title: "เคส ECP-2569-00124 เหลือ 2 วันก่อนครบ SLA เข้ากรรมการ", time: "วันนี้ 08:00", unread: true,  caseId: "case-002" },
    { id: "n2", icon: "info",    title: "ได้รับมอบหมายเคสใหม่: คลินิกเสริมความงาม...",       time: "วันนี้ 09:14", unread: true,  caseId: "case-002" },
    { id: "n3", icon: "success", title: "บันทึกมติคณะกรรมการเคส ECP-2569-00125 สำเร็จ",       time: "เมื่อวาน",     unread: false, caseId: "case-003" },
    { id: "n4", icon: "danger",  title: "เคส ECP-2569-00126 ยังไม่มอบหมาย (เกินเวลา 1 วัน)",  time: "เมื่อวาน",     unread: true,  caseId: "case-004" },
    { id: "n5", icon: "info",    title: "ค่าปรับเคส ECP-2569-00125 ค้างชำระ ครบ 30 วัน",     time: "3 วันก่อน",   unread: false, caseId: "case-003" },
  ];

  // ---------- SLA helpers ----------
  // status: { kind: 'in-time'|'near'|'far'|'overdue'|'pending', label: 'ในเวลา'|'เหลือ N วัน'|... }
  function computeSlaStage(anchorIso, slaDays, targetIso, todayIso) {
    todayIso = todayIso || TODAY;
    if (!anchorIso) return { kind: "pending", label: "—" };
    if (targetIso) {
      const due = offsetDays(anchorIso, slaDays);
      if (targetIso <= due) return { kind: "in-time", label: "ในเวลา" };
      return { kind: "overdue", label: "เกินเวลา" };
    }
    // No target yet
    const due = offsetDays(anchorIso, slaDays);
    const daysLeft = Math.ceil((new Date(due) - new Date(todayIso)) / 86400000);
    if (daysLeft < 0) return { kind: "overdue", label: `เกินเวลา ${Math.abs(daysLeft)} วัน` };
    if (daysLeft <= 3) return { kind: "near", label: `เหลือ ${daysLeft} วัน` };
    return { kind: "far", label: `เหลือ ${daysLeft} วัน` };
  }

  function caseSlaSnapshot(c) {
    // 4 stages
    const t = TODAY;
    const stageAssign = computeSlaStage(c.postDate, 3, c.assignedAt, t);
    const investTarget =
      c.investigation && (c.investigation.siteVisitDate || c.investigation.meetingDate)
        ? minDate(c.investigation.siteVisitDate, c.investigation.meetingDate)
        : null;
    const stageInvest  = computeSlaStage(c.assignedAt, 20, investTarget, t);
    const boardTarget  = c.board && c.board.meetingDate ? c.board.meetingDate : null;
    const stageBoard   = computeSlaStage(c.assignedAt, 60, boardTarget, t);
    const fineTarget   = c.fines && c.fines.length > 0
      ? (c.fines.every(f => f.paid) ? maxDate(...c.fines.map(f=>f.paidDate)) : null)
      : null;
    const fineAnchor   = c.board && c.board.meetingDate ? c.board.meetingDate : null;
    const stageFine    = computeSlaStage(fineAnchor, 60, fineTarget, t);
    return { stageAssign, stageInvest, stageBoard, stageFine };
  }
  function minDate(...ds){ const xs=ds.filter(Boolean); if(!xs.length) return null; return xs.sort()[0]; }
  function maxDate(...ds){ const xs=ds.filter(Boolean); if(!xs.length) return null; return xs.sort().slice(-1)[0]; }

  // ---------- Lockdown ----------
  // ถ้า timeline ใดๆ "เกินกำหนด" → ห้ามแก้ไข/อัปเดตสถานะ ไม่ว่าเงื่อนไขใด
  // เคสที่ปิดแล้วถือว่าเสร็จสิ้น ไม่ใช่ "ล็อก"
  function isCaseLocked(c) {
    if (["05","06","07","08"].includes(c.status)) return false;
    const sla = caseSlaSnapshot(c);
    // ตรวจทุก stage — ถ้ามี stage ใด overdue ในช่วงที่ active แล้วยังไม่จบ ถือว่าล็อก
    const order = ["stageAssign","stageInvest","stageBoard","stageFine"];
    const activeIdx = { "01":0, "02":1, "03":2, "04":3 }[c.status] ?? 0;
    for (let i = 0; i <= activeIdx; i++) {
      if (sla[order[i]] && sla[order[i]].kind === "overdue") return true;
    }
    return false;
  }
  function lockReason(c) {
    if (!isCaseLocked(c)) return null;
    const s = caseSlaSnapshot(c);
    const labels = {
      stageAssign: "ขั้นมอบหมาย (3 วัน)",
      stageInvest: "ขั้นตรวจสอบข้อเท็จจริง (20 วัน)",
      stageBoard:  "ขั้นเข้าคณะกรรมการ (60 วัน)",
      stageFine:   "ขั้นชำระค่าปรับ (60 วัน)",
    };
    for (const k of ["stageAssign","stageInvest","stageBoard","stageFine"]) {
      if (s[k] && s[k].kind === "overdue") return { stage: labels[k], detail: s[k].label };
    }
    return null;
  }

  // Overall: pick the active stage by status
  function caseSla(c) {
    const s = caseSlaSnapshot(c);
    if (["05", "06", "07", "08"].includes(c.status)) return { kind: "in-time", label: "ปิดเคส" };
    if (c.status === "01") return s.stageAssign;
    if (c.status === "02") return s.stageInvest;
    if (c.status === "03") return s.stageBoard;
    if (c.status === "04") return s.stageFine;
    return { kind: "pending", label: "—" };
  }

  // ---------- Storage ----------
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Merge stored cases with defaults (we re-anchor sample on each load so SLA stays "live")
        return {
          cases: parsed.cases && parsed.cases.length ? parsed.cases : SAMPLE_CASES,
          notifications: parsed.notifications || NOTIFICATIONS,
          currentRole: parsed.currentRole || "officer",
          loggedIn: !!parsed.loggedIn,
        };
      }
    } catch (e) { /* ignore */ }
    return { cases: SAMPLE_CASES, notifications: NOTIFICATIONS, currentRole: "officer", loggedIn: false };
  }

  function saveState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function resetState() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // ---------- Display helpers ----------
  // Convert YYYY-MM-DD (AD) -> Thai BE date "วว/ดด/ปป (BE)"
  function fmtThaiDate(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${+y + 543}`;
  }
  function fmtThaiDateShort(iso) {
    if (!iso) return "—";
    const months = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
    const [y, m, d] = iso.split("-");
    return `${+d} ${months[+m-1]} ${(+y+543).toString().slice(-2)}`;
  }
  function fmtMoney(n) {
    if (n == null) return "—";
    return n.toLocaleString("th-TH") + " บาท";
  }
  function lawLabel(id) { const l = MASTER.laws.find(x=>x.id===id); return l ? l.label : id; }
  function officerName(id) { const o = MASTER.officers.find(x=>x.id===id); return o ? o.name : id; }

  // Sections lookup
  function sectionById(id) { return MASTER.sections.find(s => s.id === id); }

  window.CMS = {
    MASTER, STATUS, SAMPLE_CASES, NOTIFICATIONS,
    TODAY, offsetDays, toIso,
    computeSlaStage, caseSlaSnapshot, caseSla, isCaseLocked, lockReason,
    loadState, saveState, resetState,
    fmtThaiDate, fmtThaiDateShort, fmtMoney,
    lawLabel, officerName, sectionById,
  };
})();
