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
        // Increase execution time for large CSV uploads
        set_time_limit(300); // 5 minutes
        ini_set('max_execution_time', 300);
        
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:10240', // 10MB max
        ]);

        try {
            $file = $request->file('file');
            $originalName = $file->getClientOriginalName();
            
            // Store file temporarily
            $path = $file->storeAs('temp', uniqid() . '_' . $originalName);
            $fullPath = Storage::path($path);

            // Process CSV
            $uploadResults = $this->service->processCsvFile($fullPath, $originalName);

            // Clean up temp file
            Storage::delete($path);

            // Automatically process logs if upload was successful
            $processResults = null;
            if ($uploadResults['success'] > 0) {
                try {
                    // Get date range from ONLY the newly uploaded CSV (performance optimization)
                    $dateRange = $this->service->getNewlyUploadedLogsDateRange($originalName);
                    
                    \Log::info('Date range for processing (from new CSV only)', $dateRange);
                    
                    if ($dateRange['start'] && $dateRange['end']) {
                        $processResults = $this->service->processLogsToRecords(
                            Carbon::parse($dateRange['start']),
                            Carbon::parse($dateRange['end'])
                        );
                        
                        \Log::info('Process results', $processResults);
                    } else {
                        \Log::warning('No date range found for processing');
                    }
                } catch (\Exception $e) {
                    \Log::error('Error processing logs to records', [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                    ]);
                }
            }

            // Get updated summary
            $summary = $this->service->getAttendanceSummary();

            // Detect date gaps after processing
            $gapInfo = $this->service->detectDateGaps();

            return Inertia::render('Attendance/Records', [
                'attendanceSummary' => $summary,
                'flash' => [
                    'success' => [
                        'message' => 'CSV uploaded and processed successfully',
                        'uploadResults' => $uploadResults,
                        'processResults' => $processResults,
                    ],
                    'gapInfo' => $gapInfo, // Include gap info in flash message
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in storeUpload', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return back()->withErrors([
                'file' => 'Error processing file: ' . $e->getMessage(),
            ]);
        }
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

        return Inertia::render('Attendance/Records', [
            'attendanceSummary' => $summary,
            'dateRange' => $dateRange,
            'gapInfo' => $gapInfo,
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
            'time_in_am' => 'nullable|date_format:H:i',
            'time_out_lunch' => 'nullable|date_format:H:i',
            'time_in_pm' => 'nullable|date_format:H:i',
            'time_out_pm' => 'nullable|date_format:H:i',
            'rendered' => 'nullable|numeric|min:0|max:1',
            'status' => 'nullable|string',
            'notes' => 'nullable|string|max:500',
            'reason' => 'nullable|string|max:500',
        ]);

        try {
            $record = \App\Models\AttendanceRecord::findOrFail($recordId);
            
            // Validate time chronological order if all times are provided
            if ($request->filled(['time_in_am', 'time_out_lunch', 'time_in_pm', 'time_out_pm'])) {
                $times = [
                    $request->time_in_am,
                    $request->time_out_lunch,
                    $request->time_in_pm,
                    $request->time_out_pm,
                ];
                
                for ($i = 0; $i < count($times) - 1; $i++) {
                    if ($times[$i] >= $times[$i + 1]) {
                        return response()->json([
                            'error' => 'Times must be in chronological order'
                        ], 422);
                    }
                }
            }

            // Track changes for audit trail
            $changes = [];
            $editableFields = ['time_in_am', 'time_out_lunch', 'time_in_pm', 'time_out_pm', 'rendered', 'status', 'notes'];
            
            foreach ($editableFields as $field) {
                if ($request->has($field) && $request->filled($field)) {
                    $oldValue = $record->{$field};
                    $newValue = $request->{$field};
                    
                    if ($oldValue != $newValue) {
                        $changes[] = [
                            'field_name' => $field,
                            'old_value' => $oldValue,
                            'new_value' => $newValue,
                            'reason' => $request->reason,
                            'changed_by' => auth()->id(),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }
                }
            }

            // Update the record
            $updateData = $request->only($editableFields);
            $updateData['reviewed_by'] = auth()->id();
            $updateData['reviewed_at'] = now();
            
            $record->update($updateData);

            // Log all changes to audit trail
            if (!empty($changes)) {
                \App\Models\AttendanceRecordChange::insert($changes);
            }

            return response()->json([
                'success' => true,
                'message' => 'Attendance record updated successfully',
                'record' => $record->load('reviewer', 'changes'),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'Attendance record not found'
            ], 404);
        } catch (\Exception $e) {
            \Log::error('Error updating attendance record', [
                'record_id' => $recordId,
                'error' => $e->getMessage(),
            ]);
            
            return response()->json([
                'error' => 'Error updating record: ' . $e->getMessage()
            ], 500);
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
