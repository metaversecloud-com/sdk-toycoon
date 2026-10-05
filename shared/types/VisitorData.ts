/**
 * Shared types between client and server for visitor data
 */

// TODO: Angel's initializeVisitorData owns the full VisitorData shape (coins, xp, materials, unlockedDecor, etc.).
// Only the booth-related field is typed here so booth logic can read it safely.
export interface VisitorDataObjectType {
  boothIds?: {
    [urlSlug: string]: string; // sceneDropId of this visitor's booth in that world
  };
  [key: string]: any;
}
