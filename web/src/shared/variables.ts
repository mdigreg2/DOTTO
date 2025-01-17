// shared variables

export const capitalLetterRegex = /[A-Z]/;
export const lowercaseLetterRegex = /[a-z]/;
export const numberRegex = /[0-9]/;
export const specialCharacterRegex = /[!@#$%^&*(),.?":{}|<>]/;
export const validProjectName = /^[A-z0-9-_]+$/;
export const validRepositoryName = /^[A-z0-9-_]+$/;
export const blacklistedRepositoryNames = ['projects', 'repositories'];
export const passwordMinLen = 6;
export const minJWTLen = 30;
export const queryMinLength = 3;
export const defaultCurrency = 'usd';
export const defaultCountry = 'us';

// products
export const defaultProductName = 'free';
export const teamProductName = 'team';
export const enterpriseProductName = 'enterprise';
