import { Module } from '@nestjs/common';

import { BotModule } from './models/bot/bot.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BotModule
  ],
 
})
export class AppModule {}
