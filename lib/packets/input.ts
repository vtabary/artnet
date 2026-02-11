import { mergeInt16, splitInt16 } from "../utils/int16.js";

export interface IInput {
  /**
   * Art-Net protocol revision number
   */
  protocol?: number;
  bindIndex: number;
  numPorts: number;
  input: [number, number, number, number];
}

export function buildContent(data: IInput): number[] {
  const protocol = splitInt16(data.protocol ?? 0x000e);
  const numPorts = splitInt16(data.numPorts ?? 0);

  return [
    // Protocol
    protocol.high, // Protocol Version High
    protocol.low, // Protocol Version Low
    0,
    data.bindIndex,
    numPorts.high,
    numPorts.low,
    ...data.input,
  ];
}

export function parseContent(packet: number[]): IInput {
  const protocol = mergeInt16(packet[11] ?? 0, packet[10] ?? 0);
  const numPorts = mergeInt16(packet[15] ?? 0, packet[14] ?? 0);

  return {
    protocol,
    bindIndex: packet[13] ?? 0,
    numPorts: numPorts,
    input: packet.slice(16, 20) as [number, number, number, number],
  };
}
