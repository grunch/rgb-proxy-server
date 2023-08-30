import { JSONRPCErrorException } from "json-rpc-2.0";

export class CannotChangeAck extends JSONRPCErrorException {
  constructor(data?: object) {
    super("Cannot change ACK", -100, data);
  }
}

export class CannotChangeUploadedFile extends JSONRPCErrorException {
  constructor(data?: object) {
    super("Cannot change uploaded file", -101, data);
  }
}

export class InvalidAck extends JSONRPCErrorException {
  constructor(data?: object) {
    super("Invalid ACK", -200, data);
  }
}

export class InvalidAttachmentID extends JSONRPCErrorException {
  constructor(data?: object) {
    super("Invalid attachment ID", -201, data);
  }
}

export class InvalidRecipientID extends JSONRPCErrorException {
  constructor(data?: object) {
    super("Invalid recipient ID", -202, data);
  }
}

export class InvalidTxid extends JSONRPCErrorException {
  constructor(data?: object) {
    super("Invalid TXID", -203, data);
  }
}

export class InvalidVout extends JSONRPCErrorException {
  constructor(data?: object) {
    super("Invalid vout", -204, data);
  }
}

export class MissingAck extends JSONRPCErrorException {
  constructor(data?: object) {
    super("Missing ACK", -300, data);
  }
}

export class MissingAttachmentID extends JSONRPCErrorException {
  constructor(data?: object) {
    super("Missing attachment ID", -301, data);
  }
}

export class MissingRecipientID extends JSONRPCErrorException {
  constructor(data?: object) {
    super("Missing recipient ID", -302, data);
  }
}

export class MissingFile extends JSONRPCErrorException {
  constructor(data?: object) {
    super("Missing file", -303, data);
  }
}

export class MissingTxid extends JSONRPCErrorException {
  constructor(data?: object) {
    super("Missing TXID", -303, data);
  }
}

export class NotFoundConsignment extends JSONRPCErrorException {
  constructor(data?: object) {
    super("Consignment file not found", -400, data);
  }
}

export class NotFoundMedia extends JSONRPCErrorException {
  constructor(data?: object) {
    super("Media file not found", -401, data);
  }
}
