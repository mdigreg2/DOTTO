import { ApolloServer } from 'apollo-server-express';
import bodyParser from 'body-parser';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import depthLimit from 'graphql-depth-limit';
import HttpStatus from 'http-status-codes';
import { getLogger } from 'log4js';
import { fileLoader, mergeTypes } from 'merge-graphql-schemas';
import { join } from 'path';
import { initializeMappings } from './elastic/configure';
import resolvers from './resolvers';
import { getContext, GraphQLContext, onSubscription, SubscriptionContextParams } from './utils/context';
import { isDebug } from './utils/mode';
import { createServer } from 'http';

const maxDepth = 7;
const logger = getLogger();

export const initializeServer = async (): Promise<void> => {
  if (!process.env.PORT) {
    const message = 'cannot find port';
    throw new Error(message);
  }
  const port = Number(process.env.PORT);
  if (!port) {
    const message = 'port is not numeric';
    throw new Error(message);
  }
  const app = express();
  app.use('*', cors());
  const typeDefs = mergeTypes(fileLoader(join(__dirname, './schema/*.graphql'), {
    recursive: true
  }), {
    all: true
  });
  const server = new ApolloServer({
    resolvers,
    typeDefs,
    validationRules: [depthLimit(maxDepth)],
    subscriptions: {
      onConnect: (connectionParams: SubscriptionContextParams): Promise<GraphQLContext> => onSubscription(connectionParams),
    },
    context: async (req): Promise<GraphQLContext> => getContext(req)
  });
  app.use(server.graphqlPath, compression());
  server.applyMiddleware({
    app,
    path: server.graphqlPath,
  });
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(bodyParser.json());
  app.get('/hello', (_, res) => {
    res.json({
      message: 'hello world!'
    }).status(HttpStatus.OK);
  });
  if (isDebug()) {
    app.post('/initializeElastic', (_, res) => {
      initializeMappings().then(() => {
        res.json({
          message: 'initialized mappings'
        }).status(HttpStatus.OK);
      }).catch((err: Error) => {
        logger.error(err.message);
        res.json({
          message: err.message
        }).status(HttpStatus.BAD_REQUEST);
      });
    });
  }
  const httpServer = createServer(app);
  server.installSubscriptionHandlers(httpServer);
  httpServer.listen(port, () => logger.info(`Api started: http://localhost:${port}/graphql 🚀`));
};
