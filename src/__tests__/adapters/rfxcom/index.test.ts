import { Rfxcom, getRfxcomInstance } from "../../../adapters/rfxcom";
import * as RfxcomModule from "../../../adapters/rfxcom/Rfxcom";

// Mock the Rfxcom module
jest.mock("../../../adapters/rfxcom/Rfxcom", () => {
  const originalModule = jest.requireActual("../../../adapters/rfxcom/Rfxcom");
  return {
    __esModule: true,
    ...originalModule,
    default: jest.fn(),
    getRfxcomInstance: jest.fn(),
  };
});

describe("RFXCOM Index", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should re-export Rfxcom class", () => {
    // Assert
    expect(Rfxcom).toBe(RfxcomModule.default);
  });

  it("should re-export getRfxcomInstance function", () => {
    // Arrange
    const mockInstance = { test: "instance" };
    (RfxcomModule.getRfxcomInstance as jest.Mock).mockReturnValue(mockInstance);

    // Act
    const result = getRfxcomInstance();

    // Assert
    expect(getRfxcomInstance).toBe(RfxcomModule.getRfxcomInstance);
    expect(RfxcomModule.getRfxcomInstance).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockInstance);
  });
});
