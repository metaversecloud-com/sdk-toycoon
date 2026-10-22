import { ErrorType } from "@/context/types";

/**
 * The player-facing text of a failed request (the server's message when it sent one), for errors shown next to the
 * button that caused them rather than in the page-level error line
 */
export const getErrorText = (error: ErrorType) => {
  console.error(error);
  if (typeof error === "string") return error;
  return error.response?.data?.error?.message || error.response?.data?.message || error.message || "Something went wrong.";
};
