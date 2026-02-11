import dgram from "node:dgram";
import { ArtNet } from "./artnet";

jest.mock("node:dgram");

describe("ArtNet", () => {
  let mockSocket: {
    bind: jest.Mock;
    setBroadcast: jest.Mock;
    on: jest.Mock;
    send: jest.Mock;
    close: jest.Mock;
    removeAllListeners: jest.Mock;
  };

  beforeEach(() => {
    mockSocket = {
      bind: jest.fn((port, addressOrCb, cb) => {
        const callback = typeof addressOrCb === "function" ? addressOrCb : cb;
        if (callback) callback();
      }),
      setBroadcast: jest.fn(),
      on: jest.fn(),
      send: jest.fn((msg, offset, length, port, address, cb) => {
        if (cb) cb(null, length);
      }),
      close: jest.fn(),
      removeAllListeners: jest.fn(),
    };
    (dgram.createSocket as jest.Mock).mockReturnValue(mockSocket);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe("#new", () => {
    it("should initialize with default options", () => {
      new ArtNet({});
      expect(dgram.createSocket).toHaveBeenCalledWith({
        type: "udp4",
        reuseAddr: true,
      });
    });
  });

  describe("open()", () => {
    it("should open the socket with default options", () => {
      const artnet = new ArtNet({});
      artnet.open();
      // Default host is broadcast, so it should bind
      expect(mockSocket.bind).toHaveBeenCalled();
      expect(mockSocket.setBroadcast).toHaveBeenCalledWith(true);
    });

    it("should open the socket with specific host (unicast)", () => {
      const artnet = new ArtNet({ host: "192.168.1.10" });
      artnet.open();
      // Unicast usually doesn't bind in this implementation unless it ends in 255
      expect(mockSocket.bind).not.toHaveBeenCalled();
    });

    it("should open the socket if host ends in 255", () => {
      const artnet = new ArtNet({ host: "192.168.1.255" });
      artnet.open();
      expect(mockSocket.bind).toHaveBeenCalled();
      expect(mockSocket.setBroadcast).toHaveBeenCalledWith(true);
    });

    it("should open the socket to interface if provided", () => {
      const artnet = new ArtNet({ iface: "1.2.3.4" });
      artnet.open();
      expect(mockSocket.bind).toHaveBeenCalledWith(
        6454,
        "1.2.3.4",
        expect.any(Function),
      );
    });
  });

  describe("set()", () => {
    let artnet: ArtNet;

    beforeEach(() => {
      artnet = new ArtNet({});
      artnet.open();
    });

    afterEach(() => {
      artnet.close();
    });

    it("should set a single value (channel 1 default)", async () => {
      await artnet.set(255);
      expect(mockSocket.send).toHaveBeenCalled();
      const buffer = mockSocket.send.mock.calls[0][0];
      // Header is 18 bytes. Channel 1 is at index 18.
      expect(buffer[18]).toBe(255);
    });

    it("should set a single value with channel", async () => {
      // 10 is matching the channel 11 since, the channel 1 is at index 0
      await artnet.set(10, 128);
      expect(mockSocket.send).toHaveBeenCalled();
      const buffer = mockSocket.send.mock.calls[0][0];
      // Channel 11 is at index 18 + 10 = 28
      expect(buffer[28]).toBe(128);
    });

    it("should set multiple values", async () => {
      await artnet.set([10, 20, 30]);
      expect(mockSocket.send).toHaveBeenCalled();
      const buffer = mockSocket.send.mock.calls[0][0];
      expect(buffer[18]).toBe(10);
      expect(buffer[19]).toBe(20);
      expect(buffer[20]).toBe(30);
    });

    it("should set values with universe", async () => {
      await artnet.set(1, 1, 255);
      expect(mockSocket.send).toHaveBeenCalled();
      const buffer = mockSocket.send.mock.calls[0][0];
      // Universe 1 -> lUni=1, hUni=0 at index 14, 15
      expect(buffer[14]).toBe(1);
      expect(buffer[15]).toBe(0);
    });

    it("should throttle sending", async () => {
      await artnet.set(1, 255);
      expect(mockSocket.send).toHaveBeenCalledTimes(1);

      await artnet.set(1, 0);
      expect(mockSocket.send).toHaveBeenCalledTimes(1); // Throttled

      jest.advanceTimersByTime(30);
      expect(mockSocket.send).toHaveBeenCalledTimes(2); // Delayed sent
    });

    it("should send refresh packets", async () => {
      // Re-init with short refresh
      artnet.close();
      artnet = new ArtNet({ refresh: 100 });
      artnet.open();

      await artnet.set(1, 255);
      expect(mockSocket.send).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      expect(mockSocket.send).toHaveBeenCalledTimes(2);
    });
  });

  describe("trigger()", () => {
    it("should send trigger packet", async () => {
      const artnet = new ArtNet({});
      artnet.open();

      await artnet.trigger(100, 200);
      expect(mockSocket.send).toHaveBeenCalled();
      const buffer = mockSocket.send.mock.calls[0][0];
      // Check OpCode for ArtTrigger (0x9900 -> 153, 0 at index 8, 9)
      expect(buffer[9]).toBe(153); // 153 is 0x99
      expect(buffer[8]).toBe(0);

      // Check key/subkey
      // triggerPackage(oem, key, subkey)
      // trigger(subkey, key) -> oem default 65535
      // header: ... hOem, lOem, key, subkey
      // index 14, 15, 16, 17
      expect(buffer[16]).toBe(200); // key
      expect(buffer[17]).toBe(100); // subkey
      artnet.close();
    });
  });

  describe("Configuration", () => {
    it("setHost should update host", async () => {
      const artnet = new ArtNet({});
      artnet.setHost("10.0.0.1");

      artnet.open();
      await artnet.set(1, 255);
      expect(mockSocket.send).toHaveBeenCalledWith(
        expect.any(Buffer),
        0,
        expect.any(Number),
        6454,
        "10.0.0.1",
        expect.any(Function),
      );
      artnet.close();
    });

    it("setPort should update port", async () => {
      const artnet = new ArtNet({ host: "10.0.0.1" });
      artnet.setPort(1234);

      artnet.open();
      await artnet.set(1, 255);
      expect(mockSocket.send).toHaveBeenCalledWith(
        expect.any(Buffer),
        0,
        expect.any(Number),
        1234,
        "10.0.0.1",
        expect.any(Function),
      );
      artnet.close();
    });

    it("setPort should throw if broadcast", () => {
      const artnet = new ArtNet({});
      expect(() => artnet.setPort(1234)).toThrow();
      artnet.close();
    });
  });
});
