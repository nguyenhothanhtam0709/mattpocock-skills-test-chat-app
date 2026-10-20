import {
  HttpStatus,
  Inject,
  createParamDecorator,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ErrorCode } from '@chat/contracts';
import type { FastifyRequest } from 'fastify';
import { DomainException } from '../common/all-exceptions.filter.js';
import { setRequestUserId } from '../logging/request-context.js';
import { AuthService } from './auth.service.js';
import { TOKEN_DENY_LIST, type TokenDenyList } from './token-deny-list.js';
import { TokenService, type AccessClaims } from './token.service.js';

export interface AuthContext {
  userId: string;
  sessionId: string;
  jti: string;
  expiresAt: number;
}

type AuthedRequest = FastifyRequest & { auth?: AuthContext };

/** Requires a valid, unexpired access token in `Authorization: Bearer`. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    @Inject(TOKEN_DENY_LIST) private readonly denyList: TokenDenyList,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
    const claims: AccessClaims | undefined = token
      ? await this.tokens.verifyAccessToken(token)
      : undefined;
    if (!claims) {
      throw new DomainException(
        ErrorCode.UNAUTHENTICATED,
        HttpStatus.UNAUTHORIZED,
        'Authentication required',
      );
    }
    // Logout denies the token; a session ended any other way (refresh-token reuse) is gone.
    if (
      (await this.denyList.isDenied(claims.jti)) ||
      !(await this.auth.isSessionActive(claims.sid))
    ) {
      throw new DomainException(
        ErrorCode.SESSION_REVOKED,
        HttpStatus.UNAUTHORIZED,
        'Session has ended',
      );
    }
    request.auth = {
      userId: claims.sub,
      sessionId: claims.sid,
      jti: claims.jti,
      expiresAt: claims.exp,
    };
    setRequestUserId(claims.sub);
    return true;
  }
}

/** The authenticated caller, set by `AuthGuard`. */
export const Auth = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  return context.switchToHttp().getRequest<AuthedRequest>().auth;
});
