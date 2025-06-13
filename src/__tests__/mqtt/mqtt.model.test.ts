import { Topic } from "../../core/models/mqtt";

describe("MQTT Model", () => {
  describe("Topic class", () => {
    it("should initialize with the correct default values", () => {
      // Arrange
      const baseTopic = "rfxcom";

      // Act
      const topic = new Topic(baseTopic);

      // Assert
      expect(topic.base).toBe("rfxcom");
      expect(topic.devices).toBe("devices");
      expect(topic.will).toBe("bridge/status");
      expect(topic.info).toBe("bridge/info");
    });

    it("should use the provided base topic", () => {
      // Arrange
      const baseTopic = "custom/base/topic";

      // Act
      const topic = new Topic(baseTopic);

      // Assert
      expect(topic.base).toBe("custom/base/topic");
      expect(topic.devices).toBe("devices");
      expect(topic.will).toBe("bridge/status");
      expect(topic.info).toBe("bridge/info");
    });
  });
});
