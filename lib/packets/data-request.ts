import { mergeInt16, splitInt16 } from "../utils/int16.js";

export interface IDataRequest {
  /**
   * Art-Net protocol revision number
   */
  protocol?: number;
  estaManufacturer: number;
  oem: number;
  request: number;
}

export function buildContent(data: IDataRequest): number[] {
  const protocol = splitInt16(data.protocol ?? 0x000e);
  const estaManufacturer = splitInt16(data.estaManufacturer ?? 0);
  const oem = splitInt16(data.oem ?? 0);
  const request = splitInt16(data.request ?? 0);

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
  ];
}

export function parseContent(packet: number[]): IDataRequest {
  return {
    protocol: mergeInt16(packet[11] ?? 0, packet[10] ?? 0),
    estaManufacturer: mergeInt16(packet[13] ?? 0, packet[12] ?? 0),
    oem: mergeInt16(packet[15] ?? 0, packet[14] ?? 0),
    request: mergeInt16(packet[17] ?? 0, packet[16] ?? 0),
  };
}
