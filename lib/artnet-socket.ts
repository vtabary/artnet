import dgram from "node:dgram";
import { EventEmitter } from "node:events";
import type { IArtNetMesssage } from "./definitions.js";
import { buildPacket, parsePacket } from "./packet.js";

export class ArtNetSocket {
  private readonly socket: dgram.Socket;
  private socketOpened = false;

  /**
   * @default "255.255.255.255"
   */
  private host = "255.255.255.255";
  /**
   * @default 6454
   */
  private port = 6454;
  private readonly iface: string;
  /**
   * Events managers
   */
  private readonly eventEmitter = new EventEmitter();

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
     * optional string IP address
     * bind udp socket to specific network interface
     */
    iface?: string;
  }) {
    /* eslint-disable no-multi-spaces */
    this.host = options.host ?? "255.255.255.255";
    this.iface = options.iface ?? "";
    this.port = options.port ?? 6454;

    this.socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
  }

  public open() {
    if (this.socketOpened) {
      throw new Error("Socket is already opened. Close the socket first");
    }

    this.socket.on("message", (message: Buffer) => {
      this.eventEmitter.emit(
        "message",
        parsePacket(Array.from(message)),
        message,
      );
    });

    if (this.iface && this.host === "255.255.255.255") {
      this.socket.bind(this.port, this.iface, () => {
        this.socket?.setBroadcast(true);
      });
      /* eslint-disable unicorn/prefer-starts-ends-with */
    } else if (new RegExp(/255$/).exec(this.host)) {
      this.socket.bind(this.port, () => {
        this.socket?.setBroadcast(true);
      });
    }

    this.socketOpened = true;
  }

  public onMessage(
    cb: (message: IArtNetMesssage, packet: number[]) => void,
  ): void {
    this.eventEmitter.on("message", cb);
  }

  /**
   * Closes the connection and stops the send interval.
   */
  public close(): Promise<void> {
    if (!this.socketOpened) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.socket.close(resolve);
    });
  }

  /**
   * Change the Art-Net hostname/address after initialization
   */
  public setHost(host: string): void {
    if (this.socketOpened) {
      throw new Error(
        "Socket is already opened. Close the socket before changing the host",
      );
    }

    this.host = host;
  }

  /**
   * Change the Art-Net port after initialization. Does not work when using the broadcast address 255.255.255.255.
   */
  public setPort(port: number): void {
    if (this.socketOpened) {
      throw new Error(
        "Socket is already opened. Close the socket before changing the port",
      );
    }

    if (this.host === "255.255.255.255") {
      throw new Error(
        "Can't change port when using broadcast address 255.255.255.255",
      );
    }

    this.port = port;
  }

  /**
   * If refresh is set to true all 512 channels will be sent, otherwise from channel 1 to the last changed channel
   */
  public async send(message: IArtNetMesssage): Promise<number> {
    if (!this.socketOpened) {
      throw new Error("Socket not initialized. Open the socket first.");
    }

    const buf = Buffer.from(buildPacket(message));

    return new Promise((resolve, reject) =>
      this.socket?.send(
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
}
