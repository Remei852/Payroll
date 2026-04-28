<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContributionType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContributionTypeController extends Controller
{
    public function index(): JsonResponse
    {
        $types = ContributionType::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        return response()->json($types);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'frequency' => ['nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $name = trim($data['name']);

        $type = ContributionType::firstOrCreate(
            ['name' => $name],
            [
                'category' => $data['category'] ?? 'Other',
                'frequency' => $data['frequency'] ?? 'Monthly',
                'is_active' => $data['is_active'] ?? true,
            ],
        );

        return response()->json($type, 201);
    }
}
