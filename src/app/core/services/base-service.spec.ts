import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { ApiError, BaseService } from './base-service';

class TestBaseService extends BaseService {
  fail(error: HttpErrorResponse) {
    return firstValueFrom(this.handleError<never>('test')(error));
  }
}

describe('BaseService error messages', () => {
  const service = new TestBaseService();

  it('shows the API message and validation details', async () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        message: 'Bank information is invalid.',
        errors: ['Account number must contain 9 to 18 digits.'],
        errorCode: 'VALIDATION_ERROR',
      },
    });

    await expect(service.fail(error)).rejects.toMatchObject({
      message: 'Bank information is invalid. Account number must contain 9 to 18 digits.',
      status: 400,
      errorCode: 'VALIDATION_ERROR',
    } satisfies Partial<ApiError>);
  });

  it('reads the backend PascalCase error envelope', async () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        Message: 'Bank information is invalid.',
        Errors: ['IFSC code must use the format ABCD0XXXXXX.'],
        ErrorCode: 'VALIDATION_ERROR',
      },
    });

    await expect(service.fail(error)).rejects.toMatchObject({
      message: 'Bank information is invalid. IFSC code must use the format ABCD0XXXXXX.',
      status: 400,
      errorCode: 'VALIDATION_ERROR',
    } satisfies Partial<ApiError>);
  });

  it('parses a JSON error returned as text', async () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: JSON.stringify({ message: 'This bank account already exists.' }),
    });

    await expect(service.fail(error)).rejects.toMatchObject({
      message: 'This bank account already exists.',
      status: 409,
    } satisfies Partial<ApiError>);
  });

  it('ignores an HTML error page and falls back to the status message', async () => {
    const error = new HttpErrorResponse({
      status: 404,
      error: '<!DOCTYPE html><html><body>Not Found</body></html>',
    });

    await expect(service.fail(error)).rejects.toMatchObject({
      message: 'The requested record was not found or is no longer available.',
      status: 404,
    } satisfies Partial<ApiError>);
  });

  it('uses an actionable status fallback when the server body is empty', async () => {
    const error = new HttpErrorResponse({ status: 403, error: null });

    await expect(service.fail(error)).rejects.toMatchObject({
      message: 'You do not have permission to perform this action.',
      status: 403,
    } satisfies Partial<ApiError>);
  });

  it('explains network failures', async () => {
    const error = new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });

    await expect(service.fail(error)).rejects.toMatchObject({
      message: 'Unable to reach the server. Check your internet connection and try again.',
      status: 0,
    } satisfies Partial<ApiError>);
  });
});
