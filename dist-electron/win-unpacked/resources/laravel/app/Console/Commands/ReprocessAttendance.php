<?php

namespace App\Console\Commands;

use App\Services\AttendanceService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class ReprocessAttendance extends Command
{
    protected $signature = 'attendance:reprocess {--date= : Specific date to reprocess (Y-m-d format)}';
    protected $description = 'Reprocess all attendance records with updated logic';

    public function handle(AttendanceService $service)
    {
        $this->info('Reprocessing attendance records...');

        // Check if specific date is provided
        if ($specificDate = $this->option('date')) {
            try {
                $date = Carbon::parse($specificDate);
                $this->info("Processing specific date: {$date->format('Y-m-d')}");

                // Delete existing records for this date
                $deleted = \App\Models\AttendanceRecord::where('attendance_date', $date->format('Y-m-d'))->delete();
                $this->info("Deleted {$deleted} existing records");

                // Reprocess the date
                $results = $service->processLogsToRecords($date, $date);

                $this->info('Completed!');
                $this->table(
                    ['Metric', 'Count'],
                    [
                        ['Days Processed', $results['processed']],
                        ['Errors', $results['errors']],
                    ]
                );

                return 0;
            } catch (\Exception $e) {
                $this->error("Error processing date: {$e->getMessage()}");
                return 1;
            }
        }

        // Process all dates
        $dateRange = $service->getUploadedLogsDateRange();

        if (!$dateRange['start'] || !$dateRange['end']) {
            $this->error('No attendance logs found.');
            return 1;
        }

        $this->info("Processing from {$dateRange['start']} to {$dateRange['end']}");

        $results = $service->processLogsToRecords(
            Carbon::parse($dateRange['start']),
            Carbon::parse($dateRange['end'])
        );

        $this->info('Completed!');
        $this->table(
            ['Metric', 'Count'],
            [
                ['Days Processed', $results['processed']],
                ['Errors', $results['errors']],
            ]
        );

        return 0;
    }
}

