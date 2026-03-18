# Implementation Plan: Attendance Violation Letter Generation

## Overview

This implementation adds a violation letter generation feature to the existing attendance records page. The feature includes a backend API endpoint to fetch violation data, React components for an editable letter preview modal, and client-side PDF generation using react-to-print. The implementation follows the existing Laravel + Inertia.js (React) architecture.

## Tasks

- [ ] 1. Create backend API endpoint for violation data
  - [x] 1.1 Add route for violation data endpoint
    - Add GET route `/api/attendance/violations/{employeeId}` in `routes/api.php`
    - Accept optional query parameters: `dateFrom`, `dateTo`
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Create controller method to fetch and calculate violations
    - Create `getViolations` method in `AttendanceController`
    - Query attendance records filtered by employee ID and date range
    - Calculate absences (status = 'Absent' or 'Half Day')
    - Extract late AM instances (late_minutes_am > 0)
    - Extract late PM instances (late_minutes_pm > 0)
    - Extract missed log instances (missed_logs_count > 0)
    - Return structured JSON response with employee info, date range, violations, and summary
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.7_

  - [ ]* 1.3 Write property test for violation retrieval with date filters
    - **Property 1: Violation Retrieval Respects Date Filters**
    - **Validates: Requirements 1.1, 1.2, 1.3, 7.2**
    - Test that violations are correctly filtered by date range including null filters
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 1.4 Write unit tests for violation calculation logic
    - Test absence counting with different status values
    - Test late AM/PM extraction with various minute values
    - Test missed log extraction
    - Test empty result set handling
    - Test invalid employee ID returns 404
    - Test invalid date range returns 422
    - _Requirements: 2.1, 2.3, 2.4, 2.7_

- [ ] 2. Create React components for letter modal and preview
  - [x] 2.1 Create ViolationLetterModal component
    - Create `resources/js/Components/ViolationLetterModal.jsx`
    - Accept props: isOpen, onClose, employeeId, dateFilters
    - Fetch violation data from API endpoint on mount
    - Handle loading, error, and success states
    - Render LetterPreview component when data is loaded
    - Include Print/Download PDF button
    - _Requirements: 1.4, 7.1, 7.3, 7.4_

  - [x] 2.2 Create LetterPreview component with A4 styling
    - Create `resources/js/Components/LetterPreview.jsx`
    - Use forwardRef to expose ref for react-to-print
    - Apply A4 dimensions (210mm × 297mm) with proper margins
    - Structure letter with: title, employee info, date range, violation breakdown, action required, signature section
    - Apply print-specific CSS with @media print rules
    - _Requirements: 1.5, 1.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 2.3 Create EditableSection component for content editing
    - Create `resources/js/Components/EditableSection.jsx`
    - Implement contentEditable div with onChange handler
    - Preserve formatting and layout during edits
    - Accept props: content, onChange, className, placeholder
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 2.4 Create ViolationBreakdown component for structured violation display
    - Create `resources/js/Components/ViolationBreakdown.jsx`
    - Display absences with dates in formatted list
    - Display late AM instances with dates and minutes
    - Display late PM instances with dates and minutes
    - Display missed log instances with dates and counts
    - Make all violation details editable
    - _Requirements: 2.2, 2.5, 2.6, 2.8_

  - [ ]* 2.5 Write property tests for letter content accuracy
    - **Property 2: Letter Contains Employee Information**
    - **Property 3: Letter Contains Date Range**
    - **Property 4: Absence Count Matches Records**
    - **Property 5: All Absence Dates Listed**
    - **Property 6: Late AM Instances Captured Completely**
    - **Property 7: Late PM Instances Captured Completely**
    - **Property 8: Missed Log Instances Captured Completely**
    - **Validates: Requirements 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**
    - _Requirements: 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 2.6 Write unit tests for React components
    - Test modal opens and closes correctly
    - Test loading state displays during API call
    - Test error state displays on API failure
    - Test letter preview renders with violation data
    - Test all sections are contentEditable
    - Test editing updates component state
    - _Requirements: 1.4, 3.1, 7.1, 7.3_

- [ ] 3. Checkpoint - Ensure backend and frontend components work independently
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Integrate react-to-print for PDF generation
  - [ ] 4.1 Install react-to-print package
    - Run `npm install react-to-print` (user should run this manually)
    - Import useReactToPrint hook in ViolationLetterModal
    - _Requirements: 5.1_

  - [ ] 4.2 Implement print functionality with A4 page settings
    - Create ref for LetterPreview component
    - Configure useReactToPrint with A4 page style
    - Set document title with employee code and date
    - Connect print button to handlePrint function
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 4.3 Write property tests for print output consistency
    - **Property 11: Print CSS Matches Preview CSS**
    - **Property 12: Print Output Contains Edited Content**
    - **Validates: Requirements 5.3, 5.4**
    - Test that print styles preserve formatting and margins
    - Test that edited content appears in print output
    - _Requirements: 5.3, 5.4_

  - [ ]* 4.4 Write unit tests for print functionality
    - Test print button triggers window.print()
    - Test print dialog can be cancelled without errors
    - Test document title is set correctly
    - _Requirements: 5.1_

- [ ] 5. Integrate letter generation into attendance records page
  - [x] 5.1 Update Records.jsx to include ViolationLetterModal
    - Import ViolationLetterModal component
    - Add state for modal visibility and selected employee ID
    - Update document icon button onClick to open modal with employee ID and current date filters
    - Pass dateFrom and dateTo filters to modal
    - _Requirements: 7.1, 7.2_

  - [x] 5.2 Update document icon button handler
    - Replace alert() with modal open function
    - Pass employee ID and active date filters to modal
    - Ensure button is accessible and has proper title attribute
    - _Requirements: 7.1, 7.5_

  - [ ]* 5.3 Write property test for modal integration
    - **Property 13: Modal Opens for Any Employee**
    - **Validates: Requirements 7.1**
    - Test that clicking document icon opens modal with correct employee data
    - _Requirements: 7.1_

  - [ ]* 5.4 Write integration tests for complete flow
    - Test complete flow: click button → view letter → edit → print
    - Test date filter integration with violation calculation
    - Test modal state management across interactions
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 6. Add CSS styling for print and preview
  - [ ] 6.1 Create print-specific CSS styles
    - Add @media print rules for A4 page size
    - Set proper margins (20mm) for printing
    - Hide non-printable elements (buttons, modal backdrop)
    - Ensure text doesn't overflow page boundaries
    - Apply professional formatting (font size, line height, spacing)
    - _Requirements: 4.4, 4.5, 4.6, 5.2, 5.3_

  - [ ] 6.2 Style editable sections for professional appearance
    - Apply consistent typography and spacing
    - Add subtle visual indicators for editable areas (optional hover effects)
    - Ensure layout preservation during editing
    - _Requirements: 3.6, 3.7, 4.1, 4.2, 4.5, 4.6_

  - [ ]* 6.3 Write property tests for layout and formatting preservation
    - **Property 9: Layout Preservation During Editing**
    - **Property 10: Formatting Preservation During Editing**
    - **Validates: Requirements 3.6, 3.7**
    - Test that document layout remains unchanged after edits
    - Test that CSS classes and spacing are preserved
    - _Requirements: 3.6, 3.7_

- [ ] 7. Final checkpoint - End-to-end testing and validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The implementation uses the existing Laravel + Inertia.js (React) architecture
- Backend uses PHP (Laravel), frontend uses JavaScript/JSX (React)
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples and edge cases
- User should manually run `npm install react-to-print` before task 4.2
- The document icon button already exists in the Action column (line 556 in Records.jsx)
