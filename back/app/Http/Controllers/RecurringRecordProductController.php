<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRecurringRecordProductRequest;
use App\Models\RecurringRecordProduct;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RecurringRecordProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $products = RecurringRecordProduct::forUser($request->user()->id)
            ->with('recurringRecord:id,name')
            ->get();

        return response()->json(['data' => $products]);
    }

    public function store(StoreRecurringRecordProductRequest $request): JsonResponse
    {
        $product = RecurringRecordProduct::create([
            ...$request->validated(),
            'sync_id' => (string) Str::uuid(),
        ]);

        $product->load('recurringRecord:id,name');

        return response()->json(['data' => $product], 201);
    }

    public function show(Request $request, RecurringRecordProduct $recurringRecordProduct): JsonResponse
    {
        if ($recurringRecordProduct->recurringRecord?->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $recurringRecordProduct->load('recurringRecord:id,name');

        return response()->json(['data' => $recurringRecordProduct]);
    }

    public function update(StoreRecurringRecordProductRequest $request, RecurringRecordProduct $recurringRecordProduct): JsonResponse
    {
        if ($recurringRecordProduct->recurringRecord?->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $recurringRecordProduct->update($request->validated());

        $recurringRecordProduct->load('recurringRecord:id,name');

        return response()->json(['data' => $recurringRecordProduct]);
    }

    public function destroy(Request $request, RecurringRecordProduct $recurringRecordProduct): JsonResponse
    {
        if ($recurringRecordProduct->recurringRecord?->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $recurringRecordProduct->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
