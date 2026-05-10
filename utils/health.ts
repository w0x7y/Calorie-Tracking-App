import { Platform } from "react-native";
import type { HealthKitPermissions, HealthPermission } from "react-native-health";

const APPLE_HEALTH_PERMISSION_ERROR =
  "Apple Health step sync requires an iPhone build with native support. Expo Go does not expose HealthKit.";

type AppleHealthModule = {
  Constants: {
    Permissions: Record<string, string>;
  };
  isAvailable: (callback: (error: object | null, results: boolean) => void) => void;
  initHealthKit: (
    permissions: HealthKitPermissions,
    callback: (error: string | null, result: unknown) => void,
  ) => void;
  getStepCount: (
    options: { date: string; includeManuallyAdded?: boolean },
    callback: (error: string | null, results: { value?: number }) => void,
  ) => void;
};

type AppleHealthConnectionResult =
  | { connected: true }
  | { connected: false; message: string };

type AppleHealthStepResult =
  | { success: true; steps: number; syncedAt: string }
  | { success: false; message: string };

function getAppleHealthKit(): AppleHealthModule | null {
  if (Platform.OS !== "ios") {
    return null;
  }

  try {
    const module = require("react-native-health") as AppleHealthModule | undefined;
    if (
      module &&
      typeof module.isAvailable === "function" &&
      typeof module.initHealthKit === "function" &&
      typeof module.getStepCount === "function"
    ) {
      return module;
    }
  } catch {
    return null;
  }

  return null;
}

function getPermissions(healthKit: AppleHealthModule): HealthKitPermissions {
  return {
    permissions: {
      read: [
        (healthKit.Constants.Permissions.StepCount ?? "StepCount") as HealthPermission,
      ],
      write: [],
    },
  };
}

async function ensureAppleHealthAuthorized(): Promise<AppleHealthConnectionResult> {
  const healthKit = getAppleHealthKit();
  if (!healthKit) {
    return { connected: false, message: APPLE_HEALTH_PERMISSION_ERROR };
  }

  const available = await new Promise<boolean>((resolve, reject) => {
    healthKit.isAvailable((error, results) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(Boolean(results));
    });
  }).catch(() => false);

  if (!available) {
    return {
      connected: false,
      message: "Apple Health is not available on this device.",
    };
  }

  try {
    await new Promise<void>((resolve, reject) => {
      healthKit.initHealthKit(getPermissions(healthKit), (error) => {
        if (error) {
          reject(new Error(error));
          return;
        }

        resolve();
      });
    });

    return { connected: true };
  } catch (error) {
    return {
      connected: false,
      message:
        error instanceof Error
          ? error.message
          : "Apple Health permission was not granted.",
    };
  }
}

export function isAppleHealthSupported(): boolean {
  return Platform.OS === "ios";
}

export async function connectAppleHealth(): Promise<AppleHealthConnectionResult> {
  return await ensureAppleHealthAuthorized();
}

export async function getAppleHealthStepCountForDate(
  date: string,
): Promise<AppleHealthStepResult> {
  const authorization = await ensureAppleHealthAuthorized();
  if (!authorization.connected) {
    return { success: false, message: authorization.message };
  }

  const healthKit = getAppleHealthKit();
  if (!healthKit) {
    return { success: false, message: APPLE_HEALTH_PERMISSION_ERROR };
  }

  try {
    const steps = await new Promise<number>((resolve, reject) => {
      healthKit.getStepCount(
        {
          date: `${date}T12:00:00`,
          includeManuallyAdded: true,
        },
        (error, results) => {
          if (error) {
            reject(new Error(error));
            return;
          }

          resolve(Math.max(0, Math.round(results?.value ?? 0)));
        },
      );
    });

    return {
      success: true,
      steps,
      syncedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to read step count from Apple Health.",
    };
  }
}
