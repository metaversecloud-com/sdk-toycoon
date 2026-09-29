import { NextFunction, Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor } from "@utils/index.js";

/**
 * Gates admin routes: admin status comes from Topia (Visitor.get), never from anything the client sends
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const credentials = getCredentials(req.query);
    const { visitor } = await getVisitor(credentials, true);

    if (!visitor.isAdmin) {
      return res.status(403).json({ success: false, message: "Only world admins can do that." });
    }

    return next();
  } catch (error) {
    return errorHandler({
      error,
      functionName: "requireAdmin",
      message: "Error verifying admin permissions",
      req,
      res,
    });
  }
};
