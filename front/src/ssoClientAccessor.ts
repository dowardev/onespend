// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { SSOClient } from "@dowardev/sso-client"

let _ssoClient: SSOClient | undefined

export function setSSOClient(client: SSOClient): void {
  _ssoClient = client
}

export function getSSOClient(): SSOClient {
  if (!_ssoClient) {
    throw new Error("SSOClient not initialized. Ensure main.ts has run first.")
  }
  return _ssoClient
}
