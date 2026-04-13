import React from 'react';

export default function PayrollValidationWarning({ issues, onContinue, onFixIssues, loading }) {
  if (!issues || issues.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-yellow-800">
            Attendance Validation Issues Found
          </p>
          <div className="mt-2 text-sm text-yellow-700">
            <p className="mb-3">The following issues were detected in your attendance records:</p>
            <ul className="list-disc list-inside space-y-1">
              {issues.map((issue, index) => (
                <li key={index}>
                  <span className="font-medium">{issue.employee_name}</span> ({issue.attendance_date}): {issue.message}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={onFixIssues}
              disabled={loading}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              Go Back & Fix Issues
            </button>
            <button
              onClick={onContinue}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
            >
              Continue Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
