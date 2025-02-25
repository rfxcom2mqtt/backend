import request from "supertest";
import express from "express";
import SettingApi from "../../../server/api/SettingApi";
import { StatusCodes } from "http-status-codes";
import { settingsService } from "../../../settings";

jest.mock("../../../settings");

describe("SettingApi", () => {
  let app: express.Application;
  let settingApi: SettingApi;

  beforeEach(() => {
    app = express();
    settingApi = new SettingApi();
    app.use("/settings", settingApi.router);
  });

  it("should get settings", async () => {
    const settings = { key: "value" };
    (settingsService.get as jest.Mock).mockReturnValue(settings);

    const response = await request(app).get("/settings");
    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual(settings);
  });
});
