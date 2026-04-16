import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

// ─── Inline editable text block ──────────────────────────────────────────────
// Clicking turns it into a textarea; blur saves. Shows a subtle edit hint on hover.
function EditableBlock({ value, onChange, multiline = true, style = {}, className = '' }) {
    const [editing, setEditing] = useState(false);
    const ref = useRef(null);

    const start = () => setEditing(true);
    const stop  = (e) => { onChange(e.target.value); setEditing(false); };

    useEffect(() => {
        if (editing && ref.current) {
            ref.current.focus();
            ref.current.select();
        }
    }, [editing]);

    const baseStyle = {
        fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit',
        color: 'inherit', background: 'transparent', border: 'none',
        padding: 0, margin: 0, width: '100%', resize: 'none',
        ...style,
    };

    if (editing) {
        return multiline
            ? <textarea ref={ref} defaultValue={value} onBlur={stop}
                rows={Math.max(3, value.split('\n').length + 1)}
                style={{ ...baseStyle, border: '1.5px solid #3b82f6', borderRadius: 3, padding: '3px 5px', background: '#eff6ff', outline: 'none' }} />
            : <input ref={ref} type="text" defaultValue={value} onBlur={stop}
                style={{ ...baseStyle, border: '1.5px solid #3b82f6', borderRadius: 3, padding: '2px 5px', background: '#eff6ff', outline: 'none' }} />;
    }

    return (
        <span
            onClick={start}
            title="Click to edit"
            className={className}
            style={{
                cursor: 'text',
                display: 'block',
                borderRadius: 3,
                padding: '1px 2px',
                transition: 'background 0.1s',
                ...style,
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
            {value || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Click to edit…</span>}
        </span>
    );
}

// ─── Read-only badge ──────────────────────────────────────────────────────────
function ReadOnly({ children, style = {} }) {
    return (
        <span style={{ cursor: 'default', userSelect: 'none', ...style }}>
            {children}
        </span>
    );
}

// ─── Live letter preview with inline editing ──────────────────────────────────
function LetterPreview({ data, content, onChange, companyName, companyAddress }) {
    if (!data) return null;
    const { employee, dateRange, violations: v, summary } = data;

    const cell = { padding: '3px 6px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'top', fontSize: '8pt' };
    const th   = { padding: '3px 6px', textAlign: 'left', fontSize: '7.5pt', textTransform: 'uppercase', letterSpacing: '0.03em', background: '#1e3a8a', color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' };
    const tbl  = { width: 'auto', borderCollapse: 'collapse', marginBottom: 10, fontSize: '8pt' };

    return (
        <div style={{ background: '#fff', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '9.5pt', lineHeight: 1.55, color: '#1e293b', padding: '14mm 16mm' }}>

            {/* Company header 
            
            <div style={{ textAlign: 'center', borderBottom: '2px solid #1e3a8a', paddingBottom: 8, marginBottom: 10 }}>
                <div style={{ fontSize: '12pt', fontWeight: 700, color: '#1e3a8a', letterSpacing: '0.04em' }}>{companyName}</div>
                {companyAddress && <div style={{ fontSize: '8pt', color: '#64748b', marginTop: 2 }}>{companyAddress}</div>}
            </div>
                */}
            {/* Letter title — editable */}
            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '11pt', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '8px 0 10px', color: '#0f172a' }}>
                <EditableBlock value={content.subject} onChange={v => onChange('subject', v)} multiline={false}
                    style={{ textAlign: 'center', fontWeight: 700, fontSize: '11pt', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0f172a', display: 'inline-block', minWidth: 200 }} />
            </div>

            {/* Employee info block — read-only */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 3, padding: '7px 10px', marginBottom: 10, background: '#f8fafc', fontSize: '9pt' }}>
                {[
                    ['Employee Name', employee.name],
                    ['Employee Code', employee.code],
                    ['Department',    employee.department],
                    ['Period Covered', `${dateRange.startFormatted} to ${dateRange.endFormatted}`],
                ].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', marginBottom: 2 }}>
                        <ReadOnly style={{ width: 110, fontWeight: 700, color: '#475569', flexShrink: 0 }}>{label}:</ReadOnly>
                        <ReadOnly>{val}</ReadOnly>
                    </div>
                ))}
                <div style={{ display: 'flex', marginBottom: 2 }}>
                    <ReadOnly style={{ width: 110, fontWeight: 700, color: '#475569', flexShrink: 0 }}>Date Issued:</ReadOnly>
                    <EditableBlock value={content.dateIssued} onChange={v => onChange('dateIssued', v)} multiline={false}
                        style={{ fontSize: '9pt', color: '#1e293b' }} />
                </div>
                <div style={{ display: 'flex', marginBottom: 2 }}>
                    <ReadOnly style={{ width: 110, fontWeight: 700, color: '#475569', flexShrink: 0 }}>Reference No.:</ReadOnly>
                    <EditableBlock value={content.referenceNo || '—'} onChange={v => onChange('referenceNo', v === '—' ? '' : v)} multiline={false}
                        style={{ fontSize: '9pt', color: '#1e293b' }} />
                </div>
            </div>

            <hr style={{ border: 0, borderTop: '1px solid #cbd5e1', margin: '8px 0' }} />

            {/* Opening — editable */}
            <div style={{ marginBottom: 7, textAlign: 'justify' }}>
                <EditableBlock value={content.opening} onChange={v => onChange('opening', v)} />
            </div>

            {/* Policy paragraph — editable */}
            <div style={{ marginBottom: 10, textAlign: 'justify' }}>
                <EditableBlock value={content.policyParagraph} onChange={v => onChange('policyParagraph', v)} />
            </div>

            {/* Summary chips — read-only */}
            <div style={{ marginBottom: 10 }}>
                {summary.totalAbsences > 0   && <span style={{ display: 'inline-block', border: '1px solid #cbd5e1', borderRadius: 3, padding: '2px 7px', fontSize: '8.5pt', marginRight: 5, background: '#fff' }}>Absences: <strong style={{ color: '#dc2626' }}>{summary.totalAbsences}</strong></span>}
                {summary.totalLateAM > 0     && <span style={{ display: 'inline-block', border: '1px solid #cbd5e1', borderRadius: 3, padding: '2px 7px', fontSize: '8.5pt', marginRight: 5, background: '#fff' }}>Late AM: <strong style={{ color: '#dc2626' }}>{summary.totalLateAM}</strong></span>}
                {summary.totalLatePM > 0     && <span style={{ display: 'inline-block', border: '1px solid #cbd5e1', borderRadius: 3, padding: '2px 7px', fontSize: '8.5pt', marginRight: 5, background: '#fff' }}>Late PM: <strong style={{ color: '#dc2626' }}>{summary.totalLatePM}</strong></span>}
                {summary.totalMissedLogs > 0 && <span style={{ display: 'inline-block', border: '1px solid #cbd5e1', borderRadius: 3, padding: '2px 7px', fontSize: '8.5pt', marginRight: 5, background: '#fff' }}>Missing Logs: <strong style={{ color: '#dc2626' }}>{summary.totalMissedLogs}</strong></span>}
                {summary.totalUndertime > 0  && <span style={{ display: 'inline-block', border: '1px solid #cbd5e1', borderRadius: 3, padding: '2px 7px', fontSize: '8.5pt', marginRight: 5, background: '#fff' }}>Undertime: <strong style={{ color: '#dc2626' }}>{summary.totalUndertime}</strong></span>}
            </div>

            {/* Absences */}
            {v.absences.length > 0 && <>
                <div style={{ fontWeight: 700, fontSize: '9.5pt', borderBottom: '1px solid #cbd5e1', paddingBottom: 2, marginBottom: 5, color: '#0f172a' }}>
                    Absences ({summary.totalAbsences} {summary.totalAbsences === 1 ? 'day' : 'days'})
                </div>
                <table style={tbl}>
                    <thead><tr><th style={{ ...th, width: 130 }}>Date</th><th style={th}>Status</th></tr></thead>
                    <tbody>{v.absences.map((r, i) => <tr key={i} style={{ background: i % 2 ? '#f8fafc' : '#fff' }}>
                        <td style={cell}><ReadOnly>{r.dateFormatted}</ReadOnly></td>
                        <td style={{ ...cell, minWidth: 120 }}><ReadOnly>{r.status}</ReadOnly></td>
                    </tr>)}</tbody>
                </table>
            </>}

            {/* Late AM */}
            {v.lateAM.length > 0 && <>
                <div style={{ fontWeight: 700, fontSize: '9.5pt', borderBottom: '1px solid #cbd5e1', paddingBottom: 2, marginBottom: 5, color: '#0f172a' }}>
                    Late Arrivals — Morning ({summary.totalLateAM} {summary.totalLateAM === 1 ? 'instance' : 'instances'})
                </div>
                <table style={tbl}>
                    <thead><tr><th style={{ ...th, width: 130 }}>Date</th><th style={{ ...th, width: 90 }}>Time In</th><th style={{ ...th, width: 100 }}>Late By</th></tr></thead>
                    <tbody>{v.lateAM.map((r, i) => <tr key={i} style={{ background: i % 2 ? '#f8fafc' : '#fff' }}>
                        <td style={cell}><ReadOnly>{r.dateFormatted}</ReadOnly></td>
                        <td style={cell}><ReadOnly>{r.timeIn || '—'}</ReadOnly></td>
                        <td style={cell}><ReadOnly>{r.timeStr}</ReadOnly></td>
                    </tr>)}</tbody>
                </table>
            </>}

            {/* Late PM */}
            {v.latePM.length > 0 && <>
                <div style={{ fontWeight: 700, fontSize: '9.5pt', borderBottom: '1px solid #cbd5e1', paddingBottom: 2, marginBottom: 5, color: '#0f172a' }}>
                    Late Returns — Afternoon ({summary.totalLatePM} {summary.totalLatePM === 1 ? 'instance' : 'instances'})
                </div>
                <table style={tbl}>
                    <thead><tr><th style={{ ...th, width: 130 }}>Date</th><th style={{ ...th, width: 90 }}>Time In (PM)</th><th style={{ ...th, width: 100 }}>Late By</th></tr></thead>
                    <tbody>{v.latePM.map((r, i) => <tr key={i} style={{ background: i % 2 ? '#f8fafc' : '#fff' }}>
                        <td style={cell}><ReadOnly>{r.dateFormatted}</ReadOnly></td>
                        <td style={cell}><ReadOnly>{r.timeIn || '—'}</ReadOnly></td>
                        <td style={cell}><ReadOnly>{r.timeStr}</ReadOnly></td>
                    </tr>)}</tbody>
                </table>
            </>}

            {/* Missing Logs */}
            {v.missedLogs.length > 0 && <>
                <div style={{ fontWeight: 700, fontSize: '9.5pt', borderBottom: '1px solid #cbd5e1', paddingBottom: 2, marginBottom: 5, color: '#0f172a' }}>
                    Missing Biometric Logs ({summary.totalMissedLogs} {summary.totalMissedLogs === 1 ? 'instance' : 'instances'})
                </div>
                <table style={tbl}>
                    <thead><tr>
                        {['Date','AM In','AM Out','PM In','PM Out','Missing Slots'].map(h => <th key={h} style={th}>{h}</th>)}
                    </tr></thead>
                    <tbody>{v.missedLogs.map((r, i) => (
                        <tr key={i} style={{ background: i % 2 ? '#f8fafc' : '#fff' }}>
                            <td style={cell}><ReadOnly>{r.dateFormatted}</ReadOnly></td>
                            {[r.timeInAM, r.timeOutLunch, r.timeInPM, r.timeOutPM].map((t, j) => (
                                <td key={j} style={{ ...cell, color: !t ? '#dc2626' : undefined, fontWeight: !t ? 700 : undefined }}>
                                    <ReadOnly>{t || '—'}</ReadOnly>
                                </td>
                            ))}
                            <td style={{ ...cell, color: '#dc2626', fontWeight: 700 }}>
                                <ReadOnly>{r.missing.join(', ')}</ReadOnly>
                            </td>
                        </tr>
                    ))}</tbody>
                </table>
            </>}

            {/* Undertime */}
            {v.undertime?.length > 0 && <>
                <div style={{ fontWeight: 700, fontSize: '9.5pt', borderBottom: '1px solid #cbd5e1', paddingBottom: 2, marginBottom: 5, color: '#0f172a' }}>
                    Undertime ({summary.totalUndertime} {summary.totalUndertime === 1 ? 'instance' : 'instances'})
                </div>
                <table style={tbl}>
                    <thead><tr><th style={{ ...th, width: 130 }}>Date</th><th style={{ ...th, width: 90 }}>Time Out</th><th style={{ ...th, width: 100 }}>Undertime By</th></tr></thead>
                    <tbody>{v.undertime.map((r, i) => <tr key={i} style={{ background: i % 2 ? '#f8fafc' : '#fff' }}>
                        <td style={cell}><ReadOnly>{r.dateFormatted}</ReadOnly></td>
                        <td style={cell}><ReadOnly>{r.timeOut || '—'}</ReadOnly></td>
                        <td style={cell}><ReadOnly>{r.timeStr}</ReadOnly></td>
                    </tr>)}</tbody>
                </table>
            </>}
            {/* Action Required — numbered list, editable as a block */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: 3, padding: '7px 10px', background: '#fefce8', marginBottom: 8, fontSize: '9.5pt' }}>
                <strong>Action Required:</strong>
                <div style={{ marginTop: 6 }}>
                    <EditableBlock
                        value={content.actionRequired}
                        onChange={val => onChange('actionRequired', val)}
                        style={{ fontSize: '9.5pt', whiteSpace: 'pre-line', lineHeight: 1.7 }}
                    />
                </div>
            </div>

            {/* Closing — editable */}
            <div style={{ marginBottom: 8, textAlign: 'justify' }}>
                <EditableBlock value={content.closing} onChange={v => onChange('closing', v)} />
            </div>

            {/* Signatures */}
            <div style={{ marginTop: 20, display: 'table', width: '100%' }}>
                <div style={{ display: 'table-cell', width: '50%', verticalAlign: 'bottom', paddingRight: 20 }}>
                    <div style={{ fontSize: '8.5pt', color: '#475569' }}>Prepared by:</div>
                    <div style={{ borderBottom: '1px solid #64748b', width: 200, marginTop: 26, marginBottom: 3 }} />
                    <EditableBlock value={content.preparedBy} onChange={v => onChange('preparedBy', v)} multiline={false}
                        style={{ fontWeight: 700, fontSize: '9.5pt', color: '#0f172a' }} />
                    <EditableBlock value={content.position} onChange={v => onChange('position', v)} multiline={false}
                        style={{ fontSize: '8.5pt', color: '#475569' }} />
                </div>
                <div style={{ display: 'table-cell', width: '50%', verticalAlign: 'bottom' }}>
                    <div style={{ fontSize: '8.5pt', color: '#475569' }}>Acknowledged by:</div>
                    <div style={{ borderBottom: '1px solid #64748b', width: 200, marginTop: 26, marginBottom: 3 }} />
                    <ReadOnly style={{ fontWeight: 700, fontSize: '9.5pt', display: 'block' }}>{employee.name}</ReadOnly>
                    <ReadOnly style={{ fontSize: '8.5pt', color: '#475569', display: 'block' }}>Employee &nbsp;&nbsp; Date: ___________________</ReadOnly>
                </div>
            </div>
        </div>
    );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function ViolationLetterModal({ isOpen, onClose, employeeId, dateFilters }) {
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [data, setData]           = useState(null);
    const [content, setContent]     = useState(null);
    const [defaults, setDefaults]   = useState(null);
    const [downloading, setDownloading] = useState(false);

    const companyName    = document.querySelector('meta[name="company-name"]')?.content
                        || window.__APP_NAME__
                        || 'Company Name';
    const companyAddress = document.querySelector('meta[name="company-address"]')?.content || '';

    useEffect(() => {
        if (!isOpen || !employeeId) return;
        setLoading(true);
        setError(null);
        setData(null);

        const params = new URLSearchParams();
        if (dateFilters?.dateFrom) params.append('dateFrom', dateFilters.dateFrom);
        if (dateFilters?.dateTo)   params.append('dateTo',   dateFilters.dateTo);

        axios.get(`/employees/${employeeId}/violation-letter/data?${params}`)
            .then(res => {
                setData(res.data);
                setDefaults(res.data.defaults);
                setContent({ ...res.data.defaults });
            })
            .catch(err => setError(err.response?.data?.error || 'Failed to load letter data'))
            .finally(() => setLoading(false));
    }, [isOpen, employeeId, dateFilters]);

    const handleChange = useCallback((name, value) => {
        setContent(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleReset = () => defaults && setContent({ ...defaults });

    const handleDownload = () => {
        setDownloading(true);
        const params = new URLSearchParams();
        if (dateFilters?.dateFrom) params.append('dateFrom', dateFilters.dateFrom);
        if (dateFilters?.dateTo)   params.append('dateTo',   dateFilters.dateTo);

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `/employees/${employeeId}/violation-letter?${params}`;
        form.target = '_blank';

        const csrf = document.createElement('input');
        csrf.type = 'hidden'; csrf.name = '_token';
        csrf.value = document.querySelector('meta[name="csrf-token"]')?.content || '';
        form.appendChild(csrf);

        Object.entries(content).forEach(([k, v]) => {
            const inp = document.createElement('input');
            inp.type = 'hidden'; inp.name = `content[${k}]`; inp.value = v;
            form.appendChild(inp);
        });

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
        setTimeout(() => setDownloading(false), 1500);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="fixed inset-3 z-[60] flex flex-col rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
                style={{ maxWidth: 1100, margin: 'auto' }}>

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3 flex-shrink-0">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">Violation Letter Editor</h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            <span className="inline-flex items-center gap-1">
                                <span className="inline-block h-2 w-2 rounded-sm bg-blue-200 border border-blue-400"></span>
                                Blue highlight = editable
                            </span>
                            &nbsp;·&nbsp;
                            <span className="inline-flex items-center gap-1">
                                <span className="inline-block h-2 w-2 rounded-sm bg-slate-200 border border-slate-400"></span>
                                Grey = read-only evidence
                            </span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleReset} disabled={!defaults}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40">
                            Reset to Default
                        </button>
                        <button onClick={handleDownload} disabled={downloading || loading || !!error}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {downloading ? 'Generating…' : 'Download PDF'}
                        </button>
                        <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Body */}
                {loading && (
                    <div className="flex flex-1 items-center justify-center">
                        <div className="text-center">
                            <svg className="mx-auto h-10 w-10 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <p className="mt-3 text-sm text-slate-500">Loading letter data…</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex flex-1 items-center justify-center p-8">
                        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">{error}</div>
                    </div>
                )}

                {!loading && !error && data && content && (
                    <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
                        {/* A4-like paper */}
                        <div className="mx-auto shadow-xl" style={{ maxWidth: 720, background: '#fff' }}>
                            <LetterPreview
                                data={data}
                                content={content}
                                onChange={handleChange}
                                companyName={companyName}
                                companyAddress={companyAddress}
                            />
                        </div>
                        <p className="mt-3 text-center text-[11px] text-slate-400">
                            Click any highlighted text to edit · Tables and employee info are read-only
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}
