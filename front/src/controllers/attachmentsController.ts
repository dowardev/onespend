// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { ref } from 'vue';
import attachmentService, { type AttachmentData } from '@/services/attachmentService';

export type { AttachmentData };

class AttachmentsController {
  private isLoading = ref(false);
  private error = ref<string | null>(null);

  getIsLoading() {
    return this.isLoading;
  }

  getError() {
    return this.error;
  }

  async listAttachments(params: { entrySyncId: string }) {
    this.isLoading.value = true;
    this.error.value = null;
    try {
      return await attachmentService.listAttachments(params.entrySyncId);
    } catch (e) {
      this.error.value = String(e);
      throw e;
    } finally {
      this.isLoading.value = false;
    }
  }

  async listProviderAttachments(params: { providerSyncId: string }) {
    this.isLoading.value = true;
    this.error.value = null;
    try {
      return await attachmentService.listProviderAttachments(params.providerSyncId);
    } catch (e) {
      this.error.value = String(e);
      throw e;
    } finally {
      this.isLoading.value = false;
    }
  }

  async upload(params: { entrySyncId: string; files: File[] }) {
    this.isLoading.value = true;
    this.error.value = null;
    try {
      return await attachmentService.uploadAttachments(params.entrySyncId, params.files);
    } catch (e) {
      this.error.value = String(e);
      throw e;
    } finally {
      this.isLoading.value = false;
    }
  }

  async uploadProvider(params: { providerSyncId: string; files: File[] }) {
    this.isLoading.value = true;
    this.error.value = null;
    try {
      return await attachmentService.uploadProviderAttachments(params.providerSyncId, params.files);
    } catch (e) {
      this.error.value = String(e);
      throw e;
    } finally {
      this.isLoading.value = false;
    }
  }

  async delete(params: { attachmentId: number }) {
    this.isLoading.value = true;
    this.error.value = null;
    try {
      return await attachmentService.deleteAttachment(params.attachmentId);
    } catch (e) {
      this.error.value = String(e);
      throw e;
    } finally {
      this.isLoading.value = false;
    }
  }

  async deleteBatch(params: { ids: number[] }) {
    this.isLoading.value = true;
    this.error.value = null;
    try {
      return await attachmentService.deleteAttachments(params.ids);
    } catch (e) {
      this.error.value = String(e);
      throw e;
    } finally {
      this.isLoading.value = false;
    }
  }

  async download(params: { attachmentId: number }) {
    this.isLoading.value = true;
    this.error.value = null;
    try {
      return await attachmentService.downloadAttachment(params.attachmentId);
    } catch (e) {
      this.error.value = String(e);
      throw e;
    } finally {
      this.isLoading.value = false;
    }
  }
}

const attachmentsController = new AttachmentsController();
export default attachmentsController;
export { AttachmentsController };
