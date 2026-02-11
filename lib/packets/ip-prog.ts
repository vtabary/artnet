import { mergeInt16, splitInt16 } from "../utils/int16.js";

export interface IIpProg {
  /**
   * Art-Net protocol revision number
   */
  protocol?: number;
  /**
   * Use a combination of COMMAND
   */
  command: number;
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
   * Default Gateway to be programmed into Node if enabled by Command Field
   */
  progDg: [number, number, number, number];
}

export enum IP_PROG_COMMAND {
  ENABLE_PROGRAMMING = 0x10000000,
  ENABLE_DHCP = 0x01000000,
  PROGRAM_DEFAULT_GATEWAY = 0x00010000,
  /**
   * Set to return all three parameters to default
   */
  RETURN_TO_DEFAULT = 0x00001000,
  PROGRAM_IP_ADDRESS = 0x00000100,
  PROGRAM_SUBNET_MASK = 0x00000010,
  PROGRAM_PORT = 0x00000001,
}

export function buildContent(data: IIpProg): number[] {
  const protocol = splitInt16(data.protocol ?? 0x000e);
  const progPort = splitInt16(data.progPort ?? 0);

  return [
    // Protocol
    protocol.high, // Protocol Version High
    protocol.low, // Protocol Version Low
    0, // Pad length to match ArtPoll.
    0, // Pad length to match ArtPoll.
    data.command,
    0, // Set to zero. Pads data structure for word alignment.
    ...data.progIp,
    ...data.progSm,
    progPort.high,
    progPort.low,
    ...data.progDg,
    0, // Transmit as zero, receivers don’t test
    0, // Transmit as zero, receivers don’t test
    0, // Transmit as zero, receivers don’t test
    0, // Transmit as zero, receivers don’t test
  ];
}

export function parseContent(packet: number[]): IIpProg {
  return {
    protocol: mergeInt16(packet[11] ?? 0, packet[10] ?? 0),
    command: packet[14] ?? 0,
    progIp: packet.slice(16, 20) as [number, number, number, number],
    progSm: packet.slice(20, 24) as [number, number, number, number],
    progPort: mergeInt16(packet[26] ?? 0, packet[25] ?? 0),
    progDg: packet.slice(28, 32) as [number, number, number, number],
  };
}
