import { mergeInt16, splitInt16 } from "../utils/int16.js";

export interface IAddress {
  /**
   * Art-Net protocol revision number
   */
  protocol?: number;
  netSwitch: number;
  bindIndex: number;
  shortName: string;
  longName: string;
  swIn: [number, number, number, number];
  swOut: [number, number, number, number];
  subSwitch: number;
  sAcnPriority: number;
  command: ADDRESS_COMMAND;
}

export enum ADDRESS_COMMAND {
  NONE = 0x00,
  CANCEL_MERGE = 0x01,
  LED_NORMAL = 0x02,
  LED_MUTE = 0x03,
  LED_LOCATE = 0x04,
  RESET_RX = 0x05,
  ANALYSIS_ON = 0x06,
  ANALYSIS_OFF = 0x07,
  FAIL_HOLD = 0x08,
  FAIL_ZERO = 0x09,
  FAIL_FULL = 0x0a,
  FAIL_SCENE = 0x0b,
  FAIL_RECORD = 0x0c,
  MERGE_LTP0 = 0x10,
  MERGE_LTP1 = 0x11,
  MERGE_LTP2 = 0x12,
  MERGE_LTP3 = 0x13,
  DIRECTION_TX0 = 0x20,
  DIRECTION_TX1 = 0x21,
  DIRECTION_TX2 = 0x22,
  DIRECTION_TX3 = 0x23,
  DIRECTION_RX0 = 0x30,
  DIRECTION_RX1 = 0x31,
  DIRECTION_RX2 = 0x32,
  DIRECTION_RX3 = 0x33,
  MERGE_HTP0 = 0x50,
  MERGE_HTP1 = 0x51,
  MERGE_HTP2 = 0x52,
  MERGE_HTP3 = 0x53,
  ART_NET_SEL0 = 0x60,
  ART_NET_SEL1 = 0x61,
  ART_NET_SEL2 = 0x62,
  ART_NET_SEL3 = 0x63,
  ACN_SEL_0 = 0x70,
  ACN_SEL_1 = 0x71,
  ACN_SEL_2 = 0x72,
  ACN_SEL_3 = 0x73,
  CLEAR_OP0 = 0x80,
  CLEAR_OP1 = 0x81,
  CLEAR_OP2 = 0x82,
  CLEAR_OP3 = 0x83,
  STYLE_DELTA0 = 0xa0,
  STYLE_DELTA1 = 0xa1,
  STYLE_DELTA2 = 0xa2,
  STYLE_DELTA3 = 0xa3,
  STYLE_CONST0 = 0xb0,
  STYLE_CONST1 = 0xb1,
  STYLE_CONST2 = 0xb2,
  STYLE_CONST3 = 0xb3,
  RDM_ENABLE0 = 0xc0,
  RDM_ENABLE1 = 0xc1,
  RDM_ENABLE2 = 0xc2,
  RDM_ENABLE3 = 0xc3,
  RDM_DISABLE0 = 0xd0,
  RDM_DISABLE1 = 0xd1,
  RDM_DISABLE2 = 0xd2,
  RDM_DISABLE3 = 0xd3,
  BQP0 = 0xe0,
  BQP1 = 0xe1,
  BQP2 = 0xe2,
  BQP3 = 0xe3,
  BQP4 = 0xe4,
  BQP5 = 0xe5,
  BQP6 = 0xe6,
  BQP7 = 0xe7,
  BQP8 = 0xe8,
  BQP9 = 0xe9,
  BQP10 = 0xea,
  BQP11 = 0xeb,
  BQP12 = 0xec,
  BQP13 = 0xed,
  BQP14 = 0xee,
  BQP15 = 0xef,
}

export function buildContent(data: IAddress): number[] {
  const protocol = splitInt16(data.protocol ?? 0x000e);

  return [
    // Protocol
    protocol.high, // Protocol Version High
    protocol.low, // Protocol Version Low
    data.netSwitch, // NetSwitch
    data.bindIndex, // Bind Index
    ...Buffer.from(data.shortName.slice(0, 18)), // PortName, 17 characters maximum
    ...new Array(18 - data.shortName.length).fill(0), // Fill with null characters
    ...Buffer.from(data.longName.slice(0, 64)), // Long name for the node, 63 characters maximum
    ...new Array(64 - data.longName.length).fill(0), // Fill with null characters
    ...data.swIn, // Sw In for the 4 ports
    ...data.swOut, // Sw Out for the 4 ports
    data.subSwitch, // SubSwitch
    data.sAcnPriority, // ACN priority
    data.command, // Command
  ];
}

export function parseContent(packet: number[]): IAddress {
  const protocol = mergeInt16(packet[11] ?? 0, packet[10] ?? 0);

  return {
    protocol,
    netSwitch: packet[12] ?? 0,
    bindIndex: packet[13] ?? 0,
    shortName: Buffer.from(packet.slice(14, 32)).toString(),
    longName: Buffer.from(packet.slice(32, 96)).toString(),
    swIn: packet.slice(96, 100) as [number, number, number, number],
    swOut: packet.slice(100, 104) as [number, number, number, number],
    subSwitch: packet[104] ?? 0,
    sAcnPriority: packet[105] ?? 0,
    command: packet[106] ?? 0,
  };
}
