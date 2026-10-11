export interface GetRefreshTokenReq {
  refreshToken: string;
  ipAddress: string;
}

export interface GetRefreshTokenRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: AuthToken;
}

export interface AuthToken {
  token: string;
  refreshToken: string;
}
