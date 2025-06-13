import {
  RfxcomInfo,
  RfxcomEvent,
  Lighting2Event,
  Lighting1Event,
  Lighting6Event,
} from "../../core/models/rfxcom";

describe("RFXCOM Model", () => {
  describe("RfxcomInfo class", () => {
    it("should initialize with default values", () => {
      // Act
      const info = new RfxcomInfo();

      // Assert
      expect(info.receiverTypeCode).toBe(0);
      expect(info.receiverType).toBe("");
      expect(info.hardwareVersion).toBe("");
      expect(info.firmwareVersion).toBe(0);
      expect(info.firmwareType).toBe("");
      expect(info.enabledProtocols).toEqual([]);
    });
  });

  describe("RfxcomEvent interfaces", () => {
    it("should create a valid Lighting2Event", () => {
      // Arrange
      const event: Lighting2Event = {
        id: "0x123456",
        subtype: 0,
        seqnbr: 1,
        type: "lighting2",
        commandNumber: 0,
        command: "On",
        unitCode: "1",
        level: 15,
        rssi: 8,
        group: false,
      };

      // Assert
      expect(event.id).toBe("0x123456");
      expect(event.type).toBe("lighting2");
      expect(event.command).toBe("On");
      expect(event.level).toBe(15);
    });

    it("should create a valid Lighting1Event", () => {
      // Arrange
      const event: Lighting1Event = {
        id: "0x123456",
        subtype: 0,
        seqnbr: 1,
        type: "lighting1",
        commandNumber: 0,
        command: "On",
        houseCode: "A",
        unitCode: "1",
        rssi: 8,
        group: false,
      };

      // Assert
      expect(event.id).toBe("0x123456");
      expect(event.type).toBe("lighting1");
      expect(event.command).toBe("On");
      expect(event.houseCode).toBe("A");
      expect(event.unitCode).toBe("1");
    });

    it("should create a valid Lighting6Event", () => {
      // Arrange
      const event: Lighting6Event = {
        id: "0x123456",
        subtype: 0,
        seqnbr: 1,
        type: "lighting6",
        commandNumber: 0,
        command: "On",
        groupCode: "A",
        unitCode: "1",
        rssi: 8,
        group: false,
      };

      // Assert
      expect(event.id).toBe("0x123456");
      expect(event.type).toBe("lighting6");
      expect(event.command).toBe("On");
      expect(event.groupCode).toBe("A");
      expect(event.unitCode).toBe("1");
    });
  });
});
