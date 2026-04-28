<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Department extends Model
{
    use HasFactory;
    use SoftDeletes;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'payroll_frequency',
        'is_active',
    ];

    public function employees()
    {
        return $this->hasMany(Employee::class);
    }

    public function workSchedule()
    {
        return $this->hasOne(WorkSchedule::class);
    }
}

