<?php

namespace App\Http\Controllers;

use App\Services\AttendanceService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class AttendanceController extends Controller
{
    public function __construct(
        protected AttendanceService $service
    ) {
    }

    public function storeUpload(Request $request)
    {
        set_time_limit(300);
        ini_set('max_execution_time', 300);
        
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:10240',
        ]);

        try {
            $file = $request->file('file');
            $originalName = $file->getClientOriginalName();
            
            // Store temporarily, parse into attendance_logs only â€” no processing
            $path = $file->storeAs('temp', uniqid() . '_' . $originalName);
            $fullPath = Storage::path($path);

            $uploadResults = $this->service->processCsvFile($fullPath, $originalName);

            Storage::delete($path);

            $summary = $this->service->getAttendanceSummary();
            $gapInfo = $this->service->detectDateGaps();
            $uploadedFiles = $this->getUploadedFilesList();

            return Inertia::render('Attendance/Records', [
                'attendanceSummary' => $summary,
                'dateRange' => $this->service->getAttendanceRecordsDateRange(),
                'gapInfo' => $gapInfo,
                'uploadedFiles' => $uploadedFiles,
                'departments' => \App\Models\Department::orderBy('name')->get(['id', 'name']),
                'flash' => [
                    'success' => [
                        'message' => "{$uploadResults['success']} logs imported from \"{$originalName}\". Review the file then click Process when ready.",
                        'uploadResults' => $uploadResults,
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in storeUpload', ['error' => $e->getMessage()]);
            return back()->withErrors(['file' => 'Error processing file: ' . $e->getMessage()]);
        }
    }

    /**
     * Process logs from a specific uploaded file into attendance_records.
     * Triggered manually by the user after reviewing uploaded files.
     */
    public function processFile(Request $request)
    {
        set_time_limit(300);
        ini_set('max_execution_time', 300);

        $request->validate([
            'source_file' => 'required|string',
        ]);

        $sourceFile = $request->source_file;

        try {
            $dateRange = \App\Models\AttendanceLog::where('source_file', $sourceFile)
                ->selectRaw('MIN(DATE(log_datetime)) as start, MAX(DATE(log_datetime)) as end')
                ->first();

            if (!$dateRange->start || !$dateRange->end) {
                return response()->json(['error' => 'No logs found for this file'], 404);
            }

            $results = $this->service->processLogsToRecords(
                Carbon::parse($dateRange->start),
                Carbon::parse($dateRange->end)
            );

            return response()->json([
                'success' => true,
                'message' => "Processed {$results['processed']} days from \"{$sourceFile}\"",
                'results' => $results,
                'date_from' => $dateRange->start,
                'date_to' => $dateRange->end,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error processing file', ['source_file' => $sourceFile, 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['error' => 'Error processing file: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Helper to build the uploaded files list for the sidebar.
     */
    private function getUploadedFilesList(): \Illuminate\Support\Collection
    {
        return \App\Models\AttendanceLog::select(
                'source_file',
                \DB::raw('COUNT(*) as log_count'),
                \DB::raw('MIN(DATE(log_datetime)) as date_from'),
                \DB::raw('MAX(DATE(log_datetime)) as date_to'),
                \DB::raw('MIN(log_datetime) as uploaded_at')
            )
            ->whereNotNull('source_file')
            ->groupBy('source_file')
            ->orderByDesc('uploaded_at')
            ->get()
            ->map(fn ($f) => [
                'source_file' => $f->source_file,
                'log_count' => $f->log_count,
                'date_from' => $f->date_from,
                'date_to' => $f->date_to,
            ]);
    }

    public function processLogs(Request $request)
    {
        // Increase execution time for processing large date ranges
        set_time_limit(300); // 5 minutes
        ini_set('max_execution_time', 300);
        
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        try {
            $startDate = Carbon::parse($request->start_date);
            $endDate = Carbon::parse($request->end_date);

            $results = $this->service->processLogsToRecords($startDate, $endDate);

            return back()->with('success', [
                'message' => 'Attendance logs processed successfully',
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            return back()->withErrors([
                'process' => 'Error processing logs: ' . $e->getMessage(),
            ]);
        }
    }

    public function records(Request $request)
    {
        // Get attendance summary
        $summary = $this->service->getAttendanceSummary();
        
        // Get date range of attendance records
        $dateRange = $this->service->getAttendanceRecordsDateRange();

        // Detect date gaps
        $gapInfo = $this->service->detectDateGaps();

        // Get uploaded files grouped by source_file for the sidebar
        $uploadedFiles = $this->getUploadedFilesList();

        // Get departments for payroll generation step
        $departments = \App\Models\Department::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Attendance/Records', [
            'attendanceSummary' => $summary,
            'dateRange' => $dateRange,
            'gapInfo' => $gapInfo,
            'uploadedFiles' => $uploadedFiles,
            'departments' => $departments,
        ]);
    }

    public function logs(Request $request)
    {
        $filters = $request->only(['start_date', 'end_date', 'employee_code', 'per_page']);
        $logs = $this->service->getAttendanceLogs($filters);

        return Inertia::render('Attendance/Logs', [
            'logs' => $logs,
            'filters' => $filters,
        ]);
    }

    public function getViolations(Request $request, int $employeeId)
    {
        $request->validate([
            'dateFrom' => 'nullable|date',
            'dateTo' => 'nullable|date|after_or_equal:dateFrom',
        ]);

        try {
            $employee = \App\Models\Employee::with('department')->findOrFail($employeeId);
            
            $query = \App\Models\AttendanceRecord::where('employee_id', $employeeId);
            
            // Apply date filters if provided
            if ($request->dateFrom) {
                $query->where('attendance_date', '>=', $request->dateFrom);
            }
            
            if ($request->dateTo) {
                $query->where('attendance_date', '<=', $request->dateTo);
            }
            
            $records = $query->orderBy('attendance_date')->get();
            
            // Calculate violations
            $violations = $this->calculateViolations($records);
            $summary = $this->calculateSummary($records);
            
            // Determine date range
            $startDate = $request->dateFrom ?? $records->min('attendance_date');
            $endDate = $request->dateTo ?? $records->max('attendance_date');
            
            return response()->json([
                'employee' => [
                    'id' => $employee->id,
                    'code' => $employee->employee_code,
                    'name' => $employee->first_name . ' ' . $employee->last_name,
                    'department' => $employee->department->name ?? 'N/A',
                ],
                'dateRange' => [
                    'start' => $startDate ? Carbon::parse($startDate)->format('Y-m-d') : null,
                    'end' => $endDate ? Carbon::parse($endDate)->format('Y-m-d') : null,
                    'startFormatted' => $startDate ? Carbon::parse($startDate)->format('F j, Y') : null,
                    'endFormatted' => $endDate ? Carbon::parse($endDate)->format('F j, Y') : null,
                ],
                'violations' => $violations,
                'summary' => $summary,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'Employee not found'
            ], 404);
        } catch (\Exception $e) {
            \Log::error('Error fetching violations', [
                'employee_id' => $employeeId,
                'error' => $e->getMessage(),
            ]);
            
            return response()->json([
                'error' => 'Error fetching violation data'
            ], 500);
        }
    }

    private function calculateViolations($records)
    {
        $absences = [];
        $lateAM = [];
        $latePM = [];
        $missedLogs = [];

        foreach ($records as $record) {
            // Absences
            if (str_contains($record->status, 'Absent') || str_contains($record->status, 'Half Day')) {
                $absences[] = [
                    'date' => $record->attendance_date->format('Y-m-d'),
                    'dateFormatted' => $record->attendance_date->format('F j, Y'),
                    'status' => $record->status,
                ];
            }

            // Late AM
            if ($record->late_minutes_am > 0) {
                $lateAM[] = [
                    'date' => $record->attendance_date->format('Y-m-d'),
                    'dateFormatted' => $record->attendance_date->format('F j, Y'),
                    'minutes' => $record->late_minutes_am,
                    'timeIn' => $record->time_in_am ? Carbon::parse($record->time_in_am)->format('H:i') : null,
                ];
            }

            // Late PM
            if ($record->late_minutes_pm > 0) {
                $latePM[] = [
                    'date' => $record->attendance_date->format('Y-m-d'),
                    'dateFormatted' => $record->attendance_date->format('F j, Y'),
                    'minutes' => $record->late_minutes_pm,
                    'timeIn' => $record->time_in_pm ? Carbon::parse($record->time_in_pm)->format('H:i') : null,
                ];
            }

            // Missed Logs
            if ($record->missed_logs_count > 0) {
                $missedLogs[] = [
                    'date' => $record->attendance_date->format('Y-m-d'),
                    'dateFormatted' => $record->attendance_date->format('F j, Y'),
                    'count' => $record->missed_logs_count,
                    'timeInAM' => $record->time_in_am ? Carbon::parse($record->time_in_am)->format('H:i') : null,
                    'timeOutLunch' => $record->time_out_lunch ? Carbon::parse($record->time_out_lunch)->format('H:i') : null,
                    'timeInPM' => $record->time_in_pm ? Carbon::parse($record->time_in_pm)->format('H:i') : null,
                    'timeOutPM' => $record->time_out_pm ? Carbon::parse($record->time_out_pm)->format('H:i') : null,
                ];
            }
        }

        return [
            'absences' => $absences,
            'lateAM' => $lateAM,
            'latePM' => $latePM,
            'missedLogs' => $missedLogs,
        ];
    }

    private function calculateSummary($records)
    {
        $totalAbsences = 0;
        $totalLateAM = 0;
        $totalLatePM = 0;
        $totalMissedLogs = 0;

        foreach ($records as $record) {
            if (str_contains($record->status, 'Absent')) {
                $totalAbsences++;
            } elseif (str_contains($record->status, 'Half Day')) {
                $totalAbsences += 0.5;
            }

            if ($record->late_minutes_am > 0) {
                $totalLateAM++;
            }

            if ($record->late_minutes_pm > 0) {
                $totalLatePM++;
            }

            if ($record->missed_logs_count > 0) {
                $totalMissedLogs++;
            }
        }

        return [
            'totalAbsences' => $totalAbsences,
            'totalLateAM' => $totalLateAM,
            'totalLatePM' => $totalLatePM,
            'totalMissedLogs' => $totalMissedLogs,
        ];
    }

    public function downloadViolationPDF(Request $request, int $employeeId)
    {
        $request->validate([
            'dateFrom'           => 'nullable|date',
            'dateTo'             => 'nullable|date|after_or_equal:dateFrom',
            'preview'            => 'nullable|boolean',
            'paper_size'         => 'nullable|in:A4,legal,letter',
            'content'            => 'nullable|array',
            'content.subject'    => 'nullable|string|max:300',
            'content.opening'    => 'nullable|string|max:1000',
            'content.policyParagraph' => 'nullable|string|max:1000',
            'content.absenceNotice'   => 'nullable|string|max:1000',
            'content.lateAMNotice'    => 'nullable|string|max:1000',
            'content.latePMNotice'    => 'nullable|string|max:1000',
            'content.missedLogNotice' => 'nullable|string|max:1000',
            'content.undertimeNotice' => 'nullable|string|max:1000',
            'content.actionRequired'  => 'nullable|string|max:1000',
            'content.closing'         => 'nullable|string|max:1000',
            'content.preparedBy'      => 'nullable|string|max:200',
            'content.position'        => 'nullable|string|max:200',
            'content.referenceNo'     => 'nullable|string|max:100',
            'content.dateIssued'      => 'nullable|string|max:100',
        ]);

        try {
            $employee = \App\Models\Employee::with('department.workSchedule')->findOrFail($employeeId);

            $query = \App\Models\AttendanceRecord::where('employee_id', $employeeId);

            if ($request->dateFrom) {
                $query->where('attendance_date', '>=', $request->dateFrom);
            }
            if ($request->dateTo) {
                $query->where('attendance_date', '<=', $request->dateTo);
            }

            $records = $query->orderBy('attendance_date')->get();

            $startDate = $request->dateFrom ?? $records->min('attendance_date');
            $endDate   = $request->dateTo   ?? $records->max('attendance_date');

            $scheduleStartTime = $employee->department?->workSchedule?->work_start_time
                ? Carbon::parse($employee->department->workSchedule->work_start_time)->format('g:i A')
                : '8:30 AM';

            // Merge submitted content with defaults
            $submitted = $request->input('content', []);
            $content   = array_merge($this->defaultLetterContent($scheduleStartTime), $submitted);

            $data = [
                'employee' => [
                    'code'       => $employee->employee_code,
                    'name'       => $employee->first_name . ' ' . $employee->last_name,
                    'department' => $employee->department->name ?? 'N/A',
                ],
                'dateRange' => [
                    'startFormatted' => $startDate ? Carbon::parse($startDate)->format('F j, Y') : null,
                    'endFormatted'   => $endDate   ? Carbon::parse($endDate)->format('F j, Y')   : null,
                ],
                'scheduleStartTime' => $scheduleStartTime,
                'violations'  => $this->buildSectionedViolations($records),
                'summary'     => $this->buildViolationSummary($records),
                'currentDate' => $content['dateIssued'] ?: Carbon::now()->format('F j, Y'),
                'content'     => $content,
            ];

            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.violation-letter', $data);
            $paperSize = in_array($request->input('paper_size'), ['A4', 'legal', 'letter'])
                ? $request->input('paper_size')
                : 'A4';
            $pdf->setPaper($paperSize, 'portrait');

            $filename = 'Violation_Letter_' . $employee->employee_code . '_' . Carbon::now()->format('Y-m-d') . '.pdf';

            // Only mark Letter Sent on actual download, not preview
            if (!$request->boolean('preview')) {
                $this->markViolationsLetterSent($employeeId, $request->dateFrom, $request->dateTo);
                return $pdf->download($filename);
            }

            return $pdf->stream($filename);

        } catch (\Exception $e) {
            \Log::error('Error generating violation PDF', [
                'employee_id' => $employeeId,
                'error'       => $e->getMessage(),
            ]);

            return response()->json(['error' => 'Error generating PDF'], 500);
        }
    }

    /**
     * Default editable content for the violation letter.
     */
    private function defaultLetterContent(string $scheduleStartTime = '8:30 AM', array $violations = []): array
    {
        // Build dynamic action required list based on which violations are present
        $actionItems = [
            "1. Submit a written explanation for each violation category listed above within two (2) business days.",
        ];
        if (!empty($violations['absences'])) {
            $actionItems[] = count($actionItems) + 1 . ". For absences, provide supporting documentation (e.g., medical certificate or approved leave form).";
        }
        if (!empty($violations['missedLogs'])) {
            $actionItems[] = count($actionItems) + 1 . ". For missing biometric logs, attach proof of attendance (supervisor certification, work output, or other verifiable evidence).";
        }
        if (!empty($violations['lateAM']) || !empty($violations['latePM'])) {
            $actionItems[] = count($actionItems) + 1 . ". For late arrivals, explain the reason and commit to a corrective action plan.";
        }
        if (!empty($violations['undertime'])) {
            $actionItems[] = count($actionItems) + 1 . ". For undertime, secure prior approval for early departures or provide a valid justification.";
        }

        return [
            'subject'         => 'Notice of Attendance Violations',
            'opening'         => 'This memorandum is issued to formally notify you of attendance irregularities recorded during the covered period stated below.',
            'policyParagraph' => "As provided in the company's attendance policy, employees are expected to observe proper working hours, maintain punctuality, and complete all required daily time logs. The official start time is {$scheduleStartTime}.",
            'absenceNotice'   => 'Our records indicate that you were absent on the dates listed above. You are required to submit a written explanation and, if applicable, supporting documentation (e.g., medical certificate)',
            'lateAMNotice'    => "Records above show that you arrived after the scheduled start time of {$scheduleStartTime}. ",
            'latePMNotice'    => 'The instances above indicate that you returned late from your lunch break.',
            'missedLogNotice' => 'Our biometric system shows incomplete clock-in/clock-out records on the dates listed above. If you were present, you must submit supporting proof of attendance (e.g., supervisor certification, work output). Failure to provide proof will be treated as absent.',
            'undertimeNotice' => 'The records below show that you left before the scheduled end of the workday on the listed dates. Undertime is subject to corresponding salary deductions. Please ensure you complete your required working hours or secure prior approval for early departure.',
            'actionRequired'  => implode("\n", $actionItems),
            'closing'         => 'Failure to comply or repeated violations may result in further disciplinary action in accordance with company policy.',
            'preparedBy'       => 'MARK LESTER M. TO-ONG',
            'position'         => 'Operations Manager',
            'referenceNo'     => '',
            'dateIssued'      => Carbon::now()->format('F j, Y'),
        ];
    }
/**Notices
 *Absences: Our records indicate that you were absent on the dates listed above without an approved leave on file. Unexcused absences disrupt team operations and may affect your compensation for the affected days. You are required to submit a written explanation and, if applicable, supporting documentation (e.g., medical certificate)',
 * LateAM: These occurrences place additional burden on your colleagues and affect overall productivity. We expect immediate improvement in your punctuality.
 * LatePM: Repeated late returns disrupt afternoon operations and are considered a violation of attendance policy.
 */
    /**
     * Return violation data + default letter content as JSON.
     * Used by the editable letter modal to populate the form.
     */
    public function getViolationLetterData(Request $request, int $employeeId)
    {
        $request->validate([
            'dateFrom' => 'nullable|date',
            'dateTo'   => 'nullable|date|after_or_equal:dateFrom',
        ]);

        try {
            $employee = \App\Models\Employee::with('department.workSchedule')->findOrFail($employeeId);

            $query = \App\Models\AttendanceRecord::where('employee_id', $employeeId);
            if ($request->dateFrom) $query->where('attendance_date', '>=', $request->dateFrom);
            if ($request->dateTo)   $query->where('attendance_date', '<=', $request->dateTo);

            $records   = $query->orderBy('attendance_date')->get();
            $startDate = $request->dateFrom ?? $records->min('attendance_date');
            $endDate   = $request->dateTo   ?? $records->max('attendance_date');

            $scheduleStartTime = $employee->department?->workSchedule?->work_start_time
                ? Carbon::parse($employee->department->workSchedule->work_start_time)->format('g:i A')
                : '8:30 AM';

            return response()->json([
                'employee' => [
                    'code'       => $employee->employee_code,
                    'name'       => $employee->first_name . ' ' . $employee->last_name,
                    'department' => $employee->department->name ?? 'N/A',
                ],
                'dateRange' => [
                    'startFormatted' => $startDate ? Carbon::parse($startDate)->format('F j, Y') : null,
                    'endFormatted'   => $endDate   ? Carbon::parse($endDate)->format('F j, Y')   : null,
                ],
                'scheduleStartTime' => $scheduleStartTime,
                'violations'  => $this->buildSectionedViolations($records),
                'summary'     => $this->buildViolationSummary($records),
                'defaults'    => $this->defaultLetterContent($scheduleStartTime, $this->buildSectionedViolations($records)),
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Generate a combined PDF letter for multiple employees.
     * Each employee gets their own page(s). Used from the Violations page bulk action.
     */
    public function downloadBulkViolationPDF(Request $request)
    {
        $request->validate([
            'employee_ids' => 'required|array|min:1',
            'employee_ids.*' => 'integer|exists:employees,id',
            'dateFrom' => 'nullable|date',
            'dateTo'   => 'nullable|date|after_or_equal:dateFrom',
            'markSent' => 'nullable|in:0,1',
            'paper_size' => 'nullable|in:A4,legal,letter',
            'format' => 'nullable|in:pdf,word',
        ]);

        try {
            $employees = \App\Models\Employee::with('department.workSchedule')
                ->whereIn('id', $request->employee_ids)
                ->get();

            $allEmployeeData = [];

            foreach ($employees as $employee) {
                $query = \App\Models\AttendanceRecord::where('employee_id', $employee->id);

                if ($request->dateFrom) {
                    $query->where('attendance_date', '>=', $request->dateFrom);
                }
                if ($request->dateTo) {
                    $query->where('attendance_date', '<=', $request->dateTo);
                }

                $records = $query->orderBy('attendance_date')->get();

                $startDate = $request->dateFrom ?? $records->min('attendance_date');
                $endDate   = $request->dateTo   ?? $records->max('attendance_date');

                $scheduleStartTime = $employee->department?->workSchedule?->work_start_time
                    ? Carbon::parse($employee->department->workSchedule->work_start_time)->format('g:i A')
                    : '8:30 AM';

                $allEmployeeData[] = [
                    'employee' => [
                        'code'       => $employee->employee_code,
                        'name'       => $employee->first_name . ' ' . $employee->last_name,
                        'department' => $employee->department->name ?? 'N/A',
                    ],
                    'dateRange' => [
                        'startFormatted' => $startDate ? Carbon::parse($startDate)->format('F j, Y') : null,
                        'endFormatted'   => $endDate   ? Carbon::parse($endDate)->format('F j, Y')   : null,
                    ],
                    'scheduleStartTime' => $scheduleStartTime,
                    'violations'  => $this->buildSectionedViolations($records),
                    'summary'     => $this->buildViolationSummary($records),
                    'currentDate' => Carbon::now()->format('F j, Y'),
                ];

                // Mark violations as Letter Sent for this employee (if requested)
                if ($request->input('markSent', '1') !== '0') {
                    $this->markViolationsLetterSent($employee->id, $request->dateFrom, $request->dateTo);
                }
            }

            // Check if Word format is requested
            if ($request->input('format') === 'word') {
                return $this->generateWordDocument($allEmployeeData);
            }

            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.violation-letter-bulk', [
                'employees' => $allEmployeeData,
            ]);
            $bulkPaperSize = in_array($request->input('paper_size'), ['A4', 'legal', 'letter'])
                ? $request->input('paper_size')
                : 'A4';
            $pdf->setPaper($bulkPaperSize, 'portrait');

            $filename = 'Violation_Letters_' . Carbon::now()->format('Y-m-d') . '.pdf';

            // ?preview=1 â†’ stream inline so the browser shows it before saving
            if ($request->boolean('preview')) {
                return $pdf->stream($filename);
            }

            return $pdf->download($filename);

        } catch (\Exception $e) {
            \Log::error('Error generating bulk violation PDF', [
                'employee_ids' => $request->employee_ids,
                'error'        => $e->getMessage(),
            ]);

            return response()->json(['error' => 'Error generating PDF: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Bulk violation PDF resolved entirely server-side from violation filters.
     * Used by the Violations page "Print All Filtered" action â€” no client-side ID list needed.
     */
    public function downloadBulkViolationPDFByFilter(Request $request)
    {
        $request->validate([
            'employee_name' => 'nullable|string',
            'department_id' => 'nullable|integer',
            'start_date'    => 'nullable|date',
            'end_date'      => 'nullable|date|after_or_equal:start_date',
            'status'        => 'nullable|string',
            'markSent'      => 'nullable|in:0,1',
        ]);

        try {
            // Resolve distinct employee IDs from AttendanceRecord matching the page filters
            $query = \App\Models\AttendanceRecord::query();

            if ($request->filled('start_date')) {
                $query->where('attendance_date', '>=', $request->input('start_date'));
            }
            if ($request->filled('end_date')) {
                $query->where('attendance_date', '<=', $request->input('end_date'));
            }
            if ($request->filled('department_id')) {
                $query->whereHas('employee', fn($q) => $q->where('department_id', $request->input('department_id')));
            }
            if ($request->filled('employee_name')) {
                $s = $request->input('employee_name');
                $query->whereHas('employee', function ($q) use ($s) {
                    $q->where('first_name', 'like', "%{$s}%")
                      ->orWhere('last_name',  'like', "%{$s}%")
                      ->orWhere('employee_code', 'like', "%{$s}%");
                });
            }
            // Only employees with at least one issue
            $query->where(function ($q) {
                $q->where(function ($q2) {
                        $q2->where('status', 'like', '%Absent%')
                           ->where('status', 'not like', '%Holiday%');
                    })
                    ->orWhere('total_late_minutes', '>', 0)
                    ->orWhere('missed_logs_count', '>', 0)
                    ->orWhere('undertime_minutes', '>', 0);
            });
            if ($request->filled('status')) {
                $query->where('status', 'like', '%' . $request->input('status') . '%');
            }

            $employeeIds = $query->distinct()->pluck('employee_id')->toArray();

            if (empty($employeeIds)) {
                return response()->json(['error' => 'No employees match the current filters.'], 422);
            }

            $request->merge([
                'employee_ids' => $employeeIds,
                'dateFrom'     => $request->input('start_date'),
                'dateTo'       => $request->input('end_date'),
            ]);

            return $this->downloadBulkViolationPDF($request);

        } catch (\Exception $e) {
            \Log::error('Error generating filtered bulk violation PDF', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Error generating PDF: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Mark attendance_violations as 'Letter Sent' for an employee within a date range.
     */
    private function markViolationsLetterSent(int $employeeId, ?string $dateFrom, ?string $dateTo): void
    {
        $query = \App\Models\AttendanceViolation::where('employee_id', $employeeId)
            ->whereNull('dismissed_at');

        if ($dateFrom) {
            $query->where('violation_date', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->where('violation_date', '<=', $dateTo);
        }

        $query->update(['status' => 'Letter Sent']);
    }
    private function generateWordDocument(array $allEmployeeData)
    {
        $phpWord = new \PhpOffice\PhpWord\PhpWord();
        $phpWord->setDefaultFontName('Arial');
        $phpWord->setDefaultFontSize(10);

        // Register named table styles so addRow()/addCell() work reliably
        $phpWord->addTableStyle('ViolationTable', [
            'borderSize'  => 6,
            'borderColor' => 'e2e8f0',
            'cellMargin'  => 60,
        ]);
        $phpWord->addTableStyle('InfoTable', [
            'borderSize'  => 6,
            'borderColor' => 'e2e8f0',
            'cellMargin'  => 60,
        ]);
        $phpWord->addTableStyle('SigTable', [
            'borderSize'  => 0,
            'borderColor' => 'FFFFFF',
            'cellMargin'  => 60,
        ]);

        $headerStyle = ['bold' => true, 'size' => 12, 'allCaps' => true];
        $labelStyle  = ['bold' => true, 'size' => 9, 'color' => '475569'];
        $bodyStyle   = ['size' => 9];
        $redBold     = ['bold' => true, 'color' => 'dc2626', 'size' => 9];
        $sectionHead = ['bold' => true, 'size' => 9, 'color' => '0f172a'];
        $tableHead   = ['bold' => true, 'color' => 'FFFFFF', 'size' => 8];
        $signStyle   = ['bold' => true, 'size' => 9];
        $subStyle    = ['size' => 8, 'color' => '475569'];

        $thCellStyle = ['bgColor' => '1e3a8a'];
        $tdCellStyle = null;
        $tdAltStyle  = ['bgColor' => 'f8fafc'];

        foreach ($allEmployeeData as $index => $emp) {
            $section = $phpWord->addSection([
                'marginTop'    => 720,
                'marginBottom' => 720,
                'marginLeft'   => 1080,
                'marginRight'  => 1080,
            ]);

            // Title
            $titlePara = $section->addParagraph();
            $titlePara->addText('NOTICE OF ATTENDANCE VIOLATIONS', $headerStyle);
            $titlePara->setParagraphStyle(['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'spaceAfter' => 120]);

            // Info block
            $infoTable = $section->addTable(['borderSize' => 6, 'borderColor' => 'e2e8f0', 'cellMargin' => 60, 'bgColor' => 'f8fafc']);
            $infoRows = [
                ['Employee Name:', $emp['employee']['name']],
                ['Employee Code:', $emp['employee']['code']],
                ['Department:',    $emp['employee']['department']],
                ['Period Covered:', ($emp['dateRange']['startFormatted'] ?? '') . ' to ' . ($emp['dateRange']['endFormatted'] ?? '')],
                ['Date Issued:',   $emp['currentDate']],
            ];
            foreach ($infoRows as $row) {
                $tr = $infoTable->addRow();
                $tr->addCell(1800, ['bgColor' => 'f8fafc'])->addText($row[0], $labelStyle);
                $tr->addCell(6000, ['bgColor' => 'f8fafc'])->addText($row[1], $bodyStyle);
            }

            $section->addTextBreak(1);

            // Opening paragraphs
            $p1 = $section->addParagraph();
            $p1->addText('This memorandum is issued to formally notify you of attendance irregularities recorded during the covered period stated below.', $bodyStyle);
            $p1->setParagraphStyle(['spaceAfter' => 80, 'alignment' => \PhpOffice\PhpWord\SimpleType\Jc::BOTH]);

            $p2 = $section->addParagraph();
            $p2->addText('As provided in the company\'s attendance policy, employees are expected to observe proper working hours, maintain punctuality, and complete all required daily time logs. The official start time is ' . $emp['scheduleStartTime'] . '.', $bodyStyle);
            $p2->setParagraphStyle(['spaceAfter' => 80, 'alignment' => \PhpOffice\PhpWord\SimpleType\Jc::BOTH]);

            // Summary chips (inline text)
            $s = $emp['summary'];
            $v = $emp['violations'];
            $summaryParts = [];
            if ($s['totalAbsences'] > 0)   $summaryParts[] = 'Absences: ' . $s['totalAbsences'];
            if ($s['totalLateAM'] > 0)     $summaryParts[] = 'Late AM: ' . $s['totalLateAM'];
            if ($s['totalLatePM'] > 0)     $summaryParts[] = 'Late PM: ' . $s['totalLatePM'];
            if ($s['totalMissedLogs'] > 0) $summaryParts[] = 'Missing Logs: ' . $s['totalMissedLogs'];
            if (($s['totalUndertime'] ?? 0) > 0) $summaryParts[] = 'Undertime: ' . $s['totalUndertime'];

            if (!empty($summaryParts)) {
                $sp = $section->addParagraph();
                $sp->addText(implode('   |   ', $summaryParts), $redBold);
                $sp->setParagraphStyle(['spaceAfter' => 100]);
            }

            // Absences table
            if (count($v['absences']) > 0) {
                $sh = $section->addParagraph();
                $sh->addText('Absences (' . $s['totalAbsences'] . ' ' . ($s['totalAbsences'] == 1 ? 'day' : 'days') . ')', $sectionHead);
                $sh->setParagraphStyle(['spaceAfter' => 60, 'borderBottomSize' => 6, 'borderBottomColor' => 'cbd5e1']);

                $t = $section->addTable($tableStyle);
                $hr = $t->addRow();
                $hr->addCell(2000, $thCellStyle)->addText('Date', $tableHead);
                $hr->addCell(5800, $thCellStyle)->addText('Status', $tableHead);
                foreach ($v['absences'] as $i => $row) {
                    $tr = $t->addRow();
                    $cs = $i % 2 === 1 ? $tdAltStyle : $tdCellStyle;
                    $tr->addCell(2000, $cs)->addText($row['dateFormatted'], $bodyStyle);
                    $tr->addCell(5800, $cs)->addText($row['status'], $bodyStyle);
                }
                $section->addTextBreak(1);
            }

            // Late AM table
            if (count($v['lateAM']) > 0) {
                $sh = $section->addParagraph();
                $sh->addText('Late Arrivals â€” Morning (' . $s['totalLateAM'] . ' ' . ($s['totalLateAM'] == 1 ? 'instance' : 'instances') . ')', $sectionHead);
                $sh->setParagraphStyle(['spaceAfter' => 60, 'borderBottomSize' => 6, 'borderBottomColor' => 'cbd5e1']);

                $t = $section->addTable($tableStyle);
                $hr = $t->addRow();
                $hr->addCell(2000, $thCellStyle)->addText('Date', $tableHead);
                $hr->addCell(1800, $thCellStyle)->addText('Time In', $tableHead);
                $hr->addCell(2000, $thCellStyle)->addText('Late By', $tableHead);
                foreach ($v['lateAM'] as $i => $row) {
                    $tr = $t->addRow();
                    $cs = $i % 2 === 1 ? $tdAltStyle : $tdCellStyle;
                    $tr->addCell(2000, $cs)->addText($row['dateFormatted'], $bodyStyle);
                    $tr->addCell(1800, $cs)->addText($row['timeIn'] ?? 'â€”', $bodyStyle);
                    $tr->addCell(2000, $cs)->addText($row['timeStr'], $bodyStyle);
                }
                $section->addTextBreak(1);
            }

            // Late PM table
            if (count($v['latePM']) > 0) {
                $sh = $section->addParagraph();
                $sh->addText('Late Returns â€” Afternoon (' . $s['totalLatePM'] . ' ' . ($s['totalLatePM'] == 1 ? 'instance' : 'instances') . ')', $sectionHead);
                $sh->setParagraphStyle(['spaceAfter' => 60, 'borderBottomSize' => 6, 'borderBottomColor' => 'cbd5e1']);

                $t = $section->addTable($tableStyle);
                $hr = $t->addRow();
                $hr->addCell(2000, $thCellStyle)->addText('Date', $tableHead);
                $hr->addCell(1800, $thCellStyle)->addText('Time In (PM)', $tableHead);
                $hr->addCell(2000, $thCellStyle)->addText('Late By', $tableHead);
                foreach ($v['latePM'] as $i => $row) {
                    $tr = $t->addRow();
                    $cs = $i % 2 === 1 ? $tdAltStyle : $tdCellStyle;
                    $tr->addCell(2000, $cs)->addText($row['dateFormatted'], $bodyStyle);
                    $tr->addCell(1800, $cs)->addText($row['timeIn'] ?? 'â€”', $bodyStyle);
                    $tr->addCell(2000, $cs)->addText($row['timeStr'], $bodyStyle);
                }
                $section->addTextBreak(1);
            }

            // Missing Logs table
            if (count($v['missedLogs']) > 0) {
                $sh = $section->addParagraph();
                $sh->addText('Missing Biometric Logs (' . $s['totalMissedLogs'] . ' ' . ($s['totalMissedLogs'] == 1 ? 'instance' : 'instances') . ')', $sectionHead);
                $sh->setParagraphStyle(['spaceAfter' => 60, 'borderBottomSize' => 6, 'borderBottomColor' => 'cbd5e1']);

                $t = $section->addTable($tableStyle);
                $hr = $t->addRow();
                $hr->addCell(1600, $thCellStyle)->addText('Date', $tableHead);
                $hr->addCell(1200, $thCellStyle)->addText('AM In', $tableHead);
                $hr->addCell(1200, $thCellStyle)->addText('AM Out', $tableHead);
                $hr->addCell(1200, $thCellStyle)->addText('PM In', $tableHead);
                $hr->addCell(1200, $thCellStyle)->addText('PM Out', $tableHead);
                $hr->addCell(2400, $thCellStyle)->addText('Missing Slots', $tableHead);
                foreach ($v['missedLogs'] as $i => $row) {
                    $tr = $t->addRow();
                    $cs = $i % 2 === 1 ? $tdAltStyle : $tdCellStyle;
                    $tr->addCell(1600, $cs)->addText($row['dateFormatted'], $bodyStyle);
                    $tr->addCell(1200, $cs)->addText($row['timeInAM']    ?? 'â€”', !$row['timeInAM']    ? $redBold : $bodyStyle);
                    $tr->addCell(1200, $cs)->addText($row['timeOutLunch'] ?? 'â€”', !$row['timeOutLunch'] ? $redBold : $bodyStyle);
                    $tr->addCell(1200, $cs)->addText($row['timeInPM']    ?? 'â€”', !$row['timeInPM']    ? $redBold : $bodyStyle);
                    $tr->addCell(1200, $cs)->addText($row['timeOutPM']   ?? 'â€”', !$row['timeOutPM']   ? $redBold : $bodyStyle);
                    $tr->addCell(2400, $cs)->addText(implode(', ', $row['missing']), $redBold);
                }
                $section->addTextBreak(1);
            }

            // Undertime table
            if (count($v['undertime'] ?? []) > 0) {
                $sh = $section->addParagraph();
                $sh->addText('Undertime (' . $s['totalUndertime'] . ' ' . ($s['totalUndertime'] == 1 ? 'instance' : 'instances') . ')', $sectionHead);
                $sh->setParagraphStyle(['spaceAfter' => 60, 'borderBottomSize' => 6, 'borderBottomColor' => 'cbd5e1']);

                $t = $section->addTable($tableStyle);
                $hr = $t->addRow();
                $hr->addCell(2000, $thCellStyle)->addText('Date', $tableHead);
                $hr->addCell(1800, $thCellStyle)->addText('Time Out', $tableHead);
                $hr->addCell(2000, $thCellStyle)->addText('Undertime By', $tableHead);
                foreach ($v['undertime'] as $i => $row) {
                    $tr = $t->addRow();
                    $cs = $i % 2 === 1 ? $tdAltStyle : $tdCellStyle;
                    $tr->addCell(2000, $cs)->addText($row['dateFormatted'], $bodyStyle);
                    $tr->addCell(1800, $cs)->addText($row['timeOut'] ?? 'â€”', $bodyStyle);
                    $tr->addCell(2000, $cs)->addText($row['timeStr'], $bodyStyle);
                }
                $section->addTextBreak(1);
            }

            // Action Required
            $section->addText('Action Required:', ['bold' => true, 'size' => 9]);
            $actionItems = ['Submit a written explanation for each violation category listed above within two (2) business days.'];
            if (count($v['absences']) > 0)
                $actionItems[] = 'For absences, provide supporting documentation (e.g., medical certificate or approved leave form).';
            if (count($v['missedLogs'] ?? []) > 0)
                $actionItems[] = 'For missing biometric logs, attach proof of attendance (supervisor certification, work output, or other verifiable evidence).';
            if (count($v['lateAM']) > 0 || count($v['latePM']) > 0)
                $actionItems[] = 'For late arrivals, explain the reason and commit to a corrective action plan.';
            if (count($v['undertime'] ?? []) > 0)
                $actionItems[] = 'For undertime, secure prior approval for early departures or provide a valid justification.';

            foreach ($actionItems as $num => $item) {
                $ap = $section->addParagraph();
                $ap->addText(($num + 1) . '. ' . $item, $bodyStyle);
                $ap->setParagraphStyle(['indent' => 360, 'spaceAfter' => 40]);
            }

            $section->addTextBreak(1);

            // Closing
            $cp = $section->addParagraph();
            $cp->addText('Failure to comply or repeated violations may result in further disciplinary action in accordance with company policy.', $bodyStyle);
            $cp->setParagraphStyle(['spaceAfter' => 200, 'alignment' => \PhpOffice\PhpWord\SimpleType\Jc::BOTH]);

            // Signatures
            $sigTable = $section->addTable(['borderSize' => 0, 'borderColor' => 'FFFFFF', 'cellMargin' => 60]);
            $sr = $sigTable->addRow();
            $leftCell  = $sr->addCell(3800);
            $rightCell = $sr->addCell(3800);

            $leftCell->addText('Prepared by:', $subStyle);
            $leftCell->addText('', $bodyStyle);
            $leftCell->addText('', $bodyStyle);
            $leftCell->addText('MARK LESTER M. TO-ONG', $signStyle);
            $leftCell->addText('Operations Manager', $subStyle);

            $rightCell->addText('Acknowledged by:', $subStyle);
            $rightCell->addText('', $bodyStyle);
            $rightCell->addText('', $bodyStyle);
            $rightCell->addText($emp['employee']['name'], $signStyle);
            $rightCell->addText('Employee     Date: ___________________', $subStyle);
        }

        $filename = 'Violation_Letters_' . Carbon::now()->format('Y-m-d') . '.docx';
        $tempPath = tempnam(sys_get_temp_dir(), 'violation_') . '.docx';

        $writer = \PhpOffice\PhpWord\IOFactory::createWriter($phpWord, 'Word2007');
        $writer->save($tempPath);

        return response()->download($tempPath, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Build sectioned violation data: absences, lateAM, latePM, missedLogs.
     * Used by the formal letter template.
     */
    private function buildSectionedViolations($records): array
    {
        $absences   = [];
        $lateAM     = [];
        $latePM     = [];
        $missedLogs = [];
        $undertime  = [];

        foreach ($records as $record) {
            $status = $record->status ?? '';
            $date   = $record->attendance_date;

            if (str_contains($status, 'Absent') || str_contains($status, 'Half Day')) {
                $absences[] = [
                    'date'          => $date->format('Y-m-d'),
                    'dateFormatted' => $date->format('F j, Y'),
                    'status'        => $status,
                ];
            }

            if ($record->late_minutes_am > 0) {
                $h = intdiv($record->late_minutes_am, 60);
                $m = $record->late_minutes_am % 60;
                $lateAM[] = [
                    'date'          => $date->format('Y-m-d'),
                    'dateFormatted' => $date->format('F j, Y'),
                    'minutes'       => $record->late_minutes_am,
                    'timeStr'       => ($h > 0 ? "{$h} hour" . ($h > 1 ? 's' : '') . " {$m} minute" . ($m != 1 ? 's' : '') : "{$m} minute" . ($m != 1 ? 's' : '')),
                    'timeIn'        => $record->time_in_am ? substr($record->time_in_am, 0, 8) : null,
                ];
            }

            if ($record->late_minutes_pm > 0) {
                $h = intdiv($record->late_minutes_pm, 60);
                $m = $record->late_minutes_pm % 60;
                $latePM[] = [
                    'date'          => $date->format('Y-m-d'),
                    'dateFormatted' => $date->format('F j, Y'),
                    'minutes'       => $record->late_minutes_pm,
                    'timeStr'       => ($h > 0 ? "{$h} hour" . ($h > 1 ? 's' : '') . " {$m} minute" . ($m != 1 ? 's' : '') : "{$m} minute" . ($m != 1 ? 's' : '')),
                    'timeIn'        => $record->time_in_pm ? substr($record->time_in_pm, 0, 8) : null,
                ];
            }

            if ($record->missed_logs_count > 0) {
                $missing = [];
                if (!$record->time_in_am)    $missing[] = 'Time In AM';
                if (!$record->time_out_lunch) $missing[] = 'Time Out Lunch';
                if (!$record->time_in_pm)    $missing[] = 'Time In PM';
                if (!$record->time_out_pm)   $missing[] = 'Time Out PM';

                $missedLogs[] = [
                    'date'          => $date->format('Y-m-d'),
                    'dateFormatted' => $date->format('F j, Y'),
                    'count'         => $record->missed_logs_count,
                    'missing'       => $missing,
                    'timeInAM'      => $record->time_in_am    ? substr($record->time_in_am, 0, 8)    : null,
                    'timeOutLunch'  => $record->time_out_lunch ? substr($record->time_out_lunch, 0, 8) : null,
                    'timeInPM'      => $record->time_in_pm    ? substr($record->time_in_pm, 0, 8)    : null,
                    'timeOutPM'     => $record->time_out_pm   ? substr($record->time_out_pm, 0, 8)   : null,
                ];
            }

            if ($record->undertime_minutes > 0) {
                $h = intdiv($record->undertime_minutes, 60);
                $m = $record->undertime_minutes % 60;
                $undertime[] = [
                    'date'          => $date->format('Y-m-d'),
                    'dateFormatted' => $date->format('F j, Y'),
                    'minutes'       => $record->undertime_minutes,
                    'timeStr'       => ($h > 0 ? "{$h} hour" . ($h > 1 ? 's' : '') . " {$m} minute" . ($m != 1 ? 's' : '') : "{$m} minute" . ($m != 1 ? 's' : '')),
                    'timeOut'       => $record->time_out_pm ? substr($record->time_out_pm, 0, 8) : null,
                ];
            }
        }

        return compact('absences', 'lateAM', 'latePM', 'missedLogs', 'undertime');
    }

    /**
     * Build summary counts for the letter header.
     */
    private function buildViolationSummary($records): array
    {
        $totalAbsences = 0;
        foreach ($records as $r) {
            $s = $r->status ?? '';
            if (str_contains($s, 'Absent'))   $totalAbsences++;
            elseif (str_contains($s, 'Half Day')) $totalAbsences += 0.5;
        }

        return [
            'totalAbsences'   => $totalAbsences,
            'totalLateAM'     => $records->filter(fn($r) => $r->late_minutes_am > 0)->count(),
            'totalLatePM'     => $records->filter(fn($r) => $r->late_minutes_pm > 0)->count(),
            'totalMissedLogs' => $records->filter(fn($r) => $r->missed_logs_count > 0)->count(),
            'totalUndertime'  => $records->filter(fn($r) => $r->undertime_minutes > 0)->count(),
        ];
    }

    /**
     * Build one row per violation day for the compact evidence table.
     * Only days that have at least one issue are included.
     */
    private function buildViolationRows($records): array
    {
        $rows = [];

        foreach ($records as $record) {
            $status = $record->status ?? '';

            $isAbsent    = str_contains($status, 'Absent');
            $isLateAM    = $record->late_minutes_am > 0;
            $isLatePM    = $record->late_minutes_pm > 0;
            $isMissed    = $record->missed_logs_count > 0;
            $isUndertime = $record->undertime_minutes > 0;

            // Skip clean days
            if (!$isAbsent && !$isLateAM && !$isLatePM && !$isMissed && !$isUndertime) {
                continue;
            }

            // Format a time value as HH:mm:ss or â€” if null
            $fmt = fn($t) => $t ? substr($t, 0, 8) : 'â€”';

            // Build remarks list
            $remarks = [];

            if ($isAbsent) {
                $remarks[] = 'No logs for workday';
            }
            if ($isLateAM) {
                $h = intdiv($record->late_minutes_am, 60);
                $m = $record->late_minutes_am % 60;
                $remarks[] = 'Late AM by ' . ($h > 0 ? "{$h}h " : '') . "{$m}m";
            }
            if ($isLatePM) {
                $h = intdiv($record->late_minutes_pm, 60);
                $m = $record->late_minutes_pm % 60;
                $remarks[] = 'Late PM by ' . ($h > 0 ? "{$h}h " : '') . "{$m}m";
            }
            if ($isMissed) {
                // Identify which specific slots are missing
                $missing = [];
                if (!$record->time_in_am)     $missing[] = 'AM IN';
                if (!$record->time_out_lunch)  $missing[] = 'AM OUT';
                if (!$record->time_in_pm)      $missing[] = 'PM IN';
                if (!$record->time_out_pm)     $missing[] = 'PM OUT';
                $remarks[] = 'Missing ' . implode(', ', $missing);
            }
            if ($isUndertime) {
                $h = intdiv($record->undertime_minutes, 60);
                $m = $record->undertime_minutes % 60;
                $remarks[] = 'Undertime by ' . ($h > 0 ? "{$h}h " : '') . "{$m}m";
            }

            $rows[] = [
                'date'        => $record->attendance_date->format('m/d/Y'),
                'time_in_am'  => $fmt($record->time_in_am),
                'time_out_am' => $fmt($record->time_out_lunch),
                'time_in_pm'  => $fmt($record->time_in_pm),
                'time_out_pm' => $fmt($record->time_out_pm),
                'violation'   => $status ?: 'Unknown',
                'remarks'     => implode('; ', $remarks),
            ];
        }

        return $rows;
    }

    /**
     * Update an attendance record with audit logging.
     * Admin edits time fields only â€” status and computed fields are recalculated automatically.
     */
    public function updateRecord(Request $request, int $recordId)
    {
        $request->validate([
            'time_in_am'         => 'nullable|date_format:H:i:s',
            'time_out_lunch'     => 'nullable|date_format:H:i:s',
            'time_in_pm'         => 'nullable|date_format:H:i:s',
            'time_out_pm'        => 'nullable|date_format:H:i:s',
            'notes'              => 'nullable|string|max:500',
            'adjustment_reason'  => 'required|string|max:500',
        ]);

        // Treat "00:00:00" as null â€” it is not a valid attendance time
        $nullIfMidnight = fn(?string $t) => ($t === '00:00:00' || $t === '') ? null : $t;

        $timeInAm    = $nullIfMidnight($request->time_in_am);
        $timeOutLunch= $nullIfMidnight($request->time_out_lunch);
        $timeInPm    = $nullIfMidnight($request->time_in_pm);
        $timeOutPm   = $nullIfMidnight($request->time_out_pm);

        try {
            $record = \App\Models\AttendanceRecord::with('schedule')->findOrFail($recordId);

            // Validate chronological order for provided times
            $provided = array_filter(
                [$timeInAm, $timeOutLunch, $timeInPm, $timeOutPm],
                fn($v) => $v !== null
            );
            $vals = array_values($provided);
            for ($i = 0; $i < count($vals) - 1; $i++) {
                if ($vals[$i] >= $vals[$i + 1]) {
                    return response()->json(['error' => 'Times must be in chronological order'], 422);
                }
            }

            $schedule = $record->schedule;
            $date     = $record->attendance_date->format('Y-m-d');

            // â”€â”€ Recalculate all computed fields from the new times â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            $lateAm    = 0;
            $latePm    = 0;
            $undertime = 0;
            $overtime  = 0;

            if ($schedule) {
                $graceMins = ($schedule->grace_period_enabled ?? true)
                    ? ($schedule->grace_period_minutes ?? 15) : 0;

                // Late AM
                if ($timeInAm) {
                    $startTime = \Carbon\Carbon::parse($date . ' ' . $schedule->work_start_time);
                    $actualIn  = \Carbon\Carbon::parse($date . ' ' . $timeInAm);
                    if ($actualIn->gt($startTime->copy()->addMinutes($graceMins))) {
                        $lateAm = max(0, (int) $startTime->diffInMinutes($actualIn));
                    }
                }

                // Late PM
                if ($timeInPm) {
                    $breakEnd   = \Carbon\Carbon::parse($date . ' ' . $schedule->break_end_time);
                    $actualPmIn = \Carbon\Carbon::parse($date . ' ' . $timeInPm);
                    if ($actualPmIn->gt($breakEnd->copy()->addMinutes($graceMins))) {
                        $latePm = max(0, (int) $breakEnd->diffInMinutes($actualPmIn));
                    }
                }

                // Undertime (afternoon out)
                if ($timeOutPm && ($schedule->undertime_enabled ?? true)) {
                    $endTime   = \Carbon\Carbon::parse($date . ' ' . $schedule->work_end_time);
                    $allowance = $schedule->undertime_allowance_minutes ?? 5;
                    $actualOut = \Carbon\Carbon::parse($date . ' ' . $timeOutPm);
                    if ($actualOut->lt($endTime->copy()->subMinutes($allowance))) {
                        $undertime = max(0, (int) $endTime->diffInMinutes($actualOut));
                    }
                }

                // Overtime (must be 1+ hour past end time)
                if ($timeOutPm) {
                    $endTime   = \Carbon\Carbon::parse($date . ' ' . $schedule->work_end_time);
                    $actualOut = \Carbon\Carbon::parse($date . ' ' . $timeOutPm);
                    if ($actualOut->gt($endTime->copy()->addHour())) {
                        $overtime = max(0, (int) $endTime->diffInMinutes($actualOut));
                    }
                }
            }

            // Missed logs count: count how many of the 4 slots are null
            $missedLogs = collect([$timeInAm, $timeOutLunch, $timeInPm, $timeOutPm])
                ->filter(fn($v) => $v === null)->count();

            // Determine rendered (workday credit)
            $hasMorning   = $timeInAm !== null;
            $hasAfternoon = $timeOutPm !== null;
            if ($hasMorning && $hasAfternoon) {
                $rendered = 1.0;
            } elseif ($hasMorning || $hasAfternoon) {
                $rendered = 0.5;
            } else {
                $rendered = 0.0;
            }

            // Derive status automatically
            $statuses = [];
            if ($rendered === 0.0) {
                $statuses[] = 'Absent';
            } else {
                if ($missedLogs > 0)  $statuses[] = 'Missed Log';
                if ($rendered === 0.5) $statuses[] = 'Half Day';
                if ($lateAm > 0 || $latePm > 0) $statuses[] = 'Late';
                if ($undertime > 0)   $statuses[] = 'Undertime';
                if (empty($statuses)) $statuses[] = 'Present';
            }
            $status = implode(', ', $statuses);

            // â”€â”€ Build update payload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            $updateData = [
                'time_in_am'       => $timeInAm,
                'time_out_lunch'   => $timeOutLunch,
                'time_in_pm'       => $timeInPm,
                'time_out_pm'      => $timeOutPm,
                'late_minutes_am'  => $lateAm,
                'late_minutes_pm'  => $latePm,
                'undertime_minutes'=> $undertime,
                'overtime_minutes' => $overtime,
                'missed_logs_count'=> $missedLogs,
                'rendered'         => $rendered,
                'status'           => $status,
                'notes'            => $request->notes,
                'reviewed_by'      => auth()->id(),
                'reviewed_at'      => now(),
            ];

            // â”€â”€ Audit trail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            $trackedFields = ['time_in_am', 'time_out_lunch', 'time_in_pm', 'time_out_pm', 'notes'];
            $changes = [];
            foreach ($trackedFields as $field) {
                $newVal = $updateData[$field] ?? null;
                $oldVal = $record->{$field};
                if ($newVal !== $oldVal) {
                    $changes[] = [
                        'attendance_record_id' => $record->id,
                        'field_name'  => $field,
                        'old_value'   => $oldVal,
                        'new_value'   => $newVal,
                        'reason'      => $request->adjustment_reason,
                        'changed_by'  => auth()->id(),
                        'created_at'  => now(),
                        'updated_at'  => now(),
                    ];
                }
            }

            $record->update($updateData);

            if (!empty($changes)) {
                \App\Models\AttendanceRecordChange::insert($changes);
            }

            $fresh = $record->fresh();

            return response()->json([
                'success' => true,
                'message' => 'Attendance record updated successfully',
                'record'  => array_merge($fresh->toArray(), [
                    // Ensure attendance_date is always a plain YYYY-MM-DD string,
                    // not a full ISO datetime, so the frontend date display works correctly.
                    'attendance_date' => $fresh->attendance_date->format('Y-m-d'),
                ]),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'Attendance record not found'], 404);
        } catch (\Exception $e) {
            \Log::error('Error updating attendance record', ['record_id' => $recordId, 'error' => $e->getMessage()]);
            return response()->json(['error' => 'Error updating record: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get change history for an attendance record
     */
    public function getChangeHistory(int $recordId)
    {
        try {
            $record = \App\Models\AttendanceRecord::findOrFail($recordId);
            
            $changes = \App\Models\AttendanceRecordChange::where('attendance_record_id', $recordId)
                ->with('changedBy')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($change) {
                    return [
                        'id' => $change->id,
                        'field_name' => $change->field_name,
                        'old_value' => $change->old_value,
                        'new_value' => $change->new_value,
                        'reason' => $change->reason,
                        'changed_by' => $change->changedBy ? [
                            'id' => $change->changedBy->id,
                            'name' => $change->changedBy->name,
                        ] : null,
                        'created_at' => $change->created_at->format('Y-m-d H:i:s'),
                        'created_at_formatted' => $change->created_at->format('F j, Y \a\t g:i A'),
                    ];
                });

            return response()->json([
                'success' => true,
                'changes' => $changes,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'Attendance record not found'
            ], 404);
        } catch (\Exception $e) {
            \Log::error('Error fetching change history', [
                'record_id' => $recordId,
                'error' => $e->getMessage(),
            ]);
            
            return response()->json([
                'error' => 'Error fetching change history'
            ], 500);
        }
    }

    /**
     * Override overtime for an attendance record manually.
     * Supports overnight overtime: start 20:00:00 on the record date, end 06:00:00 next day.
     */
    public function overrideOvertime(Request $request, int $recordId)
    {
        $request->validate([
            'overtime_start'    => 'required|string|regex:/^\d{2}:\d{2}:\d{2}$/',
            'overtime_end'      => 'required|string|regex:/^\d{2}:\d{2}:\d{2}$/',
            'is_overnight'      => 'boolean',
            'adjustment_reason' => 'required|string|min:3',
        ]);

        try {
            $record = \App\Models\AttendanceRecord::findOrFail($recordId);
            $date   = $record->attendance_date->format('Y-m-d');

            $start       = \Carbon\Carbon::parse($date . ' ' . $request->overtime_start);
            $isOvernight = (bool) ($request->is_overnight ?? false);

            if ($isOvernight) {
                $nextDay = $record->attendance_date->copy()->addDay()->format('Y-m-d');
                $end     = \Carbon\Carbon::parse($nextDay . ' ' . $request->overtime_end);
            } else {
                $end = \Carbon\Carbon::parse($date . ' ' . $request->overtime_end);
            }

            if ($end->lte($start)) {
                return response()->json(['error' => 'Overtime end must be after overtime start'], 422);
            }

            $overtimeMinutes = (int) $start->diffInMinutes($end);
            $oldOvertime     = $record->overtime_minutes;

            $record->update([
                'overtime_minutes' => $overtimeMinutes,
                'reviewed_by'      => auth()->id(),
                'reviewed_at'      => now(),
            ]);

            \App\Models\AttendanceRecordChange::insert([
                'attendance_record_id' => $record->id,
                'field_name'           => 'overtime_minutes',
                'old_value'            => (string) $oldOvertime,
                'new_value'            => (string) $overtimeMinutes,
                'reason'               => $request->adjustment_reason,
                'changed_by'           => auth()->id(),
                'created_at'           => now(),
                'updated_at'           => now(),
            ]);

            $fresh = $record->fresh();

            return response()->json([
                'success'          => true,
                'message'          => "Overtime overridden: {$overtimeMinutes} minutes",
                'overtime_minutes' => $overtimeMinutes,
                'record'           => array_merge($fresh->toArray(), [
                    'attendance_date' => $fresh->attendance_date->format('Y-m-d'),
                ]),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'Attendance record not found'], 404);
        } catch (\Exception $e) {
            \Log::error('Error overriding overtime', ['record_id' => $recordId, 'error' => $e->getMessage()]);
            return response()->json(['error' => 'Error overriding overtime: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Return raw attendance logs for a specific employee on a specific date.
     * Used by the inline edit row to show the original biometric entries.
     */
    public function getRawLogsForDate(Request $request)
    {
        $request->validate([
            'employee_code' => 'required|string',
            'date'          => 'required|date',
        ]);

        $logs = \App\Models\AttendanceLog::where('employee_code', $request->employee_code)
            ->whereDate('log_datetime', $request->date)
            ->orderBy('log_datetime')
            ->get(['log_datetime', 'log_type', 'location']);

        return response()->json([
            'logs' => $logs->map(fn($l) => [
                'time'     => $l->log_datetime->format('H:i:s'),
                'type'     => strtoupper($l->log_type),
                'location' => $l->location,
            ]),
        ]);
    }
    public function deleteUpload(string $sourceFile)
    {
        $sourceFile = urldecode($sourceFile);

        $meta = \App\Models\AttendanceLog::where('source_file', $sourceFile)
            ->selectRaw('MIN(DATE(log_datetime)) as date_from, MAX(DATE(log_datetime)) as date_to')
            ->first();

        \App\Models\AttendanceLog::where('source_file', $sourceFile)->delete();

        // After deleting the logs, remove any attendance_records whose date
        // no longer has ANY logs remaining (from any file) for that employee.
        // Payroll records are intentionally NOT deleted â€” once payroll is generated
        // it is a financial record independent of the source attendance file.
        if ($meta?->date_from && $meta?->date_to) {
            $orphaned = \App\Models\AttendanceRecord::whereBetween('attendance_date', [$meta->date_from, $meta->date_to])
                ->get()
                ->filter(function ($record) {
                    return !\App\Models\AttendanceLog::where('employee_code', function ($q) use ($record) {
                            $q->select('employee_code')
                              ->from('employees')
                              ->where('id', $record->employee_id)
                              ->limit(1);
                        })
                        ->whereDate('log_datetime', $record->attendance_date)
                        ->exists();
                })
                ->pluck('id');

            if ($orphaned->isNotEmpty()) {
                \App\Models\AttendanceRecord::whereIn('id', $orphaned)->delete();
            }
        }

        return redirect()->route('admin.attendance.index')
            ->with('success', "File \"{$sourceFile}\" and its associated records have been deleted.");
    }

    /**
     * Check if deleting a file would affect an already-generated payroll period.
     * Returns a warning if overlap exists â€” used by the frontend before confirming delete.
     */
    public function checkDeleteImpact(string $sourceFile)
    {
        $sourceFile = urldecode($sourceFile);

        $meta = \App\Models\AttendanceLog::where('source_file', $sourceFile)
            ->selectRaw('MIN(DATE(log_datetime)) as date_from, MAX(DATE(log_datetime)) as date_to')
            ->first();

        if (!$meta?->date_from) {
            return response()->json(['has_payroll' => false]);
        }

        $overlapping = \App\Models\PayrollPeriod::where(function ($q) use ($meta) {
                $q->whereBetween('start_date', [$meta->date_from, $meta->date_to])
                  ->orWhereBetween('end_date', [$meta->date_from, $meta->date_to])
                  ->orWhere(function ($q2) use ($meta) {
                      $q2->where('start_date', '<=', $meta->date_from)
                         ->where('end_date', '>=', $meta->date_to);
                  });
            })
            ->with('department')
            ->get(['id', 'department_id', 'start_date', 'end_date', 'status']);

        return response()->json([
            'has_payroll' => $overlapping->isNotEmpty(),
            'periods' => $overlapping->map(fn($p) => [
                'id'         => $p->id,
                'department' => $p->department->name ?? 'â€”',
                'start_date' => $p->start_date,
                'end_date'   => $p->end_date,
                'status'     => $p->status,
            ]),
        ]);
    }

    /**
     * Validate attendance records before payroll generation
     */
    public function validateForPayroll(Request $request)
    {
        $request->validate([
            'payroll_period_id' => 'nullable|integer',
            'employee_ids' => 'nullable|array',
            'employee_ids.*' => 'integer',
        ]);

        try {
            $query = \App\Models\AttendanceRecord::query();

            // Filter by employees if provided
            if ($request->filled('employee_ids')) {
                $query->whereIn('employee_id', $request->employee_ids);
            }

            $records = $query->get();
            $issues = [];

            foreach ($records as $record) {
                // Check for missing critical times
                if ($record->status !== 'Absent' && $record->status !== 'Half Day - Absent') {
                    if (!$record->time_in_am) {
                        $issues[] = [
                            'record_id' => $record->id,
                            'employee_id' => $record->employee_id,
                            'date' => $record->attendance_date->format('Y-m-d'),
                            'issue_type' => 'missing_time_in_am',
                            'message' => 'Missing morning in time',
                        ];
                    }
                    if (!$record->time_out_pm) {
                        $issues[] = [
                            'record_id' => $record->id,
                            'employee_id' => $record->employee_id,
                            'date' => $record->attendance_date->format('Y-m-d'),
                            'issue_type' => 'missing_time_out_pm',
                            'message' => 'Missing afternoon out time',
                        ];
                    }
                }

                // Check for invalid rendered value
                if ($record->rendered < 0 || $record->rendered > 1) {
                    $issues[] = [
                        'record_id' => $record->id,
                        'employee_id' => $record->employee_id,
                        'date' => $record->attendance_date->format('Y-m-d'),
                        'issue_type' => 'invalid_rendered',
                        'message' => 'Invalid rendered hours value',
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'valid' => empty($issues),
                'issues' => $issues,
                'total_records' => $records->count(),
                'records_with_issues' => count($issues),
            ]);
        } catch (\Exception $e) {
            \Log::error('Error validating records for payroll', [
                'error' => $e->getMessage(),
            ]);
            
            return response()->json([
                'error' => 'Error validating records'
            ], 500);
        }
    }
}
