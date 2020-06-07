import { store } from '../reduxWrapper';
import { RootState } from '..';
import { searchParamKeys } from '../../utils/variables';
import { isSSR } from '../../utils/checkSSR';

export const getSearchURL = (): string => {
  if (isSSR || !window) {
    return '';
  }
  const state = (store.getState() as RootState).searchReducer;
  const baseUrl = `${window.location.protocol}//${window.location.host}`;
  const searchURL = new URL(`${baseUrl}/search`);
  if (state.query.length > 0) {
    searchURL.searchParams.append(searchParamKeys.query, state.query);
  }
  if (state.filters.languages.length > 0) {
    searchURL.searchParams.append(
      searchParamKeys.language,
      state.filters.languages.join(',')
    );
  }
  return searchURL.toString();
};
