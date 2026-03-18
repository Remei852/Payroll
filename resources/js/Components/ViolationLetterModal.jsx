import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import LetterPreview from './LetterPreview';

export default function ViolationLetterModal({ isOpen, onClose, employeeId, dateFilters }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [violationData, setViolationData] = useState(null);
    const letterRef = useRef();

    useEffect(() => {
        if (isOpen && employeeId) {
            fetchViolationData();
        }
    }, [isOpen, employeeId]);

    // Add print styles when modal opens
    useEffect(() => {
        if (isOpen) {
            // Add print-specific styles to document
            const style = document.createElement('style');
            style.id = 'violation-letter-print-styles';
            style.textContent = `
                @media print {
                    .no-print {
                        display: none !important;
                    }
                }
            `;
            document.head.appendChild(style);

            return () => {
                // Clean up when modal closes
                const existingStyle = document.getElementById('violation-letter-print-styles');
                if (existingStyle) {
                    existingStyle.remove();
                }
            };
        }
    }, [isOpen]);

    const fetchViolationData = async () => {
        setLoading(true);
        setError(null);

        try {
            const params = {};
            if (dateFilters?.dateFrom) params.dateFrom = dateFilters.dateFrom;
            if (dateFilters?.dateTo) params.dateTo = dateFilters.dateTo;

            const response = await axios.get(`/api/attendance/violations/${employeeId}`, { params });
            setViolationData(response.data);
        } catch (err) {
            console.error('Error fetching violation data:', err);
            setError(err.response?.data?.error || 'Failed to load violation data');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        // Open letter in new window for printing
        const printWindow = window.open('', '_blank');
        
        if (!printWindow) {
            alert('Please allow pop-ups to print the letter');
            return;
        }
        
        const letterElement = letterRef.current;
        const letterHTML = letterElement.innerHTML;
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Attendance Violation Letter</title>
                <style>
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        font-size: 12pt;
                        line-height: 1.6;
                        color: #1e293b;
                        background: white;
                        padding: 0;
                    }
                    
                    .text-center { text-align: center; }
                    .text-justify { text-align: justify; }
                    .font-bold { font-weight: 700; }
                    .font-semibold { font-weight: 600; }
                    .font-medium { font-weight: 500; }
                    .text-2xl { font-size: 1.5rem; line-height: 2rem; }
                    .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
                    .text-xs { font-size: 0.75rem; line-height: 1rem; }
                    .mb-2 { margin-bottom: 0.5rem; }
                    .mb-3 { margin-bottom: 0.75rem; }
                    .mb-6 { margin-bottom: 1.5rem; }
                    .mt-1 { margin-top: 0.25rem; }
                    .mt-2 { margin-top: 0.5rem; }
                    .mt-4 { margin-top: 1rem; }
                    .mt-12 { margin-top: 3rem; }
                    .my-6 { margin-top: 1.5rem; margin-bottom: 1.5rem; }
                    .ml-4 { margin-left: 1rem; }
                    .ml-6 { margin-left: 1.5rem; }
                    .p-4 { padding: 1rem; }
                    .space-y-1 > * + * { margin-top: 0.25rem; }
                    .space-y-2 > * + * { margin-top: 0.5rem; }
                    .space-y-4 > * + * { margin-top: 1rem; }
                    .space-y-8 > * + * { margin-top: 2rem; }
                    .flex { display: flex; }
                    .gap-4 { gap: 1rem; }
                    .inline-block { display: inline-block; }
                    .w-24 { width: 6rem; }
                    .border-b { border-bottom: 1px solid; }
                    .border-slate-300 { border-color: #cbd5e1; }
                    .border-slate-400 { border-color: #94a3b8; }
                    .border-slate-200 { border-color: #e2e8f0; }
                    .border-green-200 { border-color: #bbf7d0; }
                    .rounded-md { border-radius: 0.375rem; }
                    .bg-slate-50 { background-color: #f8fafc; }
                    .bg-green-50 { background-color: #f0fdf4; }
                    .text-slate-900 { color: #0f172a; }
                    .text-slate-700 { color: #334155; }
                    .text-slate-600 { color: #475569; }
                    .text-green-800 { color: #166534; }
                    .text-red-600 { color: #dc2626; }
                    .list-disc { list-style-type: disc; }
                    .whitespace-pre-line { white-space: pre-line; }
                    .leading-relaxed { line-height: 1.625; }
                    .border { border: 1px solid #e2e8f0; }
                    hr { border: 0; border-top: 1px solid #cbd5e1; margin: 1.5rem 0; }
                </style>
            </head>
            <body>
                ${letterHTML}
                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() {
                            window.close();
                        };
                    };
                </script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
    };

    const handleDownloadPDF = () => {
        // Build URL with query parameters
        const params = new URLSearchParams();
        if (dateFilters?.dateFrom) params.append('dateFrom', dateFilters.dateFrom);
        if (dateFilters?.dateTo) params.append('dateTo', dateFilters.dateTo);
        
        const url = `/api/attendance/violations/${employeeId}/pdf?${params.toString()}`;
        
        // Trigger download by opening URL in new tab
        window.open(url, '_blank');
    };

    // Don't render anything if modal is not open
    if (!isOpen) {
        return null;
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm no-print"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed left-1/2 top-1/2 z-[60] w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white shadow-xl no-print">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <h2 className="text-lg font-semibold text-slate-900">
                        Attendance Violation Letter
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="max-h-[70vh] overflow-y-auto p-6">
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <svg className="mx-auto h-12 w-12 animate-spin text-[#1E3A8A]" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <p className="mt-4 text-sm text-slate-600">Loading violation data...</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="rounded-md border border-red-200 bg-red-50 p-4">
                            <div className="flex items-center gap-3">
                                <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-sm font-medium text-red-800">{error}</p>
                            </div>
                        </div>
                    )}

                    {!loading && !error && violationData && (
                        <div className="print-preview-container">
                            <LetterPreview ref={letterRef} data={violationData} />
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!loading && !error && violationData && (
                    <div className="border-t border-slate-200 px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="inline-flex items-center gap-2 rounded-md border border-[#1E3A8A] bg-white px-4 py-2 text-sm font-medium text-[#1E3A8A] shadow-sm transition hover:bg-slate-50"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Print Letter
                            </button>
                            <button
                                type="button"
                                onClick={handleDownloadPDF}
                                className="inline-flex items-center gap-2 rounded-md bg-[#1E3A8A] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#1E3A8A]/90"
                                title="Download as PDF file"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Download PDF
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
