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
                    // Get date range from uploaded logs
                    $dateRange = $this->service->getUploadedLogsDateRange();
                    
                    \Log::info('Date range for processing', $dateRange);
                    
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

            return Inertia::render('Attendance/Records', [
                'attendanceSummary' => $summary,
                'flash' => [
                    'success' => [
                        'message' => 'CSV uploaded and processed successfully',
                        'uploadResults' => $uploadResults,
                        'processResults' => $processResults,
                    ],
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

        return Inertia::render('Attendance/Records', [
            'attendanceSummary' => $summary,
            'dateRange' => $dateRange,
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
}
