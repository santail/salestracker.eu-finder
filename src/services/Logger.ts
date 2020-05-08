"use strict";

import * as winston from 'winston';

let Logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
  ],
  exitOnError: false, // do not exit on handled exceptions
});

export default Logger;