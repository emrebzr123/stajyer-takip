import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { InternsModule } from '../interns/interns.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PassportModule,
    UsersModule,
    InternsModule,
    NotificationsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        // NOT: Önceden burada 'super-secret' diye bir fallback vardı — yani
        // JWT_SECRET environment variable'ı tanımlanmamışsa sistem SESSİZCE
        // bu zayıf, herkesin bildiği sabit değerle token imzalamaya devam
        // ederdi (kimse JWT_SECRET undefined olduğunu fark etmezdi). Pratikte
        // JwtStrategy zaten secret olmadan başlamayı reddettiği için bu
        // fallback'e hiç ulaşılmıyordu, ama yine de net bir hata vermek,
        // sessizce zayıf bir secretle devam etmekten çok daha güvenli.
        if (!secret) {
          throw new Error('JWT_SECRET environment variable tanımlı değil — uygulama güvenli şekilde başlatılamaz.');
        }
        return {
          secret,
          signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '7d') },
        };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
