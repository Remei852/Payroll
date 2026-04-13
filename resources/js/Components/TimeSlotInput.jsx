import React, { useState } from 'react';

export default function TimeSlotInput({ 
  label, 
  value, 
  onChange, 
  error, 
  required = false,
  disabled = false,
  hint = null,
  showValidation = false,
  isValid = null
}) {
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  const getInputClasses = () => {
    let classes = 'w-full px-3 py-2 border rounded-md text-sm transition focus:outline-none focus:ring-1';
    
    if (disabled) {
      classes += ' bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed';
    } else if (error) {
      classes += ' border-red-500 focus:border-red-500 focus:ring-red-500';
    } else if (showValidation && isValid === true) {
      classes += ' border-green-500 focus:border-green-500 focus:ring-green-500';
    } else if (showValidation && isValid === false) {
      classes += ' border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500';
    } else {
      classes += ' border-gray-300 focus:border-blue-500 focus:ring-blue-500';
    }
    
    return classes;
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          type="time"
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          className={getInputClasses()}
        />
        
        {showValidation && isValid === true && (
          <div className="absolute right-3 top-2.5 text-green-600">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        
        {showValidation && isValid === false && (
          <div className="absolute right-3 top-2.5 text-yellow-600">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 font-medium">{error}</p>
      )}

      {hint && !error && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
}
