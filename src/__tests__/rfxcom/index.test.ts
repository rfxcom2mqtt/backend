import Rfxcom, { getRfxcomInstance } from "../../rfxcom";
import MockRfxcom from "../../rfxcom/Mock";
import rfxcom from "rfxcom";
import { settingsService } from "../../settings";

jest.mock("rfxcom");
jest.mock("../../settings");

describe("Rfxcom", () => {
  let rfxcomInstance: Rfxcom;
  let mockRfxtrx: any;
  let mockRfxcomDevice: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRfxtrx = {
      on: jest.fn(),
      initialise: jest.fn(),
      get: jest.fn(),
      enableRFXProtocols: jest.fn(),
      getRFXStatus: jest.fn(),
      close: jest.fn(),
    };
    mockRfxcomDevice = function () {};
    (rfxcom.RfxCom as jest.Mock).mockReturnValue(mockRfxtrx);
    (rfxcom.Lighting2 as jest.Mock).mockReturnValue(mockRfxcomDevice);
    (settingsService.get as jest.Mock).mockReturnValue({
      rfxcom: {
        usbport: "COM3",
        debug: true,
        receive: ["lighting2"],
      },
    });
    rfxcomInstance = new Rfxcom();
  });

  it("should initialize Rfxcom instance with correct options", () => {
    expect(rfxcom.RfxCom).toHaveBeenCalledWith("COM3", { debug: true });
  });

  it("should get RFX status", () => {
    const callback = jest.fn();
    rfxcomInstance.getStatus(callback);
    expect(mockRfxtrx.getRFXStatus).toHaveBeenCalledWith(expect.any(Function));
  });

  it("should handle status event", () => {
    const callback = jest.fn();
    rfxcomInstance.onStatus(callback);
    expect(mockRfxtrx.on).toHaveBeenCalledWith("status", expect.any(Function));
  });

  it("should handle disconnect event", () => {
    const callback = jest.fn();
    rfxcomInstance.onDisconnect(callback);
    expect(mockRfxtrx.on).toHaveBeenCalledWith(
      "disconnect",
      expect.any(Function),
    );
  });

  it("should subscribe to protocols event", () => {
    const callback = jest.fn();
    rfxcomInstance.subscribeProtocolsEvent(callback);
    expect(mockRfxtrx.on).toHaveBeenCalledWith(
      "lighting2",
      expect.any(Function),
    );
  });

  it("should stop Rfxcom device", () => {
    rfxcomInstance.stop();
    expect(mockRfxtrx.close).toHaveBeenCalled();
  });
});

describe("getRfxcomInstance", () => {
  it("should return MockRfxcom instance if usbport is mock", () => {
    (settingsService.get as jest.Mock).mockReturnValue({
      rfxcom: { usbport: "mock" },
    });
    const instance = getRfxcomInstance();
    expect(instance).toBeInstanceOf(MockRfxcom);
  });

  it("should return Rfxcom instance if usbport is not mock", () => {
    (settingsService.get as jest.Mock).mockReturnValue({
      rfxcom: { usbport: "COM3" },
    });
    const instance = getRfxcomInstance();
    expect(instance).toBeInstanceOf(Rfxcom);
  });
});
