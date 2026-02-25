<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    use HasFactory;
    use \Illuminate\Database\Eloquent\SoftDeletes;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'employee_code',
        'first_name',
        'last_name',
        'department_id',
        'position',
        'daily_rate',
        'hire_date',
        'employment_status',
    ];

    protected $casts = [
        'daily_rate' => 'decimal:2',
        'hire_date' => 'date',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function contributions()
    {
        return $this->hasMany(EmployeeContribution::class);
    }
}

