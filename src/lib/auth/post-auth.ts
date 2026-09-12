/** After login/verify, send first-time creators to /submit and existing listers to /dashboard. */

export const CREATOR_LISTING_PATH = "/submit";
export const CREATOR_HOME_PATH = "/dashboard";

export function shouldResolveCreatorHome(path: string) {
  return path === CREATOR_LISTING_PATH || path === CREATOR_HOME_PATH;
}

export function destinationForOwnedCreator(hasCreator: boolean) {
  return hasCreator ? CREATOR_HOME_PATH : CREATOR_LISTING_PATH;
}
