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
      throw new InternalServerErrorException('ADMIN_KEY is not configured on the server');
    }

    const req = context.switchToHttp().getRequest();
    const providedRaw = req.headers['x-admin-key'];

    const provided =
      Array.isArray(providedRaw) ? String(providedRaw[0] ?? '').trim() : String(providedRaw ?? '').trim();

    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Invalid admin key');
    }

    return true;
  }
}
