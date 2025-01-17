import { config } from 'dotenv';
import AWS from 'aws-sdk';

export let dbConnectionURI: string;
export let debug = true;
export let dbName = 'rescribe';
export let websiteURL = 'https://rescribe.dev';
export let production = true;

const secretsManagerStart = 'arn:aws:secretsmanager';

export const initializeGlobalConfig = async (requiresDBConfig: boolean): Promise<void> => {
  config();
  if (process.env.DB_NAME) {
    dbName = process.env.DB_NAME;
  }
  if (process.env.DEBUG) {
    debug = process.env.DEBUG === 'true';
  }
  if (process.env.MODE) {
    production = process.env.MODE !== 'dev';
  }
  if (process.env.WEBSITE_URL) {
    websiteURL = process.env.WEBSITE_URL;
  }
  AWS.config = new AWS.Config();
  const requireAWSConfig = !production;
  if (requireAWSConfig && !process.env.AWS_ACCESS_KEY_ID) {
    throw new Error('no aws access key id provided');
  }
  if (requireAWSConfig && !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('no aws secret access key provided');
  }
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    AWS.config.credentials = new AWS.Credentials({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });
  }
  if (!process.env.AWS_REGION) {
    throw new Error('no aws region provided');
  }
  if (process.env.AWS_REGION) {
    AWS.config.update({
      region: process.env.AWS_REGION
    });
  }
  if (requiresDBConfig) {
    if (!process.env.DB_CONNECTION_URI) {
      throw new Error('cannot find database uri');
    }
    if (process.env.DB_CONNECTION_URI.substr(0, secretsManagerStart.length) === secretsManagerStart) {
      const secretsClient = new AWS.SecretsManager();
      const secretData = await secretsClient.getSecretValue({ SecretId: process.env.DB_CONNECTION_URI }).promise();
      if ('SecretString' in secretData) {
        dbConnectionURI = secretData.SecretString as string;
      } else {
        const secretsBuffer = Buffer.from(secretData.SecretBinary as string, 'base64');
        dbConnectionURI = secretsBuffer.toString('ascii');
      }
    } else {
      dbConnectionURI = process.env.DB_CONNECTION_URI;
    }
  }
};
