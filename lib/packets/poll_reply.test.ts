import { DEVICE_STYLE } from "../definitions.js";
import type { IPollReply } from "./poll-reply.js";

describe("PollReply", () => {
  describe("definitions", () => {
    it("should compile without error", () => {
      const test: IPollReply = {
        ipAddress: [127, 0, 0, 1],
        macAddress: [0, 0, 0, 0, 0, 0],
        port: 0x1936,
        subSwitch: 0,
        longNodeName: "Long test",
        shortNodeName: "shortTest",
        deviceStyle: DEVICE_STYLE.NODE,
        versionInfo: 0,
        netSwitch: 0,
        oem: 0,
        ubeaVersion: 0,
        status1: 0,
        estaManufacturer: 0,
        nodeReport: "",
        numPorts: 0,
        portTypes: [0, 0, 0, 0],
        goodInput: [0, 0, 0, 0],
        goodOutputA: [0, 0, 0, 0],
        swIn: [0, 0, 0, 0],
        swOut: [0, 0, 0, 0],
        sACNPriority: 0,
        swMacro: 0,
        swRemote: 0,
      };

      expect(test).not.toBeUndefined();
    });
  });
});
