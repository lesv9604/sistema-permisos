import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  estado(): string {
    return 'ok';
  }
}
