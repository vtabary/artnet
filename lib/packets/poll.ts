import { mergeInt16, splitInt16 } from "../utils/int16.js";
import { PRIORITY } from "./definitions.js";

export interface IPoll {
  /**
   * Art-Net protocol revision number
   */
  protocol?: number;
  flags: number;
  diagPriority: PRIORITY;
  topTargetPort?: number;
  bottomTargetPort?: number;
  estaManufacturer?: number;
  oem?: number;
}

export enum FLAGS {
  ENABLE_TARGETED_MODE = 0b00100000,
  ENABLE_VLC_TRANSMISSION = 0b00010000,
  DIAGNOSTICS_UNICAST = 0b00001000,
  DIAGNOSTICS = 0b00000100,
  POLL_REPLY_ON_CHANGE = 0b00000010,
}

export function buildContent(data: IPoll): number[] {
  const topTargetPort = splitInt16(data.topTargetPort ?? 0);
  const bottomTargetPort = splitInt16(data.bottomTargetPort ?? 0);
  const estaManufacturer = splitInt16(data.estaManufacturer ?? 0);
  const oem = splitInt16(data.oem ?? 0);
  const protocol = splitInt16(data.protocol ?? 0x000e);

  return [
    // Protocol
    protocol.high, // Protocol Version High
    protocol.low, // Protocol Version Low
    data.flags, // Flags
    data.diagPriority, // Diag priority
    topTargetPort.high, // Top Target port High
    topTargetPort.low, // Top Target port Low
    bottomTargetPort.high, // Bottom Target port High
    bottomTargetPort.low, // Bottom Target port Low
    estaManufacturer.high, // Esta Manufacturer code High
    estaManufacturer.low, // Esta Manufacturer code Low
    oem.high, // Oem High
    oem.low, // Oem Low
  ];
}

export function parseContent(packet: number[]): IPoll {
  const protocol = mergeInt16(packet[11] ?? 0, packet[10] ?? 0);

  return {
    protocol,
    flags: packet[12] ?? 0,
    diagPriority: packet[13] ?? PRIORITY.LOW,
    topTargetPort: mergeInt16(packet[15] ?? 0, packet[14] ?? 0),
    bottomTargetPort: mergeInt16(packet[17] ?? 0, packet[16] ?? 0),
    estaManufacturer: mergeInt16(packet[19] ?? 0, packet[18] ?? 0),
    oem: mergeInt16(packet[21] ?? 0, packet[20] ?? 0),
  };
}
