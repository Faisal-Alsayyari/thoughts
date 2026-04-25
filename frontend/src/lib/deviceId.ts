const DEVICE_ID_KEY = 'thoughts-device-id';

/**
 * Returns a stable UUID for this device, generating and persisting one
 * to localStorage on first call.
 */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
