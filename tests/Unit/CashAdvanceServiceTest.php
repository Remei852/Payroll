<?php

namespace Tests\Unit;

use App\Models\CashAdvance;
use App\Models\Employee;
use App\Models\PayrollItem;
use App\Models\PayrollPeriod;
use App\Models\User;
use App\Services\CashAdvanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CashAdvanceServiceTest extends TestCase
{
    use RefreshDatabase;

    private CashAdvanceService $service;
    private Employee $employee;
    private User $admin;
    private PayrollPeriod $payrollPeriod;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(CashAdvanceService::class);
        
        // Create test data
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->employee = Employee::factory()->create();
        $this->payrollPeriod = PayrollPeriod::factory()->create();
    }

    public function test_create_advance_with_valid_data()
    {
        $result = $this->service->createAdvance(
            $this->employee->id,
            5000,
            'Emergency expenses',
            $this->admin->id
        );

        $this->assertNotNull($result);
        $this->assertEquals(5000, $result->amount);
        $this->assertEquals('Active', $result->status);
        $this->assertEquals('Emergency expenses', $result->reason);
        $this->assertDatabaseHas('cash_advances', [
            'employee_id' => $this->employee->id,
            'amount' => 5000,
            'status' => 'Active',
        ]);
    }

    public function test_create_advance_with_invalid_amount_negative()
    {
        $this->expectException(\InvalidArgumentException::class);
        
        $this->service->createAdvance(
            $this->employee->id,
            -1000,
            'Invalid amount',
            $this->admin->id
        );
    }

    public function test_create_advance_with_invalid_amount_zero()
    {
        $this->expectException(\InvalidArgumentException::class);
        
        $this->service->createAdvance(
            $this->employee->id,
            0,
            'Invalid amount',
            $this->admin->id
        );
    }

    public function test_delete_advance_with_active_status()
    {
        $advance = CashAdvance::factory()->create([
            'employee_id' => $this->employee->id,
            'status' => 'Active',
        ]);

        $result = $this->service->deleteAdvance($advance->id);

        $this->assertTrue($result);
        $this->assertDatabaseMissing('cash_advances', ['id' => $advance->id]);
    }

    public function test_delete_advance_with_deducted_status_fails()
    {
        $advance = CashAdvance::factory()->create([
            'employee_id' => $this->employee->id,
            'status' => 'Deducted',
        ]);

        $this->expectException(\Exception::class);
        
        $this->service->deleteAdvance($advance->id);
    }

    public function test_delete_advance_with_completed_status_fails()
    {
        $advance = CashAdvance::factory()->create([
            'employee_id' => $this->employee->id,
            'status' => 'Completed',
        ]);

        $this->expectException(\Exception::class);
        
        $this->service->deleteAdvance($advance->id);
    }

    public function test_get_deductible_advances_returns_only_active()
    {
        CashAdvance::factory()->create([
            'employee_id' => $this->employee->id,
            'status' => 'Active',
            'amount' => 5000,
        ]);

        CashAdvance::factory()->create([
            'employee_id' => $this->employee->id,
            'status' => 'Deducted',
            'amount' => 3000,
        ]);

        CashAdvance::factory()->create([
            'employee_id' => $this->employee->id,
            'status' => 'Completed',
            'amount' => 2000,
        ]);

        $deductible = $this->service->getDeductibleAdvances($this->employee->id);

        $this->assertCount(1, $deductible);
        $this->assertEquals('Active', $deductible[0]->status);
        $this->assertEquals(5000, $deductible[0]->amount);
    }

    public function test_get_remaining_advances_returns_active_and_deducted()
    {
        CashAdvance::factory()->create([
            'employee_id' => $this->employee->id,
            'status' => 'Active',
            'amount' => 5000,
        ]);

        CashAdvance::factory()->create([
            'employee_id' => $this->employee->id,
            'status' => 'Deducted',
            'amount' => 3000,
        ]);

        CashAdvance::factory()->create([
            'employee_id' => $this->employee->id,
            'status' => 'Completed',
            'amount' => 2000,
        ]);

        $remaining = $this->service->getRemainingAdvances($this->employee->id);

        $this->assertCount(2, $remaining);
        $statuses = $remaining->pluck('status')->toArray();
        $this->assertContains('Active', $statuses);
        $this->assertContains('Deducted', $statuses);
        $this->assertNotContains('Completed', $statuses);
    }

    public function test_get_total_remaining_balance()
    {
        CashAdvance::factory()->create([
            'employee_id' => $this->employee->id,
            'status' => 'Active',
            'amount' => 5000,
        ]);

        CashAdvance::factory()->create([
            'employee_id' => $this->employee->id,
            'status' => 'Deducted',
            'amount' => 3000,
        ]);

        CashAdvance::factory()->create([
            'employee_id' => $this->employee->id,
            'status' => 'Completed',
            'amount' => 2000,
        ]);

        $total = $this->service->getTotalRemainingBalance($this->employee->id);

        // Should be 5000 (Active) + 3000 (Deducted) = 8000
        $this->assertEquals(8000, $total);
    }

    public function test_get_total_remaining_balance_with_no_advances()
    {
        $total = $this->service->getTotalRemainingBalance($this->employee->id);

        $this->assertEquals(0, $total);
    }
}
