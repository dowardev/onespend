<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreBudgetProviderProductRequest;
use App\Models\BudgetProviderProduct;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BudgetProviderProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $products = BudgetProviderProduct::forUser($request->user()->id)
            ->active()
            ->with(['budgetProvider:id,name', 'supplierProduct:id,name,price'])
            ->get();

        return response()->json(['data' => $products]);
    }

    public function store(StoreBudgetProviderProductRequest $request): JsonResponse
    {
        $product = BudgetProviderProduct::create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
            'sync_id' => (string) Str::uuid(),
        ]);

        $product->load(['budgetProvider:id,name', 'supplierProduct:id,name,price']);

        return response()->json(['data' => $product], 201);
    }

    public function show(Request $request, BudgetProviderProduct $budgetProviderProduct): JsonResponse
    {
        if ($budgetProviderProduct->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $budgetProviderProduct->load(['budgetProvider:id,name', 'supplierProduct:id,name,price']);

        return response()->json(['data' => $budgetProviderProduct]);
    }

    public function update(StoreBudgetProviderProductRequest $request, BudgetProviderProduct $budgetProviderProduct): JsonResponse
    {
        if ($budgetProviderProduct->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $budgetProviderProduct->update($request->validated());

        $budgetProviderProduct->load(['budgetProvider:id,name', 'supplierProduct:id,name,price']);

        return response()->json(['data' => $budgetProviderProduct]);
    }

    public function destroy(Request $request, BudgetProviderProduct $budgetProviderProduct): JsonResponse
    {
        if ($budgetProviderProduct->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $budgetProviderProduct->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
