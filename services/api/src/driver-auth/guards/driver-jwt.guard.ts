import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DriverAuthService } from '../driver-auth.service';

@Injectable()
export class DriverJwtGuard implements CanActivate {
  constructor(private readonly driverAuthService: DriverAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers.authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Authorization header');
    }

    const driver = await this.driverAuthService.verifyToken(token);

    request.driver = driver;

    return true;
  }
}
