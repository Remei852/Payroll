<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeContribution extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'employee_id',
        'contribution_type_id',
        'calculation_type',
        'amount_or_rate',
        'employer_share_amount',
        'effective_date',
        'is_active',
    ];

    protected $casts = [
        'amount_or_rate' => 'decimal:4',
        'employer_share_amount' => 'decimal:2',
        'effective_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function contributionType()
    {
        return $this->belongsTo(ContributionType::class);
    }
}

