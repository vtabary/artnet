export enum PRIORITY {
  LOW = 0x10,
  MEDIUM = 0x40,
  HIGH = 0x80,
  CRITICAL = 0xe0,
  VOLATILE = 0xf0,
}

export enum DATA_REQUEST {
  /**
   * Controller is polling to establish whether ArtDataRequest is supported
   */
  POLL = 0x0000,
  /**
   * URL to manufacturer product page
   */
  URL_PRODUCT = 0x0001,
  /**
   * URL to manufacturer user guide
   */
  URL_USER_GUIDE = 0x0002,
  /**
   * URL to manufacturer support page
   */
  URL_SUPPORT = 0x0003,
  /**
   * URL to manufacture UDR personality
   */
  URL_PERS_UDR = 0x0004,
  /**
   * URL to manufacture GDTF personality
   */
  URL_PERS_GDTF = 0x0005,
  /**
   * Manufacturer specific use
   */
  MAN_SPEC = 0x0006,
}
