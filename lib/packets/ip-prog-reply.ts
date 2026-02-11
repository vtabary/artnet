import { mergeInt16, splitInt16 } from "../utils/int16.js";

export interface IIpProgReply {
  /**
   * Art-Net protocol revision number
   */
  protocol?: number;
  progIp: [number, number, number, number];
  /**
   * Subnet mask of Node.
   */
  progSm: [number, number, number, number];
  /**
   * Deprecated
   */
  progPort: number;
  /**
   * Use a combination of STATUS
   */
  status: number;
  /**
   * Default Gateway to be programmed into Node if enabled by Command Field
   */
  progDg: [number, number, number, number];
}

export enum STATUS {
  DHCP_ENABLED = 0x01000000,
}

export function buildContent(data: IIpProgReply): number[] {
  const protocol = splitInt16(data.protocol ?? 0x000e);
  const progPort = splitInt16(data.progPort ?? 0);

  return [
    // Protocol
    protocol.high, // Protocol Version High
    protocol.low, // Protocol Version Low
    0, // Pad length to match ArtPoll
    0, // Pad length to match ArtPoll
    0, // Pad length to match ArtIpProg
    0, // Pad length to match ArtIpProg
    ...data.progIp,
    ...data.progSm,
    progPort.high,
    progPort.low,
    data.status,
    0, // Transmit as zero, receivers don’t test
    ...data.progDg,
    0, // Transmit as zero, receivers don’t test
    0, // Transmit as zero, receivers don’t test
  ];
}

export function parseContent(packet: number[]): IIpProgReply {
  return {
    protocol: mergeInt16(packet[11] ?? 0, packet[10] ?? 0),
    progIp: packet.slice(16, 20) as [number, number, number, number],
    progSm: packet.slice(20, 24) as [number, number, number, number],
    progPort: mergeInt16(packet[26] ?? 0, packet[25] ?? 0),
    status: packet[27] ?? 0,
    progDg: packet.slice(29, 33) as [number, number, number, number],
  };
}
