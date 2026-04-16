import { forwardRef, useState } from 'react';
import EditableSection from './EditableSection';
import ViolationBreakdown from './ViolationBreakdown';

const LetterPreview = forwardRef(({ data }, ref) => {
    const [letterContent, setLetterContent] = useState({
        title: 'MEMORANDUM',
        opening: `This memorandum serves as a formal notice regarding attendance violations observed in your employment record.`,
        actionRequired: `You are hereby required to:
1. Report to the Human Resources office within five (5) working days from receipt of this memorandum
2. Submit a written explanation regarding the attendance violations listed above`,
        closing: `Your immediate attention to this matter is expected. Failure to comply may result in further disciplinary action in accordance with company policy.`,
    });

    const updateContent = (field, value) => {
        setLetterContent(prev => ({ ...prev, [field]: value }));
    };

    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div ref={ref} className="letter-preview mx-auto bg-white p-8" style={{ width: '210mm', minHeight: '297mm' }}>
            {/* Title */}
            <div className="mb-6 text-center">
                <EditableSection
                    content={letterContent.title}
                    onChange={(value) => updateContent('title', value)}
                    className="text-2xl font-bold text-slate-900"
                />
            </div>

            {/* Header Info */}
            <div className="mb-6 space-y-2 text-sm">
                <div className="flex">
                    <span className="w-24 font-semibold">TO:</span>
                    <span>{data.employee.name} ({data.employee.code})</span>
                </div>
                <div className="flex">
                    <span className="w-24 font-semibold">FROM:</span>
                    <EditableSection
                        content="Human Resources Department"
                        onChange={() => {}}
                        className="inline-block"
                    />
                </div>
                <div className="flex">
                    <span className="w-24 font-semibold">DATE:</span>
                    <span>{currentDate}</span>
                </div>
                <div className="flex">
                    <span className="w-24 font-semibold">SUBJECT:</span>
                    <EditableSection
                        content="Attendance Violation Notice"
                        onChange={() => {}}
                        className="inline-block"
                    />
                </div>
            </div>

            <hr className="my-6 border-slate-300" />

            {/* Body */}
            <div className="space-y-4 text-sm leading-relaxed">
                {/* Opening */}
                <EditableSection
                    content={letterContent.opening}
                    onChange={(value) => updateContent('opening', value)}
                    className="text-justify"
                />

                {/* Date Range */}
                <p>
                    <span className="font-semibold">Period Covered:</span>{' '}
                    {data.dateRange.startFormatted} to {data.dateRange.endFormatted}
                </p>

                {/* Violation Breakdown */}
                <div>
                    <p className="mb-3 font-semibold">The following attendance violations have been recorded:</p>
                    <ViolationBreakdown violations={data.violations} summary={data.summary} />
                </div>

                {/* Action Required */}
                <div>
                    <p className="mb-2 font-semibold">Action Required:</p>
                    <EditableSection
                        content={letterContent.actionRequired}
                        onChange={(value) => updateContent('actionRequired', value)}
                        className="whitespace-pre-line text-justify"
                    />
                </div>

                {/* Closing */}
                <EditableSection
                    content={letterContent.closing}
                    onChange={(value) => updateContent('closing', value)}
                    className="text-justify"
                />
            </div>

            {/* Signature Section */}
            <div className="mt-12 space-y-8">
                <div>
                    <p className="text-sm">Respectfully,</p>
                    <div className="mt-12 border-b border-slate-400" style={{ width: '250px' }}></div>
                    <EditableSection
                        content="Mark Lester M. To-ong"
                        onChange={() => {}}
                        className="mt-1 text-sm font-semibold"
                    />
                    <EditableSection
                        content="Operations Manager"
                        onChange={() => {}}
                        className="text-sm text-slate-600"
                    />
                </div>

                <div>
                    <p className="text-sm">Acknowledged by:</p>
                    <div className="mt-12 border-b border-slate-400" style={{ width: '250px' }}></div>
                    <p className="mt-1 text-sm font-semibold">{data.employee.name}</p>
                    <p className="text-sm text-slate-600">Employee</p>
                    <div className="mt-4 flex gap-4">
                        <div>
                            <span className="text-sm">Date: </span>
                            <span className="inline-block border-b border-slate-400" style={{ width: '150px' }}></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Styles */}
            <style jsx>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 25.4mm;
                    }

                    .letter-preview {
                        width: 100%;
                        min-height: auto;
                        padding: 0;
                        font-size: 12pt;
                        line-height: 1.6;
                    }

                    /* Hide non-printable elements */
                    button,
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
});

LetterPreview.displayName = 'LetterPreview';

export default LetterPreview;
