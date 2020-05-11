import axios, { AxiosError, AxiosInstance } from 'axios';
import HttpStatus from 'http-status-codes';
import { ProcessFileInput, FileOutput } from './antlrTypes';

let antlrURI: string;

let antlrClient: AxiosInstance;

export const processFile = (inputData: ProcessFileInput): Promise<FileOutput> => {
  return antlrClient.post<FileOutput>('/processFile', inputData).then(res => {
    if (res.status === HttpStatus.OK) {
      return res.data;
    } else {
      throw new Error(`invalid response status ${res.status}`);
    }
  }).catch((err: AxiosError) => {
    throw new Error(err.message);
  });
};

export const pingAntlr = (): Promise<boolean> => {
  return antlrClient.get('/ping').then(res => {
    if (res.status === HttpStatus.OK) {
      return true;
    }
    return false;
  }).catch((err: AxiosError) => {
    throw new Error(err.message);
  });
};

export const initializeAntlr = (): Promise<boolean> => {
  if (!process.env.ANTLR_URI) {
    throw new Error('cannot find antlr uri');
  }
  antlrURI = process.env.ANTLR_URI;
  antlrClient = axios.create({
    baseURL: antlrURI,
    headers: {
      common: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
        Pragma: 'no-cache',
      },
    },
    timeout: 3000,
  });
  return pingAntlr().then((res) => {
    return res;
  }).catch((err: Error) => {
    throw new Error(`cannot connect to antlr server: ${err.message}`);
  });
};
