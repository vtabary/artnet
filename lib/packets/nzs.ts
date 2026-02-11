import { mergeInt16, splitInt16 } from "../utils/int16.js";

export interface INZS {
  /**
   * Art-Net protocol revision number
   */
  protocol?: number;
  sequence: number;
  startCode: number;
  subUni: number;
  net: number;
  data: number[];
}

interface IVLCPart {
  /**
   * Use a combination of VLC_FLAGS
   */
  flags: number;
  transaction: number;
  slotAddress: number;
  payCount: number;
  payCheck: number;
  depth: number;
  freq: number;
  modulation: number;
  payLang: VLC_PAYLOAD_LANG;
  beaconRepeat: number;
}

export interface IVLC extends INZS, IVLCPart {}

export enum VLC_FLAGS {
  IEEE = 0b10000000,
  REPLY = 0b01000000,
  BEACON = 0b00100000,
}

export enum VLC_PAYLOAD_LANG {
  BEACON_URL = 0x0000,
  TEXT = 0x0001,
  LOCATION_ID = 0x0002,
}

function isVLCData(data: INZS): data is IVLC {
  return Object.hasOwn(data, "flags");
}

function isVLCPacket(data: number[]): boolean {
  return (
    data[13] === 0x91 &&
    data[18] === 0x41 &&
    data[19] === 0x4c &&
    data[20] === 0x45
  );
}

function buildVLCContent(data: IVLCPart): number[] {
  const transaction = splitInt16(data.transaction ?? 0);
  const slotAddress = splitInt16(data.slotAddress ?? 0);
  const payCount = splitInt16(data.payCount ?? 0);
  const payCheck = splitInt16(data.payCheck ?? 0);
  const freq = splitInt16(data.freq ?? 0);
  const modulation = splitInt16(data.modulation ?? 0);
  const beaconRepeat = splitInt16(data.beaconRepeat ?? 0);
  const payLang = splitInt16(data.payLang ?? 0);

  return [
    0x41,
    0x4c,
    0x45,
    data.flags,
    transaction.high,
    transaction.low,
    slotAddress.high,
    slotAddress.low,
    payCount.high,
    payCount.low,
    payCheck.high,
    payCheck.low,
    0,
    data.depth,
    freq.high,
    freq.low,
    modulation.high,
    modulation.low,
    payLang.high,
    payLang.low,
    beaconRepeat.high,
    beaconRepeat.low,
  ];
}

export function buildContent(data: INZS | IVLC): number[] {
  const protocol = splitInt16(data.protocol ?? 0x000e);
  const vlcData = isVLCData(data) ? buildVLCContent(data) : [];
  const dataLength = splitInt16(data.data.length + vlcData.length);

  return [
    // Protocol
    protocol.high, // Protocol Version High
    protocol.low, // Protocol Version Low
    data.sequence,
    data.startCode,
    data.subUni,
    data.net,
    dataLength.high,
    dataLength.low,
    ...vlcData,
    ...data.data,
  ];
}

function parseVLCContent(packet: number[]): IVLCPart {
  return {
    flags: packet[21] ?? 0,
    transaction: mergeInt16(packet[23] ?? 0, packet[22] ?? 0),
    slotAddress: mergeInt16(packet[25] ?? 0, packet[24] ?? 0),
    payCount: mergeInt16(packet[27] ?? 0, packet[26] ?? 0),
    payCheck: mergeInt16(packet[29] ?? 0, packet[28] ?? 0),
    depth: packet[30] ?? 0,
    freq: mergeInt16(packet[32] ?? 0, packet[31] ?? 0),
    modulation: mergeInt16(packet[34] ?? 0, packet[33] ?? 0),
    payLang: mergeInt16(packet[36] ?? 0, packet[35] ?? 0),
    beaconRepeat: mergeInt16(packet[38] ?? 0, packet[37] ?? 0),
  };
}

export function parseContent(packet: number[]): INZS | IVLC {
  const dataLength = mergeInt16(packet[17] ?? 0, packet[16] ?? 0);

  return {
    protocol: mergeInt16(packet[11] ?? 0, packet[10] ?? 0),
    sequence: packet[12] ?? 0,
    startCode: packet[13] ?? 0,
    subUni: packet[14] ?? 0,
    net: packet[15] ?? 0,
    data: packet.slice(18, 18 + dataLength),
    ...(isVLCPacket(packet) ? parseVLCContent(packet) : {}),
  };
}
