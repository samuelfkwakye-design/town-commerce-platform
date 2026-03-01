'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function OpsLogin() {
  const [key, setKey] = useState('');
  const router = useRouter();

  function save() {
    localStorage.setItem('ops_admin_key', key.trim());
    router.push('/ops/orders');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="border rounded-2xl p-6 w-full max-w-md space-y-4">
        <h1 className="text-lg font-semibold">Ops Admin Login</h1>

        <input
          className="w-full border rounded-xl px-3 py-2"
          placeholder="Enter admin key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />

        <button
          onClick={save}
          className="w-full bg-black text-white rounded-xl py-2"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}
