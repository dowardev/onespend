<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSupplierProductRequest;
use App\Models\SupplierProduct;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class SupplierProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $products = SupplierProduct::forUser($request->user()->id)
            ->active()
            ->with('supplier:id,name,sync_id')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $products]);
    }

    public function store(StoreSupplierProductRequest $request): JsonResponse
    {
        $product = SupplierProduct::create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
            'sync_id' => (string) Str::uuid(),
        ]);

        $product->load('supplier:id,name,sync_id');

        return response()->json(['data' => $product], 201);
    }

    public function show(Request $request, SupplierProduct $supplierProduct): JsonResponse
    {
        if ($supplierProduct->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $supplierProduct->load('supplier:id,name,sync_id');

        return response()->json(['data' => $supplierProduct]);
    }

    public function update(StoreSupplierProductRequest $request, SupplierProduct $supplierProduct): JsonResponse
    {
        if ($supplierProduct->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $supplierProduct->update($request->validated());

        $supplierProduct->load('supplier:id,name,sync_id');

        return response()->json(['data' => $supplierProduct]);
    }

    public function image(Request $request, int $id): Response
    {
        $product = SupplierProduct::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        if (!$product->image_base64) {
            abort(404);
        }

        $base64 = $product->image_base64;

        $allowedTypes = ['jpeg', 'png', 'gif', 'webp'];
        if (!preg_match('/^data:image\/(\w+);base64,/', $base64, $matches) || !in_array($matches[1], $allowedTypes)) {
            abort(404);
        }

        $contentType = 'image/' . $matches[1];
        $base64 = substr($base64, strpos($base64, ',') + 1);

        $imageData = base64_decode($base64, true);
        if ($imageData === false) {
            abort(404);
        }

        return response($imageData, 200, ['Content-Type' => $contentType]);
    }

    public function destroy(Request $request, SupplierProduct $supplierProduct): JsonResponse
    {
        if ($supplierProduct->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $supplierProduct->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
