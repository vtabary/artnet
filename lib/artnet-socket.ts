import dgram from "node:dgram";
import { EventEmitter } from "node:events";
import type { IArtNetMessage } from "./definitions.js";
import { buildPacket, parsePacket } from "./packet.js";
export class ArtNetSocket {
  private socketListener: dgram.Socket | null = null;
  private socketSender: dgram.Socket | null = null;

  /**
   * @default "255.255.255.255"
   */
  private host = "255.255.255.255";
  /**
   * @default 6454
   */
  private port = 6454;
  private readonly iface: string | undefined;
  /**
   * Events managers
   */
  private readonly _events = new EventEmitter<{
    message: [
      IArtNetMessage,
      number[],
      { address: string; family: string; port: number; size: number },
    ];
  }>();

  constructor(options: {
    /**
     * The address when message are sent.
     * 255.255.255.255 means broadcasting on all interface
     * @default "127.0.0.1"
     */
    host?: string;
    /**
     * @default 6454
     */
    port?: number;
    /**
     * optional string IP address
     * bind udp socket to specific network interface for listening
     * when undefined, the socket will listen to all interface
     */
    iface?: string;
  }) {
    /* eslint-disable no-multi-spaces */
    this.host = options.host ?? "127.0.0.1";
    this.iface = options.iface;
    this.port = options.port ?? 6454;
  }

  public get events(): EventEmitter<{
    message: [
      IArtNetMessage,
      number[],
      { address: string; family: string; port: number; size: number },
    ];
  }> {
    return this._events;
  }

  private async bind(port: number, address?: string): Promise<dgram.Socket> {
    const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });

    return new Promise((resolve, reject) => {
      socket.once("error", (e) => {
        socket.close();
        reject(e);
      });

      // iface defined : bind on this IP ; otherwise all the interfaces
      const onListening = () => {
        socket.setBroadcast(true);
        resolve(socket);
      };
      if (address) socket.bind(port, address, onListening);
      else socket.bind(port, onListening);
    });
  }

  public async listen(): Promise<void> {
    if (this.socketListener) {
      throw new Error("Listener is already opened. Close it first");
    }

    const socket = await this.bind(this.port, this.iface);
    this.socketListener = socket;

    const isBroadcast =
      this.host === "255.255.255.255" || this.host.endsWith(".255");

    socket.on("message", (message, rinfo) => {
      // Ignore packets from an other source in unicast
      if (!isBroadcast && rinfo.address !== this.host) return;
      this.events.emit(
        "message",
        parsePacket(Array.from(message)),
        [...message],
        rinfo,
      );
    });
  }

  /**
   * Closes the connection and stops the send interval.
   */
  public async close(): Promise<void> {
    await this.closeListener();
    await this.closeSender();
  }

  private async closeListener(): Promise<void> {
    if (!this.socketListener) {
      return;
    }
    let socket = this.socketListener;
    await new Promise((resolve) => socket.close(() => resolve(undefined)));
    this.socketListener = null;
  }

  private async closeSender(): Promise<void> {
    if (!this.socketSender) {
      return;
    }

    const socket = this.socketSender;
    await new Promise((resolve) => socket.close(() => resolve(undefined)));
    this.socketSender = null;
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
    if (this.socketListener) {
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
  public async send(message: IArtNetMessage): Promise<number> {
    let socket = this.socketSender;
    if (!socket) {
      socket = await this.bind(0, this.host);
      this.socketSender = socket;
    }
    const buf = Buffer.from(buildPacket(message));

    return new Promise((resolve, reject) =>
      socket.send(buf, 0, buf.length, this.port, this.host, (err, bytes) => {
        if (err) {
          reject(err);
        } else {
          resolve(bytes);
        }
      }),
    );
  }
}
