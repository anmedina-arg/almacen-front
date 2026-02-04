import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email requerido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir mayúscula')
    .regex(/[a-z]/, 'Debe incluir minúscula')
    .regex(/[0-9]/, 'Debe incluir número')
    .max(100, 'Contraseña demasiado larga'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Mínimo 2 caracteres').max(100, 'Nombre demasiado largo'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export type RegisterInput = z.infer<typeof registerSchema>;
