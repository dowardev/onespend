<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Http\Controllers;

use App\Http\Requests\StoreBudgetProviderRequest;
use App\Models\BudgetProvider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BudgetProviderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $providers = BudgetProvider::forUser($request->user()->id)
            ->active()
            ->with(['account:id,name', 'products'])
            ->orderBy('date', 'desc')
            ->get();

        return response()->json(['data' => $providers]);
    }

    public function store(StoreBudgetProviderRequest $request): JsonResponse
    {
        $data = $request->validated();
        $products = $data['products'] ?? [];
        unset($data['products']);

        $provider = BudgetProvider::create([
            ...$data,
            'user_id' => $request->user()->id,
            'sync_id' => (string) Str::uuid(),
        ]);

        foreach ($products as $product) {
            $provider->products()->create([
                ...$product,
                'user_id' => $request->user()->id,
                'sync_id' => (string) Str::uuid(),
            ]);
        }

        $provider->load(['account:id,name', 'products']);

        return response()->json(['data' => $provider], 201);
    }

    public function show(Request $request, BudgetProvider $budgetProvider): JsonResponse
    {
        if ($budgetProvider->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $budgetProvider->load(['account:id,name', 'products']);

        return response()->json(['data' => $budgetProvider]);
    }

    public function update(StoreBudgetProviderRequest $request, BudgetProvider $budgetProvider): JsonResponse
    {
        if ($budgetProvider->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $data = $request->validated();
        $products = $data['products'] ?? null;
        unset($data['products']);

        $budgetProvider->update($data);

        if ($products !== null) {
            $budgetProvider->products()->delete();
            foreach ($products as $product) {
                $budgetProvider->products()->create([
                    ...$product,
                    'user_id' => $request->user()->id,
                    'sync_id' => (string) Str::uuid(),
                ]);
            }
        }

        $budgetProvider->load(['account:id,name', 'products']);

        return response()->json(['data' => $budgetProvider]);
    }

    public function destroy(Request $request, BudgetProvider $budgetProvider): JsonResponse
    {
        if ($budgetProvider->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $budgetProvider->products()->delete();
        $budgetProvider->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
