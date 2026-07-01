// @ts-nocheck
const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;
const isProduction = import.meta.env.PROD;

const toSnakeCase = (str) => str.replace(/([A-Z])/g, '_$1').toLowerCase();

const PRODUCTION_LOCKED_PARAMS = new Set(['server_url']);
const TRANSIENT_PARAMS = new Set(['access_token', 'clear_access_token']);

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
  if (isNode) return defaultValue;

  const storageKey = `base44_${toSnakeCase(paramName)}`;
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get(paramName);
  const shouldRemoveFromUrl = removeFromUrl || TRANSIENT_PARAMS.has(paramName) || (isProduction && PRODUCTION_LOCKED_PARAMS.has(paramName));

  if (shouldRemoveFromUrl && searchParam !== null) {
    urlParams.delete(paramName);
    const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}${window.location.hash}`;
    window.history.replaceState({}, document.title, newUrl);
  }

  if (searchParam && !(isProduction && PRODUCTION_LOCKED_PARAMS.has(paramName))) {
    storage.setItem(storageKey, searchParam);
    return searchParam;
  }

  if (defaultValue) {
    storage.setItem(storageKey, defaultValue);
    return defaultValue;
  }

  const storedValue = storage.getItem(storageKey);
  if (storedValue && !(isProduction && PRODUCTION_LOCKED_PARAMS.has(paramName))) {
    return storedValue;
  }

  return null;
};

const getAppParams = () => {
  if (getAppParamValue('clear_access_token') === 'true') {
    storage.removeItem('base44_access_token');
    storage.removeItem('token');
  }

  return {
    appId: getAppParamValue('app_id', { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
    serverUrl: getAppParamValue('server_url', { defaultValue: import.meta.env.VITE_BASE44_BACKEND_URL }),
    token: getAppParamValue('access_token', { removeFromUrl: true }),
    fromUrl: getAppParamValue('from_url', { defaultValue: window.location.href }),
    functionsVersion: getAppParamValue('functions_version'),
  };
};

export const appParams = {
  ...getAppParams(),
};
