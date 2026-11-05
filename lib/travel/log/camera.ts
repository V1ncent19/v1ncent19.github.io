/** Shared ownership semantics; interpolation and framing remain variant-specific. */
export type CameraMode = "follow" | "overview" | "manual";
export function cameraAfterGesture(): CameraMode { return "manual"; }
