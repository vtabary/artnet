import type { IAddress } from "./packets/address.js";
import type { ICommand } from "./packets/command.js";
import type { IDataReply } from "./packets/data-reply.js";
import type { IDataRequest } from "./packets/data-request.js";
import type { IDiagData } from "./packets/diag-data.js";
import type { IDmx } from "./packets/dmx.js";
import type { IInput } from "./packets/input.js";
import type { IIpProgReply } from "./packets/ip-prog-reply.js";
import type { IIpProg } from "./packets/ip-prog.js";
import type { INZS, IVLC } from "./packets/nzs.js";
import type { IPollReply } from "./packets/poll-reply.js";
import type { IPoll } from "./packets/poll.js";
import type { ISync } from "./packets/sync.js";
import type { ITimeCode } from "./packets/time-code.js";
import type { ITrigger } from "./packets/trigger.js";

export enum DEVICE_STYLE {
  NODE = 0x00,
  CONTROLLER = 0x01,
  MEDIA = 0x02,
  ROUTE = 0x03,
  BACKUP = 0x04,
  CONFIG = 0x05,
  VISUAL = 0x06,
}

export enum OP_CODES {
  POLL = 0x2000,
  POLL_REPLY = 0x2100,
  DIAG_DATA = 0x2300,
  COMMAND = 0x2400,
  DATA_REQUEST = 0x2700,
  DATA_REPLY = 0x2800,
  DMX = 0x5000,
  NZS = 0x5100,
  SYNC = 0x5200,
  ADDRESS = 0x6000,
  INPUT = 0x7000,
  TOD_REQUEST = 0x8000,
  TOD_DATA = 0x8100,
  TOD_CONTROL = 0x8200,
  RDM = 0x8300,
  RDM_SUB = 0x8400,
  FIRMWARE_MASTER = 0xf200,
  FIRMWARE_REPLY = 0xf300,
  TRIGGER = 0x9900,
  TIME_CODE = 0x9700,
  IP_PROG = 0xf800,
  IP_PROG_REPLY = 0xf900,

  // Not implemented
  VIDEO_SETUP = 0xa010,
  VIDEO_PALETTE = 0xa020,
  VIDEO_DATA = 0xa040,
  MAC_MASTER = 0xf000,
  MAC_SLAVE = 0xf100,
  FILE_TN_MASTER = 0xf400,
  FILE_TN_SLAVE = 0xf500,
  FILE_TN_REPLY = 0xf600,
  MEDIA = 0x9000,
  MEDIA_PATCH = 0x9100,
  MEDIA_CONTROL = 0x9200,
  MEDIA_CONTROL_REPLY = 0x9300,
  DIRECTORY = 0x9a00,
  DIRECTORY_REPLY = 0x9b00,
  TIME_SYNC = 0x9800,
}

export type IArtNetMesssage = { type: OP_CODES } & IArtNetContent;
export type IArtNetContent =
  | IAddress
  | ICommand
  | IDataReply
  | IDataRequest
  | IDiagData
  | IDmx
  | IInput
  | IIpProg
  | IIpProgReply
  | INZS
  | IVLC
  | IPollReply
  | IPoll
  | ISync
  | ITimeCode
  | ITrigger;
