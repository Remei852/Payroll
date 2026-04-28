<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class CreateMissingWorkSchedules extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'schedules:create-missing';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create work schedules for departments that are missing them';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking for departments without work schedules...');
        
        $departments = \App\Models\Department::doesntHave('workSchedule')->get();
        
        if ($departments->isEmpty()) {
            $this->info('All departments have work schedules!');
            return 0;
        }
        
        $this->info("Found {$departments->count()} department(s) without work schedules.");
        
        foreach ($departments as $department) {
            $this->line("Creating schedule for: {$department->name}");
            
            \App\Models\WorkSchedule::create([
                'department_id' => $department->id,
                'name' => $department->name . ' Schedule',
                'work_start_time' => '08:00',
                'work_end_time' => '17:00',
                'break_start_time' => '12:00',
                'break_end_time' => '13:00',
                'grace_period_minutes' => 15,
                'is_working_day' => true,
            ]);
            
            $this->info("✓ Created schedule for {$department->name}");
        }
        
        $this->newLine();
        $this->info("Successfully created {$departments->count()} work schedule(s)!");
        
        return 0;
    }
}
