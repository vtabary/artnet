import EventEmitter from "node:events";
import os from "node:os";
import { ArtNetSocket } from "./artnet-socket.js";
import { DEVICE_STYLE, OP_CODES, type IArtNetMesssage } from "./definitions.js";
import type { CustomEvent } from "./event-handler.js";
import type { IDmx } from "./packets/dmx.js";
import { splitInt16 } from "./utils/int16.js";

export class DMXEvent extends Event implements CustomEvent<"dmx"> {
  private readonly _values: number[];

  public readonly type = "dmx";

  constructor(values: number[]) {
    super("dmx");
    this._values = values;
  }

  public get values(): number[] {
    return this._values;
  }
}

function getMacAndIps(): { ip: string; mac: string }[] {
  const interfaces = os.networkInterfaces();
  const addresses: { ip: string; mac: string }[] = [];

  for (const k in interfaces) {
    interfaces[k]?.forEach((address) => {
      if (address.family === "IPv4") {
        addresses.push({ ip: address.address, mac: address.mac });
      }
    });
  }

  return addresses;
}

export class ArtNet {
  /**
   * Index of the following arrays is the universe
   */
  private readonly data: number[][] = []; // The 512 dmx channels
  /**
   * The intervals for the 4sec refresh
   */
  private interval: NodeJS.Timeout[] = [];
  /**
   * millisecond interval for sending unchanged data to the Art-Net node.
   * @default 4000
   */
  private readonly refresh: number;
  /**
   * The timeouts
   */
  private sendThrottle: (NodeJS.Timeout | null)[] = [];
  /**
   * The reference to the timeout of a poll reply
   */
  private pollReplyTimeout: NodeJS.Timeout | null = null;
  /**
   * Boolean flag indicating if data should be sent after sendThrottle timeout
   */
  private sendDelayed: boolean[] = [];
  /**
   * The highest channel number that had a change. mind that channel counting starts at 1!
   */
  private dataChanged: number[] = [];
  /**
   * sends always the full DMX universe instead of only changed values.
   * @default false
   */
  private readonly sendAll: boolean;
  /**
   * @default "Art Net device"
   */
  private readonly nodeName: string;
  /**
   * @default "ArtNet device"
   */
  private readonly shortNodeName: string;
  /**
   * @default DEVICE_STYLE.NODE
   */
  private readonly DEVICE_STYLE: DEVICE_STYLE;
  /**
   * Events managers
   */
  private readonly eventEmitter = new EventEmitter();

  private readonly socket: ArtNetSocket;

  constructor(options: {
    /**
     * @default "255.255.255.255"
     */
    host?: string;
    /**
     * @default 6454
     */
    port?: number;
    /**
     * millisecond interval for sending unchanged data to the Art-Net node.
     * @default 4000
     */
    refresh?: number;
    /**
     * optional string IP address
     * bind udp socket to specific network interface
     */
    iface?: string;
    /**
     * sends always the full DMX universe instead of only changed values.
     * @default false
     */
    sendAll?: boolean;
    /**
     * The long name for the current node to reply to the poll message
     * 63 ASCII characters maximum
     */
    nodeName?: string;
    /**
     * The short name for the current node to reply to the poll message
     * 17 ASCII characters maximum
     */
    shortNodeName?: string;
    /**
     * The style of the device defined in https://art-net.org.uk/downloads/art-net.pdf page 24
     */
    DEVICE_STYLE?: DEVICE_STYLE;
  }) {
    this.socket = new ArtNetSocket({
      host: options.host ?? "255.255.255.255",
      port: options.port ?? 6454,
      iface: options.iface ?? "",
    });

    this.refresh = options.refresh ?? 4000;
    this.sendAll = options.sendAll ?? false;
    this.nodeName = options.nodeName ?? "Art Net device";
    this.shortNodeName = options.shortNodeName ?? "ArtNet device";
    this.DEVICE_STYLE = options.DEVICE_STYLE ?? DEVICE_STYLE.NODE;
  }

  public open() {
    this.socket.onMessage((message: IArtNetMesssage, packet: number[]) => {
      this.onMessage(message, packet);
    });
    this.socket.open();
  }

  private onMessage(message: IArtNetMesssage, packet: number[]) {
    switch (message.type) {
      case OP_CODES.POLL:
        this.onPoll();
        break;
      case OP_CODES.DMX:
        this.eventEmitter.emit("dmx", message);
        break;
    }

    this.eventEmitter.emit("message", message, packet);
  }

