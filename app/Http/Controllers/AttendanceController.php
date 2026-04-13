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
            
            // Store temporarily, parse into attendance_logs only — no processing
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
            \Log::error('Error processing file', ['source_file' => $sourceFile, 'error' => $e->getMessage()]);
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
            'dateFrom' => 'nullable|date',
            'dateTo' => 'nullable|date|after_or_equal:dateFrom',
        ]);

        try {
            $employee = \App\Models\Employee::with('department')->findOrFail($employeeId);
            
            $query = \App\Models\AttendanceRecord::where('employee_id', $employeeId);
            
            if ($request->dateFrom) {
                $query->where('attendance_date', '>=', $request->dateFrom);
            }
            
            if ($request->dateTo) {
                $query->where('attendance_date', '<=', $request->dateTo);
            }
            
            $records = $query->orderBy('attendance_date')->get();
            $violations = $this->calculateViolations($records);
            $summary = $this->calculateSummary($records);
            
            $startDate = $request->dateFrom ?? $records->min('attendance_date');
            $endDate = $request->dateTo ?? $records->max('attendance_date');
            
            $data = [
                'employee' => [
                    'code' => $employee->employee_code,
                    'name' => $employee->first_name . ' ' . $employee->last_name,
                    'department' => $employee->department->name ?? 'N/A',
                ],
                'dateRange' => [
                    'startFormatted' => $startDate ? Carbon::parse($startDate)->format('F j, Y') : null,
                    'endFormatted' => $endDate ? Carbon::parse($endDate)->format('F j, Y') : null,
                ],
                'violations' => $violations,
                'summary' => $summary,
                'currentDate' => Carbon::now()->format('F j, Y'),
            ];
            
            // Generate PDF using dompdf
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.violation-letter', $data);
            
            // Set paper size to A4
            $pdf->setPaper('A4', 'portrait');
            
            // Generate filename
            $filename = 'Violation_Letter_' . $employee->employee_code . '_' . Carbon::now()->format('Y-m-d') . '.pdf';
            
            // Download the PDF
            return $pdf->download($filename);
                
        } catch (\Exception $e) {
            \Log::error('Error generating violation PDF', [
                'employee_id' => $employeeId,
                'error' => $e->getMessage(),
            ]);
            
            return response()->json([
                'error' => 'Error generating PDF'
            ], 500);
        }
    }

    /**
     * Update an attendance record with audit logging
     */
    public function updateRecord(Request $request, int $recordId)
    {
        $request->validate([
            'time_in_am'    => 'nullable|date_format:H:i',
            'time_out_lunch'=> 'nullable|date_format:H:i',
            'time_in_pm'    => 'nullable|date_format:H:i',
            'time_out_pm'   => 'nullable|date_format:H:i',
            'rendered'      => 'nullable|numeric|min:0|max:1',
            'status'        => 'nullable|string',
            'notes'         => 'nullable|string|max:500',
            'reason'        => 'nullable|string|max:500',
        ]);

        try {
            $record = \App\Models\AttendanceRecord::with('schedule')->findOrFail($recordId);

            // Validate chronological order when all times are provided
            $times = array_filter([
                $request->time_in_am,
                $request->time_out_lunch,
                $request->time_in_pm,
                $request->time_out_pm,
            ]);
            $timeValues = array_values($times);
            for ($i = 0; $i < count($timeValues) - 1; $i++) {
                if ($timeValues[$i] >= $timeValues[$i + 1]) {
                    return response()->json(['error' => 'Times must be in chronological order'], 422);
                }
            }

            // Build update data from request
            $editableFields = ['time_in_am', 'time_out_lunch', 'time_in_pm', 'time_out_pm', 'rendered', 'status', 'notes'];
            $updateData = array_filter($request->only($editableFields), fn($v) => $v !== null);

            // Recalculate late/undertime if any time fields changed
            $timeFields = ['time_in_am', 'time_out_lunch', 'time_in_pm', 'time_out_pm'];
            $timesChanged = collect($timeFields)->some(fn($f) => $request->has($f));

            if ($timesChanged && $record->schedule) {
                $schedule = $record->schedule;
                $date = $record->attendance_date->format('Y-m-d');

                $timeInAm   = $request->time_in_am    ?? $record->time_in_am;
                $timeInPm   = $request->time_in_pm     ?? $record->time_in_pm;
                $timeOutPm  = $request->time_out_pm    ?? $record->time_out_pm;

                // Recalculate late AM
                $lateAm = 0;
                if ($timeInAm) {
                    $startTime  = \Carbon\Carbon::parse($date . ' ' . $schedule->work_start_time);
                    $graceMins  = ($schedule->grace_period_enabled ?? true) ? ($schedule->grace_period_minutes ?? 15) : 0;
                    $graceTime  = $startTime->copy()->addMinutes($graceMins);
                    $actualIn   = \Carbon\Carbon::parse($date . ' ' . $timeInAm);
                    if ($actualIn->gt($graceTime)) {
                        $lateAm = $startTime->diffInMinutes($actualIn);
                    }
                }

                // Recalculate late PM
                $latePm = 0;
                if ($timeInPm) {
                    $breakEnd   = \Carbon\Carbon::parse($date . ' ' . $schedule->break_end_time);
                    $actualPmIn = \Carbon\Carbon::parse($date . ' ' . $timeInPm);
                    if ($actualPmIn->gt($breakEnd->copy()->addMinute())) {
                        $latePm = $breakEnd->diffInMinutes($actualPmIn);
                    }
                }

                // Recalculate undertime
                $undertime = 0;
                if ($timeOutPm && ($schedule->undertime_enabled ?? true)) {
                    $endTime    = \Carbon\Carbon::parse($date . ' ' . $schedule->work_end_time);
                    $allowance  = $schedule->undertime_allowance_minutes ?? 5;
                    $actualOut  = \Carbon\Carbon::parse($date . ' ' . $timeOutPm);
                    if ($actualOut->lt($endTime->copy()->subMinutes($allowance))) {
                        $undertime = $endTime->diffInMinutes($actualOut);
                    }
                }

                $updateData['late_minutes_am']  = $lateAm;
                $updateData['late_minutes_pm']  = $latePm;
                $updateData['undertime_minutes'] = $undertime;
            }

            // Track changes for audit trail
            $changes = [];
            foreach ($editableFields as $field) {
                if (isset($updateData[$field]) && $updateData[$field] != $record->{$field}) {
                    $changes[] = [
                        'attendance_record_id' => $record->id,
                        'field_name'  => $field,
                        'old_value'   => $record->{$field},
                        'new_value'   => $updateData[$field],
                        'reason'      => $request->reason,
                        'changed_by'  => auth()->id(),
                        'created_at'  => now(),
                        'updated_at'  => now(),
                    ];
                }
            }

            $updateData['reviewed_by'] = auth()->id();
            $updateData['reviewed_at'] = now();
            $record->update($updateData);

            if (!empty($changes)) {
                \App\Models\AttendanceRecordChange::insert($changes);
            }

            return response()->json([
                'success' => true,
                'message' => 'Attendance record updated successfully',
                'record'  => $record->fresh(),
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
     * Delete all logs for a given source file and clean up orphaned attendance records.
     */
    public function deleteUpload(string $sourceFile)
    {
        $sourceFile = urldecode($sourceFile);

        $meta = \App\Models\AttendanceLog::where('source_file', $sourceFile)
            ->selectRaw('MIN(DATE(log_datetime)) as date_from, MAX(DATE(log_datetime)) as date_to')
            ->first();

        \App\Models\AttendanceLog::where('source_file', $sourceFile)->delete();

        // After deleting the logs, remove any attendance_records whose date
        // no longer has ANY logs remaining (from any file) for that employee.
        // Payroll records are intentionally NOT deleted — once payroll is generated
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
     * Returns a warning if overlap exists — used by the frontend before confirming delete.
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
                'department' => $p->department->name ?? '—',
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
