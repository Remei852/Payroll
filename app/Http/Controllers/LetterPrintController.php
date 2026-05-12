<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LetterPrintController extends Controller
{
    public function index(Request $request): Response
    {
        $employees = Employee::with('department')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get()
            ->map(function ($e) {
                return [
                    'id' => $e->id,
                    'employeeCode' => $e->employee_code,
                    'firstName' => $e->first_name,
                    'lastName' => $e->last_name,
                    'fullName' => trim(($e->first_name ?? '') . ' ' . ($e->last_name ?? '')),
                    'departmentId' => $e->department_id,
                    'departmentName' => $e->department->name ?? '',
                ];
            })
            ->values();

        $preparedBy = $request->user()?->name ?? '';

        $letterTypes = [
            ['value' => 'report_submission_violations', 'label' => 'NOTICE TO EXPLAIN – Report Submission Violations'],
        ];

        return Inertia::render('Letters/PrintPolicy', [
            'employees' => $employees,
            'letterTypes' => $letterTypes,
            'preparedBy' => $preparedBy,
            'dateIssued' => now()->format('Y-m-d'),
        ]);
    }
}
