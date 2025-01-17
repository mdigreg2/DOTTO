import cors, { CorsOptions } from 'cors';
import express from 'express';
import { getLogger } from 'log4js';
import { createServer } from 'http';
import { configData } from './utils/config';
import statusCodes from 'http-status-codes';
import prerender from './prerender';

const logger = getLogger();

export const initializeServer = async (): Promise<void> => {
  const app = express();
  const corsConfig: CorsOptions = {
    credentials: true,
    origin: [configData.MAIN_WEBSITE, configData.STATIC_WEBSITE]
  };

  app.use(cors(corsConfig));
  app.get('/_hello', (_, res) => {
    res.json({
      message: 'hello world!'
    });
  });
  app.get('/_ping', (_, res) => {
    res.status(statusCodes.OK).send();
  });
  app.get('*', prerender);
  const httpServer = createServer(app);
  httpServer.listen(configData.PORT, '0.0.0.0', () => logger.info(`Prerendering service started: http://localhost:${configData.PORT} 🚀`));
};
