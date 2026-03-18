<?php

namespace App\Console\Commands;

use App\Services\ViolationDetectionService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class DetectViolationsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'attendance:detect-violations {--date=}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Detect attendance violations for a specific date (batch/pattern detection only)';

    /**
     * Execute the console command.
     *
     * @param ViolationDetectionService $service
     * @return int
     */
    public function handle(ViolationDetectionService $service): int
    {
        try {
            $this->info('Starting violation detection...');

            // Get date from option or use yesterday (since this runs after daily processing)
            $date = $this->option('date')
                ? Carbon::parse($this->option('date'))
                : Carbon::yesterday();

            $this->info("Detecting violations for date: {$date->format('Y-m-d')}");

            // Run violation detection
            $summary = $service->detectViolationsForDate($date);

            // Output summary
            $this->newLine();
            $this->info('=== Violation Detection Summary ===');
            $this->info("Date: {$summary['date']}");
            $this->info("Employees processed: {$summary['employees_processed']}");
            $this->info("Total violations created: {$summary['violations_created']}");

            // Output violations by type
            if (!empty($summary['violations_by_type'])) {
                $this->newLine();
                $this->info('Violations by type:');
                foreach ($summary['violations_by_type'] as $type => $count) {
                    $this->line("  - {$type}: {$count}");
                }
            }

            // Output errors if any
            if (!empty($summary['errors'])) {
                $this->newLine();
                $this->warn("Errors encountered: " . count($summary['errors']));
                foreach ($summary['errors'] as $error) {
                    $this->error("  Employee {$error['employee_code']} (ID: {$error['employee_id']}): {$error['error']}");
                }
            }

            $this->newLine();
            $this->info('Violation detection completed successfully.');

            // Log summary
            Log::info('Violation detection completed', [
                'date' => $summary['date'],
                'employees_processed' => $summary['employees_processed'],
                'violations_created' => $summary['violations_created'],
                'violations_by_type' => $summary['violations_by_type'],
                'error_count' => count($summary['errors']),
            ]);

            return 0;

        } catch (\Exception $e) {
            $this->error('Violation detection failed: ' . $e->getMessage());
            
            Log::error('Violation detection command failed', [
                'date' => $this->option('date') ?? 'yesterday',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return 1;
        }
    }
}

