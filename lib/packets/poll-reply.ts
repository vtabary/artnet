import type { DEVICE_STYLE } from "../definitions.js";
import { mergeInt16, splitInt16 } from "../utils/int16.js";

export interface IPollReply {
  ipAddress: [number, number, number, number];
  port: number;
  versionInfo: number;
  netSwitch: number;
  subSwitch: number;
  oem: number;
  ubeaVersion: number;
  status1: number;
  estaManufacturer: number;
  shortNodeName: string;
  longNodeName: string;
  nodeReport: string;
  numPorts: number;
  portTypes: [number, number, number, number];
  goodInput: [number, number, number, number];
  goodOutputA: [number, number, number, number];
  swIn: [number, number, number, number];
  swOut: [number, number, number, number];
  sACNPriority: number;
  swMacro: number;
  swRemote: number;
  deviceStyle: DEVICE_STYLE;
  macAddress: [number, number, number, number, number, number];
  bindIp?: [number, number, number, number];
  bindIndex?: number;
  status2?: number;
  goodOutputB?: [number, number, number, number];
  status3?: number;
  defaultRespUID?: [number, number, number, number, number, number];
  user?: number;
  refreshRate?: number;
  backgroundQueuePolicy?: number;
}

export function buildContent(data: IPollReply): number[] {
  const port = splitInt16(data.port ?? 0);
  const versionInfo = splitInt16(data.versionInfo ?? 0);
  const oem = splitInt16(data.oem ?? 0);
  const estaManufacturer = splitInt16(data.estaManufacturer ?? 0);
  const numPorts = splitInt16(data.numPorts ?? 0);
  const user = splitInt16(data.user ?? 0);
  const refreshRate = splitInt16(data.refreshRate ?? 0);

  return [
    ...data.ipAddress, // IP Address
    port.low, // Port, low first
    port.high, // Port, high
    versionInfo.high, // Version info, high first
    versionInfo.low, // Version info, low
    data.netSwitch, // NetSwitch
    data.subSwitch, // SubSwitch
    oem.high, // OEM, high first
    oem.low, // OEM, low
    data.ubeaVersion, // UBEA Version
    data.status1, // Status 1
    estaManufacturer.high, // ESTA Manufacturer, low first
    estaManufacturer.low, // ESTA Manufacturer, high
    ...Buffer.from(data.shortNodeName.slice(0, 17)), // PortName
    ...new Array(18 - data.shortNodeName.length).fill(0), // Port name, 17 characters maximum
    ...Buffer.from(data.longNodeName.slice(0, 63)), // Long name for the node, 63 characters maximum
    ...new Array(64 - data.longNodeName.length).fill(0), // Long name for the node, filled with null characters
    ...Buffer.from(data.nodeReport.slice(0, 63)), // Node report, 63 characters maximum
    ...new Array(64 - data.longNodeName.length).fill(0), // Node report, filled with null characters
    numPorts.high, // Number of input or output ports, high first
    numPorts.low, // Number of input or output ports, low, maximum value is 4
    ...data.portTypes, // Port type
    ...data.goodInput, // Good input for the 4 ports
    ...data.goodOutputA, // Good output for the 4 ports
    ...data.swIn, // Sw In for the 4 ports
    ...data.swOut, // Sw Out for the 4 ports
    data.sACNPriority, // ACN priority
    data.swMacro, // SW Macro
    data.swRemote, // SW Remote
    0, // Not used
    0, // Not used
    0, // Not used
    data.deviceStyle, // Device style
    ...data.macAddress, // MAC address
    ...(data.bindIp ?? [0, 0, 0, 0]),
    data.bindIndex,
    data.status2,
    ...(data.goodOutputB ?? [0, 0, 0, 0]),
    data.status3,
    ...(data.defaultRespUID ?? [0, 0, 0, 0, 0, 0]),
    user.high,
    user.low,
    refreshRate.high,
    refreshRate.low,
    data.backgroundQueuePolicy,
  ];
}

export function parseContent(packet: number[]): IPollReply {
  return {
    ipAddress: packet.slice(10, 14) as [number, number, number, number],
    port: mergeInt16(packet[14] ?? 0, packet[15] ?? 0),
    versionInfo: mergeInt16(packet[17] ?? 0, packet[16] ?? 0),
    netSwitch: packet[18] ?? 0,
    subSwitch: packet[19] ?? 0,
    oem: mergeInt16(packet[21] ?? 0, packet[20] ?? 0),
    ubeaVersion: packet[22] ?? 0,
    status1: packet[23] ?? 0,
    estaManufacturer: mergeInt16(packet[25] ?? 0, packet[24] ?? 0),
    shortNodeName: Buffer.from(packet.slice(26, 44)).toString(),
    longNodeName: Buffer.from(packet.slice(44, 108)).toString(),
    nodeReport: Buffer.from(packet.slice(108, 172)).toString(),
    numPorts: mergeInt16(packet[173] ?? 0, packet[172] ?? 0),
    portTypes: packet.slice(174, 178) as [number, number, number, number],
    goodInput: packet.slice(178, 182) as [number, number, number, number],
    goodOutputA: packet.slice(183, 187) as [number, number, number, number],
    swIn: packet.slice(188, 192) as [number, number, number, number],
    swOut: packet.slice(193, 197) as [number, number, number, number],
    sACNPriority: packet[198] ?? 0,
    swMacro: packet[199] ?? 0,
    swRemote: packet[200] ?? 0,
    deviceStyle: packet[201] ?? 0,
    macAddress: packet.slice(202, 208) as [
      number,
      number,
      number,
      number,
      number,
      number,
    ],
    bindIp: packet.slice(208, 212) as [number, number, number, number],
    bindIndex: packet[212] ?? 0,
    status2: packet[213] ?? 0,
    goodOutputB: packet.slice(214, 218) as [number, number, number, number],
    status3: packet[219] ?? 0,
    defaultRespUID: packet.slice(220, 226) as [
      number,
      number,
      number,
      number,
      number,
      number,
    ],
    user: mergeInt16(packet[227] ?? 0, packet[226] ?? 0),
    refreshRate: mergeInt16(packet[229] ?? 0, packet[228] ?? 0),
    backgroundQueuePolicy: packet[230] ?? 0,
  };
}
