export interface AuthContext {
  log: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  };
  set: {
    status: number;
  };
  cookie: {
    access_token: {
      set: (options: {
        httpOnly: boolean;
        secure: boolean;
        sameSite: string;
        path: string;
        maxAge?: number;
        value: string;
        expires?: Date;
      }) => void;
    };
  };
  userId?: string;
}

export interface AuthContextWithBody<TBody> extends AuthContext {
  body: TBody;
}

export interface AuthContextWithRequest extends AuthContext {
  request: {
    user?: {
      userId: string;
    };
  };
}

export interface RegisterBody {
  name: string;
  email: string;
  username: string;
  key: string;
  municipalityName: string;
  organizationName: string;
}

export interface RegisteredUser {
  name: string;
  username: string;
  email: string;
  userRole: string;
  userType: string;
  writePrivilege: string;
  readPrivilege: string;
  organizationId: string;
  municipalityId: string;
  registered: Date;
  updatedAt: Date | null;
  deleted: boolean;
  lastLoginTime: Date;
  needsToBeLoggedOut: boolean;
}

export interface LoginBody {
  identifier: string;
  key: string;
}
