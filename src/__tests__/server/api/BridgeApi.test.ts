import request from "supertest";
import express from "express";
import BridgeApi from "../../../server/api/BridgeApi";
import { BridgeInfo, Action } from "../../../models/models";
import { RfxcomInfo } from "../../../models/rfxcom";

describe("BridgeApi", () => {
  let app: express.Application;
  let bridgeInfo: BridgeInfo;
  let actionCallback: jest.Mock;

  beforeEach(() => {
    bridgeInfo = {
      version: "1.0.0",
      logLevel: "info",
      coordinator: new RfxcomInfo(),
    }; // Mock BridgeInfo
    actionCallback = jest.fn();
    app = express();
    app.use(express.json());
    const bridgeApi = new BridgeApi(bridgeInfo, actionCallback);
    app.use("/bridge", bridgeApi.router);
  });

  it("should return bridge info", async () => {
    const response = await request(app).get("/bridge/info");
    expect(response.status).toBe(200);
    expect(response.body).toEqual(bridgeInfo);
  });

  it("should handle action callback", async () => {
    const action = "restart";
    const response = await request(app).post("/bridge/action").send({ action });
    expect(response.status).toBe(200);
    expect(actionCallback).toHaveBeenCalledWith(new Action("bridge", action));
  });
});
