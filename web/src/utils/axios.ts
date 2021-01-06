import axios from 'axios';
import { useSecure } from './useSecure';

export const getAPIURL = (): string => {
  return `${useSecure ? 'https' : 'http'}://${process.env.GATSBY_API_URL}`;
};

export const axiosClient = axios.create({
  baseURL: `${useSecure ? 'https' : 'http'}://${process.env.GATSBY_API_URL}`,
  withCredentials: true,
});
