import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Network from 'expo-network';
import * as Battery from 'expo-battery';
import { clearExpiredCache } from './cache';

const BACKGROUND_FETCH_TASK = 'pharmacy-data-refresh';

/**
 * Check if conditions are favorable for background refresh
 * (Wi-Fi connected and battery not low)
 */
async function shouldRefresh(): Promise<boolean> {
  try {
    // Check network state
    const networkState = await Network.getNetworkStateAsync();
    const isWifi = networkState.type === Network.NetworkStateType.WIFI;
    const isConnected = networkState.isConnected;

    if (!isConnected) {
      console.log('[BackgroundFetch] No network connection, skipping');
      return false;
    }

    // Check battery level (skip if < 20% and not charging)
    const batteryLevel = await Battery.getBatteryLevelAsync();
    const batteryState = await Battery.getBatteryStateAsync();
    const isCharging = batteryState === Battery.BatteryState.CHARGING ||
                       batteryState === Battery.BatteryState.FULL;

    if (batteryLevel < 0.2 && !isCharging) {
      console.log('[BackgroundFetch] Battery low and not charging, skipping');
      return false;
    }

    // Prefer Wi-Fi, but allow cellular if battery is good
    if (!isWifi && batteryLevel < 0.5) {
      console.log('[BackgroundFetch] On cellular with low battery, skipping');
      return false;
    }

    return true;
  } catch (error) {
    console.warn('[BackgroundFetch] Error checking conditions:', error);
    // Default to allowing refresh if we can't check conditions
    return true;
  }
}

/**
 * Define the background fetch task
 * This runs periodically when the app is in background
 */
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  console.log('[BackgroundFetch] Task started');

  try {
    // Check if we should refresh
    if (!(await shouldRefresh())) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Clear expired cache entries
    const cleared = await clearExpiredCache();
    console.log(`[BackgroundFetch] Cleared ${cleared} expired cache entries`);

    // Note: Actual data fetching would go here
    // For now, we just do housekeeping
    // The actual refresh happens when user opens the app
    // because we need to know their location for nearby queries

    console.log('[BackgroundFetch] Task completed successfully');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[BackgroundFetch] Task failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register the background fetch task
 * Call this once during app initialization
 */
export async function registerBackgroundFetch(): Promise<boolean> {
  try {
    // Check if background fetch is available
    const status = await BackgroundFetch.getStatusAsync();

    if (status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
        status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      console.log('[BackgroundFetch] Background fetch is restricted or denied');
      return false;
    }

    // Check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);

    if (isRegistered) {
      console.log('[BackgroundFetch] Task already registered');
      return true;
    }

    // Register the task
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      // Minimum interval: 15 minutes (iOS enforces this minimum)
      minimumInterval: 15 * 60, // 15 minutes in seconds
      // Stop task if app is terminated
      stopOnTerminate: false,
      // Start on device boot
      startOnBoot: true,
    });

    console.log('[BackgroundFetch] Task registered successfully');
    return true;
  } catch (error) {
    console.error('[BackgroundFetch] Failed to register task:', error);
    return false;
  }
}

/**
 * Unregister the background fetch task
 */
export async function unregisterBackgroundFetch(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);

    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      console.log('[BackgroundFetch] Task unregistered');
    }
  } catch (error) {
    console.error('[BackgroundFetch] Failed to unregister task:', error);
  }
}

/**
 * Check background fetch status
 */
export async function getBackgroundFetchStatus(): Promise<{
  isAvailable: boolean;
  isRegistered: boolean;
  status: BackgroundFetch.BackgroundFetchStatus;
}> {
  const status = await BackgroundFetch.getStatusAsync();
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);

  return {
    isAvailable: status === BackgroundFetch.BackgroundFetchStatus.Available,
    isRegistered,
    status,
  };
}

/**
 * Manually trigger a background fetch (for testing)
 * Only works in development
 */
export async function triggerBackgroundFetchNow(): Promise<void> {
  if (__DEV__) {
    await BackgroundFetch.fetchAsync(BACKGROUND_FETCH_TASK);
    console.log('[BackgroundFetch] Manual fetch triggered');
  }
}
