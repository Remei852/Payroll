import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

// ─── Inline editable text block ──────────────────────────────────────────────
// Clicking turns it into a textarea; blur saves. Shows a subtle edit hint on hover.
function EditableBlock({ value, onChange, multiline = true, style = {}, className = '', renderValue = null }) {
    const [editing, setEditing] = useState(false);
    const ref = useRef(null);

    const start = () => setEditing(true);
    const stop = (e) => { onChange(e.target.value); setEditing(false); };

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
                rows={Math.max(3, (value || '').split('\n').length + 1)}
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
            {renderValue ? renderValue(value) : (value || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Click to edit…</span>)}
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

    const cell = { padding: '1px 5px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'top', fontSize: '9pt' };
    const th = { padding: '1px 5px', textAlign: 'left', fontSize: '9pt', textTransform: 'uppercase', letterSpacing: '0.03em', background: '#1e3a8a', color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' };
    const tbl = { width: 'auto', borderCollapse: 'collapse', marginBottom: 3, fontSize: '9pt' };

    return (
        <div style={{ background: '#fff', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10pt', lineHeight: 1.15, color: '#1e293b', padding: '0.2in' }}>

            {/* Letter title — editable */}
            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '12pt', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '4px 0 4px', color: '#0f172a' }}>
                <EditableBlock value={content.subject} onChange={v => onChange('subject', v)} multiline={false}
                    style={{ textAlign: 'center', fontWeight: 700, fontSize: '12pt', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0f172a', display: 'inline-block', minWidth: 200 }} />
            </div>

            {/* Employee info block — read-only */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 3, padding: '5px 10px', marginBottom: 4, background: '#f8fafc', fontSize: '9pt' }}>
                {[
                    ['Employee Name', employee.name],
                    ['Employee Code', employee.code],
                    ['Department', employee.department],
                    ['Period Covered', `${dateRange.startFormatted} to ${dateRange.endFormatted}`],
                ].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', marginBottom: 0 }}>
                        <ReadOnly style={{ width: 110, fontWeight: 700, color: '#475569', flexShrink: 0 }}>{label}:</ReadOnly>
                        <ReadOnly>{val}</ReadOnly>
                    </div>
                ))}
                <div style={{ display: 'flex', marginBottom: 0 }}>
                    <ReadOnly style={{ width: 110, fontWeight: 700, color: '#475569', flexShrink: 0 }}>Date Issued:</ReadOnly>
                    <EditableBlock value={content.dateIssued} onChange={v => onChange('dateIssued', v)} multiline={false}
                        style={{ fontSize: '9pt', color: '#1e293b' }} />
                </div>
            </div>

            <hr style={{ border: 0, borderTop: '1px solid #cbd5e1', margin: '3px 0' }} />

            {/* Greeting — editable */}
            <div style={{ marginBottom: 3, textAlign: 'left', fontSize: '10pt', lineHeight: 1.4, whiteSpace: 'pre-line', color: '#1e293b' }}>
                <EditableBlock value={content.greeting} onChange={v => onChange('greeting', v)} />
            </div>

            {/* Summary chips — read-only */}
            <div style={{ marginBottom: 4 }}>
                {summary.totalAbsences > 0 && <span style={{ display: 'inline-block', border: '1px solid #cbd5e1', borderRadius: 3, padding: '1px 6px', fontSize: '8pt', marginRight: 4, background: '#fff' }}>Absences: <strong style={{ color: '#dc2626' }}>{summary.totalAbsences}</strong></span>}

                {summary.graceBankEnabled ? (
                    summary.totalAccumulatedLate > 0 && (
                        <span style={{ display: 'inline-block', border: '1px solid #cbd5e1', borderRadius: 3, padding: '1px 6px', fontSize: '8pt', marginRight: 4, background: '#fff' }}>
                            Tardiness: <strong style={{ color: summary.graceBankExceeded ? '#dc2626' : '#0f172a' }}>
                                {summary.totalAccumulatedLate} mins{summary.graceBankExceeded && ' (Exceeded)'}
                            </strong>
                        </span>
                    )
                ) : (
                    <>
                        {summary.totalLateAM > 0 && <span style={{ display: 'inline-block', border: '1px solid #cbd5e1', borderRadius: 3, padding: '1px 6px', fontSize: '8pt', marginRight: 4, background: '#fff' }}>Late AM: <strong style={{ color: '#0f172a' }}>{summary.totalLateAM} day(s)</strong></span>}
                        {summary.totalLatePM > 0 && <span style={{ display: 'inline-block', border: '1px solid #cbd5e1', borderRadius: 3, padding: '1px 6px', fontSize: '8pt', marginRight: 4, background: '#fff' }}>Late PM: <strong style={{ color: '#0f172a' }}>{summary.totalLatePM} day(s)</strong></span>}
                    </>
                )}

                {summary.totalMissedLogs > 0 && <span style={{ display: 'inline-block', border: '1px solid #cbd5e1', borderRadius: 3, padding: '1px 6px', fontSize: '8pt', marginRight: 4, background: '#fff' }}>Missing Logs: <strong style={{ color: '#dc2626' }}>{summary.totalMissedLogs}</strong></span>}
                {summary.totalUndertime > 0 && <span style={{ display: 'inline-block', border: '1px solid #cbd5e1', borderRadius: 3, padding: '1px 6px', fontSize: '8pt', marginRight: 4, background: '#fff' }}>Undertime: <strong style={{ color: '#dc2626' }}>{summary.totalUndertime}</strong></span>}
            </div>

            {/* Absences */}
            {v.absences.length > 0 && <>
                <div style={{ fontWeight: 700, fontSize: '9pt', borderBottom: '1px solid #cbd5e1', paddingBottom: 1, marginBottom: 1, color: '#0f172a' }}>
                    <strong>Violation</strong> Absences ({summary.totalAbsences} {summary.totalAbsences === 1 ? 'day' : 'days'})
                </div>
                <div style={{ fontSize: '9pt', lineHeight: 1.3, marginBottom: 2, textAlign: 'justify' }}>
                    <EditableBlock value={content.absenceNotice} onChange={val => onChange('absenceNotice', val)} />
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
            {!summary.graceBankEnabled && v.lateAM.length > 0 && <>
                <div style={{ fontWeight: 700, fontSize: '9pt', borderBottom: '1px solid #cbd5e1', paddingBottom: 1, marginBottom: 1, color: '#0f172a' }}>
                    <strong>Violation</strong> Tardiness AM IN ({summary.totalLateAM} {summary.totalLateAM === 1 ? 'instance' : 'instances'})
                </div>
                <div style={{ fontSize: '9pt', lineHeight: 1.3, marginBottom: 2, textAlign: 'justify' }}>
                    <EditableBlock value={content.lateAMNotice} onChange={val => onChange('lateAMNotice', val)} />
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
            {!summary.graceBankEnabled && v.latePM.length > 0 && <>
                <div style={{ fontWeight: 700, fontSize: '9pt', borderBottom: '1px solid #cbd5e1', paddingBottom: 1, marginBottom: 1, color: '#0f172a' }}>
                    <strong>Violation</strong> Tardiness PM IN ({summary.totalLatePM} {summary.totalLatePM === 1 ? 'instance' : 'instances'})
                </div>
                <div style={{ fontSize: '9pt', lineHeight: 1.3, marginBottom: 2, textAlign: 'justify' }}>
                    <EditableBlock value={content.latePMNotice} onChange={val => onChange('latePMNotice', val)} />
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

            {/* Grace Bank Accumulation */}
            {summary.graceBankEnabled && (
                <>
                    <div style={{ fontWeight: 700, fontSize: '9pt', borderBottom: '1px solid #cbd5e1', paddingBottom: 1, marginBottom: 1, color: '#0f172a' }}>
                        <strong>Tardiness: Accumulated Lates</strong>
                    </div>
                    <div style={{ marginBottom: 4 }}>
                        <span style={{ display: 'inline-block', border: '1px solid #cbd5e1', borderRadius: 3, padding: '1px 6px', fontSize: '8pt', marginRight: 4, background: '#fff' }}>Total Late Minutes: <strong style={{ color: '#dc2626' }}>{summary.totalAccumulatedLate}</strong></span>
                        <span style={{ display: 'inline-block', border: '1px solid #cbd5e1', borderRadius: 3, padding: '1px 6px', fontSize: '8pt', marginRight: 4, background: '#fff' }}>Late Days: <strong style={{ color: '#dc2626' }}>{data.graceBankDays}</strong></span>
                    </div>
                    <table style={tbl}>
                        <thead><tr>
                            {['Date', 'AM IN', 'AM OUT', 'PM IN', 'PM OUT', 'Mins', 'Accum'].map(h => <th key={h} style={th}>{h}</th>)}
                        </tr></thead>
                        <tbody>{(data.graceBankDetails || []).map((r, i) => (
                            <tr key={i} style={{ background: i % 2 ? '#f8fafc' : '#fff' }}>
                                <td style={cell}><ReadOnly>{r.dateFormatted}</ReadOnly></td>
                                <td style={cell}><ReadOnly>{r.time_in_am}</ReadOnly></td>
                                <td style={cell}><ReadOnly>{r.time_out_am}</ReadOnly></td>
                                <td style={cell}><ReadOnly>{r.time_in_pm}</ReadOnly></td>
                                <td style={cell}><ReadOnly>{r.time_out_pm}</ReadOnly></td>
                                <td style={cell}><ReadOnly>{r.minutes}</ReadOnly></td>
                                <td style={cell}><ReadOnly>{r.accumulated}</ReadOnly></td>
                            </tr>
                        ))}</tbody>
                    </table>
                </>
            )}

            {/* Missing Logs */}
            {v.missedLogs.length > 0 && <>
                <div style={{ fontWeight: 700, fontSize: '9pt', borderBottom: '1px solid #cbd5e1', paddingBottom: 1, marginBottom: 1, color: '#0f172a' }}>
                    <strong>Violation</strong> Missing Biometric Logs ({summary.totalMissedLogs} {summary.totalMissedLogs === 1 ? 'instance' : 'instances'})
                </div>
                <div style={{ fontSize: '9pt', lineHeight: 1.3, marginBottom: 2, textAlign: 'justify' }}>
                    <EditableBlock value={content.missedLogNotice} onChange={val => onChange('missedLogNotice', val)} />
                </div>
                <table style={tbl}>
                    <thead><tr>
                        {['Date', 'AM In', 'AM Out', 'PM In', 'PM Out', 'Missing Slots'].map(h => <th key={h} style={th}>{h}</th>)}
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
                <div style={{ fontWeight: 700, fontSize: '9pt', borderBottom: '1px solid #cbd5e1', paddingBottom: 1, marginBottom: 1, color: '#0f172a' }}>
                    Undertime ({summary.totalUndertime} {summary.totalUndertime === 1 ? 'instance' : 'instances'})
                </div>
                <div style={{ fontSize: '9pt', lineHeight: 1.3, marginBottom: 2, textAlign: 'justify' }}>
                    <EditableBlock value={content.undertimeNotice} onChange={val => onChange('undertimeNotice', val)} />
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
            {/* Opening text moved below the tables */}
            <div style={{ marginBottom: 3, textAlign: 'justify', fontSize: '10pt', lineHeight: 1.4, whiteSpace: 'pre-line', color: '#1e293b' }}>
                <EditableBlock value={content.opening} onChange={v => onChange('opening', v)} />
            </div>

            {/* Action Required — numbered list, editable as a block */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: 3, padding: '5px 10px', background: '#fefce8', marginBottom: 3, fontSize: '9pt' }}>
                <strong>Action Required:</strong>
                <div style={{ marginTop: 2 }}>
                    <EditableBlock
                        value={content.actionRequired}
                        onChange={val => onChange('actionRequired', val)}
                        style={{ fontSize: '9pt', whiteSpace: 'pre-line', lineHeight: 1.15 }}
                    />
                </div>
            </div>

            {(v.absences.length > 0 || (v.undertime?.length > 0) || v.missedLogs.length > 0 || v.lateAM.length > 0 || v.latePM.length > 0 || summary.habitualTardiness) && (
                <div style={{ marginBottom: 2, fontSize: '10pt', lineHeight: 1.4 }}>
                    <EditableBlock value={content.policyIntro} onChange={val => onChange('policyIntro', val)} />
                </div>
            )}

            {/* Policy Sections */}
            {[
                { show: v.absences.length > 0, title: 'Policy: Absences', policy: content.absencesPolicy, key: 'absencesPolicy' },
                { show: v.missedLogs.length > 0, title: 'Policy: Improper Logs', policy: content.missedLogsPolicy, key: 'missedLogsPolicy' },
                { show: v.undertime?.length > 0, title: 'Policy: Undertime', policy: content.undertimePolicy, key: 'undertimePolicy' },
                { show: (v.lateAM.length > 0 || v.latePM.length > 0 || summary.habitualTardiness), title: 'Policy: Habitual Tardiness', policy: content.tardinessPolicy, key: 'tardinessPolicy' }
            ].map(p => p.show && (
                <div key={p.key} style={{ border: '1px solid #bfdbfe', borderRadius: 3, padding: '3px 10px', background: '#f0f9ff', marginBottom: 5, fontSize: '8.5pt', lineHeight: 1.15 }}>
                    <strong style={{ fontSize: '9.5pt', color: '#0f172a', display: 'block', marginBottom: 2 }}>{p.title}</strong>
                    <div style={{ marginTop: 2 }}>
                        <EditableBlock value={p.policy.rule} onChange={val => onChange(p.key, { ...p.policy, rule: val })} style={{ fontSize: '8.5pt', whiteSpace: 'pre-line', textAlign: 'left', marginBottom: 2 }} />
                        
                        <span style={{ fontWeight: 700, display: 'block', margin: '2px 0 1px' }}>Penalties:</span> 
                        <div style={{ position: 'relative' }}>
                            <EditableBlock 
                                value={p.policy.penalties} 
                                onChange={val => onChange(p.key, { ...p.policy, penalties: val })} 
                                style={{ fontSize: '8.5pt', textAlign: 'left' }}
                                renderValue={(val) => (
                                    <ul style={{ margin: '-2px 0 -4px 15px', padding: 0, listStyleType: 'disc', color: '#334155' }}>
                                        {(val || '').split('|').map((penalty, idx) => (
                                            <li key={idx} style={{ marginBottom: 0, lineHeight: 1.0 }}>{penalty.trim()}</li>
                                        ))}
                                    </ul>
                                )}
                            />
                        </div>

                        {p.policy.note !== undefined && (
                             <div style={{ marginTop: 2 }}>
                                <EditableBlock value={p.policy.note} onChange={val => onChange(p.key, { ...p.policy, note: val })} style={{ fontSize: '8.5pt', whiteSpace: 'pre-line', textAlign: 'left' }} />
                             </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Closing — editable */}
            <div style={{ marginTop: 4, marginBottom: 4, textAlign: 'justify', fontSize: '10pt', lineHeight: 1.4, whiteSpace: 'pre-line', color: '#1e293b' }}>
                <EditableBlock value={content.closing} onChange={v => onChange('closing', v)} />
            </div>

            {/* Signatures */}
            <div style={{ marginTop: 5, display: 'table', width: '100%' }}>
                <div style={{ display: 'table-cell', width: '50%', verticalAlign: 'bottom', paddingRight: 20 }}>
                    <div style={{ fontSize: '8.5pt', color: '#475569' }}>Prepared by:</div>
                    <div style={{ borderBottom: '1px solid #64748b', width: 200, marginTop: 15, marginBottom: 2 }} />
                    <EditableBlock value={content.preparedBy} onChange={v => onChange('preparedBy', v)} multiline={false}
                        style={{ fontWeight: 700, fontSize: '9.5pt', color: '#0f172a' }} />
                    <EditableBlock value={content.position} onChange={v => onChange('position', v)} multiline={false}
                        style={{ fontSize: '8.5pt', color: '#475569' }} />
                </div>
                <div style={{ display: 'table-cell', width: '50%', verticalAlign: 'bottom' }}>
                    <div style={{ fontSize: '8.5pt', color: '#475569' }}>Acknowledged by:</div>
                    <div style={{ borderBottom: '1px solid #64748b', width: 200, marginTop: 15, marginBottom: 2 }} />
                    <ReadOnly style={{ fontWeight: 700, fontSize: '9.5pt', display: 'block' }}>{employee.name}</ReadOnly>
                    <ReadOnly style={{ fontSize: '8.5pt', color: '#475569', display: 'block' }}>Employee &nbsp;&nbsp; Date: ___________________</ReadOnly>
                </div>
            </div>
        </div>
    );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function ViolationLetterModal({ isOpen, onClose, employeeId, dateFilters }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [content, setContent] = useState(null);
    const [defaults, setDefaults] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const [paperSize, setPaperSize] = useState('A4');
    const [exportFormat, setExportFormat] = useState('pdf');

    const companyName = document.querySelector('meta[name="company-name"]')?.content
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
        if (dateFilters?.dateTo) params.append('dateTo', dateFilters.dateTo);

        const baseUrl = window.location.origin;
        axios.get(`${baseUrl}/employees/${employeeId}/violation-letter/data?${params}`)
            .then(res => {
                setData(res.data);
                setDefaults(res.data.defaults);
                setContent({ ...res.data.defaults });
            })
            .catch(err => {
                const msg = err.response?.data?.error
                    || err.response?.data?.message
                    || err.message
                    || 'Failed to load letter data';
                console.error('ViolationLetterModal fetch error:', err.response?.status, msg);
                setError(msg);
            })
            .finally(() => setLoading(false));
    }, [isOpen, employeeId, dateFilters]);

    const handleChange = useCallback((name, value) => {
        setContent(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleReset = () => defaults && setContent({ ...defaults });

    const handleDownload = () => {
        if (exportFormat === 'word') {
            handleWordDownload();
            return;
        }
        setDownloading(true);
        const params = new URLSearchParams();
        if (dateFilters?.dateFrom) params.append('dateFrom', dateFilters.dateFrom);
        if (dateFilters?.dateTo) params.append('dateTo', dateFilters.dateTo);

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `/employees/${employeeId}/violation-letter?${params}`;
        form.target = '_blank';

        const csrf = document.createElement('input');
        csrf.type = 'hidden'; csrf.name = '_token';
        csrf.value = document.querySelector('meta[name="csrf-token"]')?.content || '';
        form.appendChild(csrf);

        const sizeInput = document.createElement('input');
        sizeInput.type = 'hidden'; sizeInput.name = 'paper_size'; sizeInput.value = paperSize;
        form.appendChild(sizeInput);

        const appendNested = (parentKey, obj) => {
            Object.entries(obj).forEach(([k, v]) => {
                const key = `${parentKey}[${k}]`;
                if (v && typeof v === 'object') {
                    appendNested(key, v);
                } else {
                    const inp = document.createElement('input');
                    inp.type = 'hidden'; inp.name = key; inp.value = v ?? '';
                    form.appendChild(inp);
                }
            });
        };

        appendNested('content', content);

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
        setTimeout(() => setDownloading(false), 1500);
    };

    const handleWordDownload = () => {
        if (!data || !content) return;
        setDownloading(true);
        const { employee, dateRange, violations: v, summary } = data;

        const fmtDate = s => s || '—';
        const missRow = (r) => `
            <tr>
                <td>${r.dateFormatted}</td>
                <td style="color:${!r.timeInAM ? '#dc2626' : 'inherit'}">${r.timeInAM || '—'}</td>
                <td style="color:${!r.timeOutLunch ? '#dc2626' : 'inherit'}">${r.timeOutLunch || '—'}</td>
                <td style="color:${!r.timeInPM ? '#dc2626' : 'inherit'}">${r.timeInPM || '—'}</td>
                <td style="color:${!r.timeOutPM ? '#dc2626' : 'inherit'}">${r.timeOutPM || '—'}</td>
                <td style="color:#dc2626;font-weight:bold">${r.missing.join(', ')}</td>
            </tr>`;

        const thStyle = 'background:#1e3a8a;color:#fff;padding:4px 8px;font-size:9pt;text-align:left;';
        const tdStyle = 'padding:3px 8px;border-bottom:1px solid #e2e8f0;font-size:9pt;';

        const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  body { font-family: Arial, sans-serif; font-size: 10pt; color: #1e293b; margin: 0.5in; }
  .info-table { font-size: 9pt; }
  h1 { font-size: 12pt; font-weight: bold; text-align: center; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; }
  table { border-collapse: collapse; width: auto; margin-bottom: 10px; }
  th { ${thStyle} }
  td { ${tdStyle} }
  .info-table td { border: none; padding: 2px 6px; }
  .section { font-weight: bold; font-size: 9.5pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; margin: 10px 0 5px; }
  .chip { display: inline-block; border: 1px solid #cbd5e1; border-radius: 3px; padding: 1px 6px; font-size: 8.5pt; margin-right: 4px; }
  .action-box { border: 1px solid #cbd5e1; padding: 8px 12px; background: #fefce8; margin-bottom: 10px; }
  .sig-table { width: 100%; margin-top: 24px; }
  .sig-table td { border: none; padding: 0 20px 0 0; vertical-align: bottom; width: 50%; }
  .sig-line { border-bottom: 1px solid #64748b; width: 200px; margin-top: 30px; margin-bottom: 4px; }
  p { text-align: justify; margin-bottom: 8px; font-size: 9.5pt; line-height: 1.55; }
</style>
</head>
<body>
<h1>${content.subject}</h1>
<table class="info-table">
  <tr><td style="width:120px;font-weight:bold;color:#475569">Employee Name:</td><td>${employee.name}</td></tr>
  <tr><td style="font-weight:bold;color:#475569">Employee Code:</td><td>${employee.code}</td></tr>
  <tr><td style="font-weight:bold;color:#475569">Department:</td><td>${employee.department}</td></tr>
  <tr><td style="font-weight:bold;color:#475569">Period Covered:</td><td>${dateRange.startFormatted} to ${dateRange.endFormatted}</td></tr>
  <tr><td style="font-weight:bold;color:#475569">Date Issued:</td><td>${content.dateIssued}</td></tr>
</table>
<hr style="border:0;border-top:1px solid #cbd5e1;margin:8px 0"/>
<p style="white-space:pre-line;font-size:10pt;line-height:1.5;text-align:left;">${content.greeting}</p>
<div>
  ${summary.totalAbsences > 0 ? `<span class="chip">Absences: <b style="color:#dc2626">${summary.totalAbsences}</b></span>` : ''}
  ${summary.totalAccumulatedLate > 0 ? `<span class="chip">Tardiness: <b style="color:${(summary.graceBankEnabled && summary.graceBankExceeded) ? '#dc2626' : '#0f172a'}">${summary.totalAccumulatedLate} mins${summary.graceBankEnabled && summary.graceBankExceeded ? ' (Exceeded)' : ''}</b></span>` : ''}
  ${summary.totalMissedLogs > 0 ? `<span class="chip">Missing Logs: <b style="color:#dc2626">${summary.totalMissedLogs}</b></span>` : ''}
  ${summary.totalUndertime > 0 ? `<span class="chip">Undertime: <b style="color:#dc2626">${summary.totalUndertime}</b></span>` : ''}
</div>
${v.absences.length > 0 ? `
<div class="section"><b>Violation</b> Absences (${summary.totalAbsences} ${summary.totalAbsences === 1 ? 'day' : 'days'})</div>
<div style="font-size:9pt; line-height:1.55; margin-bottom:6px; text-align:justify;">${content.absenceNotice}</div>
<table><thead><tr><th style="width:140px">Date</th><th>Status</th></tr></thead>
<tbody>${v.absences.map((r, i) => `<tr style="background:${i % 2 ? '#f8fafc' : '#fff'}"><td>${r.dateFormatted}</td><td>${r.status}</td></tr>`).join('')}</tbody></table>` : ''}
${!summary.graceBankEnabled && v.lateAM.length > 0 ? `
<div class="section"><b>Violation</b> Tardiness AM IN (${summary.totalLateAM} ${summary.totalLateAM === 1 ? 'instance' : 'instances'})</div>
<div style="font-size:9pt; line-height:1.55; margin-bottom:6px; text-align:justify;">${content.lateAMNotice}</div>
<table><thead><tr><th style="width:140px">Date</th><th style="width:90px">Time In</th><th>Late By</th></tr></thead>
<tbody>${v.lateAM.map((r, i) => `<tr style="background:${i % 2 ? '#f8fafc' : '#fff'}"><td>${r.dateFormatted}</td><td>${r.timeIn || '—'}</td><td>${r.timeStr}</td></tr>`).join('')}</tbody></table>` : ''}
${!summary.graceBankEnabled && v.latePM.length > 0 ? `
<div class="section"><b>Violation</b> Tardiness PM IN (${summary.totalLatePM} ${summary.totalLatePM === 1 ? 'instance' : 'instances'})</div>
<div style="font-size:9pt; line-height:1.55; margin-bottom:6px; text-align:justify;">${content.latePMNotice}</div>
<table><thead><tr><th style="width:140px">Date</th><th style="width:90px">Time In (PM)</th><th>Late By</th></tr></thead>
<tbody>${v.latePM.map((r, i) => `<tr style="background:${i % 2 ? '#f8fafc' : '#fff'}"><td>${r.dateFormatted}</td><td>${r.timeIn || '—'}</td><td>${r.timeStr}</td></tr>`).join('')}</tbody></table>` : ''}
${summary.graceBankEnabled ? `
<div class="section"><b>Grace Bank Accumulation</b></div>
<div style="margin-bottom:8px">
  <span class="chip">Total Late Minutes: <b>${summary.totalAccumulatedLate}</b></span>
  <span class="chip">Late Days: <b>${data.graceBankDays}</b></span>
</div>
<p style="font-size:9.5pt;margin-bottom:8px">
  ${summary.graceBankExceeded
                    ? "Based on attendance records, your accumulated late minutes for the current pay period have reached/exceeded the department's allowed grace bank threshold."
                    : `You incurred a total of ${summary.totalAccumulatedLate} late minutes across ${data.graceBankDays} occurrence(s) within the covered payroll period.`
                }
</p>
<table style="width:100%">
  <thead><tr>
    <th style="width:110px">Date</th>
    <th style="width:70px">AM IN</th>
    <th style="width:70px">AM OUT</th>
    <th style="width:70px">PM IN</th>
    <th style="width:70px">PM OUT</th>
    <th style="width:80px">Mins</th>
    <th>Accum.</th>
  </tr></thead>
  <tbody>${(data.graceBankDetails || []).map((r, i) => `<tr style="background:${i % 2 ? '#f8fafc' : '#fff'}">
    <td>${r.dateFormatted}</td>
    <td>${r.time_in_am}</td>
    <td>${r.time_out_am}</td>
    <td>${r.time_in_pm}</td>
    <td>${r.time_out_pm}</td>
    <td>${r.minutes}</td>
    <td>${r.accumulated}</td>
  </tr>`).join('')}</tbody>
</table>
` : ''}
${v.missedLogs.length > 0 ? `
<div class="section"><b>Violation</b> Missing Biometric Logs (${summary.totalMissedLogs} ${summary.totalMissedLogs === 1 ? 'instance' : 'instances'})</div>
<div style="font-size:9pt; line-height:1.55; margin-bottom:6px; text-align:justify;">${content.missedLogNotice}</div>
<table><thead><tr><th>Date</th><th>AM In</th><th>AM Out</th><th>PM In</th><th>PM Out</th><th>Missing Slots</th></tr></thead>
<tbody>${v.missedLogs.map(missRow).join('')}</tbody></table>` : ''}
${v.undertime?.length > 0 ? `
<div class="section">Undertime (${summary.totalUndertime} ${summary.totalUndertime === 1 ? 'instance' : 'instances'})</div>
<div style="font-size:9pt; line-height:1.55; margin-bottom:6px; text-align:justify;">${content.undertimeNotice}</div>
<table><thead><tr><th style="width:140px">Date</th><th style="width:90px">Time Out</th><th>Undertime By</th></tr></thead>
<tbody>${v.undertime.map((r, i) => `<tr style="background:${i % 2 ? '#f8fafc' : '#fff'}"><td>${r.dateFormatted}</td><td>${r.timeOut || '—'}</td><td>${r.timeStr}</td></tr>`).join('')}</tbody></table>` : ''}

<p style="white-space:pre-line;font-size:10pt;line-height:1.5;margin-top:10px;">${content.opening}</p>

<div class="action-box" style="font-size:9pt;"><b>Action Required:</b><br/><span style="white-space:pre-line;font-size:9pt;">${content.actionRequired}</span></div>
${[
                { show: v.absences.length > 0, title: 'POLICY: ABSENCES', policy: content.absencesPolicy },
                { show: v.missedLogs.length > 0, title: 'POLICY: IMPROPER LOGS', policy: content.missedLogsPolicy },
                { show: v.undertime?.length > 0, title: 'POLICY: UNDERTIME', policy: content.undertimePolicy },
                { show: (v.lateAM.length > 0 || v.latePM.length > 0 || summary.habitualTardiness), title: 'POLICY: TARDINESS', policy: content.tardinessPolicy }
            ].map(p => p.show ? `
<div style="border: 1px solid #bfdbfe; border-radius: 3px; padding: 10px 12px; background: #eff6ff; margin-bottom: 12px; font-size: 10pt; line-height: 1.4;">
  <b style="font-size: 10.5pt; color: #0f172a; display: block; margin-bottom: 4px; border-bottom: 1px solid #bfdbfe; padding-bottom: 2px;">${p.title}</b>
  <p style="margin-top: 6px;"><b>Rule:</b><br/>${p.policy.rule}</p>
  <p><b>Penalties:</b>
    <ul style="margin: 4px 0 0 0; padding-left: 18px;">
      ${(p.policy.penalties || '').split('|').map(pen => `<li style="margin-bottom:1px;">${pen.trim()}</li>`).join('')}
    </ul>
  </p>
</div>` : '').join('')}
<p style="white-space:pre-line;font-size:10pt;line-height:1.5;margin-top:10px;">${content.closing}</p>
<table class="sig-table"><tr>
  <td><div style="font-size:8.5pt;color:#475569">Prepared by:</div><div class="sig-line"></div><b style="font-size:9.5pt">${content.preparedBy}</b><br/><span style="font-size:8.5pt;color:#475569">${content.position}</span></td>
  <td><div style="font-size:8.5pt;color:#475569">Acknowledged by:</div><div class="sig-line"></div><b style="font-size:9.5pt">${employee.name}</b><br/><span style="font-size:8.5pt;color:#475569">Employee &nbsp;&nbsp; Date: ___________________</span></td>
</tr></table>
</body></html>`;

        const blob = new Blob(['\ufeff', html], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Violation_Letter_${employee.code}_${new Date().toISOString().slice(0, 10)}.docx`;
        a.click();
        URL.revokeObjectURL(url);
        setTimeout(() => setDownloading(false), 500);
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
                        {/* Format selector */}
                        <select
                            value={exportFormat}
                            onChange={e => setExportFormat(e.target.value)}
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 focus:outline-none"
                        >
                            <option value="pdf">PDF</option>
                            <option value="word">Word (.doc)</option>
                        </select>
                        {/* Paper size — only for PDF */}
                        {exportFormat === 'pdf' && (
                            <select
                                value={paperSize}
                                onChange={e => setPaperSize(e.target.value)}
                                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 focus:outline-none"
                            >
                                <option value="A4">A4</option>
                                <option value="legal">Legal </option>
                                <option value="letter">Letter </option>
                            </select>
                        )}
                        <button onClick={handleDownload} disabled={downloading || loading || !!error}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {downloading ? 'Generating…' : exportFormat === 'word' ? 'Download Word' : 'Print PDF'}
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
