import { mergeInt16, splitInt16 } from "../utils/int16.js";

export interface IDmx {
  /**
   * Art-Net protocol revision number
   */
  protocol?: number;
  sequence: number;
  physical: number;
  /**
   * The low byte of the 15 bit Port-Address to which this packet is destined.
   */
  subUni: number;
  /**
   * The top 7 bits of the 15 bit Port-Address to which this packet is destined.
   */
  net: number;
  data: number[];
}

export function buildContent(data: IDmx): number[] {
  const protocol = splitInt16(data.protocol ?? 0x000e);
  const dataLength = splitInt16(data.data.length ?? 0);

  return [
    // Protocol
    protocol.high, // Protocol Version High
    protocol.low, // Protocol Version Low
    data.sequence,
    data.physical,
    data.subUni,
    data.net,
    dataLength.high,
    dataLength.low,
    ...data.data,
  ];
}

export function parseContent(packet: number[]): IDmx {
  const dataLength = mergeInt16(packet[17] ?? 0, packet[16] ?? 0);

  return {
    protocol: mergeInt16(packet[11] ?? 0, packet[10] ?? 0),
    sequence: packet[12] ?? 0,
    physical: packet[13] ?? 0,
    subUni: packet[14] ?? 0,
    net: packet[15] ?? 0,
    data: packet.slice(18, 18 + dataLength),
  };
}
