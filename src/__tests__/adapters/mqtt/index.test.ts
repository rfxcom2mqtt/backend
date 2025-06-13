import { getMqttInstance } from "../../../adapters/mqtt";
import { MockMqtt } from "../../../adapters/mqtt/MockMqtt";
import Mqtt from "../../../adapters/mqtt/Mqtt";
import { settingsService } from "../../../config/settings";

// Mock the settings service
jest.mock("../../../config/settings", () => ({
  settingsService: {
    get: jest.fn(),
  },
}));

// Mock the Mqtt and MockMqtt classes
jest.mock("../../../adapters/mqtt/Mqtt");
jest.mock("../../../adapters/mqtt/MockMqtt");

describe("MQTT Index", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return MockMqtt instance when server is set to "mock"', () => {
    // Arrange
    (settingsService.get as jest.Mock).mockReturnValue({
      mqtt: { server: "mock" },
    });

    // Act
    const result = getMqttInstance();

    // Assert
    expect(MockMqtt).toHaveBeenCalledTimes(1);
    expect(Mqtt).not.toHaveBeenCalled();
    expect(result).toBeInstanceOf(MockMqtt);
  });

  it('should return Mqtt instance when server is not "mock"', () => {
    // Arrange
    (settingsService.get as jest.Mock).mockReturnValue({
      mqtt: { server: "localhost" },
    });

    // Act
    const result = getMqttInstance();

    // Assert
    expect(Mqtt).toHaveBeenCalledTimes(1);
    expect(MockMqtt).not.toHaveBeenCalled();
    expect(result).toBeInstanceOf(Mqtt);
  });
});
