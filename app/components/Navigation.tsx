"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';

// Add or update this interface at the top of the file
interface NavigationProps {
  currentPage: string;
  onLogout: () => void;
}

export default function Navigation({ currentPage, onLogout }: NavigationProps) {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(localStorage.getItem('userRole'));
  }, []);

  return (
    <nav className="flex gap-4 p-4 bg-white border-b">
      <Link href="/shop" className="text-green-700 font-bold">Marketplace</Link>
      
      {role === 'farmer' && (
        <>
          <Link href="/admin">Livestock</Link>
          <Link href="/health">Health</Link>
          <Link href="/productivity">Productivity</Link>
          <Link href="/expenses">Expenses</Link>
        </>
      )}
      
      <button onClick={() => {localStorage.clear(); window.location.href='/';}} className="ml-auto text-red-500">Logout</button>
    </nav>
  );
}
