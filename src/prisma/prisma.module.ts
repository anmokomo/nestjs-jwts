import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
/*Global Module = import this in app's root module -> available in all modules
(no need to import it in every module where it's needed)
*/
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
