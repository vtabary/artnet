import { mergeInt16, splitInt16 } from "../utils/int16.js";
import { PRIORITY } from "./definitions.js";

export interface IDiagData {
  /**
   * Art-Net protocol revision number
   */
  protocol?: number;
  diagPriority: PRIORITY;
  logicalPort: number;
  data: string;
}

export function buildContent(data: IDiagData): number[] {
  const protocol = splitInt16(data.protocol ?? 0x000e);
  const length = splitInt16(data.data.length ?? 0);
  const payload = data.data.slice(0, 511);

  return [
    // Protocol
    protocol.high, // Protocol Version High
    protocol.low, // Protocol Version Low
    0, // Ignore by receiver, set to zero by sender.
    data.diagPriority,
    data.logicalPort,
    0, // Ignore by receiver, set to zero by sender.
    length.high,
    length.low,
    ...Buffer.from(payload),
  ];
}

export function parseContent(packet: number[]): IDiagData {
  const protocol = mergeInt16(packet[11] ?? 0, packet[10] ?? 0);

  return {
    protocol,
    diagPriority: packet[13] ?? PRIORITY.LOW,
    logicalPort: packet[14] ?? 0,
    data: Buffer.from(packet.slice(18)).toString(),
  };
}
