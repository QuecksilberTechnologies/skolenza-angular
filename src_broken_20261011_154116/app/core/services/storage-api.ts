import { Injectable } from '@angular/core';

const APP_PREFIX = 'skolenza/';

@Injectable({
  providedIn: 'root',
})
export class StorageApi {
  prefixKey(key: string): string {
    return key.startsWith(APP_PREFIX) ? key : `${APP_PREFIX}${key}`;
  }

  async setItem(key: string, value: unknown) {
    try {
      localStorage.setItem(this.prefixKey(key), JSON.stringify(value));
    } catch (err) {
      console.error('Error setting item in storage:', err);
    }
  }

  async getItem(key: string): Promise<unknown> {
    try {
      const raw = localStorage.getItem(this.prefixKey(key));
      return raw === null ? null : JSON.parse(raw);
    } catch (err) {
      console.error('Error getting item from storage:', err);
      return null;
    }
  }

  async removeItem(key: string) {
    try {
      localStorage.removeItem(this.prefixKey(key));
    } catch (err) {
      console.error('Error removing item from storage:', err);
    }
  }

  clearSensitive() {
    const sensitiveKeys = [
      'token',
      'refreshToken',
      'clientIp',
      'loginInfo',
      'attendance-records',
      'feature-pages',
    ];
    for (const key of sensitiveKeys) {
      localStorage.removeItem(this.prefixKey(key));
    }
  }
}
