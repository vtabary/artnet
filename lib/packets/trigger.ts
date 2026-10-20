import { mergeInt16, splitInt16 } from "../utils/int16.js";

export interface ITrigger {
  /**
   * Art-Net protocol revision number
   */
  protocol?: number;
  /**
   * The Oem code of nodes that shall accept this trigger
   */
  oem: number;
  /**
   * The Key is an 8-bit number which defines the purpose of the packet. The interpretation
   * of this field is dependent upon the Oem code. If the Oem code is set to a value other
   * than 0xffff then the Key and SubKey fields are manufacturer specific.
   */
  key: TRIGGER_KEY_VALUES;
  /**
   * The SubKey is an 8-bit number. The interpretation of this field is dependent upon the
   * Oem code. If the Oem code is set to a value other than ffff16 then the Key and SubKey
   * fields are manufacturer specific.
   */
  subKey: number;
  /**
   * The Payload is a fixed length array of 512, bytes. The interpretation of this field is
   * dependent upon the Oem code. If the Oem code is set to a value other than 0xffff then
   * the Payload is manufacturer specific
   */
  data: Buffer;
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
    data: Buffer.from(packet.slice(16)),
  };
}
