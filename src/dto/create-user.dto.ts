import { IsEmail, IsInt, IsString } from 'class-validator';
import z from 'zod';

export default class CreateUserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  country!: string;

  @IsInt()
  age!: number;
}

export const createUserSchema = z.object({
  name: z.string(),
  email: z.email(),
  country: z.string(),
  age: z.int(),
});
