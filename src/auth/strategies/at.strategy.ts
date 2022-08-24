import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../types';

@Injectable() //note the injectable = this is a provider class
//Passport - takes the token, decodes it in the payload, and payload
//need to put Strategy in a Guard
export class AtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    //pass strategy options
    super({
      //how we'll get the tokens- here, from headers (add Authorization: Bearer to postman header values)
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      //secret key that server will sign tokens with
      //access and refresh tokens will have different secret keys
      secretOrKey: config.get<string>('AT_SECRET'),
    });
  }
//payload = the token object decoded sent from client to passport
  validate(payload: JwtPayload) {
    return payload;
  }
}
