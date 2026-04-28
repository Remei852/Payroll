<?php

namespace App\Services;

use App\Models\Department;
use App\Repositories\DepartmentRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class DepartmentService
{
    public function __construct(
        protected DepartmentRepository $repository,
    ) {
    }

    public function create(array $data): Department
    {
        return $this->repository->create($data);
    }

    public function getAll(?int $perPage = null): Collection|LengthAwarePaginator
    {
        return $this->repository->findAll($perPage);
    }

    public function getById(int $id): Department
    {
        $department = $this->repository->findById($id);

        if (! $department) {
            throw new ModelNotFoundException('Department not found.');
        }

        return $department;
    }

    public function update(int $id, array $data): Department
    {
        $department = $this->getById($id);

        return $this->repository->update($department, $data);
    }

    public function softDelete(int $id): void
    {
        $department = $this->getById($id);

        $this->repository->softDelete($department);
    }

    public function getStats(): array
    {
        return $this->repository->getStats();
    }
}

