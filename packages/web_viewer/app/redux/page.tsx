'use client';

import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { increment, decrement } from '@/lib/features/exampleSlice';

export default function Counter() {
  const count = useAppSelector((state) => state.example.value);
  const dispatch = useAppDispatch();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <p style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Count: {count}</p>
      <button
        style={{ fontSize: '1.1rem', padding: '6px 10px' }}
        onClick={() => dispatch(increment())}
      >
        +
      </button>
      <button
        style={{ fontSize: '1.1rem', padding: '6px 10px' }}
        onClick={() => dispatch(decrement())}
      >
        -
      </button>
    </div>
  );
}
