import { getLogger } from 'log4js';
import { elasticClient } from '../elastic/init';
import { processFile } from '../utils/antlrBridge';
import { fileIndexName } from '../elastic/settings';
import File, { FileModel, FileDB, StorageType } from '../schema/structure/file';
import { ObjectId } from 'mongodb';
import { s3Client, fileBucket, getFileKey } from '../utils/aws';
import { AccessLevel } from '../schema/auth/access';

const logger = getLogger();

export enum UpdateType {
  add = 'add',
  update = 'update'
}

export interface FileIndexArgs {
  saveContent: boolean;
  action: UpdateType;
  file: FileDB | undefined;
  location: StorageType;
  project: ObjectId;
  repository: ObjectId;
  branch: string;
  path: string;
  fileName: string;
  content: string;
  public: AccessLevel;
}

export const indexFile = async (args: FileIndexArgs): Promise<string> => {
  if (args.action === UpdateType.update && !args.file) {
    throw new Error('file is required for update');
  }
  const id = args.action === UpdateType.add ? new ObjectId() : args.file?._id as ObjectId;
  const fileData = await processFile({
    id,
    fileName: args.fileName,
    content: args.content,
    path: args.path
  });
  const currentTime = new Date().getTime();
  const fileLength = args.content.split('\n').length - 1;
  if (args.action === UpdateType.add) {
    const newFileDB: FileDB = {
      _id: id,
      project: args.project,
      repository: args.repository,
      branch: args.branch,
      path: args.path,
      location: args.location,
      fileLength,
      public: args.public,
      saveContent: args.saveContent
    };
    const elasticContent: File = {
      ...fileData,
      _id: undefined,
      project: args.project.toHexString(),
      repository: args.repository.toHexString(),
      branch: args.branch,
      created: currentTime,
      updated: currentTime,
      location: args.location,
      path: args.path,
      public: args.public,
      fileLength
    };
    await elasticClient.index({
      id: id.toHexString(),
      index: fileIndexName,
      body: elasticContent
    });
    await new FileModel(newFileDB).save();
    if (args.saveContent) {
      await s3Client.upload({
        Bucket: fileBucket,
        Key: getFileKey(args.repository, args.branch, args.path),
        Body: args.content
      }).promise();
    }
  } else if (args.action === UpdateType.update) {
    const elasticContent: object = {
      ...fileData,
      _id: undefined,
      updated: currentTime,
    };
    await elasticClient.update({
      id: id.toHexString(),
      index: fileIndexName,
      body: elasticContent
    });
    await FileModel.updateOne({
      _id: id
    }, {
      fileLength,
    });
    if (args.file?.saveContent) {
      await s3Client.upload({
        Bucket: fileBucket,
        Key: getFileKey(args.repository, args.branch, args.path),
        Body: args.content
      }).promise();
    }
  }
  logger.info(`${args.action}ed file ${id.toHexString()}`);
  return `indexed file with id ${id.toHexString()}`;
};
