<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Department\StoreDepartmentRequest;
use App\Http\Requests\Department\UpdateDepartmentRequest;
use App\Services\DepartmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function __construct(
        protected DepartmentService $service,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page');

        $departments = $this->service->getAll($perPage ?: null);

        return response()->json($departments);
    }

    public function store(StoreDepartmentRequest $request): JsonResponse
    {
        $department = $this->service->create($request->validated());

        return response()->json($department, 201);
    }

    public function show(int $id): JsonResponse
    {
        $department = $this->service->getById($id);

        return response()->json($department);
    }

    public function update(UpdateDepartmentRequest $request, int $id): JsonResponse
    {
        $department = $this->service->update($id, $request->validated());

        return response()->json($department);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->service->softDelete($id);

        return response()->json(null, 204);
    }

    public function stats(): JsonResponse
    {
        $stats = $this->service->getStats();

        return response()->json($stats);
    }
}

