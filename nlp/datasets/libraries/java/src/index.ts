import { Callback, Context, EventBridgeEvent, EventBridgeHandler, SQSEvent, SQSHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { getLogger } from 'log4js';
import { dataFolder, initializeConfig, repositoryURL } from './utils/config';
import { initializeLogger } from './shared/logger';
import axios, { AxiosError } from 'axios';
import statusCodes from 'http-status-codes';
import { baseFolder, s3Bucket, saveLocal, paginationSize, saveS3 } from './shared/libraries_global_config';
import YAML from 'yaml';
import cheerio from 'cheerio';
import { writeFileSync } from 'fs';
import { format } from 'date-fns';
import { deleteObjects } from './shared/s3utils';
import { average } from './shared/utils';
import { createHash } from 'crypto';
import { resolve } from 'path';

const logger = getLogger();

const localDataFolder = resolve('../../../data/datasets/base_library_prediction/java');
const estimatedNumberArtifacts = 5e6;

const writeData = async (content: string, s3Client: AWS.S3): Promise<void> => {
  const hash = createHash('sha256').update(content).digest('hex');
  const basename = `${hash}.yml`;
  logger.info(`write data to s3: ${basename}`);
  const fileType = 'application/x-yaml';
  if (saveLocal) {
    writeFileSync(`${localDataFolder}/${basename}`, content);
  }
  if (saveS3) {
    await s3Client.upload({
      Bucket: s3Bucket,
      Body: content,
      Key: `${baseFolder}/${dataFolder}/${basename}`,
      ContentEncoding: 'identity',
      ContentType: fileType
    })
      .on('httpUploadProgress', (evt) => {
        logger.info(evt);
      })
      .promise();
  }
};

interface LibraryData {
  id: string[];
  versions: string[];
}

interface PageData {
  paths: string[][];
  libraries: LibraryData[];
  requestTime: number;
  totalTime: number;
}

// eslint-disable-next-line no-useless-escape
const versionMatch = /^([\d]+[\.]+)+[A-z\.\-(0-9)]*$/;

const getData = async (currentPath: string[]): Promise<PageData> => {
  const totalStartTime = new Date();
  const baseURL = new URL(repositoryURL);
  let fullPath = `${baseURL.pathname}/${currentPath.join('/')}`;
  if (!fullPath.endsWith('/')) {
    fullPath += '/';
  }
  const currentURL = new URL(fullPath, repositoryURL);
  let requestData: string;
  const requestStartTime = new Date();
  try {
    const res = await axios.get<string>(currentURL.href);
    if (res.status !== statusCodes.OK) {
      throw new Error('problem with getting data');
    }
    requestData = res.data;
  } catch (err) {
    const errObj: AxiosError = err;
    if (errObj.response?.status === statusCodes.NOT_FOUND) {
      logger.info(`cannot find page for ${currentURL.href}`);
      return {
        libraries: [],
        paths: [],
        requestTime: 0,
        totalTime: 0
      };
    }
    logger.error(`got error with http request for ${currentURL}`);
    throw err;
  }
  const requestTime = new Date().getTime() - requestStartTime.getTime();
  const $ = cheerio.load(requestData);
  let paths: string[] = [];
  let library: LibraryData | undefined = undefined;
  $('a').each((_, elem) => {
    let link = $(elem).attr('href');
    if (!link) {
      return;
    }
    link = link.trim();
    if (link.startsWith('.') || !link.endsWith('/')) {
      return;
    }
    // remove the backslash
    link = link.slice(0, -1);
    if (link.length === 0) {
      return;
    }
    if (link.match(versionMatch)) {
      // found a version. ignore path data
      if (library === undefined) {
        library = {
          id: currentPath,
          versions: []
        };
      }
      library.versions.push(link);
    } else {
      paths.push(link);
    }
  });
  const libraries: LibraryData[] = [];
  let fullPaths: string[][] = [];
  if (library !== undefined) {
    libraries.push(library);
    paths = [];
  } else {
    paths = paths.sort().reverse();
    fullPaths = paths.map(path => {
      const current = [...currentPath];
      current.push(path);
      return current;
    });
  }
  const totalTime = new Date().getTime() - totalStartTime.getTime();
  const data: PageData = {
    libraries,
    paths: fullPaths,
    requestTime,
    totalTime: totalTime
  };
  return data;
};

const writeDatasetRecursive = async (pathsToCheck: string[][], s3Client: AWS.S3): Promise<void> => {
  let allData: LibraryData[] = [];
  let currentPage = 1;
  let countVersions = 0;
  const requestTimes: number[] = [];
  const totalPageTimes: number[] = [];
  const startTime = new Date();

  console.log(pathsToCheck);
  logger.info(`starting at ${format(startTime, 'HH:mm:ss')}`);

  while (pathsToCheck.length > 0) {
    const currentPath = pathsToCheck.pop();
    if (!currentPath) {
      break;
    }
    const currentData = await getData(currentPath);
    requestTimes.push(currentData.requestTime);
    totalPageTimes.push(currentData.totalTime);
    pathsToCheck = pathsToCheck.concat(currentData.paths);

    countVersions += currentData.libraries.reduce((prev, curr) => prev += curr.versions.length, 0);
    allData = allData.concat(currentData.libraries);
    while (allData.length >= paginationSize) {
      await writeData(YAML.stringify(allData.slice(0, paginationSize)), s3Client);
      allData = allData.slice(paginationSize);

      const numRemaining = estimatedNumberArtifacts - countVersions;
      const currentTime = new Date();
      const timeElapsed = currentTime.getTime() - startTime.getTime();
      const timeRemaining = timeElapsed / countVersions * numRemaining; // in ms

      logger.info(`wrote page ${currentPage}`);
      logger.info(`as of ${format(currentTime, 'HH:mm:ss')} processed ${countVersions} versions`);
      logger.info(`estimated time remaining: ${format(new Date(timeRemaining), 'dd:HH:mm:ss')}`);
      logger.info(`average request time: ${average(requestTimes)}, total time: ${average(totalPageTimes)}`);
      logger.info(`paths remaining to check: ${pathsToCheck.length}`);
      currentPage++;
    }
  }
  if (allData.length > 0) {
    await writeData(YAML.stringify(allData), s3Client);
  }
  logger.info('done with getting datasets');
};

export const handler: EventBridgeHandler<string, null, void> | SQSHandler = async (
  _event: EventBridgeEvent<string, null> | SQSEvent,
  _context: Context, callback: Callback<void>): Promise<void> => {
  logger.info('enter handler');
  await initializeConfig();
  initializeLogger();
  const s3Client = new AWS.S3();
  await deleteObjects(s3Client, s3Bucket, `${baseFolder}/${dataFolder}`);
  await writeDatasetRecursive([[]], s3Client);
  callback();
};

const getDataset = async (): Promise<void> => {
  await initializeConfig();
  initializeLogger();
  const s3Client = new AWS.S3();
  await deleteObjects(s3Client, s3Bucket, `${baseFolder}/${dataFolder}`);
  await writeDatasetRecursive([[]], s3Client);
};

if (require.main === module) {
  getDataset().then(() => {
    logger.info('done with update');
    process.exit(0);
  }).catch((err: Error) => {
    console.error(err.message);
    process.exit(1);
  });
}

export default getDataset;
