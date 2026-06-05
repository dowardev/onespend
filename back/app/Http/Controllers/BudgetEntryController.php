<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreBudgetEntryRequest;
use App\Models\BudgetEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BudgetEntryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $entries = BudgetEntry::forUser($request->user()->id)
            ->active()
            ->with(['account:id,name', 'groups.account:id,name'])
            ->orderBy('date', 'desc')
            ->limit(100)
            ->get();

        return response()->json(['data' => $entries]);
    }

    public function store(StoreBudgetEntryRequest $request): JsonResponse
    {
        $data = $request->validated();
        $groups = $data['groups'] ?? [];
        unset($data['groups']);

        $entry = BudgetEntry::create([
            ...$data,
            'user_id' => $request->user()->id,
            'sync_id' => (string) Str::uuid(),
        ]);

        foreach ($groups as $group) {
            $entry->groups()->create([
                ...$group,
                'user_id' => $request->user()->id,
            ]);
        }

        $entry->load(['account:id,name', 'groups.account:id,name']);

        return response()->json(['data' => $entry], 201);
    }

    public function show(Request $request, BudgetEntry $budgetEntry): JsonResponse
    {
        if ($budgetEntry->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $budgetEntry->load(['account:id,name', 'groups.account:id,name']);

        return response()->json(['data' => $budgetEntry]);
    }

    public function update(StoreBudgetEntryRequest $request, BudgetEntry $budgetEntry): JsonResponse
    {
        if ($budgetEntry->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $data = $request->validated();
        $groups = $data['groups'] ?? null;
        unset($data['groups']);

        $budgetEntry->update($data);

        if ($groups !== null) {
            $budgetEntry->groups()->delete();
            foreach ($groups as $group) {
                $budgetEntry->groups()->create([
                    ...$group,
                    'user_id' => $request->user()->id,
                ]);
            }
        }

        $budgetEntry->load(['account:id,name', 'groups.account:id,name']);

        return response()->json(['data' => $budgetEntry]);
    }

    public function destroy(Request $request, BudgetEntry $budgetEntry): JsonResponse
    {
        if ($budgetEntry->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $budgetEntry->groups()->delete();
        $budgetEntry->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
