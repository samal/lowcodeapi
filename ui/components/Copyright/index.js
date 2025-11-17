import React from 'react';
import dayjs from 'dayjs';

const copyright = `© ${dayjs().format('YYYY')}`;

function Copyright({ extendClass, copyright_name }) {
  return (
    <div className={`text-xs ${extendClass}`}>
      {copyright} - {copyright_name}
    </div>
  );
}

export default Copyright;
