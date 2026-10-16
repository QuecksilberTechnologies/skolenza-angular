import { HttpContextToken } from '@angular/common/http';

/** Suppresses the global 403 toast in `errorInterceptor` for a request whose caller already treats
 *  a denial as an expected, recovered-from outcome. Everything else about the response is
 *  unchanged: it is still logged and still rethrown. */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);
