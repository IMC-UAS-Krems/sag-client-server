import { UserRole } from "@utils/roles";

export interface AuthContext {
  jwt: {
    sign: (payload: object) => string;
    verify: (token: string) => object;
  };
  log: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  };
  set: {
    status: number;
  };
  cookie: {
    jwtToken: {
      set: (options: {
        httpOnly: boolean;
        secure: boolean;
        sameSite: string;
        path: string;
        maxAge?: number;
        value: object | string;
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

export interface AuthContextWithQuery<TQuery> extends AuthContext {
  query: TQuery;
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
  userRole: string | UserRole;
  userType: string;
  writePrivilege: string;
  readPrivilege: string;
  organizationId: string;
  municipalityId: string;
  registered: Date;
  updatedAt: Date | null;
  deleted: boolean;
  lastTimeActive: Date;
  needsToBeLoggedOut: boolean;
}

export interface LoginBody {
  identifier: string;
  key: string;
}

export interface UserDetails {
  id: string;
  name: string;
  username: string;
  email: string;
  userRole: string;
  deleted: boolean;
  municipality: { name: string };
  organization: { name: string };
  needsToBeLoggedOut: boolean;
  lastTimeActive: Date;
  organizationName?: string;
  municipalityName?: string;
}

export interface CreateUserBody {
  username: string;
  password: string;
  name: string;
  email: string;
  organizationName: string;
  municipalityName: string;
  userRole: UserRole;
}

export interface UpdateUserBody {
  userId: string;
  username?: string;
  password?: string;
  name?: string;
  email?: string;
  organization?: string;
  municipality?: string;
  userRole?: UserRole;
}
