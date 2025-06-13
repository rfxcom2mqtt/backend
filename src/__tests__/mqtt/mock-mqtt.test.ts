import { MockMqtt } from "../../adapters/mqtt/MockMqtt";
import { settingsService } from "../../config/settings";

// Mock the settings service
jest.mock("../../config/settings", () => ({
  settingsService: {
    get: jest.fn().mockReturnValue({
      mqtt: {
        base_topic: "test/topic",
      },
    }),
  },
}));

describe("MockMqtt", () => {
  let mockMqtt: MockMqtt;

  beforeEach(() => {
    mockMqtt = new MockMqtt();
  });

  it("should initialize with the correct topic from settings", () => {
    expect(mockMqtt.topics.base).toBe("test/topic");
  });

  it("should always return true for isConnected", () => {
    expect(mockMqtt.isConnected()).toBe(true);
  });

  it("should implement all required interface methods", () => {
    // This test ensures that the mock implements all required methods
    expect(typeof mockMqtt.connect).toBe("function");
    expect(typeof mockMqtt.disconnect).toBe("function");
    expect(typeof mockMqtt.addListener).toBe("function");
    expect(typeof mockMqtt.publishState).toBe("function");
    expect(typeof mockMqtt.publish).toBe("function");
  });

  it("should not throw errors when methods are called", async () => {
    // These methods should not throw errors even though they don't do anything
    await expect(mockMqtt.connect()).resolves.toBeUndefined();
    expect(() => mockMqtt.disconnect()).not.toThrow();
    expect(() =>
      mockMqtt.addListener({
        subscribeTopic: () => ["test/topic"],
        onMQTTMessage: () => {},
      }),
    ).not.toThrow();
    expect(() => mockMqtt.publishState("online")).not.toThrow();
    expect(() => mockMqtt.publish("test", "payload", () => {})).not.toThrow();
  });
});
