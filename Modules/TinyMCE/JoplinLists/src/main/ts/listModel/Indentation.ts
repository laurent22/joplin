/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import { Entry } from './Entry';

export const enum Indentation {
  Indent = 'Indent',
  Outdent = 'Outdent',
  Flatten = 'Flatten'
}

export const indentEntry = (indentation: Indentation, entry: Entry): void => {
  switch (indentation) {
    case Indentation.Indent:
      entry.depth ++;
      break;

    case Indentation.Outdent:
      entry.depth --;
      break;

    case Indentation.Flatten:
      entry.depth = 0;
  }
};