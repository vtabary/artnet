import { mergeInt16, splitInt16 } from "../utils/int16.js";

export interface ISync {
  /**
   * Art-Net protocol revision number
   */
  protocol?: number;
}

export function buildContent(data: ISync): number[] {
  const protocol = splitInt16(data.protocol ?? 0x000e);

  return [
    // Protocol
    protocol.high, // Protocol Version High
    protocol.low, // Protocol Version Low
    0,
    0,
  ];
}

export function parseContent(packet: number[]): ISync {
  const protocol = mergeInt16(packet[11] ?? 0, packet[10] ?? 0);

  return {
    protocol,
  };
}
