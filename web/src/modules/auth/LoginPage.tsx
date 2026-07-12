import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../lib/hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const { signIn } = useAuth();
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setGlobalError(null);
    const { error } = await signIn(data.email, data.password);
    
    if (error) {
      setGlobalError(error.message);
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', fontFamily: 'sans-serif' }}>
      <h1>Sign In</h1>
      
      {globalError && (
        <div style={{ color: 'red', marginBottom: '1rem', padding: '0.5rem', border: '1px solid red' }}>
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
          <input
            id="email"
            type="email"
            {...register('email')}
            style={{ width: '100%', padding: '0.5rem' }}
          />
          {errors.email && <span style={{ color: 'red', fontSize: '0.875rem' }}>{errors.email.message}</span>}
        </div>

        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
          <input
            id="password"
            type="password"
            {...register('password')}
            style={{ width: '100%', padding: '0.5rem' }}
          />
          {errors.password && <span style={{ color: 'red', fontSize: '0.875rem' }}>{errors.password.message}</span>}
        </div>

        <button type="submit" disabled={isSubmitting} style={{ padding: '0.75rem', cursor: 'pointer' }}>
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {import.meta.env.DEV && (
        <div style={{ marginTop: '2rem', fontSize: '0.875rem', color: '#666' }}>
          <p><strong>Dev Hints (Seeded Accounts):</strong></p>
          <ul style={{ paddingLeft: '1rem' }}>
            <li>admin@ecosphere.test (Admin)</li>
            <li>manager@ecosphere.test (Manager)</li>
            <li>employee@ecosphere.test (Employee)</li>
          </ul>
          <p>Password: password123</p>
        </div>
      )}
    </div>
  );
};
