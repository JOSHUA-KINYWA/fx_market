"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type NotificationType = "success" | "error" | "info";

interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  type: NotificationType;
}

interface NotificationContextValue {
  notifications: NotificationItem[];
  pushNotification: (notification: Omit<NotificationItem, "id">) => void;
  dismissNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  const pushNotification = useCallback(
    ({ title, description, type }: Omit<NotificationItem, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setNotifications((prev) => [...prev, { id, title, description, type }]);
    },
    []
  );

  useEffect(() => {
    if (notifications.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setNotifications((prev) => prev.slice(1));
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [notifications]);

  const value = useMemo(
    () => ({ notifications, pushNotification, dismissNotification }),
    [notifications, pushNotification, dismissNotification]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`rounded-lg border px-4 py-3 shadow-lg ${
              notification.type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : notification.type === "success"
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-blue-200 bg-blue-50 text-blue-800"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{notification.title}</p>
                {notification.description ? (
                  <p className="mt-1 text-sm opacity-90">{notification.description}</p>
                ) : null}
              </div>
              <button
                onClick={() => dismissNotification(notification.id)}
                className="text-sm font-medium opacity-80 hover:opacity-100"
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }

  return context;
}
