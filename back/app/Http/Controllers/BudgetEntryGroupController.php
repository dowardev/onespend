<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Http\Controllers;

use App\Http\Requests\StoreBudgetEntryGroupRequest;
use App\Models\BudgetEntryGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BudgetEntryGroupController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $groups = BudgetEntryGroup::forUser($request->user()->id)
            ->with(['account:id,name', 'budgetEntry:id,name'])
            ->get();

        return response()->json(['data' => $groups]);
    }

    public function store(StoreBudgetEntryGroupRequest $request): JsonResponse
    {
        $group = BudgetEntryGroup::create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
        ]);

        $group->load(['account:id,name', 'budgetEntry:id,name']);

        return response()->json(['data' => $group], 201);
    }

    public function show(Request $request, BudgetEntryGroup $budgetEntryGroup): JsonResponse
    {
        if ($budgetEntryGroup->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $budgetEntryGroup->load(['account:id,name', 'budgetEntry:id,name']);

        return response()->json(['data' => $budgetEntryGroup]);
    }

    public function update(StoreBudgetEntryGroupRequest $request, BudgetEntryGroup $budgetEntryGroup): JsonResponse
    {
        if ($budgetEntryGroup->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $budgetEntryGroup->update($request->validated());

        $budgetEntryGroup->load(['account:id,name', 'budgetEntry:id,name']);

        return response()->json(['data' => $budgetEntryGroup]);
    }

    public function destroy(Request $request, BudgetEntryGroup $budgetEntryGroup): JsonResponse
    {
        if ($budgetEntryGroup->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $budgetEntryGroup->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
