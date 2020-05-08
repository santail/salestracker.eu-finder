import * as winston from 'winston';

const Logger = winston.createLogger({
  transports: [
    new winston.transports.Console()
  ],
  exitOnError: false
});

export default Logger;