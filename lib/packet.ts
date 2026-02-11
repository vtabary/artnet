import { OP_CODES, type IArtNetContent } from "./definitions.js";
import * as addressFunctions from "./packets/address.js";
import * as commandFunctions from "./packets/command.js";
import * as dataReplyFunctions from "./packets/data-reply.js";
import * as dataRequestFunctions from "./packets/data-request.js";
import * as diagDataFunctions from "./packets/diag-data.js";
import * as dmxFunctions from "./packets/dmx.js";
import * as inputFunctions from "./packets/input.js";
import * as ipProgReplyFunctions from "./packets/ip-prog-reply.js";
import * as ipProgFunctions from "./packets/ip-prog.js";
import * as notImplementedFunctions from "./packets/not-implemented.js";
import * as nzsFunctions from "./packets/nzs.js";
import * as pollReplyFunctions from "./packets/poll-reply.js";
import * as pollFunctions from "./packets/poll.js";
import * as syncFunctions from "./packets/sync.js";
import * as timeCodeFunctions from "./packets/time-code.js";
import * as triggerFunctions from "./packets/trigger.js";
import { mergeInt16, splitInt16 } from "./utils/int16.js";

const FUNCTIONS = {
  [OP_CODES.POLL]: pollFunctions,
  [OP_CODES.POLL_REPLY]: pollReplyFunctions,
  [OP_CODES.IP_PROG]: ipProgFunctions,
  [OP_CODES.IP_PROG_REPLY]: ipProgReplyFunctions,
  [OP_CODES.ADDRESS]: addressFunctions,
  [OP_CODES.DATA_REQUEST]: dataRequestFunctions,
  [OP_CODES.DATA_REPLY]: dataReplyFunctions,
  [OP_CODES.DIAG_DATA]: diagDataFunctions,
  [OP_CODES.TIME_CODE]: timeCodeFunctions,
  [OP_CODES.COMMAND]: commandFunctions,
  [OP_CODES.TRIGGER]: triggerFunctions,
  [OP_CODES.DMX]: dmxFunctions,
  [OP_CODES.SYNC]: syncFunctions,
  [OP_CODES.NZS]: nzsFunctions,
  [OP_CODES.INPUT]: inputFunctions,

  // Deprecated
  [OP_CODES.MAC_MASTER]: notImplementedFunctions,
  // Deprecated
  [OP_CODES.MAC_SLAVE]: notImplementedFunctions,
  // Not supported yet

  [OP_CODES.FIRMWARE_MASTER]: notImplementedFunctions,
  [OP_CODES.FIRMWARE_REPLY]: notImplementedFunctions,
  [OP_CODES.TOD_REQUEST]: notImplementedFunctions,
  [OP_CODES.TOD_DATA]: notImplementedFunctions,
  [OP_CODES.TOD_CONTROL]: notImplementedFunctions,
  [OP_CODES.RDM]: notImplementedFunctions,
  [OP_CODES.RDM_SUB]: notImplementedFunctions,
  [OP_CODES.VIDEO_SETUP]: notImplementedFunctions,
  [OP_CODES.VIDEO_PALETTE]: notImplementedFunctions,
  [OP_CODES.VIDEO_DATA]: notImplementedFunctions,
  [OP_CODES.MEDIA]: notImplementedFunctions,
  [OP_CODES.MEDIA_PATCH]: notImplementedFunctions,
  [OP_CODES.MEDIA_CONTROL]: notImplementedFunctions,
  [OP_CODES.MEDIA_CONTROL_REPLY]: notImplementedFunctions,
  [OP_CODES.DIRECTORY]: notImplementedFunctions,
  [OP_CODES.DIRECTORY_REPLY]: notImplementedFunctions,
  [OP_CODES.FILE_TN_MASTER]: notImplementedFunctions,
  [OP_CODES.FILE_TN_SLAVE]: notImplementedFunctions,
  [OP_CODES.FILE_TN_REPLY]: notImplementedFunctions,
  [OP_CODES.TIME_SYNC]: notImplementedFunctions,
};

const SHARED_HEADER = [
  65, // "A"
  114, // "r"
  116, // "t"
  45, // "-"
  78, // "N"
  101, // "e"
  116, // "t"
  0, // 0x00
];

export function buildPacket<T extends IArtNetContent>(
  data: { type: OP_CODES } & T,
): number[] {
  const leType = splitInt16(data.type);

  return [
    ...SHARED_HEADER,
    // Opcode, little endian
    leType.low,
    leType.high,
    // Content
    ...(FUNCTIONS[data.type]?.buildContent(data as any) ?? []),
  ];
}

/**
 * See http://www.artisticlicence.com/WebSiteMaster/User%20Guides/art-net.pdf page 40
 */
export function parsePacket<T extends IArtNetContent>(
  data: number[],
): { type: OP_CODES } & T {
  const OP_CODES: OP_CODES = mergeInt16(data[9] ?? 0, data[8] ?? 0);

  return {
    type: OP_CODES,
    ...(FUNCTIONS[OP_CODES]?.parseContent(data) as T),
  };
}
