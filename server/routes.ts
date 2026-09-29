import express from "express";
import {
  handleClaimBooth,
  handleClearBooth,
  handleClearInactiveBooths,
  handleGetGameState,
  handleResetWorld,
  handleTeleportToMainScene,
  handleTeleportToMyBooth,
} from "./controllers/index.js";
import { requireAdmin } from "./middleware/requireAdmin.js";
import { getVersion } from "@utils/getVersion.js";

const router = express.Router();
const SERVER_START_DATE = new Date();

router.get("/", (req, res) => {
  res.json({ message: "Hello from server!" });
});

router.get("/system/health", (req, res) => {
  return res.json({
    appVersion: getVersion(),
    status: "OK",
    serverStartDate: SERVER_START_DATE,
    envs: {
      NODE_ENV: process.env.NODE_ENV,
      INSTANCE_DOMAIN: process.env.INSTANCE_DOMAIN,
      INTERACTIVE_KEY: process.env.INTERACTIVE_KEY,
      S3_BUCKET: process.env.S3_BUCKET,
    },
  });
});

router.get("/game-state", handleGetGameState);
router.post("/claim-booth", handleClaimBooth);
router.post("/teleport/my-booth", handleTeleportToMyBooth);
router.post("/teleport/main-scene", handleTeleportToMainScene);

// Admin — every route here is gated by requireAdmin
router.post("/admin/clear-booth", requireAdmin, handleClearBooth);
router.post("/admin/clear-inactive-booths", requireAdmin, handleClearInactiveBooths);
router.post("/admin/reset-world", requireAdmin, handleResetWorld);

export default router;
