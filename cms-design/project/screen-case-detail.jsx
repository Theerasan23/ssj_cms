/* =========================================================
   CMS — S05 Case Detail + S06–S09 Workflow Modals
   ========================================================= */

const CaseDetailScreen = ({ id }) => {
  const { state, actions, setRoute, tweaks, role } = useApp();
  const toast = useToasts();
  const c = state.cases.find(x => x.id === id);

  const [modal, setModal] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState("data");

  if (!c) {
    return (
      <main className="page">
        <div className="card">
          <div className="table-empty">
            <div className="empty-icon"><Icon name="alert" size={26}/></div>
            <div style={{ fontWeight: 600 }}>ไม่พบเคสที่ร้องขอ</div>
            <button className="btn btn-primary" onClick={()=> setRoute({ name: "case-list" })}>กลับสู่รายการเคส</button>
          </div>
        </div>
      </main>
    );
  }

  const canAssign   = ["head", "admin"].includes(role.id);
  const canEdit     = ["officer", "head", "admin"].includes(role.id);
  const closedCase  = ["05", "06", "07", "08"].includes(c.status);
  const sla = window.CMS.caseSla(c);
  const locked      = window.CMS.isCaseLocked(c);
  const lock        = window.CMS.lockReason(c);

  // ---------- Modal actions ----------
  function guardLocked() {
    if (locked) {
      toast.push({ kind: "danger", title: "เคสถูกล็อก", msg: "เกินกำหนด SLA — ไม่สามารถแก้ไขหรืออัปเดตสถานะได้" });
      setModal(null);
      return true;
    }
    return false;
  }
  function saveAssignment(officerIds, note) {
    if (guardLocked()) return;
    actions.updateCase(c.id, prev => ({
      ...prev,
      assignees: officerIds,
      assignedAt: window.CMS.TODAY,
      assignedBy: role.id,
      status: "02",
      timeline: [...prev.timeline, {
        date: window.CMS.TODAY, time: new Date().toTimeString().slice(0,5),
        title: `มอบหมายให้ ${officerIds.length} เจ้าหน้าที่${note ? ` — ${note}` : ""}`,
        user: role.name, kind: "assign", status: "in-time",
      }]
    }));
    setModal(null);
    toast.push({ kind: "success", title: "มอบหมายสำเร็จ", msg: "เจ้าหน้าที่ได้รับ notification แล้ว" });
  }

  function saveInvestigation(payload) {
    if (guardLocked()) return;
    actions.updateCase(c.id, prev => ({
      ...prev,
      investigation: { ...prev.investigation, ...payload },
      timeline: [...prev.timeline, {
        date: window.CMS.TODAY, time: new Date().toTimeString().slice(0,5),
        title: "บันทึกการตรวจสอบข้อเท็จจริง", user: role.name, kind: "investigate", status: "in-time",
      }]
    }));
    toast.push({ kind: "success", title: "บันทึกการตรวจสอบสำเร็จ", msg: "เลือกแนวทางถัดไปจากปุ่มด้านล่าง" });
  }

  function selectInvestPath(path) {
    if (guardLocked()) return;
    let newStatus = c.status;
    let line = "";
    if (path === "board")   { newStatus = "03"; line = "เลือกแนวทาง: เข้ากรรมการ"; }
    if (path === "forward") { newStatus = "06"; line = "ส่งต่อหน่วยงานอื่น (ปิดเคส)"; }
    if (path === "stop")    { newStatus = "05"; line = "เสนอนายแพทย์ยุติเรื่อง (ปิดเคส)"; }
    if (path === "police")  { newStatus = "07"; line = "ดำเนินคดี/แจ้งความ (ปิดเคส)"; }
    actions.updateCase(c.id, prev => ({
      ...prev, status: newStatus,
      timeline: [...prev.timeline, {
        date: window.CMS.TODAY, time: new Date().toTimeString().slice(0,5),
        title: line, user: role.name, kind: "decision", status: "in-time",
      }]
    }));
    setModal(null);
    toast.push({ kind: "success", title: "อัปเดตสถานะเคสสำเร็จ" });
  }

  function saveBoard(payload) {
    if (guardLocked()) return;
    let newStatus = c.status;
    let extra = [];
    let lineExtra = "";
    if (payload.resolution === "ยุติเรื่อง")     { newStatus = "05"; lineExtra = "ปิดเคส: ยุติคดี"; }
    else if (payload.resolution === "ดำเนินคดี (ส่งตำรวจ)" || payload.resolution === "ส่งอัยการ") { newStatus = "07"; lineExtra = "ปิดเคส: ดำเนินคดี"; }
    else if (payload.resolution === "เปรียบเทียบปรับ" || payload.resolution === "ออกคำสั่งปรับพินัย") {
      newStatus = "04";
      extra = payload.sections.map(s => ({
        secId: s.secId, count: s.count, amount: s.fine, paid: false, paidDate: null, paidAmount: 0,
      }));
    }
    actions.updateCase(c.id, prev => ({
      ...prev, status: newStatus, board: payload,
      fines: extra.length > 0 ? extra : prev.fines,
      timeline: [
        ...prev.timeline,
        { date: window.CMS.TODAY, time: new Date().toTimeString().slice(0,5),
          title: `ประชุม ${payload.committees.join(", ")} ครั้งที่ ${payload.meetingNo}/${payload.year}`,
          user: role.name, kind: "board", status: "in-time" },
        { date: window.CMS.TODAY, time: new Date().toTimeString().slice(0,5),
          title: `บันทึกมติ: ${payload.resolution}`,
          user: role.name, kind: "board", status: "in-time" },
        ...(lineExtra ? [{ date: window.CMS.TODAY, time: new Date().toTimeString().slice(0,5),
          title: lineExtra, user: "—", kind: "close", status: "in-time" }] : []),
      ]
    }));
    setModal(null);
    toast.push({ kind: "success", title: "บันทึกมติสำเร็จ", msg: `มติ: ${payload.resolution}` });
  }

  function savePayment(payload) {
    if (guardLocked()) return;
    actions.updateCase(c.id, prev => {
      const newFines = prev.fines.map((f, i) => i === payload.idx ? {
        ...f, paid: true, paidDate: payload.paidDate, paidAmount: payload.amount,
      } : f);
      const allPaid = newFines.every(f => f.paid);
      return {
        ...prev,
        fines: newFines,
        status: allPaid ? "05" : "04",
        timeline: [
          ...prev.timeline,
          { date: window.CMS.TODAY, time: new Date().toTimeString().slice(0,5),
            title: `บันทึกการชำระค่าปรับ ${window.CMS.fmtMoney(payload.amount)}`,
            user: role.name, kind: "fine", status: "in-time" },
          ...(allPaid ? [{ date: window.CMS.TODAY, time: new Date().toTimeString().slice(0,5),
            title: "ปิดเคส: ยุติคดี (จ่ายค่าปรับครบ)",
            user: "—", kind: "close", status: "in-time" }] : []),
        ]
      };
    });
    setModal(null);
    toast.push({ kind: "success", title: "บันทึกการชำระเงินสำเร็จ" });
  }

  // ---------- Action button (dynamic) ----------
  const primaryAction = (() => {
    if (closedCase) return null;
    if (locked) return null;
    if (c.status === "01") return { label: "มอบหมายเจ้าหน้าที่", icon: "users", onClick: ()=> setModal("assign"), disabled: !canAssign };
    if (c.status === "02") return { label: "บันทึกการตรวจสอบ",   icon: "loupe", onClick: ()=> setModal("invest") };
    if (c.status === "03") return { label: "บันทึกมติคณะกรรมการ", icon: "users", onClick: ()=> setModal("board") };
    if (c.status === "04") return { label: "บันทึกการชำระ",       icon: "money", onClick: ()=> setModal("fine") };
    return null;
  })();

  // ---------- Sub-views ----------
  const LockBanner = locked && (
    <div className="lock-banner">
      <div className="lock-ic"><Icon name="lock" size={20}/></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="lock-title">เคสนี้ถูกล็อก — เกินกำหนด SLA</div>
        <div className="lock-body">
          ตามนโยบาย: timeline เกินกำหนดแล้ว <b>ทุกเงื่อนไข</b> — ไม่สามารถแก้ไขข้อมูล หรืออัปเดตสถานะของเคสได้
          จนกว่าผู้ดูแลระบบจะปลดล็อกหรือขยายกำหนด
        </div>
        {lock && <span className="lock-stage"><Icon name="clock" size={11}/> {lock.stage} · {lock.detail}</span>}
      </div>
    </div>
  );

  const StatusPanel = (
    <div className="card">
      <div className="card-body">
        <div className="row between" style={{ alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div className="small muted">E-tracking</div>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{c.etracking}</div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <StatusBadge code={c.status} size="lg"/>
            {!closedCase && <SLABadge sla={sla}/>}
          </div>
        </div>
        <h2 style={{ margin: "8px 0 14px", fontSize: 19, lineHeight: 1.35, letterSpacing: "-0.01em" }}>{c.title}</h2>
        <div className="kv">
          <div className="k">ผู้ถูกร้อง</div>
          <div className="v">{c.respondent.business || c.respondent.licensee || "—"}</div>
          <div className="k">อำเภอ</div>
          <div className="v">{c.respondent.district || "—"}</div>
          <div className="k">พรบ.</div>
          <div className="v"><div className="tag-list">{c.laws.map(id => <span key={id} className="chip primary">{window.CMS.lawLabel(id)}</span>)}</div></div>
          <div className="k">ผู้รับผิดชอบ</div>
          <div className="v">{c.assignees.length === 0 ? <span className="muted">— ยังไม่มอบหมาย</span> :
            <div className="row" style={{ gap: 6 }}>
              <AvatarStack names={c.assignees.map(id => window.CMS.officerName(id))} max={5} size="sm"/>
              <span className="small">{c.assignees.map(id => window.CMS.officerName(id).split(" ")[1]).join(", ")}</span>
            </div>}</div>
          <div className="k">วันลงรับ POST</div>
          <div className="v">{window.CMS.fmtThaiDate(c.postDate)}</div>
          <div className="k">วันที่หนังสือ</div>
          <div className="v">{window.CMS.fmtThaiDate(c.letterDate)}</div>
        </div>

        {primaryAction && (
          <button className="btn btn-accent btn-lg btn-block" style={{ marginTop: 16 }}
            onClick={primaryAction.onClick} disabled={primaryAction.disabled}>
            <Icon name={primaryAction.icon} size={16}/> {primaryAction.label}
            {!primaryAction.disabled && <Icon name="arrow-right" size={14}/>}
          </button>
        )}
        {primaryAction && primaryAction.disabled && (
          <div className="small muted" style={{ textAlign:"center", marginTop: 8 }}>
            * เฉพาะหัวหน้ากลุ่มงาน/Admin
          </div>
        )}
        {locked && !closedCase && (
          <div style={{
            background: "var(--error-100)", color: "var(--error-700)",
            padding: "12px 14px", borderRadius: 8, marginTop: 16,
            display:"flex", alignItems:"center", gap: 10, fontSize: 13, fontWeight: 600,
            border: "1px dashed var(--error-700)",
          }}>
            <Icon name="lock" size={16}/>
            <div style={{ flex: 1 }}>
              <div>เคสล็อก — ไม่สามารถดำเนินการต่อได้</div>
              <div className="small" style={{ fontWeight: 400, color: "color-mix(in oklab, var(--error-700) 80%, black)" }}>
                เกิน SLA แล้ว · กรุณาติดต่อผู้ดูแลระบบเพื่อขอขยายกำหนด
              </div>
            </div>
          </div>
        )}
        {closedCase && (
          <div style={{
            background: "var(--success-100)", color: "var(--success-700)",
            padding: "12px 14px", borderRadius: 8, marginTop: 16,
            display:"flex", alignItems:"center", gap: 8, fontSize: 13, fontWeight: 600,
          }}>
            <Icon name="check-circle" size={16}/> เคสนี้ถูกปิดแล้ว · {window.CMS.STATUS[c.status].label}
          </div>
        )}
      </div>

      <div className="card-divider"/>
      <div style={{ padding: "16px 22px" }}>
        <div className="small muted" style={{ marginBottom: 10, fontWeight: 600, color: "var(--text)" }}>SLA Timeline</div>
        <SLATimelineHorizontal c={c}/>
      </div>
    </div>
  );

  const DataPanel = (
    <div className="stack">
      <DataCard title="เลขอ้างอิง" icon="paperclip">
        <div className="kv">
          <div className="k">E-tracking</div><div className="v mono">{c.etracking}</div>
          <div className="k">เลขรับหนังสือ</div><div className="v mono">{c.letterNo}</div>
          <div className="k">วันที่ของหนังสือ</div><div className="v">{window.CMS.fmtThaiDate(c.letterDate)}</div>
          <div className="k">เลขรับ POST</div><div className="v mono">{c.postNo}</div>
          <div className="k">วันที่ลงรับ POST</div><div className="v">{window.CMS.fmtThaiDate(c.postDate)}</div>
        </div>
      </DataCard>

      <DataCard title="ข้อมูลผู้ร้องเรียน" icon="user">
        {c.complainant.anonymous ? (
          <div className="muted small"><Icon name="shield" size={14}/> ผู้ร้องเรียนไม่ระบุตัวตน (PDPA)</div>
        ) : (
          <div className="kv">
            <div className="k">ชื่อ-นามสกุล</div><div className="v">{c.complainant.name || "—"}</div>
            <div className="k">เบอร์โทร</div><div className="v">{c.complainant.phone || "—"}</div>
            <div className="k">Email</div><div className="v">{c.complainant.email || "—"}</div>
          </div>
        )}
        <div className="kv" style={{ marginTop: 8 }}>
          <div className="k">ช่องทาง</div><div className="v"><span className="chip">{c.complainant.channel}</span></div>
        </div>
      </DataCard>

      <DataCard title="ข้อมูลผู้ถูกร้อง" icon="package">
        <div className="kv">
          <div className="k">ผู้รับอนุญาต</div><div className="v">{c.respondent.licensee || "—"}</div>
          <div className="k">สถานประกอบการ</div><div className="v">{c.respondent.business || "—"}</div>
          <div className="k">ที่อยู่</div><div className="v">{c.respondent.address || "—"}</div>
          <div className="k">อำเภอ</div><div className="v">{c.respondent.district || "—"}</div>
          <div className="k">เลขที่ใบอนุญาต</div><div className="v mono">{c.respondent.licenseNo || "—"}</div>
        </div>
      </DataCard>

      <DataCard title="รายละเอียดเรื่องร้องเรียน" icon="info">
        <div className="kv">
          <div className="k">พรบ.</div><div className="v"><div className="tag-list">{c.laws.map(id => <span key={id} className="chip primary">{window.CMS.lawLabel(id)}</span>)}</div></div>
          <div className="k">ที่มา</div><div className="v"><span className="chip">{c.source}</span></div>
          <div className="k">ผลิตภัณฑ์/บริการ</div><div className="v">{c.product || "—"}</div>
          <div className="k">เลข อย./ทะเบียน</div><div className="v mono">{c.productLicense || "—"}</div>
          <div className="k">ประเภทปัญหา</div><div className="v"><div className="tag-list">{c.problems.map(p => <span key={p} className="chip accent">{p}</span>)}</div></div>
          {c.bountyAmount && (<><div className="k">สินบนรางวัล</div><div className="v">{window.CMS.fmtMoney(c.bountyAmount)}</div></>)}
        </div>
        {c.description && <p style={{ marginTop: 12, color: "var(--text)", lineHeight: 1.7, fontSize: 13.5 }}>{c.description}</p>}
      </DataCard>

      {c.investigation && (c.investigation.siteVisitDate || c.investigation.meetingDate) && (
        <DataCard title="การตรวจสอบข้อเท็จจริง" icon="loupe">
          {c.investigation.siteVisitDate && (
            <div style={{ paddingBottom: 12, borderBottom: "1px solid var(--border)", marginBottom: 12 }}>
              <div className="small muted" style={{ fontWeight: 600, color: "var(--text)" }}>การลงพื้นที่</div>
              <div className="kv" style={{ marginTop: 4 }}>
                <div className="k">วันที่ลงพื้นที่</div><div className="v">{window.CMS.fmtThaiDate(c.investigation.siteVisitDate)}</div>
                <div className="k">สถานที่</div><div className="v">{c.investigation.sitePlace || "—"}</div>
                <div className="k">ผลการตรวจ</div><div className="v">{c.investigation.siteResult || "—"}</div>
              </div>
            </div>
          )}
          {c.investigation.meetingDate && (
            <div>
              <div className="small muted" style={{ fontWeight: 600, color: "var(--text)" }}>การเชิญพบเพื่อชี้แจง</div>
              <div className="kv" style={{ marginTop: 4 }}>
                <div className="k">วันที่</div><div className="v">{window.CMS.fmtThaiDate(c.investigation.meetingDate)}</div>
                <div className="k">สถานที่นัด</div><div className="v">{c.investigation.meetingPlace || "—"}</div>
                <div className="k">สรุป</div><div className="v">{c.investigation.meetingSummary || "—"}</div>
              </div>
            </div>
          )}
        </DataCard>
      )}

      {c.board && c.board.resolution && (
        <DataCard title="มติคณะกรรมการ" icon="users">
          <div className="kv">
            <div className="k">คณะกรรมการ</div><div className="v">{c.board.committees.join(", ")}</div>
            <div className="k">ครั้งที่ประชุม</div><div className="v">{c.board.meetingNo}/{c.board.year}</div>
            <div className="k">วันที่ประชุม</div><div className="v">{window.CMS.fmtThaiDate(c.board.meetingDate)}</div>
            <div className="k">มติ</div><div className="v"><span className="chip accent" style={{ fontWeight: 600 }}>{c.board.resolution}</span></div>
            {c.board.sections.length > 0 && (
              <>
                <div className="k">มาตรา</div>
                <div className="v">
                  <div className="stack-sm">
                    {c.board.sections.map((s, i) => {
                      const sec = window.CMS.sectionById(s.secId);
                      return <div key={i} className="small">{sec?.text} · ครั้งที่ {s.count} · {window.CMS.fmtMoney(s.fine)}</div>;
                    })}
                  </div>
                </div>
              </>
            )}
            {c.board.notes && (<><div className="k">หมายเหตุ</div><div className="v">{c.board.notes}</div></>)}
          </div>
        </DataCard>
      )}

      {c.fines && c.fines.length > 0 && (
        <DataCard title="ค่าปรับ" icon="money">
          <table className="data" style={{ marginTop: -8 }}>
            <thead>
              <tr><th>มาตรา</th><th>ครั้งที่</th><th>จำนวนเงิน</th><th>สถานะ</th><th>วันชำระ</th></tr>
            </thead>
            <tbody>
              {c.fines.map((f, i) => {
                const sec = window.CMS.sectionById(f.secId);
                return (
                  <tr key={i} style={{ cursor: "default" }}>
                    <td style={{ maxWidth: 260 }}>{sec?.text}</td>
                    <td className="num">{f.count}</td>
                    <td className="num"><strong>{window.CMS.fmtMoney(f.amount)}</strong></td>
                    <td>{f.paid ? <span className="status-badge s05"><Icon name="check" size={12} stroke={2}/>ชำระแล้ว</span> : <span className="status-badge s04"><Icon name="clock" size={12} stroke={2}/>ค้างชำระ</span>}</td>
                    <td className="muted small">{window.CMS.fmtThaiDateShort(f.paidDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DataCard>
      )}
    </div>
  );

  const TimelinePanel = (
    <DataCard title="Timeline / ประวัติการดำเนินการ" icon="history">
      <div className="v-timeline">
        {c.timeline.slice().reverse().map((t, i) => (
          <div key={i} className={`v-event ${t.kind === "close" ? "done" : ""}`}>
            <div className="v-when">{window.CMS.fmtThaiDate(t.date)} เวลา {t.time} น.</div>
            <div className="v-title">{t.title}</div>
            <div className="v-body">โดย {t.user}</div>
            {t.status && <div className="v-meta"><SLABadge sla={{ kind: t.status, label: t.status === "in-time" ? "ในเวลา" : t.status }}/></div>}
          </div>
        ))}
      </div>
    </DataCard>
  );

  const AttachmentsPanel = (
    <DataCard title="เอกสารแนบ" icon="paperclip" actions={canEdit && !locked && <button className="btn btn-outline btn-sm"><Icon name="upload" size={14}/> อัปโหลดเพิ่ม</button>}>
      {c.attachments && c.attachments.length > 0 ? (
        <div className="stack-sm">
          {c.attachments.map((a, i) => (
            <div key={i} className="file-row">
              <div className="file-thumb">{a.type === "image" ? <Icon name="image" size={18}/> : a.type === "pdf" ? "PDF" : <Icon name="file" size={18}/>}</div>
              <div className="file-name">{a.name}</div>
              <div className="file-meta">{a.size}</div>
              <button className="btn btn-ghost btn-sm"><Icon name="eye" size={14}/> ดู</button>
              <button className="btn btn-ghost btn-sm"><Icon name="download" size={14}/></button>
            </div>
          ))}
        </div>
      ) : (
        <div className="muted small">ยังไม่มีเอกสารแนบ</div>
      )}
    </DataCard>
  );

  const NotifyPanel = (
    <DataCard title="แจ้งเตือนผู้ร้องเรียน" icon="send">
      <div className="stack">
        {c.complainant.anonymous ? (
          <div style={{ padding: "12px 14px", background: "var(--surface-2)", borderRadius: 8 }} className="small muted">
            <Icon name="shield" size={14}/> ผู้ร้องนิรนาม — ไม่มีช่องทางติดต่อ
          </div>
        ) : (
          <>
            <FormField label="Template">
              <select className="select" defaultValue="status">
                <option value="status">แจ้งสถานะปัจจุบัน</option>
                <option value="invest">เชิญพบเพื่อชี้แจง</option>
                <option value="close">แจ้งปิดเคส</option>
              </select>
            </FormField>
            <FormField label="ช่องทาง">
              <div className="row">
                <label className="checkbox"><input type="checkbox" defaultChecked/>Email ({c.complainant.email || "—"})</label>
                <label className="checkbox"><input type="checkbox" defaultChecked/>SMS ({c.complainant.phone || "—"})</label>
                <label className="checkbox"><input type="checkbox"/>Line</label>
              </div>
            </FormField>
            <FormField label="ข้อความ" full>
              <textarea className="textarea" rows={5} defaultValue={`เรียน ${c.complainant.name},\n\nเรื่องร้องเรียนที่ ${c.etracking} ขณะนี้อยู่ในขั้นตอน ${window.CMS.STATUS[c.status].label}\n\nสำนักงานสาธารณสุขจังหวัดนนทบุรี`}/>
            </FormField>
            <div className="row end">
              <button className="btn btn-primary" disabled={locked}><Icon name="send" size={14}/> ส่งการแจ้งเตือน</button>
            </div>
          </>
        )}
      </div>
    </DataCard>
  );

  // ---------- Layout variants ----------
  let layoutContent;
  if (tweaks.detailLayout === "tabs") {
    layoutContent = (
      <div className="detail-grid-tabs">
        {StatusPanel}
        <div className="card">
          <div className="card-header" style={{ padding: 0, borderBottom: "none" }}>
            <Tabs value={activeTab} onChange={setActiveTab} tabs={[
              { value: "data",     label: "ข้อมูลเคส", icon: "info" },
              { value: "timeline", label: "Timeline",  icon: "history" },
              { value: "files",    label: "เอกสารแนบ", icon: "paperclip", count: (c.attachments || []).length },
              { value: "notify",   label: "แจ้งเตือนผู้ร้อง", icon: "send" },
            ]}/>
          </div>
          <div className="card-body">
            {activeTab === "data" && DataPanel}
            {activeTab === "timeline" && TimelinePanel}
            {activeTab === "files" && AttachmentsPanel}
            {activeTab === "notify" && NotifyPanel}
          </div>
        </div>
      </div>
    );
  } else if (tweaks.detailLayout === "timeline") {
    layoutContent = (
      <div className="detail-grid-timeline">
        <div className="stack">
          {StatusPanel}
          <DataCard title="ขั้นตอน SLA" icon="clock">
            <SLATimelineVertical c={c}/>
          </DataCard>
          {AttachmentsPanel}
        </div>
        <div className="stack">
          {TimelinePanel}
          {DataPanel}
          {NotifyPanel}
        </div>
      </div>
    );
  } else {
    // 2col default
    layoutContent = (
      <div className="detail-grid-2col">
        <div className="stack">
          {StatusPanel}
          {AttachmentsPanel}
          {NotifyPanel}
        </div>
        <div className="stack">
          <div className="card">
            <div className="card-header" style={{ padding: 0, borderBottom: "none" }}>
              <Tabs value={activeTab} onChange={setActiveTab} tabs={[
                { value: "data",     label: "ข้อมูลเคส", icon: "info" },
                { value: "timeline", label: "Timeline",  icon: "history" },
              ]}/>
            </div>
            <div className="card-body">
              {activeTab === "data" ? DataPanel : TimelinePanel}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="page fade-in">
      <div className="row" style={{ marginBottom: 12, gap: 4 }}>
        <button className="btn btn-ghost btn-sm" onClick={()=> setRoute({ name: "case-list" })}>
          <Icon name="arrow-left" size={14}/> ทุกเคส
        </button>
        <span className="small muted">/</span>
        <span className="small mono" style={{ color: "var(--primary-700)" }}>{c.etracking}</span>
      </div>
      <div className="page-header">
        <div>
          <h1 style={{ maxWidth: 720 }}>{c.title}</h1>
          <div className="page-meta">สร้างโดย {c.createdBy} เมื่อ {window.CMS.fmtThaiDate(c.createdAt)} · มอบหมาย {c.assignees.length} คน</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm"><Icon name="printer" size={14}/> พิมพ์</button>
          <button className="btn btn-outline btn-sm" disabled={locked} title={locked ? "เคสล็อก — เกิน SLA" : ""}>
            <Icon name={locked ? "lock" : "edit"} size={14}/> {locked ? "ล็อก" : "แก้ไข"}
          </button>
          <button className="btn btn-outline btn-sm"><Icon name="more" size={14}/></button>
        </div>
      </div>

      {LockBanner}

      {layoutContent}

      {modal === "assign" && <AssignModal c={c} onClose={()=> setModal(null)} onSave={saveAssignment}/>}
      {modal === "invest" && <InvestigationModal c={c} onClose={()=> setModal(null)} onSave={saveInvestigation} onChoose={selectInvestPath}/>}
      {modal === "board"  && <BoardModal c={c} onClose={()=> setModal(null)} onSave={saveBoard}/>}
      {modal === "fine"   && <FineModal c={c} onClose={()=> setModal(null)} onSave={savePayment}/>}
    </main>
  );
};

// Generic card wrapper
const DataCard = ({ title, icon, actions, children }) => (
  <div className="card">
    <div className="card-header">
      <div className="row" style={{ gap: 10 }}>
        {icon && <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--primary-100)", color: "var(--primary-700)", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name={icon} size={16}/></div>}
        <h3>{title}</h3>
      </div>
      {actions}
    </div>
    <div className="card-body">{children}</div>
  </div>
);

// ============== S06 — Assign Modal ==============
const AssignModal = ({ c, onClose, onSave }) => {
  const [selected, setSelected] = React.useState([]);
  const [note, setNote] = React.useState("");
  return (
    <Modal open onClose={onClose} title="มอบหมายเจ้าหน้าที่" sub={c.etracking + " · " + c.title}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" disabled={selected.length === 0} onClick={()=> onSave(selected, note)}>
            <Icon name="check" size={14}/> บันทึกการมอบหมาย
          </button>
        </>
      }>
      <div className="stack">
        <div style={{ padding: 12, background: "var(--primary-50)", borderRadius: 8, fontSize: 12.5 }}>
          <strong>SLA:</strong> ต้องมอบหมายภายใน 3 วันจากวันที่ลงรับ POST ({window.CMS.fmtThaiDate(c.postDate)})
        </div>
        <FormField label="เลือกเจ้าหน้าที่ผู้รับผิดชอบ" req>
          <ChipPicker
            options={window.CMS.MASTER.officers.map(o => ({ id: o.id, label: o.name }))}
            value={selected} onChange={setSelected}/>
          <span className="hint">เลือกได้มากกว่า 1 คน · ทุกคนจะได้รับ notification</span>
        </FormField>
        <FormField label="หมายเหตุ">
          <textarea className="textarea" rows={3} placeholder="ข้อความถึงผู้รับมอบหมาย (ถ้ามี)"
            value={note} onChange={(e)=> setNote(e.target.value)}/>
        </FormField>
      </div>
    </Modal>
  );
};

// ============== S07 — Investigation Modal ==============
const InvestigationModal = ({ c, onClose, onSave, onChoose }) => {
  const [form, setForm] = React.useState({
    siteVisitDate: c.investigation.siteVisitDate || "",
    sitePlace: c.investigation.sitePlace || "",
    siteResult: c.investigation.siteResult || "",
    meetingDate: c.investigation.meetingDate || "",
    meetingPlace: c.investigation.meetingPlace || "",
    meetingSummary: c.investigation.meetingSummary || "",
    attachments: [],
  });
  const has = form.siteVisitDate || form.meetingDate;
  const snapInvest = window.CMS.computeSlaStage(c.assignedAt, 20, form.siteVisitDate || form.meetingDate || null);
  return (
    <Modal open onClose={onClose} size="lg" title="บันทึกการตรวจสอบข้อเท็จจริง" sub={c.etracking + " · " + c.title}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" disabled={!has} onClick={()=> onSave(form)}>
            <Icon name="save" size={14}/> บันทึกการตรวจสอบ
          </button>
        </>
      }>
      <div className="stack">
        <div className="row" style={{ padding: 12, background: "var(--primary-50)", borderRadius: 8, fontSize: 12.5, justifyContent:"space-between" }}>
          <div><strong>SLA:</strong> ตรวจสอบข้อเท็จจริงภายใน 20 วันจากวันมอบหมาย</div>
          <SLABadge sla={snapInvest}/>
        </div>

        <div className="form-grid cols-2">
          <div className="form-section">
            <div className="section-head"><div className="section-num" style={{background:"var(--primary-700)"}}>A</div><div className="section-title">ลงพื้นที่ตรวจสอบ</div></div>
            <div className="section-body stack">
              <FormField label="วันที่ลงพื้นที่">
                <input type="date" className="input" value={form.siteVisitDate} onChange={(e)=> setForm({...form, siteVisitDate: e.target.value})}/>
              </FormField>
              <FormField label="สถานที่">
                <input className="input" placeholder="ระบุสถานที่ลงพื้นที่"
                  value={form.sitePlace} onChange={(e)=> setForm({...form, sitePlace: e.target.value})}/>
              </FormField>
              <FormField label="ผลการตรวจ">
                <textarea className="textarea" rows={3} placeholder="สรุปสิ่งที่ตรวจพบ"
                  value={form.siteResult} onChange={(e)=> setForm({...form, siteResult: e.target.value})}/>
              </FormField>
            </div>
          </div>
          <div className="form-section">
            <div className="section-head"><div className="section-num" style={{background:"var(--accent-600)"}}>B</div><div className="section-title">เชิญพบเพื่อชี้แจง</div></div>
            <div className="section-body stack">
              <FormField label="วันที่เชิญพบ">
                <input type="date" className="input" value={form.meetingDate} onChange={(e)=> setForm({...form, meetingDate: e.target.value})}/>
              </FormField>
              <FormField label="สถานที่นัด">
                <input className="input" placeholder="เช่น สสจ.นนทบุรี"
                  value={form.meetingPlace} onChange={(e)=> setForm({...form, meetingPlace: e.target.value})}/>
              </FormField>
              <FormField label="สรุปการชี้แจง">
                <textarea className="textarea" rows={3} placeholder="สรุปจากการชี้แจงของผู้ถูกร้อง"
                  value={form.meetingSummary} onChange={(e)=> setForm({...form, meetingSummary: e.target.value})}/>
              </FormField>
            </div>
          </div>
        </div>

        {has && (
          <div className="card" style={{ background: "var(--accent-100)", borderColor: "var(--accent-600)" }}>
            <div className="card-body" style={{ padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--accent-700)", marginBottom: 4 }}>เลือกแนวทางหลังตรวจสอบ</div>
              <div className="small" style={{ marginBottom: 12, color: "var(--accent-700)" }}>ปลดล็อกขั้นถัดไป — กรุณาเลือก 1 ใน 4 ทางเลือก</div>
              <div className="form-grid cols-2">
                <button className="btn btn-primary btn-lg" onClick={()=> onChoose("board")}><Icon name="users" size={16}/> เข้าคณะกรรมการ</button>
                <button className="btn btn-outline btn-lg" onClick={()=> onChoose("forward")}><Icon name="send" size={16}/> ส่งต่อหน่วยงาน</button>
                <button className="btn btn-success btn-lg" onClick={()=> onChoose("stop")}><Icon name="check-circle" size={16}/> เสนอนายแพทย์ยุติ</button>
                <button className="btn btn-danger btn-lg" onClick={()=> onChoose("police")}><Icon name="gavel" size={16}/> แจ้งความ/ดำเนินคดี</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

// ============== S08 — Board Modal ==============
const BoardModal = ({ c, onClose, onSave }) => {
  const [committees, setCommittees] = React.useState(c.board?.committees || []);
  const [meetingNo, setMeetingNo] = React.useState(c.board?.meetingNo || "");
  const [year, setYear] = React.useState(c.board?.year || 2569);
  const [meetingDate, setMeetingDate] = React.useState(c.board?.meetingDate || window.CMS.TODAY);
  const [resolution, setResolution] = React.useState(c.board?.resolution || "");
  const [sections, setSections] = React.useState(c.board?.sections || []);
  const [notes, setNotes] = React.useState(c.board?.notes || "");

  function addSection() {
    const first = window.CMS.MASTER.sections[0];
    setSections([...sections, { secId: first.id, count: 1, fine: first.fines[0] }]);
  }
  function updateSection(i, k, v) {
    setSections(sections.map((s, idx) => idx === i ? { ...s, [k]: v, ...(k === "count" ? { fine: window.CMS.sectionById(s.secId)?.fines[Math.min(v-1, 2)] || 0 } : {}) , ...(k === "secId" ? { fine: window.CMS.sectionById(v)?.fines[Math.min(s.count-1, 2)] || 0 } : {}) } : s));
  }
  function removeSection(i) { setSections(sections.filter((_, idx) => idx !== i)); }

  const canSubmit = committees.length > 0 && meetingNo && meetingDate && resolution;

  return (
    <Modal open onClose={onClose} size="lg" title="บันทึกมติคณะกรรมการ" sub={c.etracking + " · " + c.title}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" disabled={!canSubmit}
            onClick={()=> onSave({ committees, meetingNo: +meetingNo, year: +year, meetingDate, resolution, sections, notes })}>
            <Icon name="save" size={14}/> บันทึกมติ
          </button>
        </>
      }>
      <div className="stack">
        <FormField label="คณะกรรมการ" req hint="กรองตามพรบ. ของเคส · เลือกได้หลายคณะ">
          <ChipPicker
            options={window.CMS.MASTER.committees.map(co => ({ id: co, label: co }))}
            value={committees} onChange={setCommittees}/>
        </FormField>
        <div className="form-grid cols-3">
          <FormField label="ครั้งที่ประชุม" req>
            <input type="number" min="1" max="12" className="input" value={meetingNo}
              onChange={(e)=> setMeetingNo(e.target.value)}/>
          </FormField>
          <FormField label="ปี พ.ศ.">
            <input type="number" className="input" value={year} onChange={(e)=> setYear(e.target.value)}/>
          </FormField>
          <FormField label="วันที่ประชุม" req>
            <input type="date" className="input" value={meetingDate} onChange={(e)=> setMeetingDate(e.target.value)}/>
          </FormField>
        </div>

        <FormField label="มติ" req>
          <ChipPicker single
            options={window.CMS.MASTER.resolutions.map(r => ({ id: r, label: r }))}
            value={resolution ? [resolution] : []}
            onChange={(arr) => setResolution(arr[0] || "")}/>
        </FormField>

        {(resolution === "เปรียบเทียบปรับ" || resolution === "ออกคำสั่งปรับพินัย") && (
          <div className="form-section">
            <div className="section-head"><div className="section-num">+</div><div className="section-title">ความผิดตามมาตรา</div></div>
            <div className="section-body stack">
              {sections.length === 0 && <div className="muted small">ยังไม่ได้เพิ่มมาตรา</div>}
              {sections.map((s, i) => {
                const sec = window.CMS.sectionById(s.secId);
                return (
                  <div key={i} className="row" style={{ gap: 8, padding: 10, border: "1px solid var(--border)", borderRadius: 8 }}>
                    <select className="select" style={{ flex: 1 }} value={s.secId} onChange={(e)=> updateSection(i, "secId", e.target.value)}>
                      {window.CMS.MASTER.sections.map(sx => <option key={sx.id} value={sx.id}>{sx.text}</option>)}
                    </select>
                    <input type="number" min="1" max="3" className="input" style={{ width: 100 }}
                      value={s.count} onChange={(e)=> updateSection(i, "count", +e.target.value)}/>
                    <input className="input mono" style={{ width: 140, textAlign: "right" }} disabled
                      value={window.CMS.fmtMoney(s.fine)}/>
                    <button className="icon-btn" onClick={()=> removeSection(i)}><Icon name="trash" size={14}/></button>
                  </div>
                );
              })}
              <button className="btn btn-outline btn-sm" onClick={addSection}>
                <Icon name="plus" size={14}/> เพิ่มมาตรา
              </button>
              {sections.length > 0 && (
                <div className="row between" style={{ padding: 12, background: "var(--primary-50)", borderRadius: 8, fontWeight: 600 }}>
                  <span>รวมค่าปรับ</span>
                  <span className="mono">{window.CMS.fmtMoney(sections.reduce((s, x) => s + x.fine, 0))}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <FormField label="หมายเหตุ">
          <textarea className="textarea" rows={2} value={notes} onChange={(e)=> setNotes(e.target.value)}/>
        </FormField>
      </div>
    </Modal>
  );
};

// ============== S09 — Fine / Payment Modal ==============
const FineModal = ({ c, onClose, onSave }) => {
  const [idx, setIdx] = React.useState(-1);
  const [paidDate, setPaidDate] = React.useState(window.CMS.TODAY);
  const [amount, setAmount] = React.useState("");
  const [files, setFiles] = React.useState([]);
  const unpaid = c.fines.map((f, i) => ({ ...f, i })).filter(f => !f.paid);
  const totalUnpaid = unpaid.reduce((s, f) => s + f.amount, 0);
  const allPaidAfter = c.fines.filter((f, i) => i !== idx).every(f => f.paid) && idx >= 0;

  return (
    <Modal open onClose={onClose} size="lg" title="บันทึกการเปรียบเทียบปรับ" sub={c.etracking + " · " + c.title}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" disabled={idx < 0 || !amount || !paidDate}
            onClick={()=> onSave({ idx, paidDate, amount: +amount })}>
            <Icon name="save" size={14}/> บันทึกการชำระ
          </button>
        </>
      }>
      <div className="stack">
        <div className="row between" style={{ padding: 12, background: "var(--accent-100)", borderRadius: 8 }}>
          <div>
            <div className="small" style={{ color: "var(--accent-700)", fontWeight: 600 }}>ค่าปรับค้างจ่าย</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 700 }}>{window.CMS.fmtMoney(totalUnpaid)}</div>
          </div>
          <SLABadge sla={window.CMS.computeSlaStage(c.board?.meetingDate, 60, null)}/>
        </div>

        <FormField label="เลือกรายการชำระ" req>
          <div className="stack-sm">
            {c.fines.map((f, i) => {
              const sec = window.CMS.sectionById(f.secId);
              return (
                <label key={i} className="row" style={{ padding: 12, border: idx === i ? "2px solid var(--primary-700)" : "1px solid var(--border)", borderRadius: 8, cursor: f.paid ? "not-allowed" : "pointer", opacity: f.paid ? 0.5 : 1 }}>
                  <input type="radio" name="fine" disabled={f.paid} checked={idx === i}
                    onChange={()=> { setIdx(i); setAmount(f.amount.toString()); }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{sec?.text}</div>
                    <div className="small muted">ครั้งที่ {f.count} · {window.CMS.fmtMoney(f.amount)}</div>
                  </div>
                  {f.paid ? <span className="status-badge s05"><Icon name="check" size={12}/> ชำระแล้ว</span> : <span className="status-badge s04">ค้างชำระ</span>}
                </label>
              );
            })}
          </div>
        </FormField>

        {idx >= 0 && (
          <>
            <div className="form-grid cols-2">
              <FormField label="วันที่จ่ายค่าปรับ" req>
                <input type="date" className="input" value={paidDate} onChange={(e)=> setPaidDate(e.target.value)}/>
              </FormField>
              <FormField label="จำนวนที่ชำระ (บาท)" req>
                <input type="number" className="input mono" value={amount} onChange={(e)=> setAmount(e.target.value)}/>
              </FormField>
            </div>
            <FormField label="แนบใบเสร็จ">
              <FileUpload files={files} onChange={setFiles}/>
            </FormField>
            {allPaidAfter && (
              <div style={{ padding: 14, background: "var(--success-100)", borderRadius: 8, color: "var(--success-700)", display:"flex", gap: 10, alignItems:"center" }}>
                <Icon name="check-circle" size={20}/>
                <div>
                  <div style={{ fontWeight: 700 }}>เคสจะถูกปิด (ยุติคดี)</div>
                  <div className="small">หลังบันทึกรายการนี้ ค่าปรับทั้งหมดจะถูกชำระครบ</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

Object.assign(window, { CaseDetailScreen, AssignModal, InvestigationModal, BoardModal, FineModal, DataCard });
