<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\BudgetEntry;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class AttachmentController extends Controller
{
    public function index(Request $request, string $entryId): JsonResponse
    {
        $user = $request->user();

        $entry = BudgetEntry::forUser($user->id)
            ->where('sync_id', $entryId)
            ->first();

        if (!$entry) {
            return response()->json(['error' => 'Entry not found'], 404);
        }

        $attachments = Attachment::forUser($user->id)
            ->byEntry($entryId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($a) => [
                'id' => $a->id,
                'sync_id' => $a->sync_id,
                'name' => $a->name,
                'mime_type' => $a->mime_type,
                'size' => $a->size,
                'download_url' => $a->getDownloadUrl(),
                'created_at' => $a->created_at->toIso8601String(),
            ]);

        return response()->json([
            'data' => $attachments,
            'total' => $attachments->count(),
        ]);
    }

    public function store(Request $request, string $entryId): JsonResponse
    {
        $user = $request->user();

        $entry = BudgetEntry::forUser($user->id)
            ->where('sync_id', $entryId)
            ->first();

        if (!$entry) {
            return response()->json(['error' => 'Entry not found'], 404);
        }

        $request->validate([
            'files' => 'required|array|max:20',
            'files.*' => 'required|file|mimes:jpeg,jpg,png,gif,webp,pdf|max:10240',
        ]);

        $uploaded = [];
        $errors = [];

        foreach ($request->file('files') as $index => $file) {
            try {
                $extension = $file->getClientOriginalExtension();
                $attachmentId = Str::uuid()->toString();
                $filename = $attachmentId . '.' . $extension;
                $path = 'attachments/' . $user->id . '/' . $filename;

                Storage::disk('local')->put($path, file_get_contents($file->getRealPath()));

                $attachment = Attachment::create([
                    'user_id' => $user->id,
                    'sync_id' => $attachmentId,
                    'name' => $file->getClientOriginalName(),
                    'path' => $path,
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                    'budget_entry_sync_id' => $entryId,
                ]);

                $uploaded[] = [
                    'id' => $attachment->id,
                    'sync_id' => $attachment->sync_id,
                    'name' => $attachment->name,
                    'mime_type' => $attachment->mime_type,
                    'size' => $attachment->size,
                    'download_url' => $attachment->getDownloadUrl(),
                    'created_at' => $attachment->created_at->toIso8601String(),
                ];
            } catch (\Exception $e) {
                Log::error('Attachment upload failed', [
                    'index' => $index,
                    'file' => $file->getClientOriginalName(),
                    'error' => $e->getMessage(),
                ]);
                $errors[] = [
                    'index' => $index,
                    'name' => $file->getClientOriginalName(),
                    'error' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'uploaded' => $uploaded,
            'errors' => $errors,
            'total_uploaded' => count($uploaded),
            'total_errors' => count($errors),
        ], count($errors) > 0 ? 207 : 201);
    }

    public function download(Request $request, string $attachmentId): mixed
    {
        $user = $request->user();

        $attachment = Attachment::forUser($user->id)
            ->where('id', $attachmentId)
            ->first();

        if (!$attachment) {
            return response()->json(['error' => 'Attachment not found'], 404);
        }

        if (!Storage::disk('local')->exists($attachment->path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        return response()->download(
            Storage::disk('local')->path($attachment->path),
            $attachment->name
        );
    }

    public function destroy(Request $request, string $attachmentId): JsonResponse
    {
        $user = $request->user();

        $attachment = Attachment::forUser($user->id)
            ->where('id', $attachmentId)
            ->first();

        if (!$attachment) {
            return response()->json(['error' => 'Attachment not found'], 404);
        }

        $attachment->deleteFile();
        $attachment->forceDelete();

        return response()->json(['message' => 'Attachment deleted']);
    }
}
