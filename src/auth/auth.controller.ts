import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';

import { Public, GetCurrentUserId, GetCurrentUser } from '../common/decorators';
import { RtGuard } from '../common/guards';
import { AuthService } from './auth.service';
import { AuthDto } from './dto';
import { Tokens } from './types';
import {AuthGuard} from "@nestjs/passport";

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('local/signup')
  @HttpCode(HttpStatus.CREATED)
  signupLocal(@Body() dto: AuthDto) {
    console.log('***** Controller signup ****\nBody(AuthDto): ', dto)
    return this.authService.signupLocal(dto);
  }

  @Public()
  @Post('local/signin')
  @HttpCode(HttpStatus.OK)
  signinLocal(@Body() dto: AuthDto): Promise<Tokens> {
    console.log('***** Controller signin ****\nBody(AuthDto): ', dto)
    return this.authService.signinLocal(dto);
  }

  /*
  - Guard is a function put in front of routes to check for access token, expiration, etc
  - Name 'jwt' below comes from at.strategy.ts
  - for example- if in Postman, would signin, copy the at, add at to the Auth header value after 'Bearer' (Value: Bearer <token w/o quotes>)
  - successful signout = rtHash in db is now null
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@GetCurrentUserId() userId: number): Promise<boolean> {
    // logout(@GetCurrentUserId() userId: number): Promise<boolean> {
    console.log('***** Controller logout ****\nuserId: ', userId)
    return this.authService.logout(userId);
  }

  /*
  *  This endpoint compares the hash of the sent RT w/ the RT hash from the db
  * if it matches, refresh token is recreated - look @ rt.strategy.ts
  * if there is no refresh token, or if just an access token is given, will fail
  * */
  @Public()
  @UseGuards(AuthGuard('jwt-refresh')) //look for a jwt refresh token
  // @UseGuards(RtGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refreshTokens(
    @GetCurrentUserId() userId: number,
    @GetCurrentUser('refreshToken') refreshToken: string,
  ): Promise<Tokens> {
    console.log('***** Controller refresh tokens ****\nuserId: ', userId, '\nrefreshToken: ', refreshToken)
    return this.authService.refreshTokens(userId, refreshToken);
  }
}
