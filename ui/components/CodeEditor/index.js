'use client';

import CodeMirror from '@uiw/react-codemirror';
import {nord } from '@uiw/codemirror-theme-nord';
import { javascript } from '@codemirror/lang-javascript';

export default ({value, onChange}) => {
  return <CodeMirror
    value={value}
    height="300px"
    onChange={onChange}
    theme={nord}
    extensions={[javascript()]}
  />
};