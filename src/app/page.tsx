'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isUserLoggedIn } from '../lib/auth';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Kullanıcı giriş yapmışsa dashboard'a, yapmamışsa login sayfasına yönlendir
    if (isUserLoggedIn()) {
      router.push('/dashboard');
    } else {
      router.push('/auth/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-lg">Yönlendiriliyor...</div>
    </div>
  );
}
