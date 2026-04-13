import React from 'react';

export default function AttendanceValidationAlert({ validation, onDismiss }) {
  if (!validation || validation.is_valid) {
    return null;
  }

  const { issues = {} } = validation;
  const errors = issues.errors || [];
  const warnings = issues.warnings || [];

  const getIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return (
          <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0zm3 0a1 1 0 11-2 0 1 1 0 012 0zm3 0a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${getSeverityColor(errors.length > 0 ? 'critical' : 'warning')}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon(errors.length > 0 ? 'critical' : 'warning')}
        </div>
        <div className="flex-1">
          <h3 className={`text-sm font-medium ${errors.length > 0 ? 'text-red-900' : 'text-yellow-900'}`}>
            {errors.length > 0 ? 'Validation Errors' : 'Validation Warnings'}
          </h3>
          <div className="mt-2 space-y-1">
            {errors.map((error, idx) => (
              <p key={`error-${idx}`} className="text-sm text-red-800">
                <span className="font-medium">{error.field}:</span> {error.message}
              </p>
            ))}
            {warnings.map((warning, idx) => (
              <p key={`warning-${idx}`} className="text-sm text-yellow-800">
                <span className="font-medium">{warning.field}:</span> {warning.message}
              </p>
            ))}
          </div>
          {validation.can_auto_correct && (
            <p className="mt-2 text-xs text-blue-700 font-medium">
              💡 Some issues can be auto-corrected. Review and approve to proceed.
            </p>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
