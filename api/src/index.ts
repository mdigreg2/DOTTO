import { initializeDB } from './db/connect';
import { initializeElastic } from './elastic/init';
import { initializeServer } from './server';
import { initializeAntlr } from './antlr/antlrBridge';
import { initializeLogger } from './utils/logger';
import { initializeGithub } from './utils/github';
import { configData, initializeConfig } from './utils/config';
import { initializeAWS } from './utils/aws';
import { initializeRedis } from './utils/redis';
import { initializeSendgrid } from './email/sendgrid';
import { initializeNLP } from './nlp/nlpBridge';
import compileEmailTemplates from './email/compileEmailTemplates';

const runAPI = async (): Promise<void> => {
  await initializeConfig();
  const logger = initializeLogger();
  try {
    if (configData.CONNECT_ANTLR) {
      await initializeAntlr();
      logger.info('connected to antlr');
    }
    if (configData.CONNECT_NLP) {
      await initializeNLP();
      logger.info('connected to nlp');
    }
    initializeGithub();
    logger.info('github client initialized');
    await initializeAWS();
    logger.info('aws initialized');
    await initializeSendgrid();
    logger.info('sendgrid connection initialized');
    await compileEmailTemplates();
    logger.info('email templates compiled');
    await initializeElastic();
    logger.info('connected to elasticsearch');
    await initializeDB();
    logger.info('database connection set up');
    await initializeRedis();
    logger.info('connected to redis');
    await initializeServer();
    logger.info('server started');
  } catch(err) {
    logger.fatal(err.message);
  }
};

if (!module.parent) {
  runAPI();
}

export default runAPI;
