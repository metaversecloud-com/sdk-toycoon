import { Credentials } from "../types/Credentials.js";

/**
 * Builds the interactive-credential query string an app iframe needs, for links we open on the visitor's behalf
 */
export const getQueryString = (credentials: Partial<Credentials>): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(credentials)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  return params.toString();
};
