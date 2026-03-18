<?php

namespace Tests\Unit;

use App\Models\AttendanceRecord;
use App\Models\AttendanceViolation;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Holiday;
use App\Services\ViolationDetectionService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ViolationDetectionServiceTest extends TestCase
{
    use RefreshDatabase;

    protected ViolationDetectionService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new ViolationDetectionService();
    }

    /** @test */
    public function it_detects_unexcused_absence()
    {
        $department = Department::factory()->create();
        $employee = Employee::factory()->create(['department_id' => $department->id]);
        $date = Carbon::parse('2024-03-15');

        // Create an absence record
        AttendanceRecord::factory()->create([
            'employee_id' => $employee->id,
            'attendance_date' => $date,
            'status' => 'Absent',
        ]);

        // Run detection
        $result = $this->service->detectViolationsForEmployee($employee->id, $date, $date);

        // Assert violation was created
        $this->assertDatabaseHas('attendance_violations', [
            'employee_id' => $employee->id,
            'violation_type' => 'Unexcused Absence',
            'severity' => 'High',
        ]);
    }

    /** @test */
    public function it_does_not_detect_excused_absence()
    {
        $department = Department::factory()->create();
        $employee = Employee::factory()->create(['department_id' => $department->id]);
        $date = Carbon::parse('2024-03-15');

        // Create an excused absence record
        AttendanceRecord::factory()->create([
            'employee_id' => $employee->id,
            'attendance_date' => $date,
            'status' => 'Absent - Excused',
        ]);

        // Run detection
        $this->service->detectViolationsForEmployee($employee->id, $date, $date);

        // Assert no violation was created
        $this->assertDatabaseMissing('attendance_violations', [
            'employee_id' => $employee->id,
            'violation_type' => 'Unexcused Absence',
        ]);
    }

    /** @test */
    public function it_detects_awol_with_three_consecutive_working_days()
    {
        $department = Department::factory()->create();
        $employee = Employee::factory()->create(['department_id' => $department->id]);

        // Create 3 consecutive absence records (Mon, Tue, Wed)
        $monday = Carbon::parse('2024-03-11'); // Monday
        $tuesday = Carbon::parse('2024-03-12'); // Tuesday
        $wednesday = Carbon::parse('2024-03-13'); // Wednesday

        AttendanceRecord::factory()->create([
            'employee_id' => $employee->id,
            'attendance_date' => $monday,
            'status' => 'Absent',
        ]);

        AttendanceRecord::factory()->create([
            'employee_id' => $employee->id,
            'attendance_date' => $tuesday,
            'status' => 'Absent',
        ]);

        AttendanceRecord::factory()->create([
            'employee_id' => $employee->id,
            'attendance_date' => $wednesday,
            'status' => 'Absent',
        ]);

        // Run detection
        $this->service->detectViolationsForEmployee($employee->id, $monday, $wednesday);

        // Assert AWOL violation was created
        $this->assertDatabaseHas('attendance_violations', [
            'employee_id' => $employee->id,
            'violation_type' => 'AWOL',
            'severity' => 'Critical',
        ]);
    }

    /** @test */
    public function it_does_not_detect_awol_when_weekend_is_between_absences()
    {
        $department = Department::factory()->create();
        $employee = Employee::factory()->create(['department_id' => $department->id]);

        // Create absence records with weekend in between (Fri, Sat, Sun, Mon)
        $friday = Carbon::parse('2024-03-08'); // Friday
        $saturday = Carbon::parse('2024-03-09'); // Saturday
        $sunday = Carbon::parse('2024-03-10'); // Sunday
        $monday = Carbon::parse('2024-03-11'); // Monday

        AttendanceRecord::factory()->create([
            'employee_id' => $employee->id,
            'attendance_date' => $friday,
            'status' => 'Absent',
        ]);

        AttendanceRecord::factory()->create([
            'employee_id' => $employee->id,
            'attendance_date' => $saturday,
            'status' => 'Absent',
        ]);

        AttendanceRecord::factory()->create([
            'employee_id' => $employee->id,
            'attendance_date' => $sunday,
            'status' => 'Absent',
        ]);

        AttendanceRecord::factory()->create([
            'employee_id' => $employee->id,
            'attendance_date' => $monday,
            'status' => 'Absent',
        ]);

        // Run detection
        $this->service->detectViolationsForEmployee($employee->id, $friday, $monday);

        // Assert no AWOL violation was created (only 2 consecutive working days: Fri and Mon)
        $this->assertDatabaseMissing('attendance_violations', [
            'employee_id' => $employee->id,
            'violation_type' => 'AWOL',
        ]);
    }

    /** @test */
    public function it_does_not_detect_awol_when_holiday_is_between_absences()
    {
        $department = Department::factory()->create();
        $employee = Employee::factory()->create(['department_id' => $department->id]);

        // Create a holiday
        $tuesday = Carbon::parse('2024-03-12'); // Tuesday (holiday)
        Holiday::factory()->create([
            'holiday_date' => $tuesday,
            'department_id' => null, // Company-wide holiday
        ]);

        // Create absence records with holiday in between (Mon, Tue (holiday), Wed)
        $monday = Carbon::parse('2024-03-11');
        $wednesday = Carbon::parse('2024-03-13');

        AttendanceRecord::factory()->create([
            'employee_id' => $employee->id,
            'attendance_date' => $monday,
            'status' => 'Absent',
        ]);

        AttendanceRecord::factory()->create([
            'employee_id' => $employee->id,
            'attendance_date' => $tuesday,
            'status' => 'Absent',
        ]);

        AttendanceRecord::factory()->create([
            'employee_id' => $employee->id,
            'attendance_date' => $wednesday,
            'status' => 'Absent',
        ]);

        // Run detection
        $this->service->detectViolationsForEmployee($employee->id, $monday, $wednesday);

        // Assert no AWOL violation was created (only 2 consecutive working days: Mon and Wed)
        $this->assertDatabaseMissing('attendance_violations', [
            'employee_id' => $employee->id,
            'violation_type' => 'AWOL',
        ]);
    }
}
