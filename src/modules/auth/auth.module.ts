import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { Session } from './entities/session.entity';
import { DeviceToken } from './entities/device-token.entity';
import { User } from '../staff/entities/user.entity';
import { Sale } from '../sales/entities/sale.entity';
import { SaleLine } from '../sales/entities/sale-line.entity';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([Session, DeviceToken, User, Sale, SaleLine]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_EXPIRES ?? ('8h' as any) },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
