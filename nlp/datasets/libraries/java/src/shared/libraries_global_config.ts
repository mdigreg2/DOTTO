export let baseFolder = 'libraries';
export let s3Bucket = 'rescribe-datasets';
export let saveLocal = false;
export let paginationSize = 100;
export let saveS3 = true;

export const initializeLibrariesConfig = (): void => {
  if (process.env.BASE_FOLDER) {
    baseFolder = process.env.BASE_FOLDER;
  }
  if (process.env.AWS_S3_BUCKET) {
    s3Bucket = process.env.AWS_S3_BUCKET;
  }
  if (process.env.SAVE_LOCAL) {
    saveLocal = process.env.SAVE_LOCAL === 'true';
  }
  if (process.env.SAVE_S3) {
    saveS3 = process.env.SAVE_S3 === 'true';
  }
  if (process.env.PAGINATION_SIZE) {
    const paginationCast = Number(process.env.PAGINATION_SIZE);
    if (!paginationCast) {
      throw new Error(`pagination ${process.env.PAGINATION_SIZE} is not numeric`);
    }
    paginationSize = paginationCast as number;
  }
};
