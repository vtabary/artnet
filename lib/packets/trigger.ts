import { mergeInt16, splitInt16 } from "../utils/int16.js";

export interface ITrigger {
  /**
   * Art-Net protocol revision number
   */
  protocol?: number;
  oem: number;
  key: TRIGGER_KEY_VALUES;
  subKey: number;
  data: string;
}

export enum TRIGGER_KEY_VALUES {
  KEY_ASCII = 0,
  KEY_MACRO = 1,
  KEY_SOFT = 2,
  KEY_SHOW = 3,
}

export function buildContent(data: ITrigger): number[] {
  const protocol = splitInt16(data.protocol ?? 0x000e);
  const oem = splitInt16(data.oem ?? 0);

  return [
    // Protocol
    protocol.high, // Protocol Version High
    protocol.low, // Protocol Version Low
    0,
    0,
    oem.high, // Oem High
    oem.low, // Oem Low
    data.key,
    data.subKey,
    ...Buffer.from(data.data.slice(0, 511)),
    ...new Array(512 - data.data.length).fill(0),
  ];
}

export function parseContent(packet: number[]): ITrigger {
  return {
    protocol: mergeInt16(packet[11] ?? 0, packet[10] ?? 0),
    oem: mergeInt16(packet[13] ?? 0, packet[12] ?? 0),
    key: packet[14] ?? TRIGGER_KEY_VALUES.KEY_ASCII,
    subKey: packet[15] ?? 0,
    data: Buffer.from(packet.slice(16)).toString(),
  };
}
