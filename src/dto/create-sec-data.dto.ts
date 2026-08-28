import { IsEmail } from 'class-validator';
import z from 'zod';

export default class CreateSecData {
  @IsEmail()
  email!: string;
}

export const createSecDataSchema = z.object({
  email: z.email(),
});
