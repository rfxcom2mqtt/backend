import Controller from "../Controller";
import { Action } from "../models/models";

describe("Controller", () => {
  let controller: Controller;
  let mockExit: jest.Mock;

  beforeEach(() => {
    mockExit = jest.fn();
    controller = new Controller(mockExit);
  });

  it("should start the controller", async () => {
    await controller.start();
    expect(controller).toBeDefined();
  });

  it("should stop the controller", async () => {
    await controller.stop(false);
    expect(mockExit).toHaveBeenCalled();
  });

  it("should action reset_devices the controller", async () => {
    await controller.runAction(new Action("bridge", "reset_devices"));
  });
});
