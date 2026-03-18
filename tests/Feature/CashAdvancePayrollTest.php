<?php

namespace Tests\Feature;

use App\Models\CashAdvance;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\PayrollPeriod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CashAdvancePayrollTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Employee $employee;
    private Department $department;
    private PayrollPeriod $payrollPeriod;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->department = Department::factory()->create();
        $this->employee = Employee::factory()->create(['department_id' => $this->department->id]);
        $this->payrollPeriod = PayrollPeriod::factory()->create();

        $this->actingAs($this->admin);
    }

    public function test_add_cash_advance_during_payroll_generation()
    {
        $response = $this->postJson('/api/employees/' . $this->employee->id . '/cash-advances', [
            'amount' => 5000,
            'reason' => 'Emergency expenses',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('cash_advances', [
            'employee_id' => $this->employee->id,
            'amount' => 5000,
            'status' => 'Active',
        ]);
    }

    public function test_get_employee_cash_advances()
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

        $response = $this->getJson('/api/employees/' . $this->employee->id . '/cash-advances');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'deductible' => [
                '*' => ['id', 'amount', 'status', 'reason', 'created_at'],
            ],
            'remaining' => [
                '*' => ['id', 'amount', 'status', 'reason', 'created_at'],
            ],
            'totalRemaining',
        ]);
        $this->assertCount(1, $response->json('deductible'));
        $this->assertCount(2, $response->json('remaining'));
        $this->assertEquals(8000, $response->json('totalRemaining'));
    }

    public function test_remove_cash_advance_before_deduction()
    {
        $advance = CashAdvance::factory()->create([
            'employee_id' => $this->employee->id,
            'status' => 'Active',
        ]);

        $response = $this->deleteJson('/api/cash-advances/' . $advance->id);

        $response->assertStatus(200);
        $this->assertDatabaseMissing('cash_advances', ['id' => $advance->id]);
    }

    public function test_prevent_removal_of_deducted_advance()
    {
        $advance = CashAdvance::factory()->create([
            'employee_id' => $this->employee->id,
            'status' => 'Deducted',
        ]);

        $response = $this->deleteJson('/api/cash-advances/' . $advance->id);

        $response->assertStatus(403);
        $this->assertDatabaseHas('cash_advances', ['id' => $advance->id]);
    }

    public function test_apply_cash_advance_deduction_to_payroll()
    {
        $payroll = Payroll::factory()->create([
            'employee_id' => $this->employee->id,
            'payroll_period_id' => $this->payrollPeriod->id,
            'gross_pay' => 10000,
            'total_deductions' => 1000,
            'net_pay' => 9000,
        ]);

        $advance = CashAdvance::factory()->create([
            'employee_id' => $this->employee->id,
            'status' => 'Active',
            'amount' => 2000,
        ]);

        $response = $this->postJson('/api/payroll/' . $payroll->id . '/apply-cash-advance', [
            'cash_advance_id' => $advance->id,
        ]);

        $response->assertStatus(200);

        // Verify advance status changed to Deducted
        $this->assertDatabaseHas('cash_advances', [
            'id' => $advance->id,
            'status' => 'Deducted',
        ]);

        // Verify PayrollItem was created
        $this->assertDatabaseHas('payroll_items', [
            'payroll_id' => $payroll->id,
            'type' => 'DEDUCTION',
            'category' => 'Cash Advance',
            'amount' => 2000,
        ]);

        // Verify payroll totals were recalculated
        $updatedPayroll = $payroll->fresh();
        $this->assertEquals(1000 + 2000, $updatedPayroll->total_deductions);
        $this->assertEquals(10000 - (1000 + 2000), $updatedPayroll->net_pay);
    }

    public function test_multiple_deductions_for_same_employee()
    {
        $payroll = Payroll::factory()->create([
            'employee_id' => $this->employee->id,
            'payroll_period_id' => $this->payrollPeriod->id,
            'gross_pay' => 10000,
            'total_deductions' => 1000,
            'net_pay' => 9000,
        ]);

        $advance1 = CashAdvance::factory()->create([
            'employee_id' => $this->employee->id,
            'status' => 'Active',
            'amount' => 2000,
        ]);

        $advance2 = CashAdvance::factory()->create([
            'employee_id' => $this->employee->id,
            'status' => 'Active',
            'amount' => 1500,
        ]);

        // Apply first deduction
        $this->postJson('/api/payroll/' . $payroll->id . '/apply-cash-advance', [
            'cash_advance_id' => $advance1->id,
        ]);

        // Apply second deduction
        $this->postJson('/api/payroll/' . $payroll->id . '/apply-cash-advance', [
            'cash_advance_id' => $advance2->id,
        ]);

        // Verify both deductions were applied
        $this->assertDatabaseHas('payroll_items', [
            'payroll_id' => $payroll->id,
            'type' => 'DEDUCTION',
            'category' => 'Cash Advance',
            'amount' => 2000,
        ]);

        $this->assertDatabaseHas('payroll_items', [
            'payroll_id' => $payroll->id,
            'type' => 'DEDUCTION',
            'category' => 'Cash Advance',
            'amount' => 1500,
        ]);

        // Verify payroll totals
        $updatedPayroll = $payroll->fresh();
        $this->assertEquals(1000 + 2000 + 1500, $updatedPayroll->total_deductions);
        $this->assertEquals(10000 - (1000 + 2000 + 1500), $updatedPayroll->net_pay);
    }
}
