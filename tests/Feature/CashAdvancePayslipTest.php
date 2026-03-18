<?php

namespace Tests\Feature;

use App\Models\CashAdvance;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\PayrollPeriod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CashAdvancePayslipTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Employee $employee;
    private PayrollPeriod $payrollPeriod;
    private Payroll $payroll;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->employee = Employee::factory()->create();
        $this->payrollPeriod = PayrollPeriod::factory()->create();
        $this->payroll = Payroll::factory()->create([
            'employee_id' => $this->employee->id,
            'payroll_period_id' => $this->payrollPeriod->id,
            'gross_pay' => 10000,
            'total_deductions' => 1000,
            'net_pay' => 9000,
        ]);

        $this->actingAs($this->admin);
    }

    public function test_cash_advance_deductions_appear_on_payslip()
    {
        // Create cash advance deduction
        PayrollItem::factory()->create([
            'payroll_id' => $this->payroll->id,
            'type' => 'DEDUCTION',
            'category' => 'Cash Advance',
            'amount' => 2000,
        ]);

        $response = $this->get('/payroll/payslip/' . $this->payroll->id);

        $response->assertStatus(200);
        $response->assertSee('Cash Advance');
        $response->assertSee('2000');
    }

    public function test_remaining_balance_note_appears_when_balance_greater_than_zero()
    {
        // Create cash advance deduction
        PayrollItem::factory()->create([
            'payroll_id' => $this->payroll->id,
            'type' => 'DEDUCTION',
            'category' => 'Cash Advance',
            'amount' => 2000,
        ]);

        // Create remaining active advance
        CashAdvance::factory()->create([
            'employee_id' => $this->employee->id,
            'status' => 'Active',
            'amount' => 1500,
        ]);

        $response = $this->get('/payroll/payslip/' . $this->payroll->id);

        $response->assertStatus(200);
        $response->assertSee('Remaining unpaid balance');
        $response->assertSee('1500');
    }

    public function test_remaining_balance_note_does_not_appear_when_balance_zero()
    {
        // Create cash advance deduction
        PayrollItem::factory()->create([
            'payroll_id' => $this->payroll->id,
            'type' => 'DEDUCTION',
            'category' => 'Cash Advance',
            'amount' => 2000,
        ]);

        // No remaining advances

        $response = $this->get('/payroll/payslip/' . $this->payroll->id);

        $response->assertStatus(200);
        // The deduction should still appear
        $response->assertSee('Cash Advance');
        // But the remaining balance note should not appear
        $response->assertDontSee('Remaining unpaid balance');
    }

    public function test_multiple_deductions_display_separately()
    {
        // Create multiple cash advance deductions
        PayrollItem::factory()->create([
            'payroll_id' => $this->payroll->id,
            'type' => 'DEDUCTION',
            'category' => 'Cash Advance',
            'amount' => 2000,
        ]);

        PayrollItem::factory()->create([
            'payroll_id' => $this->payroll->id,
            'type' => 'DEDUCTION',
            'category' => 'Cash Advance',
            'amount' => 1500,
        ]);

        $response = $this->get('/payroll/payslip/' . $this->payroll->id);

        $response->assertStatus(200);
        // Both deductions should appear
        $response->assertSee('2000');
        $response->assertSee('1500');
    }

    public function test_payslip_displays_cash_advance_deduction_total()
    {
        // Create cash advance deductions
        PayrollItem::factory()->create([
            'payroll_id' => $this->payroll->id,
            'type' => 'DEDUCTION',
            'category' => 'Cash Advance',
            'amount' => 2000,
        ]);

        PayrollItem::factory()->create([
            'payroll_id' => $this->payroll->id,
            'type' => 'DEDUCTION',
            'category' => 'Cash Advance',
            'amount' => 1500,
        ]);

        $response = $this->get('/payroll/payslip/' . $this->payroll->id);

        $response->assertStatus(200);
        // Should show total cash advance deduction
        $response->assertSee('Total cash advance deducted in this period');
        $response->assertSee('3500');
    }

    public function test_payslip_without_cash_advances()
    {
        // Create payroll without cash advance deductions
        $response = $this->get('/payroll/payslip/' . $this->payroll->id);

        $response->assertStatus(200);
        // Should not show cash advance section if no deductions
        $response->assertDontSee('Cash Advance Deduction');
    }
}
