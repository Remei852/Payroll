import { Head } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

function formatDateLong(yyyyMmDd) {
    if (!yyyyMmDd) return '';
    const d = new Date(yyyyMmDd + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return yyyyMmDd;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function PrintPolicy({ employees = [], letterTypes = [], preparedBy = '', dateIssued = '' }) {
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(() => (employees[0]?.id ? [employees[0].id] : []));
    const [issuedDate, setIssuedDate] = useState(dateIssued || '');
    const preparedByName = preparedBy || '';

    const [paperSize, setPaperSize] = useState('A4');

    const [tableRows, setTableRows] = useState(() => [{ report: '', description: '', dates: '' }]);

    const [reportChecklist, setReportChecklist] = useState({
        refusal: false,
        failure: false,
        late: false,
        habitual: false,
    });

    const [isEmployeesOpen, setIsEmployeesOpen] = useState(false);
    const [isLettersOpen, setIsLettersOpen] = useState(false);

    const autoGrowElement = (el) => {
        if (!el) return;
        el.style.height = 'auto';
        const newHeight = el.scrollHeight;
        if (newHeight > 0) {
            el.style.height = `${newHeight}px`;
        }
    };

    const adjustAllTextareas = () => {
        if (typeof document === 'undefined') return;
        document.querySelectorAll('#print-area textarea').forEach((el) => autoGrowElement(el));
    };

    useEffect(() => {
        adjustAllTextareas();
    }, [tableRows, selectedEmployeeIds, reportChecklist]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handler = () => adjustAllTextareas();
        window.addEventListener('beforeprint', handler);
        return () => window.removeEventListener('beforeprint', handler);
    }, []);

    const selectedEmployees = useMemo(() => {
        const wanted = new Set(selectedEmployeeIds.map(String));
        return employees.filter(e => wanted.has(String(e.id)));
    }, [employees, selectedEmployeeIds]);

    const noticeLetterType = useMemo(() => {
        return letterTypes.find(t => t.value === 'report_submission_violations') || letterTypes[0] || { value: 'report_submission_violations', label: 'NOTICE TO EXPLAIN – Report Submission Violations' };
    }, [letterTypes]);

    const getPolicyBody = (letterTypeValue, lastNameForGreeting) => {
        if (letterTypeValue !== 'report_submission_violations') return null;

        const selectedItems = [
            reportChecklist.refusal ? 'Refusal to submit required report(s)' : null,
            reportChecklist.failure ? 'Failure to submit required report(s)' : null,
            reportChecklist.late ? 'Late submission of required report(s)' : null,
            reportChecklist.habitual ? 'Habitual or repeated delayed submission of report(s)' : null,
        ].filter(Boolean);

        const tableBorder = '1px solid #111827';
        const tableRowsCount = Math.max(1, selectedItems.length);

        const ensureRow = (index) => {
            if (tableRows[index]) return tableRows[index];
            return { report: '', description: '', dates: '' };
        };

        const setRowField = (index, field, value) => {
            setTableRows((prev) => {
                const next = [...prev];
                while (next.length <= index) next.push({ report: '', description: '', dates: '' });
                next[index] = { ...next[index], [field]: value };
                return next;
            });
        };

        const autoGrow = (e) => {
            autoGrowElement(e.target);
        };

        return (
            <>
                <div style={{ fontWeight: 700, fontSize: '14pt' }}>NOTICE TO EXPLAIN</div>
                <div style={{ marginTop: 2, fontStyle: 'italic' }}>For Report Submission Violations</div>

                <div style={{ marginTop: 18 }}>Dear Mr/Ms. {lastNameForGreeting},</div>

                <p style={{ marginTop: 14, textAlign: 'justify' }}>
                    This refers to your compliance with company reporting requirements. It has been noted that you may have committed one or more violations related to the submission of required reports specifically,
                </p>

                <div style={{ marginTop: 10, lineHeight: 1.7 }}>
                    {selectedItems.length === 0 ? (
                        <div style={{ color: '#64748b' }}>—</div>
                    ) : (
                        selectedItems.map((txt) => (
                            <div key={txt} style={{ fontWeight: 700 }}>{txt}</div>
                        ))
                    )}
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: '10pt' }}>
                    <thead>
                        <tr>
                            <th style={{ border: tableBorder, padding: '6px 8px', textAlign: 'center', fontWeight: 700, width: '33.33%' }}>Specific Report(s)<br />Concerned:</th>
                            <th style={{ border: tableBorder, padding: '6px 8px', textAlign: 'center', fontWeight: 700, width: '33.33%' }}>Brief Description:</th>
                            <th style={{ border: tableBorder, padding: '6px 8px', textAlign: 'center', fontWeight: 700, width: '33.33%' }}>Date(s) of Incident(s):</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: Math.max(tableRowsCount, tableRows.length) }).map((_, i) => (
                            <tr key={i}>
                                <td style={{ border: tableBorder, padding: 0, verticalAlign: 'top', width: '33.33%' }}>
                                    <textarea
                                        value={ensureRow(i).report}
                                        onChange={(e) => setRowField(i, 'report', e.target.value)}
                                        onInput={autoGrow}
                                        placeholder="Report Name..."
                                        style={{
                                            width: '100%',
                                            minHeight: 44,
                                            height: 'auto',
                                            border: 'none',
                                            outline: 'none',
                                            resize: 'none',
                                            padding: '6px 8px',
                                            fontFamily: 'inherit',
                                            fontSize: '10pt',
                                            lineHeight: 1.35,
                                            background: 'transparent',
                                            overflow: 'hidden',
                                            display: 'block',
                                            boxSizing: 'border-box',
                                        }}
                                        className="no-print"
                                    />
                                    <div className="print-only" style={{ padding: '6px 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '10pt', lineHeight: 1.35, minHeight: 44 }}>
                                        {ensureRow(i).report || ' '}
                                    </div>
                                </td>
                                <td style={{ border: tableBorder, padding: 0, verticalAlign: 'top', width: '33.33%' }}>
                                    <textarea
                                        value={ensureRow(i).description}
                                        onChange={(e) => setRowField(i, 'description', e.target.value)}
                                        onInput={autoGrow}
                                        placeholder="Brief Description..."
                                        style={{
                                            width: '100%',
                                            minHeight: 44,
                                            height: 'auto',
                                            border: 'none',
                                            outline: 'none',
                                            resize: 'none',
                                            padding: '6px 8px',
                                            fontFamily: 'inherit',
                                            fontSize: '10pt',
                                            lineHeight: 1.35,
                                            background: 'transparent',
                                            overflow: 'hidden',
                                            display: 'block',
                                            boxSizing: 'border-box',
                                        }}
                                        className="no-print"
                                    />
                                    <div className="print-only" style={{ padding: '6px 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '10pt', lineHeight: 1.35, minHeight: 44 }}>
                                        {ensureRow(i).description || ' '}
                                    </div>
                                </td>
                                <td style={{ border: tableBorder, padding: 0, verticalAlign: 'top', width: '33.33%' }}>
                                    <textarea
                                        value={ensureRow(i).dates}
                                        onChange={(e) => setRowField(i, 'dates', e.target.value)}
                                        onInput={autoGrow}
                                        placeholder="Date(s)..."
                                        style={{
                                            width: '100%',
                                            minHeight: 44,
                                            height: 'auto',
                                            border: 'none',
                                            outline: 'none',
                                            resize: 'none',
                                            padding: '6px 8px',
                                            fontFamily: 'inherit',
                                            fontSize: '10pt',
                                            lineHeight: 1.35,
                                            background: 'transparent',
                                            overflow: 'hidden',
                                            display: 'block',
                                            boxSizing: 'border-box',
                                        }}
                                        className="no-print"
                                    />
                                    <div className="print-only" style={{ padding: '6px 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '10pt', lineHeight: 1.35, minHeight: 44 }}>
                                        {ensureRow(i).dates || ' '}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <p style={{ marginTop: 14, textAlign: 'justify' }}>
                    It has been observed that despite clear instructions and established deadlines, there were instances where required reports were not submitted, submitted late, or repeatedly delayed without prior approval or valid justification.
                </p>

                <p style={{ marginTop: 12, textAlign: 'justify' }}>
                    Such actions may constitute violations of company policies on <b>insubordination, neglect of duty, failure to follow lawful instructions, and non-compliance with reporting requirements</b>, which are subject to disciplinary action under the Company Code of Conduct.
                </p>

                <p style={{ marginTop: 12, textAlign: 'justify' }}>
                    In view of the foregoing, you are hereby required to submit a <b>written explanation within 5 working days from receipt of this Notice</b>, addressing the following:
                </p>

                <ol style={{ marginTop: 10, marginLeft: 20, lineHeight: 1.7 }}>
                    <li>1. The circumstances surrounding the checked violation(s) above;</li>
                    <li>2. The reason(s) for non-submission, late submission, or repeated delays;</li>
                    <li>3. Any mitigating factors that may have contributed to the incident(s);</li>
                    <li>4. Why no disciplinary action should be taken against you.</li>
                </ol>

                <p style={{ marginTop: 12, textAlign: 'justify' }}>
                    Failure to submit your explanation within the prescribed period shall be deemed a waiver of your right to be heard, and the company shall proceed with appropriate action based on available records.
                </p>

                <p style={{ marginTop: 14 }}>Please give this matter your immediate attention.</p>

                <div style={{ marginTop: 18 }}>Sincerely,</div>
                <div style={{ marginTop: 18, fontWeight: 700 }}>Mark Lester M. To-ong</div>
                <div style={{ marginTop: 6 }}>Manager</div>
            </>
        );
    };

    const toggleEmployee = (id) => {
        setSelectedEmployeeIds((prev) => {
            const s = new Set(prev.map(String));
            const key = String(id);
            if (s.has(key)) s.delete(key);
            else s.add(key);
            return Array.from(s);
        });
    };

    return (
        <>
            <Head title="Print Policy Letter" />

            <style>{`
                /* Screen */
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

                .page-spacer { height: 72px; }

                .wrap {
                    max-width: 900px; margin: 0 auto 40px;
                }

                .controls {
                    margin: 18px 0;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    background: white;
                    padding: 16px;
                }

                    .letter-wrap { background: transparent; border: none; border-radius: 0; padding: 0; box-shadow: none; }
                    .letter-paper { 
                        background: white;
                        border: 1px solid #e2e8f0;
                        border-radius: 10px;
                        padding: 30px 45px;
                        box-shadow: 0 4px 15px rgba(0,0,0,.05);
                        margin-bottom: 30px;
                    }

                    /* Print */
                    @media print {
                        @page { size: ${paperSize === 'A4' ? 'A4' : paperSize === 'letter' ? 'letter' : '8.5in 13in'} portrait; margin: 0.5in; }
                        html, body { background: white !important; margin: 0; padding: 0; }
                        .no-print, .toolbar, .page-spacer, .controls, .letter-header { display: none !important; }
                        .wrap { max-width: none; margin: 0; }
                        .letter-paper { border: none; border-radius: 0; padding: 0; box-shadow: none; margin-bottom: 0; background: white; }
                        .print-page { break-after: page; page-break-after: always; }
                    
                    /* Table and Text Fixes */
                    textarea.no-print { display: none !important; }
                    .print-only { display: block !important; }
                    table { page-break-inside: auto !important; }
                    tr { page-break-inside: auto !important; }
                    td, th { page-break-inside: auto !important; }
                }
                
                .print-only { display: none; }
            `}</style>

            <div className="toolbar no-print">
                <div>
                    <div className="toolbar-title">Notice to Explain — Report Submission Violations</div>
                    <div className="toolbar-sub">Pick employees and violations, then print</div>
                </div>
                <div className="toolbar-actions">
                    <select
                        value={paperSize}
                        onChange={(e) => setPaperSize(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 focus:outline-none"
                        title="Paper size"
                        style={{ minWidth: 130 }}
                    >
                        <option value="A4">A4</option>
                        <option value="letter">Letter</option>
                        <option value="8x13">8x13</option>
                    </select>
                    <button className="btn" onClick={() => router.get(route('dashboard'))}>← Back</button>
                    <button className="btn btn-primary" onClick={() => window.print()}>
                        Print / Save PDF
                    </button>
                </div>
            </div>

            <div className="page-spacer" style={{ height: 64 }} />

            <div className="wrap">
                <div className="controls no-print">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {/* Employees Multi-select Dropdown */}
                        <div className="relative">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Employees</label>
                            <button
                                type="button"
                                onClick={() => setIsEmployeesOpen(!isEmployeesOpen)}
                                className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50 focus:border-primary focus:outline-none"
                            >
                                <span className="truncate">
                                    {selectedEmployeeIds.length === 0 
                                        ? 'No employees selected' 
                                        : selectedEmployeeIds.length === employees.length 
                                            ? `All Employees (${employees.length})` 
                                            : `${selectedEmployeeIds.length} employee(s) selected`}
                                </span>
                                <svg className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isEmployeesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            
                            {isEmployeesOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsEmployeesOpen(false)} />
                                    <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in duration-150 ring-1 ring-black ring-opacity-5">
                                        <div className="sticky top-0 z-30 bg-white pb-1 border-b border-slate-100 mb-1">
                                            <div className="flex items-center justify-between px-2 py-1">
                                                <button 
                                                    onClick={() => setSelectedEmployeeIds(employees.map(e => String(e.id)))}
                                                    className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                                                >
                                                    Select All
                                                </button>
                                                <button 
                                                    onClick={() => setSelectedEmployeeIds([])}
                                                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 hover:underline uppercase tracking-wider"
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                        </div>
                                        {employees.map((e) => {
                                            const checked = selectedEmployeeIds.map(String).includes(String(e.id));
                                            return (
                                                <label key={e.id} className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${checked ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                                                        checked={checked}
                                                        onChange={() => toggleEmployee(e.id)}
                                                    />
                                                    <span className="truncate text-sm">{e.lastName}, {e.firstName} <span className="text-[10px] opacity-60">({e.employeeCode})</span></span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Letters Multi-select Dropdown */}
                        <div className="relative">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Letters</label>
                            <button
                                type="button"
                                onClick={() => setIsLettersOpen(!isLettersOpen)}
                                className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50 focus:border-primary focus:outline-none"
                            >
                                <span className="truncate">
                                    {(() => {
                                        const selected = Object.entries(reportChecklist).filter(([_, v]) => v);
                                        if (selected.length === 0) return 'No violations selected';
                                        if (selected.length === 1) {
                                            const labels = {
                                                refusal: 'Refusal to submit',
                                                failure: 'Failure to submit',
                                                late: 'Late submission',
                                                habitual: 'Habitual/Repeated'
                                            };
                                            return labels[selected[0][0]];
                                        }
                                        return `${selected.length} violation(s) selected`;
                                    })()}
                                </span>
                                <svg className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isLettersOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            
                            {isLettersOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsLettersOpen(false)} />
                                    <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in duration-150 ring-1 ring-black ring-opacity-5">
                                        <div className="px-2 py-1.5 mb-1 border-b border-slate-100">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{noticeLetterType.label}</div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            {[
                                                { id: 'refusal', label: 'Refusal to submit required report(s)' },
                                                { id: 'failure', label: 'Failure to submit required report(s)' },
                                                { id: 'late', label: 'Late submission of required report(s)' },
                                                { id: 'habitual', label: 'Habitual or repeated delayed submission' },
                                            ].map((item) => (
                                                <label key={item.id} className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${reportChecklist[item.id] ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                                                        checked={reportChecklist[item.id]}
                                                        onChange={() => setReportChecklist((p) => ({ ...p, [item.id]: !p[item.id] }))}
                                                    />
                                                    <span className="text-sm">{item.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Date Issued</label>
                            <input
                                type="date"
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                                value={issuedDate}
                                onChange={(e) => setIssuedDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div id="print-area">
                    {selectedEmployees.length === 0 ? (
                        <div className="letter-paper text-sm text-slate-600 no-print text-center py-12">
                            Select at least one employee from the dropdown above to generate the print preview.
                        </div>
                    ) : (
                        selectedEmployees.map((emp, idx) => {
                            const lastNameForGreeting = emp?.lastName || '';

                            return (
                                <div key={emp.id} className="print-page">
                                    {/* Header for screen visibility */}
                                    <div className="letter-header no-print flex items-center justify-between mb-3 px-1">
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                                                {idx + 1}
                                            </span>
                                            <span className="text-xs font-semibold text-slate-700">
                                                Letter for {emp.lastName}, {emp.firstName}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                                            Employee ID: {emp.employeeCode}
                                        </span>
                                    </div>

                                    {/* Individual Paper Card */}
                                    <div className="letter-paper" style={{ fontFamily: 'Calibri, Arial, Helvetica, sans-serif', fontSize: '11pt', color: '#111827', lineHeight: 1.35 }}>
                                        <div style={{ padding: '0 2px' }}>
                                            {getPolicyBody('report_submission_violations', lastNameForGreeting)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );
}
