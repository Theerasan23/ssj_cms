"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { useClickOutside } from "@/components/ui";
import { useToasts } from "@/context/AppContext";
import { ensureSheetJS } from "@/lib/sheet";

// columns: [{ header: string, value: (row) => string|number }]
function toRecords(rows, columns) {
  return rows.map((r) => Object.fromEntries(columns.map((c) => [c.header, c.value(r)])));
}

function downloadCsv(records, filename) {
  if (!records.length) return;
  const headers = Object.keys(records[0]);
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "﻿" + [headers.join(","), ...records.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filename}.csv`);
}

async function downloadXlsx(records, filename) {
  const XLSX = await ensureSheetJS();
  const ws = XLSX.utils.json_to_sheet(records);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportButtons({ rows, columns, filename = "export", size = "sm" }) {
  const toast = useToasts();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  async function run(kind) {
    setOpen(false);
    const data = typeof rows === "function" ? rows() : rows;
    if (!data || data.length === 0) { toast.push({ kind: "warn", title: "ไม่มีข้อมูลให้ export" }); return; }
    const records = toRecords(data, columns);
    try {
      if (kind === "csv") downloadCsv(records, filename);
      else await downloadXlsx(records, filename);
    } catch (e) {
      toast.push({ kind: "danger", title: "Export ไม่สำเร็จ", msg: e.message });
    }
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className={`btn btn-outline ${size === "sm" ? "btn-sm" : ""}`} onClick={() => setOpen((v) => !v)}>
        <Icon name="download" size={size === "sm" ? 14 : 16} /> Export
        <Icon name="chevron-down" size={13} />
      </button>
      {open && (
        <div className="dropdown" style={{ minWidth: 170, right: 0 }}>
          <button className="dropdown-item" onClick={() => run("xlsx")}><Icon name="file" size={15} /> Excel (.xlsx)</button>
          <button className="dropdown-item" onClick={() => run("csv")}><Icon name="file" size={15} /> CSV (.csv)</button>
        </div>
      )}
    </div>
  );
}
