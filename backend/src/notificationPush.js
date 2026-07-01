import {
  getNotification,
  listPushTokens,
  upsertNotification
} from "./db.js";
import { isAPNSConfigured, sendGenerationNotification } from "./apns.js";

export async function sendDatabasePushNotifications(deviceId, notification, chapter) {
  if (!notification || notification.dismissed) {
    return { skipped: true, reason: "notification_unavailable" };
  }

  if (notification.pushSentAt || notification.pushDeliveryStatus === "sent") {
    return { skipped: true, reason: "already_sent" };
  }

  if (!isAPNSConfigured()) {
    await updateNotificationPushDelivery(deviceId, notification, {
      status: "apns_not_configured",
      error: "APNs is not configured."
    });
    return { skipped: true, reason: "apns_not_configured" };
  }

  const tokens = await listPushTokens(deviceId);
  if (tokens.length === 0) {
    await updateNotificationPushDelivery(deviceId, notification, {
      status: "no_tokens",
      error: "No APNs token registered for this device."
    });
    return { skipped: true, reason: "no_tokens" };
  }

  const results = await Promise.all(tokens.map(async (token) => {
    const result = await sendGenerationNotification({ token, notification, chapter });
    if (result && !result.skipped && !result.ok) {
      console.warn("APNs send failed", {
        deviceId,
        chapterId: chapter?.id,
        notificationId: notification.id,
        status: result.status,
        body: result.body
      });
    }
    return { token, result };
  }));

  const sentCount = results.filter(({ result }) => result?.ok).length;
  const failedResult = results.find(({ result }) => result && !result.skipped && !result.ok)?.result;
  await updateNotificationPushDelivery(deviceId, notification, {
    sent: sentCount > 0,
    status: sentCount > 0 ? "sent" : "failed",
    error: sentCount > 0 ? "" : (failedResult?.body || failedResult?.status || "APNs send failed.")
  });
  return { sentCount, tokenCount: tokens.length };
}

async function updateNotificationPushDelivery(deviceId, notification, delivery = {}) {
  const current = await getNotification(deviceId, notification.id) || notification;
  const now = new Date().toISOString();
  const next = {
    ...current,
    pushAttemptedAt: now,
    pushSentAt: delivery.sent ? now : current.pushSentAt,
    pushDeliveryStatus: delivery.status || current.pushDeliveryStatus || "",
    pushDeliveryError: delivery.error === undefined ? current.pushDeliveryError || "" : String(delivery.error),
    pushAttemptCount: Number(current.pushAttemptCount || 0) + 1
  };
  await upsertNotification(deviceId, next);
  return next;
}
