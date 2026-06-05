<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRecurringRecordRequest;
use App\Models\RecurringRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RecurringRecordController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $records = RecurringRecord::forUser($request->user()->id)
            ->active()
            ->with(['account:id,name', 'products'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $records]);
    }

    public function store(StoreRecurringRecordRequest $request): JsonResponse
    {
        $data = $request->validated();
        $products = $data['products'] ?? [];
        unset($data['products']);

        $record = RecurringRecord::create([
            ...$data,
            'user_id' => $request->user()->id,
            'sync_id' => (string) Str::uuid(),
        ]);

        foreach ($products as $product) {
            $record->products()->create([
                ...$product,
                'sync_id' => (string) Str::uuid(),
            ]);
        }

        $record->load(['account:id,name', 'products']);

        return response()->json(['data' => $record], 201);
    }

    public function show(Request $request, RecurringRecord $recurringRecord): JsonResponse
    {
        if ($recurringRecord->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $recurringRecord->load(['account:id,name', 'products']);

        return response()->json(['data' => $recurringRecord]);
    }

    public function update(StoreRecurringRecordRequest $request, RecurringRecord $recurringRecord): JsonResponse
    {
        if ($recurringRecord->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $data = $request->validated();
        $products = $data['products'] ?? null;
        unset($data['products']);

        $recurringRecord->update($data);

        if ($products !== null) {
            $recurringRecord->products()->delete();
            foreach ($products as $product) {
                $recurringRecord->products()->create([
                    ...$product,
                    'sync_id' => (string) Str::uuid(),
                ]);
            }
        }

        $recurringRecord->load(['account:id,name', 'products']);

        return response()->json(['data' => $recurringRecord]);
    }

    public function destroy(Request $request, RecurringRecord $recurringRecord): JsonResponse
    {
        if ($recurringRecord->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $recurringRecord->products()->delete();
        $recurringRecord->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
