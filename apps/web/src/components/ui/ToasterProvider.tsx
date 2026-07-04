'use client';
import { Toaster } from 'react-hot-toast';

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: { fontSize: 13, fontFamily: 'Inter, sans-serif' },
        success: { duration: 3000 },
        error: { duration: 4000 },
      }}
    />
  );
}
