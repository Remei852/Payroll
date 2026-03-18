import { Head } from '@inertiajs/react';
import { useEffect } from 'react';

export default function ViolationPrint({ violations }) {
    useEffect(() => {
        // Auto-trigger print dialog after page loads
        const timer = setTimeout(() => {
            window.print();
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'Critical':
                return 'text-red-900';
            case 'High':
                return 'text-red-700';
            case 'Medium':
                return 'text-yellow-700';
            case 'Low':
                return 'text-blue-700';
            default:
                return 'text-gray-700';
        }
    };

    return (
        <>
            <Head title="Print Violation Notice" />
            
            <style>{`
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                    }
                    .page-break {
                        page-break-after: always;
                    }
                    .no-print {
                        display: none;
                    }
                }
                
                @page {
                    size: A4;
                    margin: 2cm;
                }
            `}</style>

            <div className="bg-white">
                {violations.map((violation, index) => (
                    <div 
                        key={violation.id} 
                        className={`p-8 ${index < violations.length - 1 ? 'page-break' : ''}`}
                    >
                        {/* Header */}
                        <div className="mb-8 border-b-2 border-gray-800 pb-4">
                            <h1 className="text-2xl font-bold text-gray-900">
                                ATTENDANCE VIOLATION NOTICE
                            </h1>
                            <p className="mt-1 text-sm text-gray-600">
                                Generated on {formatDate(new Date())}
                            </p>
                        </div>

                        {/* Employee Information */}
                        <div className="mb-6">
                            <h2 className="mb-3 text-lg font-semibold text-gray-900">
                                Employee Information
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Name:</p>
                                    <p className="text-base text-gray-900">
                                        {violation.employee.first_name} {violation.employee.last_name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Employee ID:</p>
                                    <p className="text-base text-gray-900">
                                        {violation.employee.employee_code}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Violation Details */}
                        <div className="mb-6">
                            <h2 className="mb-3 text-lg font-semibold text-gray-900">
                                Violation Details
                            </h2>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-600">Type:</span>
                                    <span className="text-base text-gray-900">{violation.violation_type}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-600">Date:</span>
                                    <span className="text-base text-gray-900">{formatDate(violation.violation_date)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-600">Severity:</span>
                                    <span className={`text-base font-semibold ${getSeverityColor(violation.severity)}`}>
                                        {violation.severity}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {violation.description && (
                            <div className="mb-6">
                                <h2 className="mb-3 text-lg font-semibold text-gray-900">
                                    Description
                                </h2>
                                <p className="text-base text-gray-700 whitespace-pre-wrap">
                                    {violation.description}
                                </p>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="mt-12 border-t border-gray-300 pt-4">
                            <p className="text-xs text-gray-500">
                                This is an official attendance violation notice. Please review and take necessary action.
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
