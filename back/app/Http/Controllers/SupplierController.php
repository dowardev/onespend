<?php

// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

namespace App\Http\Controllers;

use App\Http\Requests\StoreSupplierRequest;
use App\Models\Supplier;
use App\Models\SupplierProduct;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SupplierController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $suppliers = Supplier::forUser($request->user()->id)
            ->with('supplierProducts')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $suppliers]);
    }

    public function store(StoreSupplierRequest $request): JsonResponse
    {
        $data = $request->validated();
        $products = $data['products'];
        unset($data['products']);

        $supplier = Supplier::create([
            ...$data,
            'user_id' => $request->user()->id,
            'sync_id' => (string) Str::uuid(),
        ]);

        foreach ($products as $product) {
            SupplierProduct::create([
                ...$product,
                'user_id' => $request->user()->id,
                'sync_id' => (string) Str::uuid(),
                'supplier_id' => $supplier->sync_id,
            ]);
        }

        $supplier->load('supplierProducts');

        return response()->json(['data' => $supplier], 201);
    }

    public function show(Request $request, Supplier $supplier): JsonResponse
    {
        if ($supplier->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $supplier->load('supplierProducts');

        return response()->json(['data' => $supplier]);
    }

    public function update(StoreSupplierRequest $request, Supplier $supplier): JsonResponse
    {
        if ($supplier->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $data = $request->validated();
        $products = $data['products'] ?? null;
        unset($data['products']);

        $supplier->update($data);

        if ($products !== null) {
            $supplier->supplierProducts()->delete();
            foreach ($products as $product) {
                SupplierProduct::create([
                    ...$product,
                    'user_id' => $request->user()->id,
                    'sync_id' => (string) Str::uuid(),
                    'supplier_id' => $supplier->sync_id,
                ]);
            }
        }

        $supplier->load('supplierProducts');

        return response()->json(['data' => $supplier]);
    }

    public function destroy(Request $request, Supplier $supplier): JsonResponse
    {
        if ($supplier->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $supplier->supplierProducts()->delete();
        $supplier->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
