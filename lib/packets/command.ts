import { mergeInt16, splitInt16 } from "../utils/int16.js";

export interface ICommand {
  /**
   * Art-Net protocol revision number
   */
  protocol?: number;
  /**
   * The ESTA Manufacturer code
   */
  estaManufacturer: number;
  data: string;
}

export function buildContent(data: ICommand): number[] {
  const protocol = splitInt16(data.protocol ?? 0x000e);
  const estaManufacturer = splitInt16(data.estaManufacturer ?? 0);
  const payloadLength = splitInt16(data.data.length ?? 0);

  return [
    // Protocol
    protocol.high, // Protocol Version High
    protocol.low, // Protocol Version Low
    estaManufacturer.high, // Esta Manufacturer code High
    estaManufacturer.low, // Esta Manufacturer code Low
    payloadLength.high,
    payloadLength.low,
    ...Buffer.from(data.data.slice(0, 511)),
    0,
  ];
}

export function parseContent(packet: number[]): ICommand {
  return {
    protocol: mergeInt16(packet[11] ?? 0, packet[10] ?? 0),
    estaManufacturer: mergeInt16(packet[13] ?? 0, packet[12] ?? 0),
    data: Buffer.from(packet.slice(16)).toString(),
  };
}