  /**
   * See http://www.artisticlicence.com/WebSiteMaster/User%20Guides/art-net.pdf page 25
   */
  private onPoll() {
    if (this.pollReplyTimeout) {
      return;
    }

    getMacAndIps().forEach((address) => {
      const ip = address.ip.split(".").map(Number) as [
        number,
        number,
        number,
        number,
      ];
      const mac = address.mac.split(":").map(Number) as [
        number,
        number,
        number,
        number,
        number,
        number,
      ];

      this.socket.send({
        type: OP_CODES.POLL_REPLY,
        ipAddress: [ip[0], ip[1], ip[2], ip[3]],
        macAddress: [mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]],
        port: 0x1936,
        netSwitch: 0,
        subSwitch: 0,
        longNodeName: this.nodeName,
        shortNodeName: this.shortNodeName,
        deviceStyle: this.DEVICE_STYLE,
      });
    });
  }

  /**
   * Every parameter except the value(s) is optional. If you supply a universe you need to supply the channel also. Defaults: universe = 0, channel = 1
   * Callback is called with (error, response) params. If error and response are null data remained unchanged and therefore nothing has been sent.
   */
  public async set(value: number): Promise<boolean>;
  public async set(values: number[]): Promise<boolean>;
  public async set(channel: number, value: number): Promise<boolean>;
  public async set(channel: number, values: number[]): Promise<boolean>;
  public async set(
    universe: number,
    channel: number,
    value: number,
  ): Promise<boolean>;
  public async set(
    universe: number,
    channel: number,
    values: number[],
  ): Promise<boolean>;
  public async set(
    arg1: number | number[],
    arg2?: number | number[],
    arg3?: number | number[],
  ): Promise<boolean> {
    let universe: number;
    let channel: number;
    let value: number | number[];

    if (arguments.length === 3) {
      universe = arguments[0];
      channel = arguments[1];
      value = arguments[2];
    } else if (arguments.length === 2) {
      channel = arguments[0];
      value = arguments[1];
    } else if (arguments.length === 1) {
      channel = 0;
      value = arguments[0];
    } else {
      return false;
    }

    universe ??= 0;

    const universeData = this.data[universe] ?? new Array(512).fill(0);
    this.data[universe] = universeData;

    this.dataChanged[universe] ??= 0;

    let index: number;
    if (typeof value === "object" && value.length > 0) {
      value.forEach((val, i) => {
        index = channel + i;
        this.setDataChanged(universeData, universe, index, val);
      });
    } else {
      this.setDataChanged(universeData, universe, channel, value as number);
    }

    if (this.dataChanged[universe]) {
      await this.send(universe);
    }

    return true;
  }

  private setDataChanged(
    universeData: (number | null)[],
    universe: number,
    channel: number,
    value: number,
  ): void {
    if (typeof value === "number" && universeData[channel] !== value) {
      universeData[channel] = value ?? 0;
      if (!this.dataChanged[universe] || channel > this.dataChanged[universe]) {
        this.dataChanged[universe] = channel + 1;
      }
    }
  }

  /**
   * Sends an ArtNet ArtTrigger packet. ArtTriggers are typically device specific and perform functions like starting and stopping shows.
   * Every parameter except the key is optional. If you supply an oem, you need to supply a subkey also.
   * Triggers are NEVER throttled, as they are time sensitive. They are always sent immediately upon processing.
   * @param oem uint15
   * @param subkey uint9
   * @param  key uint8
   */
  public async trigger(key: number): Promise<boolean>;
  public async trigger(subkey: number, key: number): Promise<boolean>;
  public async trigger(
    oem: number,
    subkey: number,
    key: number,
  ): Promise<boolean>;
  public async trigger(
    arg1: number,
    arg2?: number,
    arg3?: number,
  ): Promise<boolean> {
    let oem: number | undefined = undefined;
    let subKey: number;
    let key: number;

    switch (arguments.length) {
      case 3:
        oem = arguments[0];
        subKey = arguments[1];
        key = arguments[2];
        break;
      case 2:
        subKey = arguments[0];
        key = arguments[1];
        break;
      case 1:
        subKey = 0;
        key = arguments[0];
        break;
      default:
        return false;
    }

    oem = oem ?? 0xffff; // Most devices respond to "0xFFFF", which is considered a triggered broadcast.
    key = key ?? 0xff;

    await this.socketSend({
      type: OP_CODES.TRIGGER,
      oem,
      key,
      subKey,
      data: new Array(512).fill(0),
    });

    return true;
  }

  /**
   * Closes the connection and stops the send interval.
   */
  public close(): Promise<void> {
    if (!this.socket) {
      return Promise.resolve();
    }

    this.interval.forEach((interval) => {
      clearInterval(interval);
    });

    this.sendThrottle.forEach((interval) => {
      if (interval) clearTimeout(interval);
    });

    if (this.pollReplyTimeout) {
      clearTimeout(this.pollReplyTimeout);
    }

    return new Promise<void>((resolve, reject) => {
      this.socket.close().then(resolve).catch(reject);
    });
  }

  /**
   * Change the Art-Net hostname/address after initialization
   */
  public setHost(host: string): void {
    this.socket.setHost(host);
  }

  /**
   * Change the Art-Net port after initialization. Does not work when using the broadcast address 255.255.255.255.
   */
  public setPort(port: number): void {
    this.socket.setPort(port);
  }

  private startRefresh(universe: number): void {
    this.interval[universe] = setInterval(() => {
      this.send(universe, true);
    }, this.refresh);
  }

  /**
   * If refresh is set to true all 512 channels will be sent, otherwise from channel 1 to the last changed channel
   */
  private async send(universe: number, refresh = false): Promise<void> {
    if (this.sendAll) {
      refresh = true;
    }

    if (!this.interval[universe]) {
      this.startRefresh(universe);
    }

    if (this.sendThrottle[universe]) {
      this.sendDelayed[universe] = true;
      return;
    }

    this.throttleUniverse(universe);

    const { low: subUni, high: net } = splitInt16(universe);
    const message: IDmx = {
      data:
        this.data[universe]?.slice(
          0,
          refresh ? 512 : this.dataChanged[universe],
        ) ?? [],
      sequence: 0,
      physical: 0,
      subUni,
      net,
    };

    await this.socketSend({
      type: OP_CODES.DMX,
      ...message,
    });
    this.dataChanged[universe] = 0;
  }

  private async socketSend(message: IArtNetMesssage): Promise<number> {
    return this.socket.send(message);
  }

  private throttleUniverse(universe: number): void {
    if (this.sendThrottle[universe] !== null) {
      clearTimeout(this.sendThrottle[universe]);
    }

    this.sendThrottle[universe] = setTimeout(() => {
      this.sendThrottle[universe] = null;
      if (this.sendDelayed[universe]) {
        this.sendDelayed[universe] = false;
        void this.send(universe);
      }
    }, 25);
  }
}
