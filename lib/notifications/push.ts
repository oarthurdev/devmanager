import { createClient } from '@/lib/supabase/client';
import webPush from 'web-push';

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY!;

webPush.setVapidDetails(
  'mailto:contact@oarthur.dev',
  publicVapidKey,
  privateVapidKey
);

export async function subscribeToPushNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicVapidKey
    });

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          subscription: subscription
        });
    }

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
}

export async function sendPushNotification(userId: string, notification: {
  title: string;
  body: string;
  icon?: string;
  data?: any;
}) {
  const supabase = createClient();

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId);

  if (subscriptions && subscriptions.length > 0) {
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icon.png',
      data: notification.data
    });

    for (const sub of subscriptions) {
      try {
        await webPush.sendNotification(sub.subscription, payload);
      } catch (error) {
        console.error('Error sending push notification:', error);
        // Remove invalid subscriptions
        if (error.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('subscription', sub.subscription);
        }
      }
    }
  }
}