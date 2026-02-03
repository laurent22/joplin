 'use client';

import React from 'react';
import NoteTree from './NoteTree';

export default function NoteTreeWrapper() {
  return (
    <div className="note-tree-wrapper" style={{ height: '100%' }}>
      <NoteTree />
    </div>
  );
}
