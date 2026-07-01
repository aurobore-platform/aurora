// @generated — do not edit

export interface NotificationOptions { id?: string; title: string; body: string; scheduleAt?: number }

export interface CancelArgs { id: string }

export interface ScheduleResult { id: string }

export interface NotificationsApi {
  schedule(args?: { id?: string; title: string; body: string; scheduleAt?: number }): Promise<{ id: string }>;
  notify(args?: { id?: string; title: string; body: string; scheduleAt?: number }): Promise<{ id: string }>;
  cancel(args?: { id: string }): Promise<void>;
  cancelAll(args?: {  }): Promise<void>;
}
