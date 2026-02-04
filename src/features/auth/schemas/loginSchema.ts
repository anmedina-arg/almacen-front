import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email requerido'),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(100, 'Contraseña demasiado larga'),
});

export type LoginInput = z.infer<typeof loginSchema>;
