import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
// import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import * as argon from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

import { AuthDto } from './dto';
import { JwtPayload, Tokens } from './types';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService, //don't forget to use prisma in your service
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async signupLocal(dto: AuthDto): Promise<Tokens> {
    //create hashed password
    const hash = await argon.hash(dto.password);
    console.log('*** Provider: signupLocal ***\n created hashedPassword: ', hash)

    //create user using the PrismaClient
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        hash,
      },
    });
    console.log('created user: ', user)
    // .catch((error) => {
    //   if (error instanceof PrismaClientKnownRequestError) {
    //     if (error.code === 'P2002') {
    //       throw new ForbiddenException('Credentials incorrect');
    //     }
    //   }
    //   throw error;
    // });

    const tokens = await this.getTokens(user.id, user.email);
    console.log('tokens: ', tokens)
    await this.updateRtHash(user.id, tokens.refresh_token);
    console.log('update rtHash - user.hashedRt: ', user.hashedRt)
    return tokens;
  }

  async signinLocal(dto: AuthDto): Promise<Tokens> {
    //find user
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });
    console.log('*** Provider: signinLocal ***\n found user: ', user)
    //check if user exists
    if (!user) throw new ForbiddenException('Access Denied');
    //check if the hashed passwords match (one given by client in sign in req, and the one on the server):
    const passwordMatches = await argon.verify(user.hash, dto.password);
    console.log('Password matches: ', passwordMatches)
    if (!passwordMatches) throw new ForbiddenException('Access Denied');

    //create the tokens - same as 'signupLocal()'
    const tokens = await this.getTokens(user.id, user.email);
    console.log('tokens: ', tokens)
    await this.updateRtHash(user.id, tokens.refresh_token);

    return tokens;
  }
    //Takes user id
  async logout(userId: number): Promise<boolean> {
    /*
    * update the user in db - set hashedRt to null (remove it)
    use updateMany- gives the option for multiple 'where' clauses
    we want to check for a hashedRt before updating - otherwise spamming
    the logout button for users w/ no rtHash could lead to lots of unnecessary db calls
    * */
    await this.prisma.user.updateMany({
      where: {
        id: userId,
        hashedRt: {
          not: null,
        },
      },
      data: {
        hashedRt: null,
      },
    });
    return true;
  }

  async refreshTokens(userId: number, rt: string): Promise<Tokens> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    console.log('***** Refresh Tokens *****\nuser: ', user)
    if (!user || !user.hashedRt) throw new ForbiddenException('Access Denied');

    const rtMatches = await argon.verify(user.hashedRt, rt);
    if (!rtMatches) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRtHash(user.id, tokens.refresh_token);

    return tokens;
  }

  async updateRtHash(userId: number, rt: string): Promise<void> {
    const hash = await argon.hash(rt);
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        hashedRt: hash,
      },
    });
  }

  async getTokens(userId: number, email: string): Promise<Tokens> {
    //jwt payload (data that is being encrypted into the tokens)
    const jwtPayload: JwtPayload = {
      sub: userId,
      email: email,
    };
    console.log('***** getTokens() *****\njwtPayload: ', jwtPayload)

    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: this.config.get<string>('AT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(jwtPayload, {
        secret: this.config.get<string>('RT_SECRET'),
        expiresIn: '7d',
      }),
    ]);
    console.log('access_token/at: ', at, '\nrefresh_token/rt: ', rt)

    return {
      access_token: at,
      refresh_token: rt,
    };
  }
}
