import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalCustomerAuthGuard extends AuthGuard('customer-jwt') {
  handleRequest(
    err: any,
    user: any,
    _info: any,
    _context: ExecutionContext,
  ) {
    if (err) {
      return null;
    }
    return user ?? null;
  }
}
