import { mergeInt16, splitInt16 } from "../utils/int16.js";
import type { DATA_REQUEST } from "./definitions.js";

export interface IDataReply {
  /**
   * Art-Net protocol revision number
   */
  protocol?: number;
  /**
   * The ESTA Manufacturer code
   */
  estaManufacturer: number;
  oem: number;
  request: DATA_REQUEST;
  payload: string;
}

export function buildContent(data: IDataReply): number[] {
  const protocol = splitInt16(data.protocol ?? 0x000e);
  const estaManufacturer = splitInt16(data.estaManufacturer ?? 0);
  const oem = splitInt16(data.oem ?? 0);
  const request = splitInt16(data.request ?? 0);
  const payloadLength = splitInt16(data.payload.length ?? 0);

  return [
    // Protocol
    protocol.high, // Protocol Version High
    protocol.low, // Protocol Version Low
    estaManufacturer.high, // Esta Manufacturer code High
    estaManufacturer.low, // Esta Manufacturer code Low
    oem.high, // Oem High
    oem.low, // Oem Low
    request.high, // Request high
    request.low, // Request low
    payloadLength.high,
    payloadLength.low,
    ...Buffer.from(data.payload.slice(0, 511)),
  ];
}

export function parseContent(packet: number[]): IDataReply {
  return {
    protocol: mergeInt16(packet[11] ?? 0, packet[10] ?? 0),
    estaManufacturer: mergeInt16(packet[13] ?? 0, packet[12] ?? 0),
    oem: mergeInt16(packet[15] ?? 0, packet[14] ?? 0),
    request: mergeInt16(packet[17] ?? 0, packet[16] ?? 0),
    payload: Buffer.from(packet.slice(20)).toString(),
  };
}
