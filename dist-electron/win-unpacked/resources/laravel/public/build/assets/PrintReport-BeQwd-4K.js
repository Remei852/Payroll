import{r as _,j as e,H as v,a as z}from"./app-i7-6dvRw.js";const x=t=>{const[s,o,l]=t.split("-");return`${o}/${l}/${s}`},c=t=>new Date(t+"T00:00:00").toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}),d=t=>{if(!t)return"—";const s=t.split(":"),o=s[0].padStart(2,"0"),l=(s[1]??"00").padStart(2,"0"),r=(s[2]??"00").padStart(2,"0");return`${o}:${l}:${r}`},n=t=>{if(!t||t===0)return"—";const s=Math.floor(t/60),o=t%60;return s===0?`${o}m`:o===0?`${s}h`:`${s}h${o}m`};function $({data:t,dateFrom:s,dateTo:o}){const{employee:l,rows:r,total_days_worked:i,total_late_minutes:g,total_absences:h,total_late_days:b,total_missing_logs:u,total_undertime_minutes:f,total_overtime_minutes:j}=t;return e.jsxs("div",{className:"employee-block",children:[e.jsxs("div",{className:"emp-header",children:[e.jsxs("span",{className:"emp-name",children:[l.last_name,", ",l.first_name]}),e.jsxs("span",{className:"emp-meta",children:[l.employee_code," · ",l.department??"—"]}),e.jsxs("span",{className:"emp-period",children:[c(s)," – ",c(o)]})]}),r.length===0?e.jsx("p",{className:"no-records",children:"No attendance records for this period."}):e.jsxs("table",{className:"att-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{className:"col-date",children:"Date"}),e.jsx("th",{className:"col-time",children:"AM In"}),e.jsx("th",{className:"col-time",children:"AM Out"}),e.jsx("th",{className:"col-time",children:"PM In"}),e.jsx("th",{className:"col-time",children:"PM Out"}),e.jsx("th",{className:"col-num",children:"Miss"}),e.jsx("th",{className:"col-num",children:"Late AM"}),e.jsx("th",{className:"col-num",children:"Late PM"}),e.jsx("th",{className:"col-num",children:"Total Late"}),e.jsx("th",{className:"col-num",children:"UT"}),e.jsx("th",{className:"col-num",children:"OT"}),e.jsx("th",{className:"col-status",children:"Status"})]})}),e.jsx("tbody",{children:r.map((a,y)=>{const w=(a.status??"").toLowerCase().includes("absent")&&!(a.status??"").toLowerCase().includes("holiday"),k=a.missed_logs>0,N=w?"row-absent":k?"row-missing":"",p=a.late_minutes_am>0,m=a.late_minutes_pm>0;return e.jsxs("tr",{className:N,children:[e.jsx("td",{className:"col-date",children:x(a.date)}),e.jsx("td",{className:`col-time${p?" cell-late":""}`,children:d(a.time_in_am)}),e.jsx("td",{className:"col-time",children:d(a.time_out_lunch)}),e.jsx("td",{className:`col-time${m?" cell-late":""}`,children:d(a.time_in_pm)}),e.jsx("td",{className:"col-time",children:d(a.time_out_pm)}),e.jsx("td",{className:"col-num",children:a.missed_logs>0?a.missed_logs:"—"}),e.jsx("td",{className:`col-num${p?" cell-late":""}`,children:n(a.late_minutes_am)}),e.jsx("td",{className:`col-num${m?" cell-late":""}`,children:n(a.late_minutes_pm)}),e.jsx("td",{className:`col-num${p||m?" cell-late-total":""}`,children:n(a.late_minutes)}),e.jsx("td",{className:"col-num",children:n(a.undertime_minutes)}),e.jsx("td",{className:"col-num",children:n(a.overtime_minutes)}),e.jsx("td",{className:"col-status",children:a.status||"—"})]},y)})}),e.jsx("tfoot",{children:e.jsxs("tr",{className:"summary-row",children:[e.jsx("td",{colSpan:5,className:"summary-label",children:"TOTALS"}),e.jsx("td",{className:"col-num",children:u||"—"}),e.jsx("td",{className:"col-num",children:"—"}),e.jsx("td",{className:"col-num",children:"—"}),e.jsx("td",{className:"col-num",children:n(g)}),e.jsx("td",{className:"col-num",children:n(f)}),e.jsx("td",{className:"col-num",children:n(j)}),e.jsxs("td",{className:"col-status summary-stats",children:[h>0&&e.jsxs("span",{children:[h," absent"]}),b>0&&e.jsxs("span",{children:[b," late days"]}),e.jsxs("span",{className:"days-worked",children:[i," days worked"]})]})]})})]})]})}function P({reportData:t,dateFrom:s,dateTo:o}){const[l,r]=_.useState(!1);return e.jsxs(e.Fragment,{children:[e.jsx(v,{title:`Attendance Report — ${x(s)} to ${x(o)}`}),e.jsx("style",{children:`
                /* ── Screen styles ── */
                body { background: #f1f5f9; margin: 0; }

                .toolbar {
                    position: fixed; top: 0; left: 0; right: 0; z-index: 50;
                    display: flex; align-items: center; justify-content: space-between;
                    background: white; border-bottom: 1px solid #e2e8f0;
                    padding: 10px 24px; box-shadow: 0 1px 3px rgba(0,0,0,.08);
                }
                .toolbar-title { font-size: 14px; font-weight: 600; color: #1e293b; }
                .toolbar-sub   { font-size: 11px; color: #64748b; margin-top: 1px; }
                .toolbar-actions { display: flex; gap: 8px; align-items: center; }

                .btn {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 7px 14px; border-radius: 8px; font-size: 13px;
                    font-weight: 500; cursor: pointer; transition: all .15s;
                    border: 1px solid #cbd5e1; background: white; color: #475569;
                }
                .btn:hover { background: #f8fafc; }
                .btn-primary { background: #1e3a8a; color: white; border-color: #1e3a8a; }
                .btn-primary:hover { background: #1e3a8a; opacity: .9; }

                .toggle-label {
                    display: flex; align-items: center; gap: 6px;
                    font-size: 12px; color: #475569; cursor: pointer;
                }

                .report-spacer { height: 72px; }

                .report-wrap {
                    max-width: 900px; margin: 0 auto 40px;
                    background: white; padding: 24px;
                    box-shadow: 0 1px 4px rgba(0,0,0,.1);
                }

                .report-title {
                    font-size: 16px; font-weight: 700; color: #0f172a;
                    border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 20px;
                }
                .report-title span { font-size: 11px; font-weight: 400; color: #64748b; margin-left: 8px; }

                /* ── Employee block ── */
                .employee-block {
                    margin-bottom: 20px;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    overflow: hidden;
                }

                .emp-header {
                    display: flex; align-items: baseline; gap: 10px;
                    background: #1e3a8a; color: white;
                    padding: 6px 10px; font-size: 11px;
                }
                .emp-name   { font-weight: 700; font-size: 12px; }
                .emp-meta   { opacity: .75; }
                .emp-period { margin-left: auto; opacity: .75; white-space: nowrap; }

                .no-records {
                    padding: 12px; text-align: center;
                    font-size: 11px; color: #94a3b8; font-style: italic;
                }

                /* ── Attendance table ── */
                .att-table {
                    width: 100%; border-collapse: collapse;
                    font-size: 10.5px;
                }
                .att-table th {
                    background: #f8fafc; color: #475569;
                    font-weight: 600; text-transform: uppercase;
                    font-size: 9px; letter-spacing: .04em;
                    padding: 5px 6px; border-bottom: 1px solid #e2e8f0;
                    white-space: nowrap;
                }
                .att-table td {
                    padding: 4px 6px; border-bottom: 1px solid #f1f5f9;
                    color: #334155;
                }
                .att-table tbody tr:last-child td { border-bottom: none; }

                .col-date   { text-align: left;   min-width: 58px; }
                .col-time   { text-align: center;  min-width: 62px; }
                .col-num    { text-align: center;  min-width: 36px; }
                .col-status { text-align: left;    min-width: 80px; }

                /* Row highlights — subtle for screen, stripped for print */
                .row-absent  td { background: #fef2f2; }
                .row-missing td { background: #fdf4ff; }

                /* Late cell highlights — applied per-cell, not per-row */
                .cell-late {
                    background: #fff7ed !important;
                    color: #c2410c !important;
                    font-weight: 600;
                }
                .cell-late-total {
                    background: #ffedd5 !important;
                    color: #9a3412 !important;
                    font-weight: 700;
                }

                /* Summary footer row */
                .summary-row td {
                    background: #f8fafc; font-weight: 600;
                    border-top: 1.5px solid #cbd5e1;
                    font-size: 10px; color: #1e293b;
                    padding: 5px 6px;
                }
                .summary-label { text-align: right; color: #64748b; }
                .summary-stats { display: flex; gap: 6px; flex-wrap: wrap; }
                .summary-stats span {
                    background: #e2e8f0; border-radius: 3px;
                    padding: 1px 5px; font-size: 9px; color: #475569;
                }
                .summary-stats .days-worked {
                    background: #dbeafe; color: #1e40af; font-weight: 600;
                }

                /* ── Print styles ── */
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 1cm 1.2cm;
                    }
                    @page :first {
                        margin: 1cm 1.2cm;
                    }

                    html, body { background: white !important; margin: 0; padding: 0; }
                    .toolbar { display: none !important; }
                    .report-spacer { display: none !important; }

                    .report-wrap {
                        max-width: none; margin: 0; padding: 0;
                        box-shadow: none;
                    }

                    .report-title {
                        font-size: 13px; margin-bottom: 14px;
                    }

                    /* Remove colored row backgrounds — saves ink, looks clean in B&W */
                    .row-absent td, .row-missing td {
                        background: white !important;
                    }

                    /* Keep late cell orange in print — it's the key visual signal */
                    .cell-late, .cell-late-total {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    /* Mark problem rows with left border instead of background */
                    .row-absent  td:first-child { border-left: 3px solid #dc2626; }
                    .row-missing td:first-child { border-left: 3px solid #a21caf; }

                    .employee-block {
                        border: 1px solid #cbd5e1;
                        border-radius: 0;
                        margin-bottom: 14px;
                        /* Avoid splitting an employee block across pages when possible */
                        break-inside: avoid;
                    }

                    /* One-per-page mode: force page break after each employee */
                    .one-per-page .employee-block {
                        break-after: page;
                    }
                    .one-per-page .employee-block:last-child {
                        break-after: avoid;
                    }

                    .emp-header {
                        /* Print-safe: dark background with white text prints fine */
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    .att-table { font-size: 9.5px; }
                    .att-table th { font-size: 8px; padding: 4px 5px; }
                    .att-table td { padding: 3px 5px; }

                    .summary-row td { font-size: 9px; }
                    .summary-stats span {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }                }
            `}),e.jsxs("div",{className:"toolbar no-print",children:[e.jsxs("div",{children:[e.jsx("div",{className:"toolbar-title",children:"Attendance Report"}),e.jsxs("div",{className:"toolbar-sub",children:[c(s)," – ",c(o)," · ",t.length," employee",t.length!==1?"s":""]})]}),e.jsxs("div",{className:"toolbar-actions",children:[e.jsxs("label",{className:"toggle-label",children:[e.jsx("input",{type:"checkbox",checked:l,onChange:i=>r(i.target.checked),style:{accentColor:"#1e3a8a"}}),"One employee per page"]}),e.jsx("button",{className:"btn",onClick:()=>z.get(route("admin.attendance.report")),children:"← Back"}),e.jsxs("button",{className:"btn btn-primary",onClick:()=>window.print(),children:[e.jsx("svg",{width:"14",height:"14",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"})}),"Print / Save PDF"]})]})]}),e.jsx("div",{className:"report-spacer"}),e.jsxs("div",{className:`report-wrap ${l?"one-per-page":""}`,children:[e.jsxs("div",{className:"report-title",children:["Attendance Report",e.jsxs("span",{children:[c(s)," – ",c(o)]})]}),t.length===0?e.jsx("p",{style:{textAlign:"center",color:"#94a3b8",padding:"40px 0"},children:"No attendance records found for the selected range."}):t.map(i=>e.jsx($,{data:i,dateFrom:s,dateTo:o},i.employee.id))]})]})}export{P as default};
