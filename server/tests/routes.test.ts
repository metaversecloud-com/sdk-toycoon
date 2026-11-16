import express from "express";
import request from "supertest";

import router from "../routes.js";

// Topia-facing utils are mocked; getCredentials, errorHandler and getOwnedBoothSceneDropId are the real ones.
jest.mock("@utils/index.js", () => ({
  errorHandler: jest.requireActual("../utils/errorHandler").errorHandler,
  getCredentials: jest.requireActual("../utils/getCredentials").getCredentials,
  getOwnedBoothSceneDropId: jest.requireActual("../utils/booths/getOwnedBoothSceneDropId").getOwnedBoothSceneDropId,
  initializeVisitorData: jest.fn(),
  getBoothIndex: jest.fn(),
  getInventoryItems: jest.fn(),
  settleAutoCollect: jest.fn(),
  getBoothData: jest.fn(),
  getBoothOwnerStats: jest.fn(),
  saveBadgeProgress: jest.fn(),
  trackAnalytics: jest.fn(),
  getOpenAnalytics: jest.fn(),
  DroppedAsset: { create: jest.fn() },
}));

const mockUtils = jest.mocked(require("@utils/index.js"));

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  return app;
}

process.env.INTERACTIVE_KEY ||= "test-public-key";

const baseCreds = {
  assetId: "asset-123",
  interactivePublicKey: process.env.INTERACTIVE_KEY,
  interactiveNonce: "nonce-xyz",
  profileId: "profile-me",
  sceneDropId: "booth-theirs",
  urlSlug: "my-world",
  visitorId: "1",
};

const ecosystem = {
  ecosystemBoosters: { b1: { id: "b1" } },
  ecosystemBadges: { badge1: { id: "badge1" } },
  ecosystemDecorations: { d1: { id: "d1" } },
  ecosystemMaterials: { m1: { id: "m1" } },
  ecosystemToys: { t1: { id: "t1" } },
};

const setUpWorld = () => {
  const visitor = { isAdmin: false };
  const visitorData = { boothIds: { "my-world": "booth-mine" }, daysPlayed: {}, shopsVisited: {} };
  const visitorInventory = { level: 3 };
  const booths = {
    "booth-mine": { keyAssetId: "key-mine", ownerId: "profile-me" },
    "booth-theirs": { keyAssetId: "key-theirs", ownerId: "profile-other" },
    "booth-free": { keyAssetId: "key-free", ownerId: null },
  };
  const ownedBoothAsset = { updateDataObject: jest.fn().mockResolvedValue({}) };

  mockUtils.initializeVisitorData.mockResolvedValue({ visitor, visitorData, visitorInventory });
  mockUtils.getBoothIndex.mockResolvedValue({ booths, worldData: { timerSpeed: "fast", boothsFullAlert: { at: 1 } } });
  mockUtils.getInventoryItems.mockResolvedValue(ecosystem);
  mockUtils.settleAutoCollect.mockResolvedValue(null);
  mockUtils.getBoothData.mockResolvedValue({
    boothAsset: {},
    boothData: { ownerId: "profile-other", ownerDisplayName: "Other", level: 2, claimDate: 123 },
  });
  mockUtils.getBoothOwnerStats.mockResolvedValue({ toysCrafted: 4 });
  mockUtils.getOpenAnalytics.mockReturnValue([]);
  mockUtils.DroppedAsset.create.mockReturnValue(ownedBoothAsset);

  return { visitorData, visitorInventory, ownedBoothAsset };
};

describe("routes", () => {
  beforeEach(() => jest.clearAllMocks());

  test("GET /system/health returns status OK and env keys", async () => {
    const res = await request(makeApp()).get("/api/system/health");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "OK");
    expect(res.body).toHaveProperty("envs");
    expect(res.body.envs).toHaveProperty("NODE_ENV");
  });

  test("GET /game-state returns the visitor's booth, the clicked booth and the ecosystem items", async () => {
    const { visitorData, visitorInventory, ownedBoothAsset } = setUpWorld();

    const res = await request(makeApp()).get("/api/game-state").query(baseCreds);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      visitorData,
      visitorInventory,
      ...ecosystem,
      ownsBoothInThisWorld: true,
      ownedBoothSceneDropId: "booth-mine",
      targetBooth: {
        sceneDropId: "booth-theirs",
        isClaimed: true,
        isOwnedByVisitor: false,
        ownerDisplayName: "Other",
        level: 2,
        claimDate: 123,
        ownerStats: { toysCrafted: 4 },
      },
      availableBoothCount: 1,
      isAdmin: false,
      boothsFullAlert: null, // admins only
      timerSpeed: "fast",
      autoCollect: null,
    });

    const credentials = mockUtils.initializeVisitorData.mock.calls[0][0];
    expect(credentials).toMatchObject({ profileId: "profile-me", urlSlug: "my-world", visitorId: 1 });
    expect(mockUtils.getBoothData).toHaveBeenCalledWith(credentials, "key-theirs", "booth-theirs");
    expect(mockUtils.getBoothOwnerStats).toHaveBeenCalledWith(credentials, "profile-other");

    // Opening the app counts as activity on the visitor's own booth.
    expect(mockUtils.DroppedAsset.create).toHaveBeenCalledWith("key-mine", "my-world", {
      credentials: expect.objectContaining({ assetId: "key-mine" }),
    });
    expect(ownedBoothAsset.updateDataObject).toHaveBeenCalledWith({ lastInteractionTimestamp: expect.any(Number) }, {});

    // Badge progress: today is a day played and the other player's shop counts as visited.
    const today = new Date().toISOString().slice(0, 10);
    expect(mockUtils.saveBadgeProgress).toHaveBeenCalledWith(
      expect.objectContaining({ level: 3, update: { [`daysPlayed.${today}`]: true, "shopsVisited.profile-other": true } }),
    );
  });

  test("GET /game-state answers with the error when loading the visitor fails", async () => {
    setUpWorld();
    mockUtils.initializeVisitorData.mockRejectedValue(new Error("Visitor not found"));

    const res = await request(makeApp()).get("/api/game-state").query(baseCreds);

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ success: false, message: "Error getting game state" });
    expect(mockUtils.saveBadgeProgress).not.toHaveBeenCalled();
  });

  test("GET /game-state rejects credentials for another app before calling Topia", async () => {
    setUpWorld();

    const res = await request(makeApp())
      .get("/api/game-state")
      .query({ ...baseCreds, interactivePublicKey: "someone-else" });

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ success: false, error: { message: "Provided public key does not match" } });
    expect(mockUtils.initializeVisitorData).not.toHaveBeenCalled();
    expect(mockUtils.getBoothIndex).not.toHaveBeenCalled();
  });
});
