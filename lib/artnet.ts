import dgram from "node:dgram";

/**
 * See http://www.artisticlicence.com/WebSiteMaster/User%20Guides/art-net.pdf page 40
 */
function triggerPackage(oem: number, key: number, subkey: number): Buffer {
  /* eslint-disable unicorn/number-literal-case */
  const hOem = (oem >> 8) & 0xff;
  const lOem = oem & 0xff;

  const header = [
    65,
    114,
    116,
    45,
    78,
    101,
    116,
    0,
    0,
    153,
    0,
    14,
    0,
    0,
    hOem,
    lOem,
    key,
    subkey,
  ];

  // Payload is manufacturer specific
  const payload = new Array<null>(512).fill(null);

  return Buffer.from([...header, ...payload] as number[]);
}

export class ArtNet {
  private readonly socket: dgram.Socket;

  /**
   * Index of the following arrays is the universe
   */
  private readonly data: (null | number)[][] = []; // The 512 dmx channels
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
   * @default "255.255.255.255"
   */
  private host = "255.255.255.255";
  /**
   * @default 6454
   */
  private port = 6454;

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
  }) {
    /* eslint-disable no-multi-spaces */
    this.host = options.host ?? "255.255.255.255";
    this.port = options.port ?? 6454;
    this.refresh = options.refresh ?? 4000;
    this.sendAll = options.sendAll ?? false;

    this.socket = dgram.createSocket({ type: "udp4", reuseAddr: true });

    this.socket.on("error", (err) => {
      this.emit("error", err);
    });

    if (options.iface && this.host === "255.255.255.255") {
      this.socket.bind(this.port, options.iface, () => {
        this.socket.setBroadcast(true);
      });
      /* eslint-disable unicorn/prefer-starts-ends-with */
    } else if (new RegExp(/255$/).exec(this.host)) {
      this.socket.bind(this.port, () => {
        this.socket.setBroadcast(true);
      });
    }
  }

  public emit(event: string, ...args: any[]) {}

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
      channel = 1;
      value = arguments[0];
    } else {
      return false;
    }

    universe ??= 0;

    const universeData = this.data[universe] ?? new Array<null>(512).fill(null);
    this.data[universe] = universeData;

    this.dataChanged[universe] ??= 0;

    let index: number;
    if (typeof value === "object" && value.length > 0) {
      value.forEach((val, i) => {
        index = channel + i - 1;
        this.setDataChanged(universeData, universe, index + 1, val);
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
    if (typeof value === "number" && universeData[channel - 1] !== value) {
      universeData[channel - 1] = value ?? null;
      if (!this.dataChanged[universe] || channel > this.dataChanged[universe]) {
        this.dataChanged[universe] = channel;
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
    let subkey: number;
    let key: number;

    switch (arguments.length) {
      case 3:
        oem = arguments[0];
        subkey = arguments[1];
        key = arguments[2];
        break;
      case 2:
        subkey = arguments[0];
        key = arguments[1];
        break;
      case 1:
        subkey = 0;
        key = arguments[0];
        break;
      default:
        return false;
    }

    oem = oem ?? 65535; // Most devices respond to "0xFFFF", which is considered a triggered broadcast.
    key = key ?? 255;

    await this.sendTrigger(oem, key, subkey);

    return true;
  }

  /**
   * Closes the connection and stops the send interval.
   */
  public close(): void {
    this.interval.forEach((interval) => {
      clearInterval(interval);
    });

    this.sendThrottle.forEach((interval) => {
      if (interval) clearTimeout(interval);
    });

    this.socket.close();
  }

  /**
   * Change the Art-Net hostname/address after initialization
   */
  public setHost(host: string): void {
    this.host = host;
  }

  /**
   * Change the Art-Net port after initialization. Does not work when using the broadcast address 255.255.255.255.
   */
  public setPort(port: number): void {
    if (this.host === "255.255.255.255") {
      throw new Error(
        "Can't change port when using broadcast address 255.255.255.255",
      );
    }

    this.port = port;
  }

  /**
   * See http://www.artisticlicence.com/WebSiteMaster/User%20Guides/art-net.pdf page 45
   */
  private artdmxPackage(universe: number, length = 2): Buffer {
    if (length % 2) {
      length += 1;
    }

    const hUni = (universe >> 8) & 0xff;
    const lUni = universe & 0xff;

    const hLen = (length >> 8) & 0xff;
    const lLen = length & 0xff;

    const header: number[] = [
      65,
      114,
      116,
      45,
      78,
      101,
      116,
      0,
      0,
      80,
      0,
      14,
      0,
      0,
      lUni,
      hUni,
      hLen,
      lLen,
    ];

    this.data[universe] ??= new Array<null>(512).fill(null);

    return Buffer.from([
      ...header,
      ...(this.data[universe].slice(0, hLen * 256 + lLen) as number[]),
    ]);
  }

  private startRefresh(universe: number): void {
    this.interval[universe] = setInterval(() => {
      this.send(universe, true);
    }, this.refresh);
  }

  /**
   * Triggers should always be sent, never throttled
   */
  private async sendTrigger(
    oem: number,
    key: number,
    subkey: number,
  ): Promise<void> {
    const buf = triggerPackage(oem, key, subkey);
    await this.socketSend(buf);
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

    const buf = this.artdmxPackage(
      universe,
      refresh ? 512 : this.dataChanged[universe],
    );
    this.dataChanged[universe] = 0;
    await this.socketSend(buf);
  }

  private socketSend(buf: string | Buffer<ArrayBufferLike>): Promise<number> {
    return new Promise((resolve, reject) =>
      this.socket.send(
        buf,
        0,
        buf.length,
        this.port,
        this.host,
        (err, bytes) => {
          if (err) reject(err);
          else resolve(bytes);
        },
      ),
    );
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
