import { PrismaClient } from '.prisma/client';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient //PrismaClient allows us to interact w/ the db
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    const url = config.get<string>('DATABASE_URL');
    //super() needed because we're extending an object
    //gives the PrismaClient db info - when the module starts, connect to the db
    super({
      datasources: {
        db: {
          url,
        },
      },
    });
  }
  //when module is created/started
  async onModuleInit() {
    await this.$connect();
  }
  //when module is destroyed
  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') return;

    // teardown logic
    return Promise.all([this.user.deleteMany()]);
  }
}
