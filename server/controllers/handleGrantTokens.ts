import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor, modifyVisitorInventoryItem } from "@utils/index.js";
import { CURRENCY_ITEM_NAME } from "../constants.js";

const DEFAULT_GRANT = 5000;
const MAX_GRANT = 100000;

/**
 * Admin test tool: gives the admin who calls it Toy Tokens ({ amount }, default 5,000, at most 100,000), e.g. to try
 * out the Decorations shop. Only the caller is credited, and it isn't counted as earnings (totalCoinsEarned, leaderboard).
 */
export const handleGrantTokens = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { profileId, urlSlug } = credentials;

    const amount = req.body?.amount === undefined ? DEFAULT_GRANT : Number(req.body.amount);
    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_GRANT) {
      throw `Amount must be a whole number from 1 to ${MAX_GRANT.toLocaleString()}.`;
    }

    const { visitor } = await getVisitor(credentials);
    const tokensItem = await modifyVisitorInventoryItem({
      credentials,
      visitor,
      name: CURRENCY_ITEM_NAME,
      quantity: amount,
    });

    visitor
      .updateDataObject(
        {},
        { analytics: [{ analyticName: "adminTokensGranted", profileId, urlSlug, uniqueKey: profileId }] },
      )
      .catch((error: any) =>
        errorHandler({ error, functionName: "handleGrantTokens", message: "Error tracking analytics" }),
      );

    return res.json({ success: true, amount, coins: tokensItem.quantity });
  } catch (error) {
    return errorHandler({ error, functionName: "handleGrantTokens", message: "Error granting Toy Tokens", req, res });
  }
};
