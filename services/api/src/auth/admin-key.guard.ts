import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = (process.env.ADMIN_KEY ?? '').trim();

    // Safer-by-default: if not configured, do NOT allow access
    if (!expected) {
      throw new InternalServerErrorException(
        'ADMIN_KEY is not configured on the server',
      );
    }

    const req = context.switchToHttp().getRequest();

    // 1️⃣ Check header first
    const headerRaw = req.headers['x-admin-key'];

    const headerKey = Array.isArray(headerRaw)
      ? String(headerRaw[0] ?? '').trim()
      : String(headerRaw ?? '').trim();

    // 2️⃣ Fallback to query param (?adminKey=...)
    const queryRaw = req.query?.adminKey;
    const queryKey = Array.isArray(queryRaw)
      ? String(queryRaw[0] ?? '').trim()
      : String(queryRaw ?? '').trim();

    const provided = headerKey || queryKey;

    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Invalid admin key');
    }

    return true;
  }
}
