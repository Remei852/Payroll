<?php

namespace App\Console\Commands;

use App\Services\AttendanceService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class ProcessAttendanceLogs extends Command
{
    protected $signature = 'attendance:process {start_date?} {end_date?}';
    protected $description = 'Process attendance logs into records';

    public function handle(AttendanceService $service)
    {
        $this->info('Starting attendance processing...');

        // Get date range
        if ($this->argument('start_date') && $this->argument('end_date')) {
            $startDate = Carbon::parse($this->argument('start_date'));
            $endDate = Carbon::parse($this->argument('end_date'));
        } else {
            $dateRange = $service->getUploadedLogsDateRange();
            
            if (!$dateRange['start'] || !$dateRange['end']) {
                $this->error('No logs found to process');
                return 1;
            }
            
            $startDate = Carbon::parse($dateRange['start']);
            $endDate = Carbon::parse($dateRange['end']);
        }

        $this->info("Processing from {$startDate->format('Y-m-d')} to {$endDate->format('Y-m-d')}");

        $results = $service->processLogsToRecords($startDate, $endDate);

        $this->info("Processed: {$results['processed']} days");
        $this->info("Errors: {$results['errors']}");

        if (!empty($results['messages'])) {
            $this->warn('Messages:');
            foreach ($results['messages'] as $message) {
                $this->line($message);
            }
        }

        return 0;
    }
}
