import { IsEmail, IsInt, IsString } from 'class-validator';

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
