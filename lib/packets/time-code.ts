import { mergeInt16, splitInt16 } from "../utils/int16.js";

export interface ITimeCode {
  /**
   * Art-Net protocol revision number
   */
  protocol?: number;
  streamId: number;
  frames: number;
  seconds: number;
  minutes: number;
  hours: number;
  type: TIME_CODE_TYPE;
}

export const enum TIME_CODE_TYPE {
  FILM = 0,
  EBU = 1,
  DF = 2,
  SMPTE = 3,
}

export function buildContent(data: ITimeCode): number[] {
  const protocol = splitInt16(data.protocol ?? 0x000e);

  return [
    // Protocol
    protocol.high, // Protocol Version High
    protocol.low, // Protocol Version Low
    0,
    data.streamId,
    data.frames,
    data.seconds,
    data.minutes,
    data.hours,
    data.type,
  ];
}

export function parseContent(packet: number[]): ITimeCode {
  const protocol = mergeInt16(packet[11] ?? 0, packet[10] ?? 0);

  return {
    protocol,
    streamId: packet[13] ?? 0,
    frames: packet[14] ?? 0,
    seconds: packet[15] ?? 0,
    minutes: packet[16] ?? 0,
    hours: packet[17] ?? 0,
    type: packet[18] ?? TIME_CODE_TYPE.FILM,
  };
}
