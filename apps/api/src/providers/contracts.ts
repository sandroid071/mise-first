export interface NotificationProvider { send(input: { to: string; template: string; data: Record<string, string> }): Promise<void>; }
export interface StorageProvider { createUploadUrl(input: { tenantId: string; contentType: string }): Promise<{ url: string; key: string }>; }
export interface PaymentProvider { createIntent(input: { amountMinor: number; currency: string }): Promise<{ id: string }>; }
export interface AnalyticsProvider { track(input: { event: string; tenantId?: string; properties?: Record<string, unknown> }): Promise<void>; }
