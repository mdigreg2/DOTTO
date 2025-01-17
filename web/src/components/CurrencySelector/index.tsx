import React, { useState } from 'react';
import AsyncSelect from 'react-select/async';
import {
  CurrenciesQuery,
  CurrenciesQueryVariables,
  Currencies,
} from 'lib/generated/datamodel';
import { ValueType } from 'react-select';
import { isSSR } from 'utils/checkSSR';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from 'state';
import { Dispatch } from 'redux';
import { useQuery, ApolloError } from '@apollo/react-hooks';
import isDebug from 'utils/mode';
import { toast } from 'react-toastify';
import 'currency-flags/dist/currency-flags.css';
import { defaultCurrency } from 'shared/variables';
import './index.scss';
import { CurrencyData } from 'state/settings/types';
import { setDisplayCurrency } from 'state/settings/actions';

interface SelectObject {
  value: CurrencyData;
  label: JSX.Element;
}

interface CurrencySelectorArgs {
  displayCurrency: boolean;
  onChange?: (code: string) => void;
  acceptedPayment?: boolean;
}

const CurrencySelector = (args: CurrencySelectorArgs): JSX.Element => {
  const [currencyOptions, setCurrencyOptions] = useState<SelectObject[]>([]);
  const getLabel = (currency: CurrencyData): JSX.Element => {
    return (
      <>
        <div
          style={{
            marginRight: '1rem',
          }}
          className={`currency-flag currency-flag-${currency.name}`}
        />
        {currency.name.toUpperCase()}
      </>
    );
  };
  const currentDisplayCurrency: SelectObject | undefined = isSSR
    ? undefined
    : useSelector<RootState, SelectObject>((state) => {
        const currency = state.settingsReducer.displayCurrency;
        return {
          value: currency,
          label: getLabel(currency),
        };
      });

  const [currentCurrency, setCurrentCurrency] = useState<
    SelectObject | undefined
  >(args.displayCurrency ? currentDisplayCurrency : undefined);

  let dispatch: Dispatch<any>;
  if (!isSSR) {
    dispatch = useDispatch();
    useQuery<CurrenciesQuery, CurrenciesQueryVariables>(Currencies, {
      variables: {
        acceptedPayment: args.acceptedPayment,
      },
      fetchPolicy: isDebug() ? 'no-cache' : 'cache-first', // disable cache if in debug
      onError: (err) => {
        toast((err as ApolloError).message, {
          type: 'error',
        });
      },
      onCompleted: (data) => {
        const newCurrencies = data.currencies;
        const newCurrencyOptions = data.currencies.map((currency) => {
          return {
            label: getLabel(currency),
            value: currency,
          };
        });
        setCurrencyOptions(newCurrencyOptions);
        if (!currentCurrency) {
          const currencyName = defaultCurrency.toLowerCase();
          const newCurrencyData = newCurrencies.find(
            (elem) => elem.name === currencyName
          );
          if (newCurrencyData && args.displayCurrency) {
            dispatch(setDisplayCurrency(newCurrencyData));
          }
          const newCurrencyOption = newCurrencyOptions.find(
            (elem) => elem.value.name === currencyName
          );
          if (newCurrencyOption) {
            setCurrentCurrency(newCurrencyOption);
            if (args.onChange) {
              args.onChange(newCurrencyOption.value.name);
            }
          }
        } else if (args.onChange) {
          args.onChange(currentCurrency.value.name);
        }
      },
    });
  }
  const getCurrencies = async (inputValue: string): Promise<SelectObject[]> => {
    if (!currencyOptions) return [];
    return inputValue.length > 0
      ? currencyOptions.filter((currency) => {
          return currency.value.name
            .toLowerCase()
            .includes(inputValue.toLowerCase());
        })
      : currencyOptions;
  };
  return (
    <>
      <AsyncSelect
        id="currency"
        name="currency"
        isMulti={false}
        defaultOptions={currencyOptions}
        cacheOptions={true}
        loadOptions={getCurrencies}
        value={args.displayCurrency ? currentDisplayCurrency : currentCurrency}
        onChange={(selectedOption: ValueType<SelectObject>) => {
          if (!selectedOption) {
            return;
          }
          const selected = selectedOption as SelectObject;
          setCurrentCurrency(selected);
          if (args.onChange) {
            args.onChange(selected.value.name);
          }
          if (args.displayCurrency) {
            dispatch(setDisplayCurrency(selected.value));
          }
        }}
      />
    </>
  );
};

export default CurrencySelector;
